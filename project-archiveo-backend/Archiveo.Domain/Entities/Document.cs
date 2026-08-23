using System;

namespace Archiveo.Domain.Entities;

public class Document
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Références aux paramètres (codes)
    public string TypeId { get; set; } = string.Empty;        // DOC_TYPE
    public string CategoryId { get; set; } = string.Empty;    // CATEGORY
    public string? SubCategoryId { get; set; }                // SUB_CATEGORY
    public string ServiceId { get; set; } = string.Empty;     // SERVICE
    public string StatusId { get; set; } = "BROUILLON";       // DOC_STATUS
    public string? ConfidentialityId { get; set; }            // CONFIDENTIALITY
    public string? LanguageId { get; set; }                   // LANGUAGE

    // Fichier
    public string? FileName { get; set; }
    public string? FilePath { get; set; }
    public long FileSize { get; set; }
    public string? MimeType { get; set; }

    // Versioning
    public int Version { get; set; } = 1;
    public Guid? ParentVersionId { get; set; }

    // Cycle de vie
    public bool Validated { get; set; } = false;
    public Guid? ValidatedBy { get; set; }
    public DateTime? ValidatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int RetentionYears { get; set; } = 10;

    // Métadonnées
    public string? Tags { get; set; }
    public string? Keywords { get; set; }

    // Audit
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsArchived { get; set; } = false;
}