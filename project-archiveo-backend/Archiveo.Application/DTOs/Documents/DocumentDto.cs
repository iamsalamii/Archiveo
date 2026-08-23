using System;

namespace Archiveo.Application.DTOs.Documents;

public class DocumentDto
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TypeId { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? SubCategoryId { get; set; }
    public string ServiceId { get; set; } = string.Empty;
    public string StatusId { get; set; } = string.Empty;
    public string? ConfidentialityId { get; set; }
    public string? LanguageId { get; set; }
    public string? FileName { get; set; }
    public string? FilePath { get; set; }
    public long FileSize { get; set; }
    public string? MimeType { get; set; }
    public int Version { get; set; }
    public bool Validated { get; set; }
    public DateTime? ValidatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int RetentionYears { get; set; }
    public string? Tags { get; set; }
    public string? Keywords { get; set; }
    public Guid CreatedBy { get; set; }
    public string CreatedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; }
    public bool IsArchived { get; set; }
    public Guid? UpdatedBy { get; set; }
}

public class DocumentVersionDto
{
    public Guid Id { get; set; }
    public int Version { get; set; }
    public Guid? ParentVersionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? FileName { get; set; }
    public long FileSize { get; set; }
    public string? MimeType { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateDocumentRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TypeId { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? SubCategoryId { get; set; }
    public string ServiceId { get; set; } = string.Empty;
    public string? ConfidentialityId { get; set; }
    public string? LanguageId { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int RetentionYears { get; set; } = 10;
    public string? Tags { get; set; }
    public string? Keywords { get; set; }
}

public class UpdateDocumentRequest
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TypeId { get; set; } = string.Empty;
    public string CategoryId { get; set; } = string.Empty;
    public string? SubCategoryId { get; set; }
    public string ServiceId { get; set; } = string.Empty;
    public string StatusId { get; set; } = "BROUILLON";
    public string? ConfidentialityId { get; set; }
    public string? LanguageId { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int RetentionYears { get; set; } = 10;
    public string? Tags { get; set; }
    public string? Keywords { get; set; }
}