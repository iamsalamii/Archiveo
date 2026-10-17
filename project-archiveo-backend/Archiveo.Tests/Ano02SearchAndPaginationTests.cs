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
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Suite de qualification et de non-régression pour ANO-02 :
/// Recherche backend sécurisée, pagination SQL, périmètre de service étanche,
/// tri déterministe et résistance aux injections/caractères spéciaux.
/// </summary>
public class Ano02SearchAndPaginationTests : IDisposable
{
    private const string StagingConnectionString = "Host=127.0.0.1;Port=5433;Database=archiveo_staging;Username=postgres;Password=";
    private readonly ApplicationDbContext _dbContext;
    private readonly DocumentService _documentService;
    private readonly string _tempStoragePath;

    public Ano02SearchAndPaginationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(StagingConnectionString)
            .Options;

        _dbContext = new ApplicationDbContext(options);

        _tempStoragePath = Path.Combine(Path.GetTempPath(), $"Archiveo_ANO02_Tests_{Guid.NewGuid():N}");
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
    public async Task Search_RhAgent_OnlySeesRhDocuments_AndTotalCountReflectsPerimeterOnly()
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
            UserName = $"agent.fin.{runId}@archiveo.local",
            Email = $"agent.fin.{runId}@archiveo.local",
            FirstName = "Agent",
            LastName = "Fin",
            ServiceId = $"service-finance-{runId}",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.AddRange(rhUser, financeUser);

        // Création de 5 documents RH et 3 documents Finance contenant le mot clé unique runId
        var keyword = $"Confidentiel_{runId}";
        var createdDocs = new List<Document>();
        for (int i = 1; i <= 5; i++)
        {
            createdDocs.Add(new Document
            {
                Id = Guid.NewGuid(),
                Title = $"Dossier {keyword} RH {i}",
                Reference = $"RH-{runId}-{i:D2}",
                Description = "Contrat de travail et paie",
                TypeId = "type-contrat",
                CategoryId = "cat-rh",
                ServiceId = $"service-rh-{runId}",
                StatusId = "status-actif",
                CreatedBy = rhUserId,
                CreatedAt = DateTime.UtcNow.AddMinutes(-i),
                IsActive = true
            });
        }

        for (int i = 1; i <= 3; i++)
        {
            createdDocs.Add(new Document
            {
                Id = Guid.NewGuid(),
                Title = $"Dossier {keyword} Finance {i}",
                Reference = $"FIN-{runId}-{i:D2}",
                Description = "Bilan et fiscalité",
                TypeId = "type-bilan",
                CategoryId = "cat-fin",
                ServiceId = $"service-finance-{runId}",
                CreatedBy = financeUserId,
                CreatedAt = DateTime.UtcNow.AddMinutes(-i),
                IsActive = true
            });
        }

        _dbContext.Documents.AddRange(createdDocs);
        await _dbContext.SaveChangesAsync();

        var rhController = CreateController(rhUserId, rhUser.Email);

        // Act 1 : Recherche RH sur le mot-clé
        var rhAction = await rhController.Search(new DocumentSearchRequest
        {
            Query = keyword,
            Page = 1,
            PageSize = 10
        });

        // Assert 1 : L'agent RH ne voit que ses 5 documents RH, totalCount = 5
        var okRh = Assert.IsType<OkObjectResult>(rhAction);
        var resultRh = Assert.IsType<PagedResult<DocumentDto>>(okRh.Value);
        Assert.Equal(5, resultRh.TotalCount);
        Assert.Equal(5, resultRh.Items.Count);
        Assert.All(resultRh.Items, item => Assert.Equal($"service-rh-{runId}", item.ServiceId));
        Assert.DoesNotContain(resultRh.Items, item => item.ServiceId == $"service-finance-{runId}");

        // Act 2 : Tentative de falsification de paramètre par l'agent RH (ServiceId = finance)
        var tamperingAction = await rhController.Search(new DocumentSearchRequest
        {
            Query = keyword,
            ServiceId = $"service-finance-{runId}",
            Page = 1,
            PageSize = 10
        });

        // Assert 2 : Rejet immédiat vers liste vide (0 résultats, 0 énumération)
        var okTamper = Assert.IsType<OkObjectResult>(tamperingAction);
        var resultTamper = Assert.IsType<PagedResult<DocumentDto>>(okTamper.Value);
        Assert.Equal(0, resultTamper.TotalCount);
        Assert.Empty(resultTamper.Items);

        // Act 3 : Agent Finance recherche le mot-clé
        var finController = CreateController(financeUserId, financeUser.Email);
        var finAction = await finController.Search(new DocumentSearchRequest
        {
            Query = keyword,
            Page = 1,
            PageSize = 10
        });

