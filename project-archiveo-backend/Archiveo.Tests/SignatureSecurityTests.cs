using Archiveo.Api.Controllers;
using Archiveo.Application.DTOs.Signatures;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

public class SignatureSecurityTests : IDisposable
{
    private readonly ApplicationDbContext _dbContext;
    private readonly SignatureService _signatureService;
    private readonly NotificationService _notificationService;

    public SignatureSecurityTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"Archiveo_Test_{Guid.NewGuid()}")
            .Options;

        _dbContext = new ApplicationDbContext(options);
        _notificationService = new NotificationService(_dbContext, null!);
        _signatureService = new SignatureService(_dbContext, _notificationService);
    }

    public void Dispose()
    {
        _dbContext.Database.EnsureDeleted();
        _dbContext.Dispose();
    }

    private SignaturesController CreateUnauthenticatedController()
    {
        var controller = new SignaturesController(_signatureService);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity()) }
        };
        return controller;
    }

    private async Task GrantPermissionToUserAsync(Guid userId, string permissionCode)
    {
        var role = new IdentityRole<Guid> { Id = Guid.NewGuid(), Name = $"Role_{permissionCode}", NormalizedName = $"ROLE_{permissionCode.ToUpperInvariant()}" };
        var perm = new Permission { Id = Guid.NewGuid(), Code = permissionCode, Name = permissionCode, Module = "Signatures" };
        var rolePerm = new RolePermission { RoleId = role.Id, PermissionId = perm.Id };
        var userRole = new IdentityUserRole<Guid> { UserId = userId, RoleId = role.Id };

        _dbContext.Roles.Add(role);
        _dbContext.Permissions.Add(perm);
        _dbContext.RolePermissions.Add(rolePerm);
        _dbContext.UserRoles.Add(userRole);
        await _dbContext.SaveChangesAsync();
    }


    private SignaturesController CreateController(Guid userId, string email, string role = "User")
    {
        var controller = new SignaturesController(_signatureService);
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Role, role)
        };
        var identity = new ClaimsIdentity(claims, "TestAuth");
        var principal = new ClaimsPrincipal(identity);

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = principal }
        };

        return controller;
    }

    [Fact]
    public async Task GetSignaturesByDocument_WhenDocumentDoesNotExist_ReturnsNotFound()
    {
        var userId = Guid.NewGuid();
        var controller = CreateController(userId, "user@archiveo.com");

        var result = await controller.GetSignaturesByDocument(Guid.NewGuid());

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(404, notFoundResult.StatusCode);
    }

    [Fact]
    public async Task GetSignaturesByDocument_WhenUserIsUnauthorizedThirdParty_ReturnsForbidden()
    {
        var ownerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();

        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Contrat Confidentiel RH",
            Reference = "RH-2026-001",
            CreatedBy = ownerId,
            ServiceId = "SERVICE_RH",
            IsActive = true
        };
        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(attackerId, "attacker@archiveo.com");
        var result = await controller.GetSignaturesByDocument(doc.Id);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetSignaturesByDocument_WhenUserIsCreator_ReturnsOk()
    {
        var ownerId = Guid.NewGuid();
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "PV de Réunion Direction",
            Reference = "DIR-2026-001",
            CreatedBy = ownerId,
            ServiceId = "DIRECTION",
            IsActive = true
        };
        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(ownerId, "director@archiveo.com");
        var result = await controller.GetSignaturesByDocument(doc.Id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
    }

    [Fact]
    public async Task GetSignaturesByDocument_WhenUserIsAdmin_ReturnsOk()
    {
        var adminId = Guid.NewGuid();
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Document Restreint",
            Reference = "DOC-SEC-01",
            CreatedBy = Guid.NewGuid(),
            ServiceId = "FINANCE",
            IsActive = true
        };
        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(adminId, "admin@archiveo.com", role: "Admin");
        var result = await controller.GetSignaturesByDocument(doc.Id);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
    }

    [Fact]
    public async Task GetCertificate_WhenSignatureNotSignedOrDoesNotExist_ReturnsNotFound()
    {
        var controller = CreateController(Guid.NewGuid(), "user@archiveo.com");
        var result = await controller.GetCertificate(Guid.NewGuid());

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(404, notFoundResult.StatusCode);
    }

    [Fact]
    public async Task GetCertificate_WhenThirdPartyTriesToReadCertificate_ReturnsForbidden()
    {
        var signerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        var signatureId = Guid.NewGuid();

        var signature = new DocumentSignature
        {
            Id = signatureId,
            DocumentId = Guid.NewGuid(),
            DocumentTitle = "Bilan Financier Q3",
            SignerUserId = signerId,
            SignerEmail = "signer@archiveo.com",
            SignerName = "M. Le Directeur",
            Status = "signed",
            SignedAt = DateTime.UtcNow,
            Sha256Hash = "abc123hash",
            SignerIpAddress = "192.168.1.10"
        };
        _dbContext.DocumentSignatures.Add(signature);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(attackerId, "attacker@archiveo.com");
        var result = await controller.GetCertificate(signatureId);

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetCertificate_WhenSignerReadsCertificate_ReturnsOkWithDetails()
    {
        var signerId = Guid.NewGuid();
        var signatureId = Guid.NewGuid();

        var signature = new DocumentSignature
        {
            Id = signatureId,
            DocumentId = Guid.NewGuid(),
            DocumentTitle = "Bilan Financier Q3",
            SignerUserId = signerId,
            SignerEmail = "signer@archiveo.com",
            SignerName = "M. Le Directeur",
            Status = "signed",
            SignedAt = DateTime.UtcNow,
            Sha256Hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            SignerIpAddress = "192.168.1.10"
        };
        _dbContext.DocumentSignatures.Add(signature);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(signerId, "signer@archiveo.com");
        var result = await controller.GetCertificate(signatureId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
        var cert = Assert.IsType<SignatureCertificateDto>(okResult.Value);
        Assert.Equal("Bilan Financier Q3", cert.DocumentTitle);
        Assert.Equal(signature.Sha256Hash, cert.Sha256Hash);
    }

    [Fact]
    public async Task SignDocument_WhenUnauthorizedUserAttemptsSign_ReturnsForbidden()
    {
        var designatedSignerId = Guid.NewGuid();
        var impostorId = Guid.NewGuid();
        var signatureId = Guid.NewGuid();

        var signature = new DocumentSignature
        {
            Id = signatureId,
            DocumentId = Guid.NewGuid(),
            DocumentTitle = "Ordre de Virement",
            SignerUserId = designatedSignerId,
            SignerEmail = "cfo@archiveo.com",
            SignerName = "Directeur Financier",
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        };
        _dbContext.DocumentSignatures.Add(signature);
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(impostorId, "impostor@archiveo.com");
        var result = await controller.SignDocument(signatureId, new SignDocumentRequest
        {
            SignatureType = "drawing",
            SignatureDataUrl = "data:image/png;base64,fake"
        });

        var objectResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, objectResult.StatusCode);
    }

    [Fact]
    public async Task GetAllSignatures_WhenUnauthenticated_ReturnsUnauthorized()
    {
        var controller = CreateUnauthenticatedController();
        var result = await controller.GetAllSignatures();

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal(401, unauthorizedResult.StatusCode);
    }

    [Fact]
    public async Task GetAllSignatures_WhenUserLacksSignaturesReadPermission_ReturnsForbidden()
    {
        var userId = Guid.NewGuid();
        var controller = CreateController(userId, "simpleuser@archiveo.com");

        var result = await controller.GetAllSignatures();

        var forbiddenResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, forbiddenResult.StatusCode);
    }

    [Fact]
    public async Task GetAllSignatures_WhenUserHasSignaturesReadPermission_ReturnsOk()
    {
        var auditorId = Guid.NewGuid();
        await GrantPermissionToUserAsync(auditorId, "signatures.read");

        _dbContext.DocumentSignatures.Add(new DocumentSignature
        {
            Id = Guid.NewGuid(),
            DocumentId = Guid.NewGuid(),
            DocumentTitle = "Rapport Trimestriel",
            SignerName = "Auditeur",
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(auditorId, "auditor@archiveo.com");
        var result = await controller.GetAllSignatures();

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
        var list = Assert.IsType<List<DocumentSignatureDto>>(okResult.Value);
        Assert.NotEmpty(list);
    }

    [Fact]
    public async Task GetAllSignatures_WhenUserIsAdmin_ReturnsOk()
    {
        var adminId = Guid.NewGuid();
        var controller = CreateController(adminId, "admin@archiveo.com", role: "Admin");

        var result = await controller.GetAllSignatures();

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);
    }

    [Fact]
    public async Task GetSignatureById_WhenUnauthenticated_ReturnsUnauthorized()
    {
        var controller = CreateUnauthenticatedController();
        var result = await controller.GetSignatureById(Guid.NewGuid());

        var unauthorizedResult = Assert.IsType<UnauthorizedObjectResult>(result);
        Assert.Equal(401, unauthorizedResult.StatusCode);
    }

    [Fact]
    public async Task GetSignatureById_WhenSignatureNotFound_ReturnsNotFound()
    {
        var controller = CreateController(Guid.NewGuid(), "user@archiveo.com");
        var result = await controller.GetSignatureById(Guid.NewGuid());

        var notFoundResult = Assert.IsType<NotFoundObjectResult>(result);
        Assert.Equal(404, notFoundResult.StatusCode);
    }

    [Fact]
    public async Task GetSignatureById_WhenThirdPartyWithoutPermission_ReturnsForbidden()
    {
        var signerId = Guid.NewGuid();
        var attackerId = Guid.NewGuid();
        var sigId = Guid.NewGuid();

        _dbContext.DocumentSignatures.Add(new DocumentSignature
        {
            Id = sigId,
            DocumentId = Guid.NewGuid(),
            DocumentTitle = "Contrat Fournisseur",
            SignerUserId = signerId,
            SignerEmail = "signer@archiveo.com",
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync();

        var controller = CreateController(attackerId, "attacker@archiveo.com");
        var result = await controller.GetSignatureById(sigId);

        var forbiddenResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(403, forbiddenResult.StatusCode);
    }

    [Fact]
    public async Task GetSignatureById_WhenDesignatedSignerOrAdmin_ReturnsOk()
    {
        var signerId = Guid.NewGuid();
        var sigId = Guid.NewGuid();

        _dbContext.DocumentSignatures.Add(new DocumentSignature
        {
            Id = sigId,
            DocumentId = Guid.NewGuid(),
            DocumentTitle = "Contrat Cadre",
            SignerUserId = signerId,
            SignerEmail = "signer@archiveo.com",
            SignerName = "Signataire Officiel",
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync();

        // 1. Signataire désigné
        var signerController = CreateController(signerId, "signer@archiveo.com");
        var signerResult = await signerController.GetSignatureById(sigId);
        var okResult = Assert.IsType<OkObjectResult>(signerResult);
        Assert.Equal(200, okResult.StatusCode);
        var dto = Assert.IsType<DocumentSignatureDto>(okResult.Value);
        Assert.Equal("Contrat Cadre", dto.DocumentTitle);

        // 2. Administrateur
        var adminController = CreateController(Guid.NewGuid(), "admin@archiveo.com", role: "Admin");
        var adminResult = await adminController.GetSignatureById(sigId);
        Assert.Equal(200, Assert.IsType<OkObjectResult>(adminResult).StatusCode);
    }

    [Fact]
    public async Task VerifySignaturePublic_WhenNotFoundOrNotSigned_ReturnsNotFound()
    {
        var controller = CreateUnauthenticatedController();

        // Non existant
        var notFoundResult = await controller.VerifySignaturePublic(Guid.NewGuid());
        Assert.Equal(404, Assert.IsType<NotFoundObjectResult>(notFoundResult).StatusCode);

        // Existant mais en attente (non encore signé)
        var pendingId = Guid.NewGuid();
        _dbContext.DocumentSignatures.Add(new DocumentSignature
        {
            Id = pendingId,
            DocumentId = Guid.NewGuid(),
            DocumentTitle = "Brouillon Accord",
            Status = "pending",
            RequestedAt = DateTime.UtcNow
        });
        await _dbContext.SaveChangesAsync();

        var pendingResult = await controller.VerifySignaturePublic(pendingId);
        Assert.Equal(404, Assert.IsType<NotFoundObjectResult>(pendingResult).StatusCode);
    }

    [Fact]
    public async Task VerifySignaturePublic_WhenSigned_ReturnsOkWithStrictPublicProofWithoutConfidentialData()
    {
        var controller = CreateUnauthenticatedController();
        var sigId = Guid.NewGuid();
        var signature = new DocumentSignature
        {
            Id = sigId,
            DocumentId = Guid.NewGuid(),
            DocumentTitle = "Acte Notarié Numérisé",
            DocumentReference = "REF-2026-ACTE-99",
            SignerUserId = Guid.NewGuid(),
            SignerName = "Me Dupond",
            SignerEmail = "notaire.secret@etude-dupond.fr",
            SignerPhone = "+33699887766",
            SignerIpAddress = "192.168.10.45",
            SignatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
            SecurityPin = "849201",
            CertificateNumber = "CERT-2026-ACTE-99",
            Sha256Hash = "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
            Status = "signed",
            SignedAt = DateTime.UtcNow
        };
        _dbContext.DocumentSignatures.Add(signature);
        await _dbContext.SaveChangesAsync();

        var result = await controller.VerifySignaturePublic(sigId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(200, okResult.StatusCode);

        var proof = Assert.IsType<SignaturePublicProofDto>(okResult.Value);
        Assert.True(proof.IsAuthentic);
        Assert.Equal(sigId, proof.SignatureId);
        Assert.Equal("CERT-2026-ACTE-99", proof.CertificateNumber);
        Assert.Equal("REF-2026-ACTE-99", proof.DocumentReference);
        Assert.Equal("Acte Notarié Numérisé", proof.DocumentTitle);
        Assert.Equal(signature.Sha256Hash, proof.Sha256Hash);

        // CONTRAT DE CONFIDENTIALITÉ :
        // La preuve publique ne contient AUCUNE propriété sensible du signataire (téléphone, IP, email, PIN, biométrie)
        var proofType = typeof(SignaturePublicProofDto);
        Assert.Null(proofType.GetProperty("SignerPhone"));
        Assert.Null(proofType.GetProperty("SignerIpAddress"));
        Assert.Null(proofType.GetProperty("SignerEmail"));
        Assert.Null(proofType.GetProperty("SecurityPin"));
        Assert.Null(proofType.GetProperty("SignatureDataUrl"));
    }
}

