using System;

namespace Archiveo.Domain.Entities;

public class ArchiveRecord
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Liens
    public Guid? DocumentId { get; set; }
    public Document? Document { get; set; }

    // Classification
    public string TypeId { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? ServiceId { get; set; }
    public string? DepartmentId { get; set; }

    // Cycle de vie
    public string Status { get; set; } = "CURRENT";
    public DateTime ArchivedAt { get; set; } = DateTime.UtcNow;
    public DateTime? RetentionDate { get; set; }
    public string? FinalSort { get; set; }
    public string? DestructionReason { get; set; }
    public DateTime? DestroyedAt { get; set; }
    public Guid? DestroyedBy { get; set; }

    // Localisation physique
    public string? SiteId { get; set; }
    public string? LocationId { get; set; }
    public string? BoxReference { get; set; }
    public string? ShelfReference { get; set; }

    // Audit
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;
}