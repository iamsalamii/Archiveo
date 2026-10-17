using Archiveo.Api.Controllers;
using Archiveo.Application.DTOs.Documents;
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
/// Suite de validation et de qualification stricte pour la remédiation ANO-01.
/// Vérifie le cloisonnement étanche des documents selon le périmètre de service,
/// la conformité des codes HTTP (403 Forbidden vs 404 Not Found), l'exclusion SQL des listes
/// et la non-régression des accès légitimes (Admin et agents du service).
/// </summary>
public class Ano01RemediationVerificationTests : IDisposable
{
    private const string StagingConnectionString = "Host=127.0.0.1;Port=5433;Database=archiveo_staging;Username=postgres;Password=";
    private readonly ApplicationDbContext _dbContext;
    private readonly DocumentService _documentService;
    private readonly string _tempStoragePath;

    public Ano01RemediationVerificationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(StagingConnectionString)
            .Options;

        _dbContext = new ApplicationDbContext(options);

        _tempStoragePath = Path.Combine(Path.GetTempPath(), $"Archiveo_ANO01_Remediation_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempStoragePath);
        Environment.SetEnvironmentVariable("ARCHIVEO_STORAGE_PATH", _tempStoragePath);

        var httpContextAccessor = new HttpContextAccessor();
        _documentService = new DocumentService(_dbContext, httpContextAccessor);
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
        catch { }
    }