        var okFin = Assert.IsType<OkObjectResult>(finAction);
        var resultFin = Assert.IsType<PagedResult<DocumentDto>>(okFin.Value);
        Assert.Equal(3, resultFin.TotalCount);
        Assert.Equal(3, resultFin.Items.Count);
        Assert.All(resultFin.Items, item => Assert.Equal($"service-finance-{runId}", item.ServiceId));
    }

    [Fact]
    public async Task Search_Admin_CanSearchTransversally_OrFilterByService()
    {
        var runId = Guid.NewGuid().ToString("N")[..8];
        var adminUserId = Guid.NewGuid();
        var adminUser = new User
        {
            Id = adminUserId,
            UserName = $"admin.{runId}@archiveo.local",
            Email = $"admin.{runId}@archiveo.local",
            FirstName = "Super",
            LastName = "Admin",
            ServiceId = "direction-generale",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Users.Add(adminUser);

        var serviceAlpha = $"serv-alpha-{runId}";
        var serviceBeta = $"serv-beta-{runId}";
        var keyword = $"Transversal_{runId}";

        _dbContext.Documents.AddRange(
            new Document
            {
                Id = Guid.NewGuid(),
                Title = $"Doc {keyword} Alpha",
                Reference = $"ALPH-{runId}-01",
                ServiceId = serviceAlpha,
                CreatedBy = adminUserId,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            },
            new Document
            {
                Id = Guid.NewGuid(),
                Title = $"Doc {keyword} Beta",
                Reference = $"BETA-{runId}-01",
                ServiceId = serviceBeta,
                CreatedBy = adminUserId,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            }
        );
        await _dbContext.SaveChangesAsync();

        var adminController = CreateController(adminUserId, adminUser.Email, role: "Admin");

        // Act 1 : Admin transversal sans filtre de service
        var actionAll = await adminController.Search(new DocumentSearchRequest
        {
            Query = keyword,
            Page = 1,
            PageSize = 10
        });
        var okAll = Assert.IsType<OkObjectResult>(actionAll);
        var resAll = Assert.IsType<PagedResult<DocumentDto>>(okAll.Value);
        Assert.Equal(2, resAll.TotalCount);
        Assert.Contains(resAll.Items, d => d.ServiceId == serviceAlpha);
        Assert.Contains(resAll.Items, d => d.ServiceId == serviceBeta);

        // Act 2 : Admin filtrant explicitement sur Alpha
        var actionAlpha = await adminController.Search(new DocumentSearchRequest
        {
            Query = keyword,
            ServiceId = serviceAlpha,
            Page = 1,
            PageSize = 10
        });
        var okAlpha = Assert.IsType<OkObjectResult>(actionAlpha);
        var resAlpha = Assert.IsType<PagedResult<DocumentDto>>(okAlpha.Value);
        Assert.Equal(1, resAlpha.TotalCount);
        Assert.Single(resAlpha.Items);
        Assert.Equal(serviceAlpha, resAlpha.Items[0].ServiceId);
    }

    [Fact]
    public async Task Search_PaginationAndPageLimits_AreEnforcedDeterministically()
    {
        var runId = Guid.NewGuid().ToString("N")[..8];
        var testService = $"serv-pages-{runId}";
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            UserName = $"agent.pages.{runId}@archiveo.local",
            Email = $"agent.pages.{runId}@archiveo.local",
            FirstName = "Agent",
            LastName = "Pages",
            ServiceId = testService,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Users.Add(user);

        var keyword = $"PagItem_{runId}";

        // Créer 7 documents avec des dates distinctes
        for (int i = 1; i <= 7; i++)
        {
            _dbContext.Documents.Add(new Document
            {
                Id = Guid.NewGuid(),
                Title = $"{keyword} {i:D2}",
                Reference = $"PAG-{runId}-{i:D2}",
                ServiceId = testService,
                CreatedBy = userId,
                CreatedAt = new DateTime(2026, 10, 1, 10, 0, 0, DateTimeKind.Utc).AddMinutes(i),
                IsActive = true
            });
        }
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(userId, user.Email);

        // Page 1, taille 3 -> doit retourner items 7, 6, 5 (tri DESC déterministe)
        var p1Action = await controller.Search(new DocumentSearchRequest
        {
            Query = keyword,
            Page = 1,
            PageSize = 3,
            SortBy = "createdAt",
            SortDirection = "desc"
        });
        var p1Res = Assert.IsType<PagedResult<DocumentDto>>(Assert.IsType<OkObjectResult>(p1Action).Value);
        Assert.Equal(7, p1Res.TotalCount);
        Assert.Equal(3, p1Res.Items.Count);
        Assert.Equal(3, p1Res.TotalPages);
        Assert.False(p1Res.HasPreviousPage);
        Assert.True(p1Res.HasNextPage);
        Assert.Equal($"{keyword} 07", p1Res.Items[0].Title);
        Assert.Equal($"{keyword} 06", p1Res.Items[1].Title);
        Assert.Equal($"{keyword} 05", p1Res.Items[2].Title);

        // Page 2, taille 3 -> doit retourner items 4, 3, 2
        var p2Action = await controller.Search(new DocumentSearchRequest
        {
            Query = keyword,
            Page = 2,
            PageSize = 3,
            SortBy = "createdAt",
            SortDirection = "desc"
        });
        var p2Res = Assert.IsType<PagedResult<DocumentDto>>(Assert.IsType<OkObjectResult>(p2Action).Value);
        Assert.Equal(7, p2Res.TotalCount);
        Assert.Equal(3, p2Res.Items.Count);
        Assert.True(p2Res.HasPreviousPage);
        Assert.True(p2Res.HasNextPage);
        Assert.Equal($"{keyword} 04", p2Res.Items[0].Title);
        Assert.Equal($"{keyword} 03", p2Res.Items[1].Title);
        Assert.Equal($"{keyword} 02", p2Res.Items[2].Title);

        // Page 3, taille 3 -> doit retourner item 1 (dernière page)
        var p3Action = await controller.Search(new DocumentSearchRequest
        {
            Query = keyword,
            Page = 3,
            PageSize = 3,
            SortBy = "createdAt",
            SortDirection = "desc"
        });
        var p3Res = Assert.IsType<PagedResult<DocumentDto>>(Assert.IsType<OkObjectResult>(p3Action).Value);
        Assert.Equal(7, p3Res.TotalCount);
        Assert.Single(p3Res.Items);
        Assert.True(p3Res.HasPreviousPage);
        Assert.False(p3Res.HasNextPage);
        Assert.Equal($"{keyword} 01", p3Res.Items[0].Title);

        // Vérification de la limitation maximale de PageSize (clampé à 100)
        var pMaxAction = await controller.Search(new DocumentSearchRequest
        {
            Query = keyword,
            Page = -5, // Doit être redressé à 1
            PageSize = 9999 // Doit être clampé à 100
        });
        var pMaxRes = Assert.IsType<PagedResult<DocumentDto>>(Assert.IsType<OkObjectResult>(pMaxAction).Value);
        Assert.Equal(1, pMaxRes.Page);
        Assert.Equal(100, pMaxRes.PageSize);
    }

    [Fact]
    public async Task Search_SpecialCharactersAndEmptyQueries_HandledGracefully()
    {
        var runId = Guid.NewGuid().ToString("N")[..8];
        var testService = $"serv-special-{runId}";
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            UserName = $"agent.special.{runId}@archiveo.local",
            Email = $"agent.special.{runId}@archiveo.local",
            FirstName = "Agent",
            LastName = "Special",
            ServiceId = testService,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Users.Add(user);

        var refCode = $"REF_100%_{runId}";
        var specialDoc = new Document
        {
            Id = Guid.NewGuid(),
            Title = $"Rapport 100% Validé / Clôturé [Urgent] & Sécurisé (v1.0) {runId}",
            Reference = refCode,
            Description = $"Notes d'audit: l'agent a dit \"OK\"! {runId}",
            ServiceId = testService,
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };
        _dbContext.Documents.Add(specialDoc);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(userId, user.Email);

        // Test 1 : Recherche avec '%'
        var resPercent = await controller.Search(new DocumentSearchRequest { Query = "100%" });
        var okPercent = Assert.IsType<PagedResult<DocumentDto>>(Assert.IsType<OkObjectResult>(resPercent).Value);
        Assert.True(okPercent.TotalCount >= 1);
        Assert.Contains(okPercent.Items, d => d.Reference == refCode);

        // Test 2 : Recherche avec apostrophe et guillemets
        var resQuote = await controller.Search(new DocumentSearchRequest { Query = "l'agent" });
        var okQuote = Assert.IsType<PagedResult<DocumentDto>>(Assert.IsType<OkObjectResult>(resQuote).Value);
        Assert.True(okQuote.TotalCount >= 1);

        // Test 3 : Recherche vide -> retourne tous les documents du service
        var resEmpty = await controller.Search(new DocumentSearchRequest { Query = "   " });
        var okEmpty = Assert.IsType<PagedResult<DocumentDto>>(Assert.IsType<OkObjectResult>(resEmpty).Value);
        Assert.True(okEmpty.TotalCount >= 1);
        Assert.All(okEmpty.Items, d => Assert.Equal(testService, d.ServiceId));

        // Test 4 : Terme inexistant -> 0 résultats
        var resNone = await controller.Search(new DocumentSearchRequest { Query = $"TermeIntrouvable_{runId}_123456789" });
        var okNone = Assert.IsType<PagedResult<DocumentDto>>(Assert.IsType<OkObjectResult>(resNone).Value);
        Assert.Equal(0, okNone.TotalCount);
        Assert.Empty(okNone.Items);
    }
}
