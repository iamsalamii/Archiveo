using System;
using System.Collections.Generic;

namespace Archiveo.Application.DTOs.Workflows;

public class WorkflowStepDto
{
    public Guid Id { get; set; }
    public int Order { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ValidatorRole { get; set; } = string.Empty;
    public string Status { get; set; } = "pending";
    public DateTime? ActionDate { get; set; }
    public string? Comment { get; set; }
    public Guid? ValidatedByUserId { get; set; }
    public string? ValidatedByUserName { get; set; }
}

public class WorkflowDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public string? DocumentTitle { get; set; }
    public int CurrentStep { get; set; }
    public string Status { get; set; } = "in_progress";
    public List<WorkflowStepDto> Steps { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public bool IsActive { get; set; }
}

public class CreateWorkflowStepRequest
{
    public int Order { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ValidatorRole { get; set; } = string.Empty;
}

public class CreateWorkflowRequest
{
    public string Name { get; set; } = string.Empty;
    public Guid DocumentId { get; set; }
    public List<CreateWorkflowStepRequest> Steps { get; set; } = new();
}

public class ProcessWorkflowStepRequest
{
    // "approved" | "rejected"
    public string Action { get; set; } = "approved";
    public string? Comment { get; set; }
}
