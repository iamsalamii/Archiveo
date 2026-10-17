using System;

namespace Archiveo.Application.DTOs.Signatures;

public class DocumentSignatureDto
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public string DocumentReference { get; set; } = string.Empty;
    
    public Guid? RequestedByUserId { get; set; }
    public string RequestedByUserName { get; set; } = string.Empty;
    
    public Guid? SignerUserId { get; set; }
    public string SignerName { get; set; } = string.Empty;
    public string SignerEmail { get; set; } = string.Empty;
    public string? SignerPhone { get; set; }
    public string? SignerRole { get; set; }
    
    public string Status { get; set; } = "pending";
    public string? SignatureType { get; set; }
    public string? SignatureDataUrl { get; set; }
    
    public DateTime RequestedAt { get; set; }
    public DateTime? SignedAt { get; set; }
    public DateTime? DueDate { get; set; }
    
    public string? Sha256Hash { get; set; }
    public string? CertificateNumber { get; set; }
    public string? SignerIpAddress { get; set; }
    public string? RejectReason { get; set; }
    public string NotificationChannel { get; set; } = "both";
    public string? WhatsAppDirectLink { get; set; }
}

public class CreateSignatureRequest
{
    public Guid DocumentId { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public string? DocumentReference { get; set; }
    
    public Guid? SignerUserId { get; set; }
    public string SignerName { get; set; } = string.Empty;
    public string SignerEmail { get; set; } = string.Empty;
    public string? SignerPhone { get; set; }
    public string? SignerRole { get; set; }
    public DateTime? DueDate { get; set; }
    public string NotificationChannel { get; set; } = "both"; // email, whatsapp, both
    public string? Note { get; set; }
}

public class SignDocumentRequest
{
    public string SignatureType { get; set; } = "drawing"; // drawing, text, image
    public string SignatureDataUrl { get; set; } = string.Empty;
    public string? SecurityPin { get; set; }
}

public class RejectSignatureRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class SignatureCertificateDto
{
    public Guid SignatureId { get; set; }
    public string CertificateNumber { get; set; } = string.Empty;
    public string DocumentTitle { get; set; } = string.Empty;
    public string DocumentReference { get; set; } = string.Empty;
    public string SignerName { get; set; } = string.Empty;
    public string SignerEmail { get; set; } = string.Empty;
    public string? SignerPhone { get; set; }
    public DateTime SignedAt { get; set; }
    public string Sha256Hash { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Algorithm { get; set; } = "SHA-256 with RSA/ECDSA timestamping";
    public string Status { get; set; } = "VERIFIED_VALID";
    public string Issuer { get; set; } = "Archivéo Electronic Parapheur Authority (eIDAS Standard)";
}

public class SignaturePublicProofDto
{
    public Guid SignatureId { get; set; }
    public string CertificateNumber { get; set; } = string.Empty;
    public string DocumentReference { get; set; } = string.Empty;
    public string DocumentTitle { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? SignedAt { get; set; }
    public string Sha256Hash { get; set; } = string.Empty;
    public string Algorithm { get; set; } = "SHA-256 (eIDAS Timestamped)";
    public string Issuer { get; set; } = "Archivéo Electronic Parapheur Trust Service";
    public bool IsAuthentic { get; set; }
}

