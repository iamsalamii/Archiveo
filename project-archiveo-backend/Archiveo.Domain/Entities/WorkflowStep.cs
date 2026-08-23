using System;

namespace Archiveo.Domain.Entities;

public class WorkflowStep
{
    public Guid Id { get; set; }
    public Guid WorkflowId { get; set; }
    public Workflow? Workflow { get; set; }

    public int Order { get; set; }
    public string Name { get; set; } = string.Empty;

    // Rôle ou fonction validatrice (ex: "Admin", "RecordsManager", "Directeur")
    public string ValidatorRole { get; set; } = string.Empty;

    // "pending" | "approved" | "rejected"
    public string Status { get; set; } = "pending";

    public DateTime? ActionDate { get; set; }
    public string? Comment { get; set; }

    public Guid? ValidatedByUserId { get; set; }
    public string? ValidatedByUserName { get; set; }
}
