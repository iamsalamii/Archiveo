using System;

namespace Archiveo.Application.DTOs.Archives;

public class ArchiveDto
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? DocumentId { get; set; }
    public string TypeId { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? ServiceId { get; set; }
    public string? DepartmentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime ArchivedAt { get; set; }
    public DateTime? RetentionDate { get; set; }
    public string? FinalSort { get; set; }
    public string? DestructionReason { get; set; }
    public DateTime? DestroyedAt { get; set; }
    public string? SiteId { get; set; }
    public string? LocationId { get; set; }
    public string? BoxReference { get; set; }
    public string? ShelfReference { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public Guid? DestroyedBy { get; set; }
}

public class CreateArchiveRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? DocumentId { get; set; }
    public string TypeId { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? ServiceId { get; set; }
    public string? DepartmentId { get; set; }
    public DateTime? RetentionDate { get; set; }
    public string? SiteId { get; set; }
    public string? LocationId { get; set; }
    public string? BoxReference { get; set; }
    public string? ShelfReference { get; set; }
}

public class UpdateArchiveRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TypeId { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? ServiceId { get; set; }
    public string? DepartmentId { get; set; }
    public DateTime? RetentionDate { get; set; }
    public string? SiteId { get; set; }
    public string? LocationId { get; set; }
    public string? BoxReference { get; set; }
    public string? ShelfReference { get; set; }
}

public class TransitionArchiveRequest
{
    public string NewStatus { get; set; } = string.Empty;
    public string? DestructionReason { get; set; }
}