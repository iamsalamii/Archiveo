using Archiveo.Api.Controllers;
using Archiveo.Application.DTOs.Archives;
using Archiveo.Application.DTOs.Documents;
using Archiveo.Application.DTOs.Loans;
using Archiveo.Application.DTOs.Signatures;
using Archiveo.Application.DTOs.Workflows;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Suite de tests exhaustifs pour les parcours métier essentiels, les autorisations multi-profils,
/// les accès inter-services, les opérations documentaires, et les scénarios de téléchargement.
/// Exécutée sur l'instance réelle PostgreSQL 18.4 (Port 5433, base archiveo_staging).
/// </summary>
public class BusinessJourneysAndSecurityAuditTests : IDisposable
{
    private const string StagingConnectionString = "Host=127.0.0.1;Port=5433;Database=archiveo_staging;Username=postgres;Password=";
    private readonly ApplicationDbContext _dbContext;
    private readonly DocumentService _documentService;
    private readonly ArchiveService _archiveService;
    private readonly LoanService _loanService;
    private readonly WorkflowService _workflowService;
    private readonly SignatureService _signatureService;
    private readonly string _tempStoragePath;

    public BusinessJourneysAndSecurityAuditTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(StagingConnectionString)
            .Options;

        _dbContext = new ApplicationDbContext(options);

        _tempStoragePath = Path.Combine(Path.GetTempPath(), $"Archiveo_Test_Storage_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempStoragePath);
        Environment.SetEnvironmentVariable("ARCHIVEO_STORAGE_PATH", _tempStoragePath);

        var httpContextAccessor = new HttpContextAccessor();
        _documentService = new DocumentService(_dbContext, httpContextAccessor);
        _archiveService = new ArchiveService(_dbContext);
        _loanService = new LoanService(_dbContext);
        _workflowService = new WorkflowService(_dbContext);
        _signatureService = new SignatureService(_dbContext, new NotificationService(_dbContext, null!));
    }

    public void Dispose()
    {
        _dbContext.Dispose();
        try
        {
            if (Directory.Exists(_tempStoragePath))
            {
                Directory.Delete(_tempStoragePath, true);
            }
        }
        catch {}
    }

