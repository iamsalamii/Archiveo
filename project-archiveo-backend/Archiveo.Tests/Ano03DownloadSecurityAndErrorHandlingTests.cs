using Archiveo.Api.Controllers;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Suite de qualification et de non-régression pour ANO-03 :
/// Sécurisation des téléchargements, respect strict des autorisations à deux niveaux,
/// distinction des erreurs HTTP (403 vs 404 vs 404 orphelin) et intégrité binaire.
/// </summary>
public class Ano03DownloadSecurityAndErrorHandlingTests : IDisposable
{
    private const string StagingConnectionString = "Host=127.0.0.1;Port=5433;Database=archiveo_staging;Username=postgres;Password=";
    private readonly ApplicationDbContext _dbContext;
    private readonly DocumentService _documentService;
    private readonly string _tempStoragePath;

    public Ano03DownloadSecurityAndErrorHandlingTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(StagingConnectionString)
            .Options;

        _dbContext = new ApplicationDbContext(options);

        _tempStoragePath = Path.Combine(Path.GetTempPath(), $"Archiveo_ANO03_Tests_{Guid.NewGuid():N}");
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
    public async Task Download_AuthorizedServiceAgent_ReceivesExactBinaryContentAndFilename()
    {
        var runId = Guid.NewGuid().ToString("N")[..8];
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            UserName = $"agent.legal.{runId}@archiveo.local",
            Email = $"agent.legal.{runId}@archiveo.local",
            FirstName = "Agent",
            LastName = "Legal",
            ServiceId = $"service-legal-{runId}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Users.Add(user);

        var docDir = Path.Combine(_tempStoragePath, "documents");
        Directory.CreateDirectory(docDir);
        var filePath = Path.Combine(docDir, $"contrat_signe_{runId}.pdf");
        var expectedBytes = Encoding.UTF8.GetBytes("%PDF-1.7 Fake PDF content for Legal service test " + runId);
        await File.WriteAllBytesAsync(filePath, expectedBytes);

        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Contrat de Partenariat Commercial",
            Reference = $"CONTRAT-{runId}",
            ServiceId = $"service-legal-{runId}",
            CreatedBy = userId,
            FilePath = filePath,
            FileName = "contrat_partenariat_2026.pdf",
            MimeType = "application/pdf",
            FileSize = expectedBytes.Length,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(userId, user.Email);

        // Act
        var result = await controller.Download(doc.Id);

        // Assert : 200 FileContentResult avec bytes exacts, mimeType et nom de fichier préservés
        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/pdf", fileResult.ContentType);
        Assert.Equal("contrat_partenariat_2026.pdf", fileResult.FileDownloadName);
        Assert.Equal(expectedBytes, fileResult.FileContents);
    }