    private DocumentsController CreateController(Guid userId, string email, string role = "User")
    {
        var controller = new DocumentsController(_documentService);
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

    [Fact]
    public async Task Ano01_CrossServiceEnforcement_RefusesFinanceAgentAndAllowsRhAndAdmin()
    {
        var userRhId = Guid.NewGuid();
        var userFinanceId = Guid.NewGuid();
        var userNoServiceId = Guid.NewGuid();
        var adminId = Guid.NewGuid();

        // 1. Enregistrement des utilisateurs faisant autorité en base PostgreSQL
        var userRh = new User
        {
            Id = userRhId,
            UserName = "agent.rh.rem@archiveo.local",
            Email = "agent.rh.rem@archiveo.local",
            ServiceId = "SERVICE_RH",
            FirstName = "Agent",
            LastName = "RH",
            IsActive = true
        };
        var userFinance = new User
        {
            Id = userFinanceId,
            UserName = "agent.finance.rem@archiveo.local",
            Email = "agent.finance.rem@archiveo.local",
            ServiceId = "SERVICE_FINANCE",
            FirstName = "Agent",
            LastName = "Finance",
            IsActive = true
        };
        var userNoService = new User
        {
            Id = userNoServiceId,
            UserName = "agent.sans.service@archiveo.local",
            Email = "agent.sans.service@archiveo.local",
            ServiceId = null,
            FirstName = "Agent",
            LastName = "SansService",
            IsActive = true
        };
        var userAdmin = new User
        {
            Id = adminId,
            UserName = "admin.rem@archiveo.local",
            Email = "admin.rem@archiveo.local",
            ServiceId = "DIRECTION",
            FirstName = "Super",
            LastName = "Admin",
            IsActive = true
        };
        _dbContext.Users.AddRange(userRh, userFinance, userNoService, userAdmin);

        // 2. Création d'un document confidentiel RH avec fichier binaire réel
        var physicalDir = Path.Combine(_tempStoragePath, "documents");
        Directory.CreateDirectory(physicalDir);
        var physicalFilePath = Path.Combine(physicalDir, $"{Guid.NewGuid():N}.pdf");
        await File.WriteAllTextAsync(physicalFilePath, "RH CONFIDENTIAL DOSSIER CONTENT");

        var docRh = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Dossier Disciplinaire RH 2026",
            Reference = $"RH-DISC-{Guid.NewGuid():N}"[..20],
            Description = "Enquête interne confidentielle",
            ServiceId = "SERVICE_RH",
            CreatedBy = userRhId,
            FilePath = physicalFilePath,
            FileName = "dossier_disciplinaire.pdf",
            MimeType = "application/pdf",
            FileSize = 31,
            Version = 1,
            StatusId = "BROUILLON",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        // Document inactif / supprimé
        var docInactive = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Document Supprimé",
            Reference = $"INACT-{Guid.NewGuid():N}"[..20],
            ServiceId = "SERVICE_RH",
            CreatedBy = userRhId,
            IsActive = false,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Documents.AddRange(docRh, docInactive);
        await _dbContext.SaveChangesAsync();

        var ctrlFinance = CreateController(userFinanceId, "agent.finance.rem@archiveo.local", "User");
        var ctrlRh = CreateController(userRhId, "agent.rh.rem@archiveo.local", "User");
        var ctrlNoService = CreateController(userNoServiceId, "agent.sans.service@archiveo.local", "User");
        var ctrlAdmin = CreateController(adminId, "admin.rem@archiveo.local", "Admin");

        // =====================================================================
        // TEST 1 : LISTES ET RECHERCHE (GET /api/documents)
        // =====================================================================
        // Agent Finance : Ne doit JAMAIS voir le document RH
        var financeListResult = Assert.IsType<OkObjectResult>(await ctrlFinance.GetAll());
        var financeDocs = Assert.IsAssignableFrom<IEnumerable<DocumentDto>>(financeListResult.Value);
        Assert.DoesNotContain(financeDocs, d => d.Id == docRh.Id);

        // Agent Sans Service : Reçoit une liste vide
        var noServiceListResult = Assert.IsType<OkObjectResult>(await ctrlNoService.GetAll());
        var noServiceDocs = Assert.IsAssignableFrom<IEnumerable<DocumentDto>>(noServiceListResult.Value);
        Assert.DoesNotContain(noServiceDocs, d => d.Id == docRh.Id);

        // Agent RH légitime : Voit le document de son service
        var rhListResult = Assert.IsType<OkObjectResult>(await ctrlRh.GetAll());
        var rhDocs = Assert.IsAssignableFrom<IEnumerable<DocumentDto>>(rhListResult.Value);
        Assert.Contains(rhDocs, d => d.Id == docRh.Id);

        // Admin : Voit les documents transversaux
        var adminListResult = Assert.IsType<OkObjectResult>(await ctrlAdmin.GetAll());
        var adminDocs = Assert.IsAssignableFrom<IEnumerable<DocumentDto>>(adminListResult.Value);
        Assert.Contains(adminDocs, d => d.Id == docRh.Id);

        // =====================================================================
        // TEST 2 : ACCÈS UNITAIRE (GET /api/documents/{id})
        // =====================================================================
        // Agent Finance -> 403 Forbidden
        var financeGetById = await ctrlFinance.GetById(docRh.Id);
        var forbiddenGetById = Assert.IsType<ObjectResult>(financeGetById);
        Assert.Equal(403, forbiddenGetById.StatusCode);

        // Document Inexistant -> 404 Not Found
        var notFoundGet = await ctrlFinance.GetById(Guid.NewGuid());
        var notFoundObj = Assert.IsType<NotFoundObjectResult>(notFoundGet);
        Assert.Equal(404, notFoundObj.StatusCode);

        // Document Inactif -> 404 Not Found
        var inactiveGet = await ctrlRh.GetById(docInactive.Id);
        Assert.IsType<NotFoundObjectResult>(inactiveGet);

        // Agent RH légitime -> 200 OK
        var rhGetById = await ctrlRh.GetById(docRh.Id);
        var okRhGet = Assert.IsType<OkObjectResult>(rhGetById);
        var docDto = Assert.IsType<DocumentDto>(okRhGet.Value);
        Assert.Equal("Dossier Disciplinaire RH 2026", docDto.Title);

        // Admin -> 200 OK
        var adminGetById = await ctrlAdmin.GetById(docRh.Id);
        Assert.IsType<OkObjectResult>(adminGetById);

        // =====================================================================
        // TEST 3 : TÉLÉCHARGEMENT BINAIRE (GET /api/documents/{id}/download)
        // =====================================================================
        // Agent Finance -> 403 Forbidden (aucun octet transmis)
        var financeDl = await ctrlFinance.Download(docRh.Id);
        var forbiddenDl = Assert.IsType<ObjectResult>(financeDl);
        Assert.Equal(403, forbiddenDl.StatusCode);

        // Agent RH légitime -> 200 FileContentResult
        var rhDl = await ctrlRh.Download(docRh.Id);
        var fileResult = Assert.IsType<FileContentResult>(rhDl);
        Assert.Equal("application/pdf", fileResult.ContentType);
        Assert.Equal("RH CONFIDENTIAL DOSSIER CONTENT", Encoding.UTF8.GetString(fileResult.FileContents));

        // =====================================================================
        // TEST 4 : VERSIONS ET SNAPSHOTS (GET /api/documents/{id}/versions)
        // =====================================================================
        // Agent Finance -> 403 Forbidden
        var financeVersions = await ctrlFinance.GetVersions(docRh.Id);
        var forbiddenVer = Assert.IsType<ObjectResult>(financeVersions);
        Assert.Equal(403, forbiddenVer.StatusCode);

        // Agent RH légitime -> 200 OK
        var rhVersions = await ctrlRh.GetVersions(docRh.Id);
        Assert.IsType<OkObjectResult>(rhVersions);

        // =====================================================================
        // TEST 5 : MODIFICATION MÉTADONNÉES (PUT /api/documents/{id})
        // =====================================================================
        var updateReq = new UpdateDocumentRequest
        {
            Title = "Tentative piratage par Finance",
            ServiceId = "SERVICE_RH"
        };
        // Agent Finance -> 403 Forbidden
        var financeUpdate = await ctrlFinance.Update(docRh.Id, updateReq);
        var forbiddenUpd = Assert.IsType<ObjectResult>(financeUpdate);
        Assert.Equal(403, forbiddenUpd.StatusCode);

        // =====================================================================
        // TEST 6 : CRÉATION DE VERSION (POST /api/documents/{id}/versions)
        // =====================================================================
        // Agent Finance -> 403 Forbidden
        var financeNewVer = await ctrlFinance.CreateVersion(docRh.Id, updateReq, null);
        var forbiddenNewVer = Assert.IsType<ObjectResult>(financeNewVer);
        Assert.Equal(403, forbiddenNewVer.StatusCode);

        // =====================================================================
        // TEST 7 : VALIDATION DE CIRCUIT (POST /api/documents/{id}/validate)
        // =====================================================================
        // Agent Finance -> 403 Forbidden
        var financeValidate = await ctrlFinance.Validate(docRh.Id);
        var forbiddenVal = Assert.IsType<ObjectResult>(financeValidate);
        Assert.Equal(403, forbiddenVal.StatusCode);

        // =====================================================================
        // TEST 8 : ARCHIVAGE / DÉSARCHIVAGE (POST /api/documents/{id}/archive)
        // =====================================================================
        // Agent Finance -> 403 Forbidden
        var financeArchive = await ctrlFinance.Archive(docRh.Id);
        var forbiddenArc = Assert.IsType<ObjectResult>(financeArchive);
        Assert.Equal(403, forbiddenArc.StatusCode);

        var financeUnarchive = await ctrlFinance.Unarchive(docRh.Id);
        var forbiddenUnarc = Assert.IsType<ObjectResult>(financeUnarchive);
        Assert.Equal(403, forbiddenUnarc.StatusCode);

        // =====================================================================
        // TEST 9 : SUPPRESSION LOGIQUE (DELETE /api/documents/{id})
        // =====================================================================
        // Agent Finance -> 403 Forbidden
        var financeDelete = await ctrlFinance.Delete(docRh.Id);
        var forbiddenDel = Assert.IsType<ObjectResult>(financeDelete);
        Assert.Equal(403, forbiddenDel.StatusCode);

        // Le document RH est toujours actif en base
        var docCheck = await _dbContext.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == docRh.Id);
        Assert.NotNull(docCheck);
        Assert.True(docCheck.IsActive);

        // =====================================================================
        // TEST 10 : CRÉATION AVEC FORGERIE DE SERVICEID (POST /api/documents)
        // =====================================================================
        // Agent Finance tente de créer un document en assignant ServiceId = "SERVICE_RH"
        var createForgedReq = new CreateDocumentRequest
        {
            Title = "Document Forgé",
            ServiceId = "SERVICE_RH",
            TypeId = "NOTE",
            CategoryId = "ADMIN"
        };
        var forgedCreateResult = await ctrlFinance.Create(createForgedReq, null);
        var forbiddenCreate = Assert.IsType<ObjectResult>(forgedCreateResult);
        Assert.Equal(403, forbiddenCreate.StatusCode);

        // Agent RH crée légitimement un document pour son service
        var createRhReq = new CreateDocumentRequest
        {
            Title = "Compte Rendu CSE RH",
            ServiceId = "SERVICE_RH",
            TypeId = "PV",
            CategoryId = "RH"
        };
        var validRhCreate = await ctrlRh.Create(createRhReq, null);
        var createdResult = Assert.IsType<CreatedAtActionResult>(validRhCreate);
        var createdDoc = Assert.IsType<DocumentDto>(createdResult.Value);
        Assert.Equal("SERVICE_RH", createdDoc.ServiceId);

        // =====================================================================
        // TEST 11 : SUPPRESSION LÉGITIME PAR L'AGENT RH DU SERVICE
        // =====================================================================
        var rhDelete = await ctrlRh.Delete(createdDoc.Id);
        Assert.IsType<NoContentResult>(rhDelete);

        var deletedCheck = await _dbContext.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == createdDoc.Id);
        Assert.NotNull(deletedCheck);
        Assert.False(deletedCheck.IsActive);
    }
}
