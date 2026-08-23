using System;

namespace Archiveo.Domain.Entities;

public class Correspondence
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;

    // Type : "incoming" | "outgoing" | "internal"
    public string Type { get; set; } = "incoming";

    public string Subject { get; set; } = string.Empty;

    // Référence paramètre PRODUCER / RECIPIENT ou texte
    public string SenderId { get; set; } = string.Empty;
    public string RecipientId { get; set; } = string.Empty;

    public DateTime Date { get; set; } = DateTime.UtcNow;

    // Lien optionnel vers un document
    public Guid? DocumentId { get; set; }
    public Document? Document { get; set; }

    // Référence paramètre SIGNATURE_TYPE
    public string SignatureTypeId { get; set; } = string.Empty;

    public string? Notes { get; set; }

    // Audit
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
