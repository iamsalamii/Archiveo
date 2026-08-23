namespace Archiveo.Domain.Entities;

public class DocumentVersionRecord
{
    public Guid Id { get; set; }
    public Guid DocumentId { get; set; }
    public int Version { get; set; }
    public Guid? ParentVersionId { get; set; }
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
    public string? Tags { get; set; }
    public string? Keywords { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
}
