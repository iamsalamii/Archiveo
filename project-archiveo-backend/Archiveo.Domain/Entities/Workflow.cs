using System;
using System.Collections.Generic;

namespace Archiveo.Domain.Entities;

public class Workflow
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public Guid DocumentId { get; set; }
    public Document? Document { get; set; }

    public int CurrentStep { get; set; } = 1;

    // "in_progress" | "completed" | "rejected"
    public string Status { get; set; } = "in_progress";

    public List<WorkflowStep> Steps { get; set; } = new();

    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public bool IsActive { get; set; } = true;
}