    [Fact]
    public async Task Download_CrossServiceAgent_IsRefusedWith403Forbidden_ZeroBytesExposed()
    {
        var runId = Guid.NewGuid().ToString("N")[..8];
        var rhUserId = Guid.NewGuid();
        var rhUser = new User
        {
            Id = rhUserId,
            UserName = $"agent.rh.{runId}@archiveo.local",
            Email = $"agent.rh.{runId}@archiveo.local",
            FirstName = "Agent",
            LastName = "RH",
            ServiceId = $"service-rh-{runId}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        var financeUserId = Guid.NewGuid();
        var financeUser = new User
        {
            Id = financeUserId,
            UserName = $"agent.finance.{runId}@archiveo.local",
            Email = $"agent.finance.{runId}@archiveo.local",
            FirstName = "Agent",
            LastName = "Finance",
            ServiceId = $"service-finance-{runId}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Users.AddRange(rhUser, financeUser);

        var docDir = Path.Combine(_tempStoragePath, "documents");
        Directory.CreateDirectory(docDir);
        var filePath = Path.Combine(docDir, $"bulletin_salaire_{runId}.pdf");
        var confidentialBytes = Encoding.UTF8.GetBytes("BULLETIN DE SALAIRE TRES CONFIDENTIEL " + runId);
        await File.WriteAllBytesAsync(filePath, confidentialBytes);

        var docRh = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Bulletin de Paie Direction",
            Reference = $"PAIE-{runId}",
            ServiceId = $"service-rh-{runId}",
            CreatedBy = rhUserId,
            FilePath = filePath,
            FileName = "bulletin_paie.pdf",
            MimeType = "application/pdf",
            FileSize = confidentialBytes.Length,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(docRh);
        await _dbContext.SaveChangesAsync();

        var finController = CreateController(financeUserId, financeUser.Email);

        // Act : L'agent Finance tente de télécharger le fichier du service RH
        var result = await finController.Download(docRh.Id);

        // Assert : Rejet 403 Forbidden immédiat, aucun FileContentResult ni byte exposé
        var forbidResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, forbidResult.StatusCode);
        Assert.IsNotType<FileContentResult>(result);

        // Act 2 : L'administrateur peut légitimement télécharger
        var adminId = Guid.NewGuid();
        var adminUser = new User
        {
            Id = adminId,
            UserName = $"admin.{runId}@archiveo.local",
            Email = $"admin.{runId}@archiveo.local",
            FirstName = "Admin",
            LastName = "Global",
            ServiceId = "direction",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Users.Add(adminUser);
        await _dbContext.SaveChangesAsync();

        var adminController = CreateController(adminId, adminUser.Email, role: "Admin");
        var adminResult = await adminController.Download(docRh.Id);
        var adminFile = Assert.IsType<FileContentResult>(adminResult);
        Assert.Equal(confidentialBytes, adminFile.FileContents);
    }

    [Fact]
    public async Task Download_MissingOrInactiveDocument_Returns404NotFound()
    {
        var runId = Guid.NewGuid().ToString("N")[..8];
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            UserName = $"agent.inactive.{runId}@archiveo.local",
            Email = $"agent.inactive.{runId}@archiveo.local",
            FirstName = "Agent",
            LastName = "Test",
            ServiceId = $"service-test-{runId}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Users.Add(user);

        var inactiveDoc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Document Supprimé / Inactif",
            Reference = $"INACT-{runId}",
            ServiceId = $"service-test-{runId}",
            CreatedBy = userId,
            IsActive = false, // Inactif
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(inactiveDoc);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(userId, user.Email);

        // Act 1 : Document inactif
        var inactResult = await controller.Download(inactiveDoc.Id);
        var notFoundInact = Assert.IsType<NotFoundObjectResult>(inactResult);
        Assert.Equal(404, notFoundInact.StatusCode);

        // Act 2 : Identifiant totalement inexistant
        var randomIdResult = await controller.Download(Guid.NewGuid());
        var notFoundRandom = Assert.IsType<NotFoundObjectResult>(randomIdResult);
        Assert.Equal(404, notFoundRandom.StatusCode);
    }

    [Fact]
    public async Task Download_MissingPhysicalFile_Returns404WithExplicitStorageMessage()
    {
        var runId = Guid.NewGuid().ToString("N")[..8];
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            UserName = $"agent.orphan.{runId}@archiveo.local",
            Email = $"agent.orphan.{runId}@archiveo.local",
            FirstName = "Agent",
            LastName = "Orphan",
            ServiceId = $"service-orphan-{runId}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Users.Add(user);

        // Document enregistré en base avec un chemin pointant vers un fichier inexistant sur disque
        var missingFilePath = Path.Combine(_tempStoragePath, "documents", $"fichier_introuvable_{runId}.pdf");
        var docOrphan = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Document Fichier Manquant",
            Reference = $"ORPH-{runId}",
            ServiceId = $"service-orphan-{runId}",
            CreatedBy = userId,
            FilePath = missingFilePath, // Non créé sur disque
            FileName = "perdu.pdf",
            MimeType = "application/pdf",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(docOrphan);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(userId, user.Email);

        // Act
        var result = await controller.Download(docOrphan.Id);

        // Assert : Doit retourner 404 (sans crash 500) avec message explicite sur le fichier physique
        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(404, notFoundResult.StatusCode);

        var prop = notFoundResult.Value?.GetType().GetProperty("message");
        var message = prop?.GetValue(notFoundResult.Value)?.ToString() ?? notFoundResult.Value?.ToString();
        Assert.NotNull(message);
        Assert.Contains("Fichier physique introuvable", message);
    }
}
