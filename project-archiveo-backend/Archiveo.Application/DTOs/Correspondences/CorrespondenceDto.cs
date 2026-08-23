using System;

namespace Archiveo.Application.DTOs.Correspondences;

public class CorrespondenceDto
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;
    public string Type { get; set; } = "incoming";
    public string Subject { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string RecipientId { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public Guid? DocumentId { get; set; }
    public string? DocumentTitle { get; set; }
    public string SignatureTypeId { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}

public class CreateCorrespondenceRequest
{
    public string Type { get; set; } = "incoming";
    public string Subject { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string RecipientId { get; set; } = string.Empty;
    public DateTime? Date { get; set; }
    public Guid? DocumentId { get; set; }
    public string SignatureTypeId { get; set; } = string.Empty;
    public string? Notes { get; set; }
}

public class UpdateCorrespondenceRequest
{
    public string Type { get; set; } = "incoming";
    public string Subject { get; set; } = string.Empty;
    public string SenderId { get; set; } = string.Empty;
    public string RecipientId { get; set; } = string.Empty;
    public DateTime? Date { get; set; }
    public Guid? DocumentId { get; set; }
    public string SignatureTypeId { get; set; } = string.Empty;
    public string? Notes { get; set; }
}
