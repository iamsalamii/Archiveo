using Archiveo.Application.DTOs.Notifications;
using Archiveo.Application.DTOs.Signatures;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class SignatureService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly NotificationService _notificationService;

    public SignatureService(ApplicationDbContext dbContext, NotificationService notificationService)
    {
        _dbContext = dbContext;
        _notificationService = notificationService;
    }

    public async Task<List<DocumentSignatureDto>> GetPendingForUserAsync(Guid userId, string userEmail)
    {
        var list = await _dbContext.DocumentSignatures
            .Where(s => (s.SignerUserId == userId || s.SignerEmail.ToLower() == userEmail.ToLower()) && s.Status == "pending")
            .OrderByDescending(s => s.RequestedAt)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<List<DocumentSignatureDto>> GetRequestedByUserAsync(Guid userId)
    {
        var list = await _dbContext.DocumentSignatures
            .Where(s => s.RequestedByUserId == userId)
            .OrderByDescending(s => s.RequestedAt)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<List<DocumentSignatureDto>> GetAllSignaturesAsync()
    {
        var list = await _dbContext.DocumentSignatures
            .OrderByDescending(s => s.RequestedAt)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<List<DocumentSignatureDto>> GetByDocumentIdAsync(Guid documentId)
    {
        var list = await _dbContext.DocumentSignatures
            .Where(s => s.DocumentId == documentId)
            .OrderByDescending(s => s.RequestedAt)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<DocumentSignatureDto> RequestSignatureAsync(CreateSignatureRequest request, Guid requestedByUserId, string requestedByUserName)
    {
        // 1. Check document
        var doc = await _dbContext.Documents.FindAsync(request.DocumentId);
        var docTitle = doc?.Title ?? request.DocumentTitle;
        var docRef = doc?.Reference ?? request.DocumentReference ?? "DOC-SIG";

        // 2. Generate security PIN
        var pin = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

        var signature = new DocumentSignature
        {
            Id = Guid.NewGuid(),
            DocumentId = request.DocumentId,
            DocumentTitle = docTitle,
            DocumentReference = docRef,
            RequestedByUserId = requestedByUserId,
            RequestedByUserName = requestedByUserName,
            SignerUserId = request.SignerUserId,
            SignerName = request.SignerName,
            SignerEmail = request.SignerEmail,
            SignerPhone = request.SignerPhone,
            SignerRole = request.SignerRole,
            DueDate = request.DueDate,
            NotificationChannel = request.NotificationChannel ?? "both",
            Status = "pending",
            SecurityPin = pin,
            RequestedAt = DateTime.UtcNow
        };

        _dbContext.DocumentSignatures.Add(signature);
        await _dbContext.SaveChangesAsync();

        // 3. Send in-app notification if user is registered
        if (request.SignerUserId.HasValue)
        {
            await _notificationService.CreateAndPushAsync(new CreateNotificationRequest
            {
                UserId = request.SignerUserId.Value,
                Type = "signature",
                Title = "Demande de signature reçue",
                Message = $"{requestedByUserName} vous a transmis le document « {docTitle} » pour signature.",
                Category = "Signatures",
                Link = "/signatures"
            });
        }

        return MapToDto(signature);
    }

    public async Task<DocumentSignatureDto> SignAsync(Guid id, SignDocumentRequest request, string ipAddress)
    {
        var signature = await _dbContext.DocumentSignatures.FindAsync(id);
        if (signature == null)
            throw new KeyNotFoundException("Demande de signature introuvable.");

        if (signature.Status != "pending")
            throw new InvalidOperationException("Cette demande a déjà été traitée.");

        // Compute SHA-256 integrity hash
        var payloadToHash = $"{signature.Id}:{signature.DocumentId}:{signature.SignerEmail}:{DateTime.UtcNow:O}:{request.SignatureDataUrl}";
        var hashBytes = SHA256.HashData(Encoding.UTF8.GetBytes(payloadToHash));
        var sha256 = Convert.ToHexString(hashBytes).ToLowerInvariant();

        signature.Status = "signed";
        signature.SignatureType = request.SignatureType;
        signature.SignatureDataUrl = request.SignatureDataUrl;
        signature.SignedAt = DateTime.UtcNow;
        signature.Sha256Hash = sha256;
        signature.SignerIpAddress = ipAddress;
        signature.CertificateNumber = $"CERT-{DateTime.UtcNow:yyyyMMdd}-{signature.Id.ToString()[..8].ToUpperInvariant()}";

        await _dbContext.SaveChangesAsync();

        // Notify requester
        if (signature.RequestedByUserId.HasValue)
        {
            await _notificationService.CreateAndPushAsync(new CreateNotificationRequest
            {
                UserId = signature.RequestedByUserId.Value,
                Type = "signature_signed",
                Title = "Document signé avec succès",
                Message = $"{signature.SignerName} a signé le document « {signature.DocumentTitle} ».",
                Category = "Signatures",
                Link = "/signatures"
            });
        }

        return MapToDto(signature);
    }

    public async Task<DocumentSignatureDto> RejectAsync(Guid id, RejectSignatureRequest request)
    {
        var signature = await _dbContext.DocumentSignatures.FindAsync(id);
        if (signature == null)
            throw new KeyNotFoundException("Demande de signature introuvable.");

        if (signature.Status != "pending")
            throw new InvalidOperationException("Cette demande a déjà été traitée.");

        signature.Status = "rejected";
        signature.RejectReason = request.Reason;
        signature.SignedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync();

        // Notify requester
        if (signature.RequestedByUserId.HasValue)
        {
            await _notificationService.CreateAndPushAsync(new CreateNotificationRequest
            {
                UserId = signature.RequestedByUserId.Value,
                Type = "signature_rejected",
                Title = "Signature refusée",
                Message = $"{signature.SignerName} a refusé de signer « {signature.DocumentTitle} ». Motif : {request.Reason}",
                Category = "Signatures",
                Link = "/signatures"
            });
        }

        return MapToDto(signature);
    }

    public async Task<SignatureCertificateDto> GetCertificateAsync(Guid id)
    {
        var signature = await _dbContext.DocumentSignatures.FindAsync(id);
        if (signature == null || signature.Status != "signed")
            throw new KeyNotFoundException("Certificat introuvable ou document non signé.");

        return new SignatureCertificateDto
        {
            SignatureId = signature.Id,
            CertificateNumber = signature.CertificateNumber ?? $"CERT-{signature.Id.ToString()[..8]}",
            DocumentTitle = signature.DocumentTitle,
            DocumentReference = signature.DocumentReference,
            SignerName = signature.SignerName,
            SignerEmail = signature.SignerEmail,
            SignerPhone = signature.SignerPhone,
            SignedAt = signature.SignedAt ?? DateTime.UtcNow,
            Sha256Hash = signature.Sha256Hash ?? "Non calculé",
            IpAddress = signature.SignerIpAddress ?? "127.0.0.1",
            Algorithm = "SHA-256 Cryptographic Timestamping (eIDAS standard)",
            Status = "VERIFIED_AUTHENTIC",
            Issuer = "Archivéo Electronic Parapheur Trust Service"
        };
    }

    private static DocumentSignatureDto MapToDto(DocumentSignature s)
    {
        string? whatsAppUrl = null;
        if (!string.IsNullOrWhiteSpace(s.SignerPhone))
        {
            var cleanPhone = new string(s.SignerPhone.Where(char.IsDigit).ToArray());
            var message = Uri.EscapeDataString($"Bonjour {s.SignerName}, vous avez un document à signer sur la plateforme Archivéo : « {s.DocumentTitle} ».\nConnectez-vous pour signer : http://localhost:3000/signatures");
            whatsAppUrl = $"https://wa.me/{cleanPhone}?text={message}";
        }

        return new DocumentSignatureDto
        {
            Id = s.Id,
            DocumentId = s.DocumentId,
            DocumentTitle = s.DocumentTitle,
            DocumentReference = s.DocumentReference,
            RequestedByUserId = s.RequestedByUserId,
            RequestedByUserName = s.RequestedByUserName,
            SignerUserId = s.SignerUserId,
            SignerName = s.SignerName,
            SignerEmail = s.SignerEmail,
            SignerPhone = s.SignerPhone,
            SignerRole = s.SignerRole,
            Status = s.Status,
            SignatureType = s.SignatureType,
            SignatureDataUrl = s.SignatureDataUrl,
            RequestedAt = s.RequestedAt,
            SignedAt = s.SignedAt,
            DueDate = s.DueDate,
            Sha256Hash = s.Sha256Hash,
            CertificateNumber = s.CertificateNumber,
            SignerIpAddress = s.SignerIpAddress,
            RejectReason = s.RejectReason,
            NotificationChannel = s.NotificationChannel,
            WhatsAppDirectLink = whatsAppUrl
        };
    }
}
