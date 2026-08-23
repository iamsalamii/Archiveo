using System;

namespace Archiveo.Domain.Entities;

public class LoanRecord
{
    public Guid Id { get; set; }
    public string Reference { get; set; } = string.Empty;

    // Lien vers le document
    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }

    // Emprunteur
    public string BorrowerName { get; set; } = string.Empty;
    public string BorrowerEmail { get; set; } = string.Empty;

    // Classification
    public string? LoanTypeId { get; set; }
    public string? ReasonId { get; set; }

    // Dates
    public DateTime BorrowDate { get; set; } = DateTime.UtcNow;
    public DateTime DueDate { get; set; }
    public DateTime? ReturnDate { get; set; }

    // Statut
    public string Status { get; set; } = "active";

    // Localisation
    public string? Location { get; set; }

    // Audit
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public Guid? UpdatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
}