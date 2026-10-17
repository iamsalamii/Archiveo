using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Signatures;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Archiveo.Infrastructure.Seeding;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

public class StagingIntegrationTests : IDisposable
{
    private readonly ApplicationDbContext _dbContext;
    private readonly SignatureService _signatureService;
    private readonly NotificationService _notificationService;
    private readonly PermissionAuthorizationHandler _permissionHandler;

    public StagingIntegrationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"Staging_Isolated_{Guid.NewGuid()}")
            .Options;

        _dbContext = new ApplicationDbContext(options);
        _notificationService = new NotificationService(_dbContext, null!);
        _signatureService = new SignatureService(_dbContext, _notificationService);
        _permissionHandler = new PermissionAuthorizationHandler(_dbContext);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    [Fact]
    public async Task Staging_AuthenticationAndTokenClaims_AreProperlyEvaluated()
    {
        await Task.CompletedTask;
        // 1. Simuler un token utilisateur standard
        var userId = Guid.NewGuid();

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, "stage.user@archiveo-test.local"),
            new Claim(ClaimTypes.Name, "Staging User"),
            new Claim(ClaimTypes.Role, "Archiviste")
        };
        var identity = new ClaimsIdentity(claims, "Bearer");
        var principal = new ClaimsPrincipal(identity);

        Assert.True(principal.Identity?.IsAuthenticated);
        Assert.Equal(userId.ToString(), principal.FindFirstValue(ClaimTypes.NameIdentifier));
        Assert.Equal("stage.user@archiveo-test.local", principal.FindFirstValue(ClaimTypes.Email));
        Assert.True(principal.IsInRole("Archiviste"));
        Assert.False(principal.IsInRole("Admin"));
    }

    [Fact]
    public async Task Staging_PermissionAuthorizationHandler_EnforcesRBACPipeline()
    {
        var requirement = new PermissionRequirement("signatures.read");

        // Cas 1 : Admin réussit immédiatement
        var adminPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Role, "Admin")
        }, "Bearer"));

        var adminContext = new AuthorizationHandlerContext(new[] { requirement }, adminPrincipal, null);
        await _permissionHandler.HandleAsync(adminContext);
        Assert.True(adminContext.HasSucceeded);

        // Cas 2 : Utilisateur sans permission échoue
        var regularUserId = Guid.NewGuid();
        var regularPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, regularUserId.ToString()),
            new Claim(ClaimTypes.Role, "User")
        }, "Bearer"));

        var regularContext = new AuthorizationHandlerContext(new[] { requirement }, regularPrincipal, null);
        await _permissionHandler.HandleAsync(regularContext);
        Assert.False(regularContext.HasSucceeded);

        // Cas 3 : Utilisateur avec rôle doté de la permission réussit
        var auditorId = Guid.NewGuid();
        var role = new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = "Auditeur", NormalizedName = "AUDITEUR" };
        var perm = new Permission { Id = Guid.NewGuid(), Code = "signatures.read", Name = "Lecture Signatures", Module = "Signatures" };
        var rolePerm = new RolePermission { RoleId = role.Id, PermissionId = perm.Id };
        var userRole = new IdentityUserRole<Guid> { UserId = auditorId, RoleId = role.Id };

        _dbContext.Roles.Add(role);
        _dbContext.Permissions.Add(perm);
        _dbContext.RolePermissions.Add(rolePerm);
        _dbContext.UserRoles.Add(userRole);
        await _dbContext.SaveChangesAsync();

        var auditorPrincipal = new ClaimsPrincipal(new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, auditorId.ToString()),
            new Claim(ClaimTypes.Role, "Auditeur")
        }, "Bearer"));

        var auditorContext = new AuthorizationHandlerContext(new[] { requirement }, auditorPrincipal, null);
        await _permissionHandler.HandleAsync(auditorContext);
        Assert.True(auditorContext.HasSucceeded);
    }

    [Fact]
    public async Task Staging_FullSignatureLifecycle_RequestSignCertificateVerify()
    {
        // 1. Ingestion d'un document test synthétique
        var docOwnerId = Guid.NewGuid();
        var signerId = Guid.NewGuid();
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Accord-Cadre de Prestation Staging",
            Reference = "STG-2026-DOC-001",
            CreatedBy = docOwnerId,
            ServiceId = "JURIDIQUE",
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        // 2. Création de la demande de signature (RequestSignature)
        var createRequest = new CreateSignatureRequest
        {
            DocumentId = doc.Id,
            DocumentTitle = doc.Title,
            DocumentReference = doc.Reference,
            SignerUserId = signerId,
            SignerName = "Directeur Juridique",
            SignerEmail = "juridique@archiveo-test.local",
            SignerRole = "Signataire Autorisé"
        };

        var requestedDto = await _signatureService.RequestSignatureAsync(
            createRequest,
            docOwnerId,
            "Responsable Achats",
            "achats@archiveo-test.local",
            isAdmin: false);

        Assert.Equal("pending", requestedDto.Status);
        Assert.NotEqual(Guid.Empty, requestedDto.Id);

        // 3. Apposition de la signature par le signataire désigné (Sign)
        var signRequest = new SignDocumentRequest
        {
            SignatureType = "drawing",
            SignatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        };

        var signedDto = await _signatureService.SignAsync(
            requestedDto.Id,
            signRequest,
            "10.0.0.15",
            signerId,
            "juridique@archiveo-test.local",
            isAdmin: false);

        Assert.Equal("signed", signedDto.Status);
        Assert.False(string.IsNullOrWhiteSpace(signedDto.Sha256Hash));
        Assert.StartsWith("CERT-", signedDto.CertificateNumber!);

        // 4. Consultation du certificat cryptographique sécurisé
        var cert = await _signatureService.GetCertificateSecuredAsync(
            requestedDto.Id,
            signerId,
            "juridique@archiveo-test.local",
            isAdmin: false);

        Assert.Equal(signedDto.CertificateNumber, cert.CertificateNumber);
        Assert.Equal("VERIFIED_AUTHENTIC", cert.Status);
        Assert.Equal(signedDto.Sha256Hash, cert.Sha256Hash);

        // 5. Vérification publique eIDAS (preuve opposable sans PII)
        var publicVerification = await _signatureService.VerifySignaturePublicAsync(requestedDto.Id);
        Assert.True(publicVerification.Exists);
        Assert.NotNull(publicVerification.Proof);
        Assert.True(publicVerification.Proof.IsAuthentic);
        Assert.Equal(signedDto.Sha256Hash, publicVerification.Proof.Sha256Hash);
        Assert.Equal("STG-2026-DOC-001", publicVerification.Proof.DocumentReference);
    }

    [Fact]
    public async Task Staging_DatabaseSeeding_IsIdempotentAndContainsSignaturesRead()
    {
        // Exécution 1 du seed des permissions
        await PermissionSeeder.SeedAsync(_dbContext);

        var countFirst = await _dbContext.Permissions.CountAsync();
        var sigPermFirst = await _dbContext.Permissions.FirstOrDefaultAsync(p => p.Code == "signatures.read");
        Assert.NotNull(sigPermFirst);
        Assert.Equal("signatures", sigPermFirst.Module, ignoreCase: true);

        // Exécution 2 (idempotence)
        await PermissionSeeder.SeedAsync(_dbContext);
        var countSecond = await _dbContext.Permissions.CountAsync();

        Assert.Equal(countFirst, countSecond);
    }
}

