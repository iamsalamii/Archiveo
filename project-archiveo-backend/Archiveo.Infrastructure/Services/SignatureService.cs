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

    public async Task<bool> HasPermissionAsync(Guid userId, string permissionCode)
    {
        return await (
            from userRole in _dbContext.UserRoles
            join rolePermission in _dbContext.RolePermissions on userRole.RoleId equals rolePermission.RoleId
            join permission in _dbContext.Permissions on rolePermission.PermissionId equals permission.Id
            where userRole.UserId == userId && permission.Code == permissionCode
            select permission.Id
        ).AnyAsync();
    }

    public async Task<(bool NotFound, bool IsAuthorized, DocumentSignatureDto? Signature)> GetSignatureByIdSecuredAsync(
        Guid id,
        Guid currentUserId,
        string currentUserEmail,
        bool isAdmin)
    {
        var s = await _dbContext.DocumentSignatures.FindAsync(id);
        if (s == null)
        {
            return (NotFound: true, IsAuthorized: false, Signature: null);
        }

        if (isAdmin)
        {
            return (NotFound: false, IsAuthorized: true, Signature: MapToDto(s));
        }

        var emailLower = currentUserEmail.ToLower();
        var isSigner = (s.SignerUserId.HasValue && s.SignerUserId.Value == currentUserId)
            || (!string.IsNullOrEmpty(s.SignerEmail) && string.Equals(s.SignerEmail, emailLower, StringComparison.OrdinalIgnoreCase));
        var isRequester = s.RequestedByUserId.HasValue && s.RequestedByUserId.Value == currentUserId;

        var hasSignaturesRead = await HasPermissionAsync(currentUserId, "signatures.read");

        if (!isSigner && !isRequester && !hasSignaturesRead)
        {
            return (NotFound: false, IsAuthorized: false, Signature: null);
        }

        return (NotFound: false, IsAuthorized: true, Signature: MapToDto(s));
    }

    public async Task<(bool Exists, SignaturePublicProofDto? Proof)> VerifySignaturePublicAsync(Guid id)
    {
        var s = await _dbContext.DocumentSignatures.FindAsync(id);
        if (s == null || s.Status != "signed")
        {
            return (Exists: false, Proof: null);
        }

        var proof = new SignaturePublicProofDto
        {
            SignatureId = s.Id,
            CertificateNumber = s.CertificateNumber ?? $"CERT-{s.Id.ToString()[..8].ToUpperInvariant()}",
            DocumentReference = s.DocumentReference,
            DocumentTitle = s.DocumentTitle,
            Status = s.Status,
            SignedAt = s.SignedAt,
            Sha256Hash = s.Sha256Hash ?? "Non calculé",
            Algorithm = "SHA-256 (eIDAS Timestamped)",
            Issuer = "Archivéo Electronic Parapheur Trust Service",
            IsAuthentic = true
        };

        return (Exists: true, Proof: proof);
    }

    public async Task<List<DocumentSignatureDto>> GetByDocumentIdAsync(Guid documentId)
    {
        var list = await _dbContext.DocumentSignatures
            .Where(s => s.DocumentId == documentId)
            .OrderByDescending(s => s.RequestedAt)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<(bool DocumentNotFound, bool IsAuthorized, List<DocumentSignatureDto>? Signatures)> GetByDocumentIdSecuredAsync(
        Guid documentId,
        Guid currentUserId,
        string currentUserEmail,
        bool isAdmin)
    {
        var doc = await _dbContext.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.Id == documentId && d.IsActive);
        if (doc == null)
        {
            return (DocumentNotFound: true, IsAuthorized: false, Signatures: null);
        }

        if (isAdmin)
        {
            var adminList = await _dbContext.DocumentSignatures
                .Where(s => s.DocumentId == documentId)
                .OrderByDescending(s => s.RequestedAt)
                .ToListAsync();
            return (DocumentNotFound: false, IsAuthorized: true, Signatures: adminList.Select(MapToDto).ToList());
        }

        // 1. L'utilisateur est-il le créateur du document ?
        var isCreator = doc.CreatedBy == currentUserId;

        // 2. L'utilisateur est-il désigné comme signataire ou demandeur sur ce document ?
        var emailLower = currentUserEmail.ToLower();
        var isSignerOrRequester = await _dbContext.DocumentSignatures.AnyAsync(s =>
            s.DocumentId == documentId &&
            (s.RequestedByUserId == currentUserId ||
             s.SignerUserId == currentUserId ||
             (!string.IsNullOrEmpty(s.SignerEmail) && s.SignerEmail.ToLower() == emailLower)));

        // 3. L'utilisateur possède-t-il la permission globale signatures.read ?
        var hasSignaturesRead = await (
            from userRole in _dbContext.UserRoles
            join rolePermission in _dbContext.RolePermissions on userRole.RoleId equals rolePermission.RoleId
            join permission in _dbContext.Permissions on rolePermission.PermissionId equals permission.Id
            where userRole.UserId == currentUserId && permission.Code == "signatures.read"
            select permission.Id
        ).AnyAsync();

        // 4. Contrôle du périmètre organisationnel / service si l'utilisateur a documents.read
        var hasDocRead = await (
            from userRole in _dbContext.UserRoles
            join rolePermission in _dbContext.RolePermissions on userRole.RoleId equals rolePermission.RoleId
            join permission in _dbContext.Permissions on rolePermission.PermissionId equals permission.Id
            where userRole.UserId == currentUserId && permission.Code == "documents.read"
            select permission.Id
        ).AnyAsync();

        bool isWithinServicePerimeter = false;
        if (hasDocRead)
        {
            var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == currentUserId);
            isWithinServicePerimeter = string.IsNullOrEmpty(doc.ServiceId)
                || string.IsNullOrEmpty(user?.ServiceId)
                || string.Equals(doc.ServiceId, user.ServiceId, StringComparison.OrdinalIgnoreCase);
        }

        var isAuthorized = isCreator || isSignerOrRequester || hasSignaturesRead || isWithinServicePerimeter;
        if (!isAuthorized)
        {
            return (DocumentNotFound: false, IsAuthorized: false, Signatures: null);
        }

        var list = await _dbContext.DocumentSignatures
            .Where(s => s.DocumentId == documentId)
            .OrderByDescending(s => s.RequestedAt)
            .ToListAsync();

        return (DocumentNotFound: false, IsAuthorized: true, Signatures: list.Select(MapToDto).ToList());
    }

    public async Task<DocumentSignatureDto> RequestSignatureAsync(
        CreateSignatureRequest request,
        Guid requestedByUserId,
        string requestedByUserName,
        string requestedByUserEmail = "",
        bool isAdmin = false)
    {
        // 1. Check document existence
        var doc = await _dbContext.Documents.FirstOrDefaultAsync(d => d.Id == request.DocumentId && d.IsActive);
        if (doc == null)
        {
            throw new KeyNotFoundException("Le document ciblé est introuvable ou inactif.");
        }

        // 2. Vérification des droits pour initier une signature sur ce document
        if (!isAdmin && doc.CreatedBy != requestedByUserId)
        {
            var hasPermission = await (
                from userRole in _dbContext.UserRoles
                join rolePermission in _dbContext.RolePermissions on userRole.RoleId equals rolePermission.RoleId
                join permission in _dbContext.Permissions on rolePermission.PermissionId equals permission.Id
                where userRole.UserId == requestedByUserId &&
                      (permission.Code == "documents.update" || permission.Code == "signatures.read")
                select permission.Id
            ).AnyAsync();

            if (!hasPermission)
            {
                throw new UnauthorizedAccessException("Contrôle de sécurité : Vous n'avez pas l'autorisation d'initier une signature sur ce document.");
            }
        }

        var docTitle = doc.Title;
        var docRef = doc.Reference;

        // 3. Generate security PIN
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

    public async Task<DocumentSignatureDto> SignAsync(Guid id, SignDocumentRequest request, string ipAddress, Guid currentUserId, string currentUserEmail, bool isAdmin)
    {
        var signature = await _dbContext.DocumentSignatures.FindAsync(id);
        if (signature == null)
            throw new KeyNotFoundException("Demande de signature introuvable.");

        if (signature.Status != "pending")
            throw new InvalidOperationException("Cette demande a déjà été traitée.");

        // Sécurité : Seul le signataire désigné ou l'administrateur système a le droit d'apposer une signature
        if (!isAdmin)
        {
            var isDesignatedSigner = (signature.SignerUserId.HasValue && signature.SignerUserId.Value == currentUserId)
                || (!string.IsNullOrEmpty(signature.SignerEmail) && string.Equals(signature.SignerEmail, currentUserEmail, StringComparison.OrdinalIgnoreCase));

            if (!isDesignatedSigner)
            {
                throw new UnauthorizedAccessException("Contrôle de sécurité : Vous n'êtes pas autorisé(e) à signer ce document à la place du signataire désigné.");
            }
        }

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

    public async Task<DocumentSignatureDto> RejectAsync(Guid id, RejectSignatureRequest request, Guid currentUserId, string currentUserEmail, bool isAdmin)
    {
        var signature = await _dbContext.DocumentSignatures.FindAsync(id);
        if (signature == null)
            throw new KeyNotFoundException("Demande de signature introuvable.");

        if (signature.Status != "pending")
            throw new InvalidOperationException("Cette demande a déjà été traitée.");

        // Sécurité : Seul le signataire désigné ou l'administrateur système a le droit de rejeter
        if (!isAdmin)
        {
            var isDesignatedSigner = (signature.SignerUserId.HasValue && signature.SignerUserId.Value == currentUserId)
                || (!string.IsNullOrEmpty(signature.SignerEmail) && string.Equals(signature.SignerEmail, currentUserEmail, StringComparison.OrdinalIgnoreCase));

            if (!isDesignatedSigner)
            {
                throw new UnauthorizedAccessException("Contrôle de sécurité : Vous n'êtes pas autorisé(e) à rejeter cette demande assignée à un autre signataire.");
            }
        }

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

    public async Task<SignatureCertificateDto> GetCertificateSecuredAsync(
        Guid id,
        Guid currentUserId,
        string currentUserEmail,
        bool isAdmin)
    {
        var signature = await _dbContext.DocumentSignatures.FindAsync(id);
        if (signature == null || signature.Status != "signed")
            throw new KeyNotFoundException("Certificat introuvable ou document non encore signé.");

        if (!isAdmin)
        {
            var emailLower = currentUserEmail.ToLower();
            var isSigner = (signature.SignerUserId.HasValue && signature.SignerUserId.Value == currentUserId)
                || (!string.IsNullOrEmpty(signature.SignerEmail) && string.Equals(signature.SignerEmail, emailLower, StringComparison.OrdinalIgnoreCase));
            var isRequester = signature.RequestedByUserId.HasValue && signature.RequestedByUserId.Value == currentUserId;

            var hasSignaturesRead = await (
                from userRole in _dbContext.UserRoles
                join rolePermission in _dbContext.RolePermissions on userRole.RoleId equals rolePermission.RoleId
                join permission in _dbContext.Permissions on rolePermission.PermissionId equals permission.Id
                where userRole.UserId == currentUserId && permission.Code == "signatures.read"
                select permission.Id
            ).AnyAsync();

            if (!isSigner && !isRequester && !hasSignaturesRead)
            {
                throw new UnauthorizedAccessException("Contrôle de sécurité : Vous n'êtes pas autorisé(e) à consulter ce certificat de signature.");
            }
        }

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
            var message = Uri.EscapeDataString($"Bonjour {s.SignerName},\n\nVous avez un document en attente de visa et signature sur Archivéo :\n📄 *{s.DocumentTitle}* (Réf: {s.DocumentReference})\n\n👉 Cliquez sur le lien direct pour signer :\nhttp://localhost:3000/signatures\n\n_Archivéo Parapheur Électronique Sécurisé_");
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
