using Archiveo.Application.DTOs.Workflows;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class WorkflowService
{
    private readonly ApplicationDbContext _dbContext;

    public WorkflowService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<WorkflowDto>> GetAllAsync()
    {
        var workflows = await _dbContext.Workflows
            .AsNoTracking()
            .Include(w => w.Document)
            .Include(w => w.Steps.OrderBy(s => s.Order))
            .Where(w => w.IsActive)
            .OrderByDescending(w => w.CreatedAt)
            .ToListAsync();

        return workflows.Select(MapToDto).ToList();
    }

    public async Task<WorkflowDto?> GetByIdAsync(Guid id)
    {
        var workflow = await _dbContext.Workflows
            .AsNoTracking()
            .Include(w => w.Document)
            .Include(w => w.Steps.OrderBy(s => s.Order))
            .FirstOrDefaultAsync(w => w.Id == id && w.IsActive);

        return workflow == null ? null : MapToDto(workflow);
    }

    public async Task<WorkflowDto?> GetByDocumentIdAsync(Guid documentId)
    {
        var workflow = await _dbContext.Workflows
            .AsNoTracking()
            .Include(w => w.Document)
            .Include(w => w.Steps.OrderBy(s => s.Order))
            .FirstOrDefaultAsync(w => w.DocumentId == documentId && w.IsActive);

        return workflow == null ? null : MapToDto(workflow);
    }

    public async Task<WorkflowDto> CreateAsync(CreateWorkflowRequest request, Guid userId)
    {
        var workflow = new Workflow
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            DocumentId = request.DocumentId,
            CurrentStep = 1,
            Status = "in_progress",
            CreatedBy = userId,
            CreatedAt = DateTime.UtcNow,
            IsActive = true
        };

        int order = 1;
        foreach (var s in request.Steps)
        {
            workflow.Steps.Add(new WorkflowStep
            {
                Id = Guid.NewGuid(),
                WorkflowId = workflow.Id,
                Order = s.Order > 0 ? s.Order : order++,
                Name = s.Name,
                ValidatorRole = s.ValidatorRole,
                Status = "pending"
            });
        }

        _dbContext.Workflows.Add(workflow);
        await _dbContext.SaveChangesAsync();

        await _dbContext.Entry(workflow).Reference(w => w.Document).LoadAsync();

        return MapToDto(workflow);
    }

    public async Task<WorkflowDto?> ProcessStepAsync(Guid workflowId, Guid stepId, ProcessWorkflowStepRequest request, Guid userId, string userName)
    {
        var workflow = await _dbContext.Workflows
            .Include(w => w.Document)
            .Include(w => w.Steps.OrderBy(s => s.Order))
            .FirstOrDefaultAsync(w => w.Id == workflowId && w.IsActive);

        if (workflow == null) return null;

        var step = workflow.Steps.FirstOrDefault(s => s.Id == stepId);
        if (step == null) return null;

        step.ActionDate = DateTime.UtcNow;
        step.Comment = request.Comment;
        step.ValidatedByUserId = userId;
        step.ValidatedByUserName = userName;

        if (request.Action.ToLower() == "rejected")
        {
            step.Status = "rejected";
            workflow.Status = "rejected";
            workflow.CompletedAt = DateTime.UtcNow;
        }
        else
        {
            step.Status = "approved";

            // Vérifier s'il reste des étapes
            var nextStep = workflow.Steps.FirstOrDefault(s => s.Order > step.Order && s.Status == "pending");
            if (nextStep != null)
            {
                workflow.CurrentStep = nextStep.Order;
            }
            else
            {
                workflow.Status = "completed";
                workflow.CompletedAt = DateTime.UtcNow;

                // Marquer le document comme validé
                if (workflow.Document != null)
                {
                    workflow.Document.Validated = true;
                    workflow.Document.ValidatedAt = DateTime.UtcNow;
                    workflow.Document.StatusId = "VALIDE";
                }
            }
        }

        await _dbContext.SaveChangesAsync();

        return MapToDto(workflow);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var workflow = await _dbContext.Workflows.FirstOrDefaultAsync(w => w.Id == id);
        if (workflow == null) return false;

        workflow.IsActive = false;
        await _dbContext.SaveChangesAsync();
        return true;
    }

    private static WorkflowDto MapToDto(Workflow w) => new()
    {
        Id = w.Id,
        Name = w.Name,
        DocumentId = w.DocumentId,
        DocumentTitle = w.Document?.Title,
        CurrentStep = w.CurrentStep,
        Status = w.Status,
        CreatedAt = w.CreatedAt,
        CompletedAt = w.CompletedAt,
        IsActive = w.IsActive,
        Steps = w.Steps.OrderBy(s => s.Order).Select(s => new WorkflowStepDto
        {
            Id = s.Id,
            Order = s.Order,
            Name = s.Name,
            ValidatorRole = s.ValidatorRole,
            Status = s.Status,
            ActionDate = s.ActionDate,
            Comment = s.Comment,
            ValidatedByUserId = s.ValidatedByUserId,
            ValidatedByUserName = s.ValidatedByUserName
        }).ToList()
    };
}
