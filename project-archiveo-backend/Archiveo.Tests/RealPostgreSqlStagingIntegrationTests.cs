using Archiveo.Application.DTOs.Signatures;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Archiveo.Infrastructure.Seeding;
using Archiveo.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Tests d'intégration exécutés DIRECTEMENT contre l'instance réelle PostgreSQL 18
/// isolée pour l'environnement de staging (Port 5433, base archiveo_staging).
/// </summary>
public class RealPostgreSqlStagingIntegrationTests : IDisposable
{
    private const string StagingConnectionString = "Host=127.0.0.1;Port=5433;Database=archiveo_staging;Username=postgres;Password=";
    private readonly ApplicationDbContext _dbContext;
    private readonly SignatureService _signatureService;
    private readonly NotificationService _notificationService;

    public RealPostgreSqlStagingIntegrationTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(StagingConnectionString)
            .Options;

        _dbContext = new ApplicationDbContext(options);
        _notificationService = new NotificationService(_dbContext, null!);
        _signatureService = new SignatureService(_dbContext, _notificationService);
    }

    public void Dispose()
    {
        _dbContext.Dispose();
    }

    [Fact]
    public async Task RealPostgres_1_SchemaAndConnection_IsHealthy()
    {
        var canConnect = await _dbContext.Database.CanConnectAsync();
        Assert.True(canConnect, "La connexion à l'instance réelle PostgreSQL 18 staging a échoué.");

        var appliedMigrations = (await _dbContext.Database.GetAppliedMigrationsAsync()).ToList();
        Assert.NotEmpty(appliedMigrations);
        Assert.Contains("20261015143142_AddCompositeIndexesForPerformance", appliedMigrations);
        Assert.Contains("20260823224502_AddDocumentSignatures", appliedMigrations);
    }

    [Fact]
    public async Task RealPostgres_2_IdempotentPermissionSeeding()
    {
        // 1. Premier passage du seed
        await PermissionSeeder.SeedAsync(_dbContext);

        var permCountFirst = await _dbContext.Permissions.CountAsync();
        var sigReadPerm = await _dbContext.Permissions.FirstOrDefaultAsync(p => p.Code == "signatures.read");
        Assert.NotNull(sigReadPerm);
        Assert.Equal("signatures", sigReadPerm.Module, ignoreCase: true);

        // 2. Deuxième passage (vérification stricte de l'idempotence sur PostgreSQL)
        await PermissionSeeder.SeedAsync(_dbContext);
        var permCountSecond = await _dbContext.Permissions.CountAsync();

        Assert.Equal(permCountFirst, permCountSecond);
    }

    [Fact]
    public async Task RealPostgres_3_DocumentPersistenceAndReading()
    {
        var docId = Guid.NewGuid();
        var doc = new Document
        {
            Id = docId,
            Title = "Contrat Archivage Numérique Staging",
            Reference = $"STG-REAL-DOC-{Guid.NewGuid():N}"[..25],
            ServiceId = "ARCHIVES_NATIONALES",
            CreatedBy = Guid.NewGuid(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        // Relecture depuis la base réelle avec un contexte déconnecté
        var loadedDoc = await _dbContext.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == docId);
        Assert.NotNull(loadedDoc);
        Assert.Equal(doc.Title, loadedDoc.Title);
        Assert.Equal(doc.Reference, loadedDoc.Reference);
        Assert.Equal("ARCHIVES_NATIONALES", loadedDoc.ServiceId);
        Assert.True(loadedDoc.IsActive);
    }

    [Fact]
    public async Task RealPostgres_4_FullSignatureLifecycle_RequestSignCertificateVerify()
    {
        var ownerId = Guid.NewGuid();
        var signerId = Guid.NewGuid();

        // 1. Création document réel
        var doc = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Convention Partenariale Souveraine",
            Reference = $"STG-SIG-{Guid.NewGuid():N}"[..20],
            ServiceId = "DIRECTION_JURIDIQUE",
            CreatedBy = ownerId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(doc);
        await _dbContext.SaveChangesAsync();

        // 2. Demande de signature
        var request = new CreateSignatureRequest
        {
            DocumentId = doc.Id,
            DocumentTitle = doc.Title,
            DocumentReference = doc.Reference,
            SignerUserId = signerId,
            SignerName = "Directeur Général",
            SignerEmail = "dg.staging@archiveo.local",
            SignerRole = "Représentant Légal"
        };

        var signatureDto = await _signatureService.RequestSignatureAsync(
            request,
            ownerId,
            "Responsable Conformité",
            "conformite.staging@archiveo.local",
            isAdmin: false);

        Assert.NotNull(signatureDto);
        Assert.Equal("pending", signatureDto.Status);

        // 3. Signature effective avec scellement SHA-256
        var signRequest = new SignDocumentRequest
        {
            SignatureType = "drawing",
            SignatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        };

        var signedDto = await _signatureService.SignAsync(
            signatureDto.Id,
            signRequest,
            "192.168.100.55",
            signerId,
            "dg.staging@archiveo.local",
            isAdmin: false);

        Assert.Equal("signed", signedDto.Status);
        Assert.False(string.IsNullOrWhiteSpace(signedDto.Sha256Hash));
        Assert.StartsWith("CERT-", signedDto.CertificateNumber!);

        // 4. Consultation sécurisée du certificat
        var certificate = await _signatureService.GetCertificateSecuredAsync(
            signatureDto.Id,
            signerId,
            "dg.staging@archiveo.local",
            isAdmin: false);

        Assert.NotNull(certificate);
        Assert.Equal("VERIFIED_AUTHENTIC", certificate.Status);
        Assert.Equal(signedDto.Sha256Hash, certificate.Sha256Hash);

        // 5. Preuve publique eIDAS opposable
        var publicProof = await _signatureService.VerifySignaturePublicAsync(signatureDto.Id);
        Assert.True(publicProof.Exists);
        Assert.NotNull(publicProof.Proof);
        Assert.True(publicProof.Proof.IsAuthentic);
        Assert.Equal(signedDto.Sha256Hash, publicProof.Proof.Sha256Hash);

        // 6. Vérification directe en base PostgreSQL
        var inDb = await _dbContext.DocumentSignatures.AsNoTracking().FirstOrDefaultAsync(s => s.Id == signatureDto.Id);
        Assert.NotNull(inDb);
        Assert.Equal("signed", inDb.Status);
        Assert.Equal(signedDto.Sha256Hash, inDb.Sha256Hash);
        Assert.Equal("192.168.100.55", inDb.SignerIpAddress);
    }

    [Fact]
    public async Task RealPostgres_5_MultiUserAndServiceAccessControls()
    {
        var ownerServiceRhId = Guid.NewGuid();
        var intruderServiceFinanceId = Guid.NewGuid();

        // Document RH confidentiel
        var docRh = new Document
        {
            Id = Guid.NewGuid(),
            Title = "Grille des Rémunérations Direction",
            Reference = $"RH-CONF-{Guid.NewGuid():N}"[..20],
            ServiceId = "SERVICE_RH",
            CreatedBy = ownerServiceRhId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _dbContext.Documents.Add(docRh);
        await _dbContext.SaveChangesAsync();

        // L'intrus tente d'accéder aux signatures du document RH
        var accessCheckIntruder = await _signatureService.GetByDocumentIdSecuredAsync(
            docRh.Id,
            intruderServiceFinanceId,
            "intruder@finance.archiveo.local",
            isAdmin: false);

        Assert.False(accessCheckIntruder.IsAuthorized, "Un utilisateur hors périmètre de service ne doit pas avoir accès.");
        Assert.Null(accessCheckIntruder.Signatures);

        // L'administrateur système a accès
        var accessCheckAdmin = await _signatureService.GetByDocumentIdSecuredAsync(
            docRh.Id,
            Guid.NewGuid(),
            "admin@archiveo.local",
            isAdmin: true);

        Assert.True(accessCheckAdmin.IsAuthorized, "L'administrateur système doit avoir accès.");
    }

    [Fact]
    public async Task RealPostgres_6_TransactionsAndConstraints_AtomicityEnforced()
    {
        var initialDocCount = await _dbContext.Documents.CountAsync();

        // Tentative d'insertion transactionnelle avec échec intentionnel
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
        {
            await using var tx = await _dbContext.Database.BeginTransactionAsync();

            _dbContext.Documents.Add(new Document
            {
                Id = Guid.NewGuid(),
                Title = "Document Transac 1",
                Reference = $"TX-TEST-{Guid.NewGuid():N}"[..20],
                CreatedBy = Guid.NewGuid(),
                IsActive = true
            });
            await _dbContext.SaveChangesAsync();

            // Erreur simulée avant commit
            throw new InvalidOperationException("Simulation incident transactionnel.");
        });

        // Le nombre de documents ne doit pas avoir changé (Rollback PostgreSQL effectif)
        var finalDocCount = await _dbContext.Documents.CountAsync();
        Assert.Equal(initialDocCount, finalDocCount);
    }
}