    private DocumentsController CreateDocumentsController(Guid userId, string email, string role = "User", string serviceId = "GENERAL")
    {
        var controller = new DocumentsController(_documentService);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role),
            new Claim("ServiceId", serviceId)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }

    private SignaturesController CreateSignaturesController(Guid userId, string email, string role = "User")
    {
        var controller = new SignaturesController(_signatureService);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) }
        };
        return controller;
    }

    // =========================================================================
    // PARCOURS 1 : Cycle de vie documentaire (Création, Versioning, Validation, Archivage, Suppression)
    // =========================================================================
    [Fact]
    public async Task Journey1_DocumentLifecycle_CreateVersionValidateArchiveDelete()
    {
        var authorId = Guid.NewGuid();

        var author = new User
        {
            Id = authorId,
            UserName = "author.logistique@archiveo.local",
            Email = "author.logistique@archiveo.local",
            ServiceId = "SERVICE_LOGISTIQUE",
            FirstName = "Agent",
            LastName = "Logistique",
            IsActive = true
        };
        _dbContext.Users.Add(author);
        await _dbContext.SaveChangesAsync();

        // 1. Création avec fichier simulé
        var fileContent = "CONTRAT-CONFIDENTIEL-STAGING-V1";
        var fileBytes = Encoding.UTF8.GetBytes(fileContent);
        using var stream = new MemoryStream(fileBytes);
        var formFile = new FormFile(stream, 0, fileBytes.Length, "file", "contrat_partenariat.pdf")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };

        var createReq = new CreateDocumentRequest
        {
            Title = "Contrat Cadre Logistique 2026",
            Description = "Accord tripartite sur la conservation physique",
            ServiceId = "SERVICE_LOGISTIQUE",
            CategoryId = "CONTRATS",
            TypeId = "ACCORD",
            ConfidentialityId = "CONFIDENTIEL"
        };

        var createdDoc = await _documentService.CreateAsync(createReq, formFile, authorId);
        Assert.NotNull(createdDoc);
        Assert.Equal("BROUILLON", createdDoc.StatusId);
        Assert.Equal("contrat_partenariat.pdf", createdDoc.FileName);
        Assert.StartsWith("DOC-", createdDoc.Reference);

        // 2. Versioning : Création d'une version V2
        var updateReq = new UpdateDocumentRequest
        {
            Title = "Contrat Cadre Logistique 2026 - Révisé V2",
            Description = "Ajout des clauses de restitution",
            ServiceId = "SERVICE_LOGISTIQUE",
            CategoryId = "CONTRATS",
            TypeId = "ACCORD",
            StatusId = "EN_REVISION"
        };
        var updatedDoc = await _documentService.CreateVersionAsync(createdDoc.Id, updateReq, null, authorId);
        Assert.NotNull(updatedDoc);
        Assert.Equal(2, updatedDoc.Version);
        Assert.Equal("Contrat Cadre Logistique 2026 - Révisé V2", updatedDoc.Title);

        // Vérification de l'historique des versions
        var versions = await _documentService.GetVersionsAsync(createdDoc.Id);
        Assert.NotEmpty(versions);
        Assert.Equal(1, versions[0].Version); // L'instantané de la V1 est archivé

        // 3. Validation formelle du document
        var validatedDoc = await _documentService.ValidateAsync(createdDoc.Id, authorId);
        Assert.NotNull(validatedDoc);
        Assert.True(validatedDoc.Validated);
        Assert.Equal("VALIDE", validatedDoc.StatusId);

        // 4. Versement au statut archivé
        var archivedDoc = await _documentService.SetArchivedAsync(createdDoc.Id, true, authorId);
        Assert.NotNull(archivedDoc);
        Assert.True(archivedDoc.IsArchived);
        Assert.Equal("ARCHIVE", archivedDoc.StatusId);

        // 5. Suppression logique (soft delete)
        var deleteSuccess = await _documentService.DeleteAsync(createdDoc.Id);
        Assert.True(deleteSuccess);

        // Vérification que le document n'est plus retourné dans les listes actives
        var checkDeleted = await _documentService.GetByIdAsync(createdDoc.Id);
        Assert.Null(checkDeleted);
    }

    // =========================================================================
    // PARCOURS 2 : Prêt et circulation physique (Création, Concurrence, Renouvellement, Restitution)
    // =========================================================================
    [Fact]
    public async Task Journey2_PhysicalLoanLifecycle_CreateConflictRenewReturn()
    {
        var archivistId = Guid.NewGuid();
        var borrowerId = Guid.NewGuid();

        // Création d'un document physique
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Dossier Médical Archive Physique 1998",
            Reference = $"DOS-MED-{Guid.NewGuid():N}"[..20],
            ServiceId = "SERVICE_SANTE",
            CreatedBy = archivistId,
            IsActive = true,
            IsArchived = false,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        // 1. Emprunt légitime
        var loanReq = new CreateLoanRequest
        {
            DocumentId = doc.Id,
            BorrowerName = "Dr. Martin",
            BorrowerEmail = "martin@sante.archiveo.local",
            DueDate = DateTime.UtcNow.AddDays(14),
            Location = "Bureau Médical 104"
        };
        var loanDto = await _loanService.CreateLoanAsync(loanReq, archivistId);
        Assert.NotNull(loanDto);
        Assert.Equal("active", loanDto.Status);
        Assert.StartsWith("LOAN-", loanDto.Reference);

        // 2. Concurrence : Tentative de second prêt sur le même document -> Doit lever InvalidOperationException
        var conflictLoanReq = new CreateLoanRequest
        {
            DocumentId = doc.Id,
            BorrowerName = "Dr. Bernard",
            BorrowerEmail = "bernard@sante.archiveo.local",
            DueDate = DateTime.UtcNow.AddDays(7),
            Location = "Cabinet Consultations"
        };
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _loanService.CreateLoanAsync(conflictLoanReq, archivistId));

        // 3. Renouvellement du prêt (+7 jours)
        var renewedLoan = await _loanService.RenewLoanAsync(loanDto.Id, 7);
        Assert.NotNull(renewedLoan);
        Assert.Equal("renewed", renewedLoan.Status);
        Assert.True(renewedLoan.DueDate > loanDto.DueDate);

        // 4. Restitution du document emprunté
        var returnedLoan = await _loanService.ReturnLoanAsync(loanDto.Id);
        Assert.NotNull(returnedLoan);
        Assert.Equal("returned", returnedLoan.Status);
        Assert.NotNull(returnedLoan.ReturnDate);

        // 5. Après restitution, un nouvel emprunt est de nouveau possible
        var secondLoan = await _loanService.CreateLoanAsync(conflictLoanReq, archivistId);
        Assert.NotNull(secondLoan);
        Assert.Equal("active", secondLoan.Status);
    }

    // =========================================================================
    // PARCOURS 3 : Circuit d'approbation documentaire / Workflow multi-niveaux
    // =========================================================================
    [Fact]
    public async Task Journey3_WorkflowApproval_MultiStepProgressionToCompletion()
    {
        var initiatorId = Guid.NewGuid();

        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Note d'Orientation Stratégique 2027",
            Reference = $"NOTE-STRAT-{Guid.NewGuid():N}"[..20],
            ServiceId = "DIRECTION_STRATEGIE",
            CreatedBy = initiatorId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        // 1. Création d'un workflow à 3 étapes ordonnées
        var createWfReq = new CreateWorkflowRequest
        {
            Name = "Circuit Approbation Direction Stratégique",
            DocumentId = doc.Id,
            Steps = new List<CreateWorkflowStepRequest>
            {
                new() { Order = 1, Name = "Visa Responsable Pôle", ValidatorRole = "PoleManager" },
                new() { Order = 2, Name = "Avis Contrôle Financier", ValidatorRole = "Cfo" },
                new() { Order = 3, Name = "Validation Directeur Général", ValidatorRole = "Ceo" }
            }
        };

        var wfDto = await _workflowService.CreateAsync(createWfReq, initiatorId);
        Assert.NotNull(wfDto);
        Assert.Equal("in_progress", wfDto.Status);
        Assert.Equal(1, wfDto.CurrentStep);
        Assert.Equal(3, wfDto.Steps.Count);

        // 2. Validation étape 1
        var step1 = wfDto.Steps.First(s => s.Order == 1);
        var wfAfterStep1 = await _workflowService.ProcessStepAsync(
            wfDto.Id, step1.Id,
            new ProcessWorkflowStepRequest { Action = "approved", Comment = "Visa pôle accordé" },
            Guid.NewGuid(), "M. Chef de Pôle");

        Assert.NotNull(wfAfterStep1);
        Assert.Equal(2, wfAfterStep1.CurrentStep); // Progression à l'étape 2
        Assert.Equal("in_progress", wfAfterStep1.Status);

        // 3. Validation étape 2
        var step2 = wfAfterStep1.Steps.First(s => s.Order == 2);
        var wfAfterStep2 = await _workflowService.ProcessStepAsync(
            wfDto.Id, step2.Id,
            new ProcessWorkflowStepRequest { Action = "approved", Comment = "Budget conforme" },
            Guid.NewGuid(), "Directeur Financier");

        Assert.NotNull(wfAfterStep2);
        Assert.Equal(3, wfAfterStep2.CurrentStep); // Progression à l'étape 3

        // 4. Validation étape 3 (finale)
        var step3 = wfAfterStep2.Steps.First(s => s.Order == 3);
        var wfCompleted = await _workflowService.ProcessStepAsync(
            wfDto.Id, step3.Id,
            new ProcessWorkflowStepRequest { Action = "approved", Comment = "Approuvé par la Direction Générale" },
            Guid.NewGuid(), "Directeur Général");

        Assert.NotNull(wfCompleted);
        Assert.Equal("completed", wfCompleted.Status);
        Assert.NotNull(wfCompleted.CompletedAt);

        // 5. Vérifier que le document rattaché a été marqué comme validé
        var updatedDoc = await _dbContext.Documents.FindAsync(doc.Id);
        Assert.NotNull(updatedDoc);
        Assert.True(updatedDoc.Validated);
        Assert.Equal("VALIDE", updatedDoc.StatusId);
    }

    // =========================================================================
    // PARCOURS 4 : Parapheur Électronique (Demande, Signature cryptographique, Certificat eIDAS)
    // =========================================================================
    [Fact]
    public async Task Journey4_ElectronicSignature_FullCycleSignVerifyCertificate()
    {
        var requesterId = Guid.NewGuid();
        var signerId = Guid.NewGuid();

        // 1. Création document source
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Avenant Contrat Cadre Fournisseur 2026",
            Reference = $"DOC-SIG-{Guid.NewGuid():N}"[..20],
            ServiceId = "ACHATS",
            CreatedBy = requesterId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        // 2. Demande de signature
        var req = new CreateSignatureRequest
        {
            DocumentId = doc.Id,
            DocumentTitle = doc.Title,
            SignerUserId = signerId,
            SignerName = "Directeur Achats",
            SignerEmail = "achats.dir@archiveo.local",
            NotificationChannel = "both"
        };
        var sigDto = await _signatureService.RequestSignatureAsync(
            req, requesterId, "Responsable Juridique", "juridique@archiveo.local", isAdmin: true);

        Assert.NotNull(sigDto);
        Assert.Equal("pending", sigDto.Status);

        // 3. Signature du document
        var signReq = new SignDocumentRequest
        {
            SignatureType = "drawing",
            SignatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        };
        var signedDto = await _signatureService.SignAsync(
            sigDto.Id, signReq, "192.168.1.50", signerId, "achats.dir@archiveo.local", isAdmin: false);

        Assert.NotNull(signedDto);
        Assert.Equal("signed", signedDto.Status);
        Assert.NotNull(signedDto.Sha256Hash);
        Assert.StartsWith("CERT-", signedDto.CertificateNumber);

        // 4. Génération et vérification du certificat eIDAS sécurisé
        var cert = await _signatureService.GetCertificateSecuredAsync(
            sigDto.Id, signerId, "achats.dir@archiveo.local", isAdmin: false);

        Assert.NotNull(cert);
        Assert.Equal(signedDto.Sha256Hash, cert.Sha256Hash);
        Assert.Equal("VERIFIED_AUTHENTIC", cert.Status);
    }

    // =========================================================================
    // AUDIT DE SÉCURITÉ : Cloisonnement inter-services vs Fuite documentaire
    // =========================================================================
    [Fact]
    public async Task SecurityAudit_CrossServicePerimeterChecks_DocumentVsSignatureBehavior()
    {
        var userRhId = Guid.NewGuid();
        var userFinanceId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        // Enregistrement des utilisateurs en base PostgreSQL avec leurs services respectifs
        var userRh = new User
        {
            Id = userRhId,
            UserName = "agent.rh@archiveo.local",
            Email = "agent.rh@archiveo.local",
            ServiceId = "SERVICE_RH",
            FirstName = "Agent",
            LastName = "RH"
        };
        var userFinance = new User
        {
            Id = userFinanceId,
            UserName = "agent.finance@archiveo.local",
            Email = "agent.finance@archiveo.local",
            ServiceId = "SERVICE_FINANCE",
            FirstName = "Agent",
            LastName = "Finance"
        };
        _dbContext.Users.AddRange(userRh, userFinance);

        // Document confidentiel RH
        var docRh = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Plan de Rémunération et Primes Cadres",
            Reference = $"RH-SAL-{Guid.NewGuid():N}"[..20],
            ServiceId = "SERVICE_RH",
            CreatedBy = userRhId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(docRh);
        await _dbContext.SaveChangesAsync();

        // 1. CLOISONNEMENT VALIDÉ : Module Signatures
        // L'agent Finance tente de consulter les signatures du document RH
        var sigControllerFinance = CreateSignaturesController(userFinanceId, "agent.finance@archiveo.local");
        var sigResultFinance = await sigControllerFinance.GetSignaturesByDocument(docRh.Id);

        var forbiddenResult = Assert.IsType<ObjectResult>(sigResultFinance);
        Assert.Equal(403, forbiddenResult.StatusCode);

        // L'administrateur système y a accès légitimement
        var sigControllerAdmin = CreateSignaturesController(adminId, "admin@archiveo.local", role: "Admin");
        var sigResultAdmin = await sigControllerAdmin.GetSignaturesByDocument(docRh.Id);
        Assert.Equal(200, Assert.IsType<OkObjectResult>(sigResultAdmin).StatusCode);

        // 2. CLOISONNEMENT SÉCURISÉ : Module Documents (ANO-01 résolu)
        // L'agent Finance tente d'accéder au document RH : l'API bloque avec 403 Forbidden
        var docControllerFinance = CreateDocumentsController(userFinanceId, "agent.finance@archiveo.local", role: "User", serviceId: "SERVICE_FINANCE");
        var docResult = await docControllerFinance.GetById(docRh.Id);

        var forbiddenDoc = Assert.IsType<ObjectResult>(docResult);
        Assert.Equal(403, forbiddenDoc.StatusCode);

        // L'administrateur système y a accès légitimement
        var docControllerAdmin = CreateDocumentsController(adminId, "admin@archiveo.local", role: "Admin", serviceId: "DIRECTION");
        var docAdminResult = await docControllerAdmin.GetById(docRh.Id);
        var okAdminDoc = Assert.IsType<OkObjectResult>(docAdminResult);
        var readDoc = Assert.IsType<DocumentDto>(okAdminDoc.Value);
        Assert.Equal("SERVICE_RH", readDoc.ServiceId);
    }

    // =========================================================================
    // AUDIT TÉLÉCHARGEMENT : Fichier présent vs Fichier orphelin sur disque
    // =========================================================================
    [Fact]
    public async Task SecurityAudit_DocumentDownload_HandlesMissingPhysicalFileWithNotFound()
    {
        var authorId = Guid.NewGuid();

        var author = new User
        {
            Id = authorId,
            UserName = "author@archiveo.local",
            Email = "author@archiveo.local",
            ServiceId = "GENERAL",
            FirstName = "Author",
            LastName = "General",
            IsActive = true
        };
        _dbContext.Users.Add(author);

        // 1. Document avec fichier existant
        var tempFile = Path.Combine(_tempStoragePath, "documents", $"{Guid.NewGuid()}.txt");
        Directory.CreateDirectory(Path.GetDirectoryName(tempFile)!);
        await File.WriteAllTextAsync(tempFile, "CONTENU_FICHIER_VALIDE");

        var docWithFile = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Document Avec Fichier Existant",
            Reference = $"DOC-DL-OK-{Guid.NewGuid():N}"[..20],
            ServiceId = "GENERAL",
            CreatedBy = authorId,
            FilePath = tempFile,
            FileName = "fichier_valide.txt",
            MimeType = "text/plain",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // 2. Document avec chemin orphelin (fichier physique supprimé ou manquant sur disque)
        var docOrphan = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Document Avec Fichier Orphelin",
            Reference = $"DOC-DL-ERR-{Guid.NewGuid():N}"[..20],
            ServiceId = "GENERAL",
            CreatedBy = authorId,
            FilePath = Path.Combine(_tempStoragePath, "documents", "non_existent_file.pdf"),
            FileName = "perdu.pdf",
            MimeType = "application/pdf",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Documents.AddRange(docWithFile, docOrphan);
        await _dbContext.SaveChangesAsync();

        var controller = CreateDocumentsController(authorId, "author@archiveo.local");

        // Téléchargement du document valide -> FileResult 200
        var validDlResult = await controller.Download(docWithFile.Id);
        var fileResult = Assert.IsType<FileContentResult>(validDlResult);
        Assert.Equal("text/plain", fileResult.ContentType);
        Assert.Equal("fichier_valide.txt", fileResult.FileDownloadName);
        Assert.Equal("CONTENU_FICHIER_VALIDE", Encoding.UTF8.GetString(fileResult.FileContents));

        // Téléchargement du document orphelin -> Doit renvoyer NotFound (404) contrôlé, sans crash 500
        var orphanDlResult = await controller.Download(docOrphan.Id);
        var notFoundObj = Assert.IsType<NotFoundObjectResult>(orphanDlResult);
        Assert.Equal(404, notFoundObj.StatusCode);
    }
}
