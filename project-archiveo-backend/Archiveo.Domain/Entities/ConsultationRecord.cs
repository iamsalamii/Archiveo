using System;

namespace Archiveo.Domain.Entities;

public class ConsultationRecord
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;

    // Lien vers le document
    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }

    // Utilisateur
    public string UserName { get; set; } = string.Empty;

    // Classification
    public string? ConsultationTypeId { get; set; }

    // Details
    public DateTime ConsultationDate { get; set; } = DateTime.UtcNow;
    public string? Duration { get; set; }
    public string? Location { get; set; }

    // Audit
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}