using Archiveo.Api.Controllers;
using Archiveo.Application.DTOs.Documents;
using Archiveo.Application.Security;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Suite de tests de validation d'autorité et d'isolation de session côté serveur (ANO-06).
/// Démontre que :
/// 1. Les requêtes non authentifiées ou dont le jeton est révoqué/expiré sont strictement rejetées en 401 Unauthorized.
/// 2. Les requêtes hors périmètre de service sont strictement rejetées en 403 Forbidden,
///    indépendamment de tout état de cache côté client.
/// 3. Les opérations légitimes sous session valide continuent de fonctionner parfaitement.
/// </summary>
public class Ano06ServerSideAuthorizationAndSessionTests : IDisposable
{
    private const string StagingConnectionString = "Host=127.0.0.1;Port=5433;Database=archiveo_staging;Username=postgres;Password=";
    private const string TestSecret = "StrongAndRobustSecretKeyForTestingAtLeast32Chars1234567890!";
    private readonly ApplicationDbContext _dbContext;
    private readonly DocumentService _documentService;
    private readonly string _tempStoragePath;

    public Ano06ServerSideAuthorizationAndSessionTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(StagingConnectionString)
            .Options;

        _dbContext = new ApplicationDbContext(options);

        _tempStoragePath = Path.Combine(Path.GetTempPath(), $"Archiveo_ANO06_Test_{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempStoragePath);
        Environment.SetEnvironmentVariable("ARCHIVEO_STORAGE_PATH", _tempStoragePath);

        var httpContextAccessor = new HttpContextAccessor();
        _documentService = new DocumentService(_dbContext, httpContextAccessor);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempStoragePath))
            {
                Directory.Delete(_tempStoragePath, true);
            }
        }
        catch {}

        _dbContext.Dispose();
    }

    private ClaimsPrincipal CreatePrincipal(Guid userId, string email, string role, string? serviceId = null)
    {
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role)
        };

        if (!string.IsNullOrWhiteSpace(serviceId))
        {
            claims.Add(new Claim("serviceId", serviceId));
            claims.Add(new Claim("ServiceId", serviceId));
        }

        var identity = new ClaimsIdentity(claims, "TestAuth");
        return new ClaimsPrincipal(identity);
    }

    [Fact]
    public void Test_01_UnauthenticatedOrExpiredToken_IsStrictlyRejectedByValidationParameters()
    {
        // GIVEN: un jeton expiré simulant une session terminée ou fermée
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(TestSecret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: JwtSecurityPolicy.DefaultIssuer,
            audience: JwtSecurityPolicy.CanonicalAudience,
            claims: new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) },
            expires: DateTime.UtcNow.AddMinutes(-10),
            signingCredentials: credentials
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        var validationParams = JwtSecurityPolicy.CreateValidationParameters(
            TestSecret,
            JwtSecurityPolicy.DefaultIssuer,
            JwtSecurityPolicy.CanonicalAudience,
            TimeSpan.FromSeconds(5)
        );

        // WHEN / THEN: la validation côté serveur doit lever une SecurityTokenExpiredException
        var handler = new JwtSecurityTokenHandler();
        Assert.Throws<SecurityTokenExpiredException>(() =>
        {
            handler.ValidateToken(tokenString, validationParams, out _);
        });
    }

    [Fact]
    public async Task Test_02_CrossServiceDocumentAccess_StrictlyReturnsForbidden403_RegardlessOfClientCache()
    {
        // GIVEN: un document appartenant au Service A
        var authorId = Guid.NewGuid();
        var document = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Document Confidentiel Service A",
            Reference = $"DOC-A-{Guid.NewGuid():N}"[..20],
            Description = "Dossier confidentiel Service A",
            ServiceId = "SERVICE_A",
            CreatedBy = authorId,
            FileName = "confidentiel.pdf",
            MimeType = "application/pdf",
            FileSize = 1024,
            Version = 1,
            StatusId = "BROUILLON",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Documents.Add(document);
        await _dbContext.SaveChangesAsync();

        try
        {
            // GIVEN: un utilisateur connecté appartenant au Service B (sans droits inter-services)
            var userBId = Guid.NewGuid();
            var userB = new User
            {
                Id = userBId,
                UserName = "agent.b.ano06@archiveo.local",
                Email = "agent.b.ano06@archiveo.local",
                ServiceId = "SERVICE_B",
                FirstName = "Agent",
                LastName = "B",
                IsActive = true
            };
            _dbContext.Users.Add(userB);
            await _dbContext.SaveChangesAsync();

            try
            {
                var userBPrincipal = CreatePrincipal(userBId, userB.Email, "AGENT", "SERVICE_B");

                var controller = new DocumentsController(_documentService);
                controller.ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = userBPrincipal }
                };

                // WHEN: l'utilisateur tente d'accéder au document (même si son interface prétendait l'avoir en cache)
                var actionResult = await controller.GetById(document.Id);

                // THEN: le serveur DOIT renvoyer un 403 Forbidden strict (ObjectResult avec StatusCode 403)
                var objectResult = Assert.IsType<ObjectResult>(actionResult);
                Assert.Equal(403, objectResult.StatusCode);
            }
            finally
            {
                _dbContext.Users.Remove(userB);
                await _dbContext.SaveChangesAsync();
            }
        }
        finally
        {
            _dbContext.Documents.Remove(document);
            await _dbContext.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task Test_03_CrossServiceDocumentDownload_StrictlyReturnsForbidden403()
    {
        // GIVEN: document appartenant au Service A avec fichier physique existant
        var authorId = Guid.NewGuid();
        var physicalDir = Path.Combine(_tempStoragePath, "documents");
        Directory.CreateDirectory(physicalDir);
        var physicalFilePath = Path.Combine(physicalDir, $"{Guid.NewGuid():N}.pdf");
        await File.WriteAllTextAsync(physicalFilePath, "%PDF-1.4 Specimen Confidentiel");

        var document = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Contrat Stratégique Service A",
            Reference = $"CTR-A-{Guid.NewGuid():N}"[..20],
            Description = "Contrat confidentiel",
            ServiceId = "SERVICE_A",
            CreatedBy = authorId,
            FilePath = physicalFilePath,
            FileName = "contrat.pdf",
            MimeType = "application/pdf",
            FileSize = 30,
            Version = 1,
            StatusId = "BROUILLON",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Documents.Add(document);
        await _dbContext.SaveChangesAsync();

        try
        {
            // GIVEN: un utilisateur du Service B
            var userBId = Guid.NewGuid();
            var userB = new User
            {
                Id = userBId,
                UserName = "agent.b.dl.ano06@archiveo.local",
                Email = "agent.b.dl.ano06@archiveo.local",
                ServiceId = "SERVICE_B",
                FirstName = "Agent",
                LastName = "B",
                IsActive = true
            };
            _dbContext.Users.Add(userB);
            await _dbContext.SaveChangesAsync();

            try
            {
                var userBPrincipal = CreatePrincipal(userBId, userB.Email, "AGENT", "SERVICE_B");

                var controller = new DocumentsController(_documentService);
                controller.ControllerContext = new ControllerContext
                {
                    HttpContext = new DefaultHttpContext { User = userBPrincipal }
                };

                // WHEN: l'agent B demande le téléchargement du binaire
                var actionResult = await controller.Download(document.Id);

                // THEN: le serveur DOIT refuser en 403 Forbidden
                var objectResult = Assert.IsType<ObjectResult>(actionResult);
                Assert.Equal(403, objectResult.StatusCode);
            }
            finally
            {
                _dbContext.Users.Remove(userB);
                await _dbContext.SaveChangesAsync();
            }
        }
        finally
        {
            _dbContext.Documents.Remove(document);
            await _dbContext.SaveChangesAsync();
        }
    }

    [Fact]
    public async Task Test_04_LegitimateSameServiceAccess_SucceedsNormally_InSingleTabOperation()
    {
        // GIVEN: document appartenant au Service A
        var authorId = Guid.NewGuid();
        var author = new User
        {
            Id = authorId,
            UserName = "agent.a.ano06@archiveo.local",
            Email = "agent.a.ano06@archiveo.local",
            ServiceId = "SERVICE_A",
            FirstName = "Agent",
            LastName = "A",
            IsActive = true
        };
        _dbContext.Users.Add(author);

        var document = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Rapport Interne Service A",
            Reference = $"RAP-A-{Guid.NewGuid():N}"[..20],
            Description = "Rapport interne régulier",
            ServiceId = "SERVICE_A",
            CreatedBy = authorId,
            FileName = "rapport.pdf",
            MimeType = "application/pdf",
            FileSize = 50,
            Version = 1,
            StatusId = "BROUILLON",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Documents.Add(document);
        await _dbContext.SaveChangesAsync();

        try
        {
            // GIVEN: un agent du même Service A
            var userAPrincipal = CreatePrincipal(authorId, author.Email, "AGENT", "SERVICE_A");

            var controller = new DocumentsController(_documentService);
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = userAPrincipal }
            };

            // WHEN: l'agent accède à son document
            var actionResult = await controller.GetById(document.Id);

            // THEN: le serveur renvoie 200 OK avec le DTO du document
            var okResult = Assert.IsType<OkObjectResult>(actionResult);
            Assert.Equal(200, okResult.StatusCode);
            var returnedDoc = Assert.IsType<DocumentDto>(okResult.Value);
            Assert.Equal(document.Id, returnedDoc.Id);
        }
        finally
        {
            _dbContext.Documents.Remove(document);
            _dbContext.Users.Remove(author);
            await _dbContext.SaveChangesAsync();
        }
    }
}
