namespace Archiveo.Domain.Entities;

public class DocumentSignature
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
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
    
    public string Status { get; set; } = "pending"; // pending, signed, rejected
    public string? SignatureType { get; set; } // drawing, text, image
    public string? SignatureDataUrl { get; set; } // Base64 data URL
    
    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;
    public DateTime? SignedAt { get; set; }
    public DateTime? DueDate { get; set; }
    
    public string? Sha256Hash { get; set; }
    public string? CertificateNumber { get; set; }
    public string? SignerIpAddress { get; set; }
    public string? RejectReason { get; set; }
    public string NotificationChannel { get; set; } = "both"; // email, whatsapp, both
    public string? SecurityPin { get; set; }
}
