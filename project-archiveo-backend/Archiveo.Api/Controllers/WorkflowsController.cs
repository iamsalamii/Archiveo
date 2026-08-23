using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Workflows;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/workflows")]
[Authorize]
public class WorkflowsController : ControllerBase
{
    private readonly WorkflowService _workflowService;

    public WorkflowsController(WorkflowService workflowService)
    {
        _workflowService = workflowService;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetUserName() =>
        User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue(ClaimTypes.Email) ?? "Utilisateur";

    // GET /api/workflows
    [HttpGet]
    [Permission("workflows.read")]
    public async Task<IActionResult> GetAll()
    {
        var list = await _workflowService.GetAllAsync();
        return Ok(list);
    }

    // GET /api/workflows/{id}
    [HttpGet("{id:guid}")]
    [Permission("workflows.read")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var workflow = await _workflowService.GetByIdAsync(id);
        if (workflow == null) return NotFound();
        return Ok(workflow);
    }

    // GET /api/workflows/document/{documentId:guid}
    [HttpGet("document/{documentId:guid}")]
    [Permission("workflows.read")]
    public async Task<IActionResult> GetByDocumentId(Guid documentId)
    {
        var workflow = await _workflowService.GetByDocumentIdAsync(documentId);
        if (workflow == null) return NotFound();
        return Ok(workflow);
    }

    // POST /api/workflows
    [HttpPost]
    [Permission("workflows.create")]
    public async Task<IActionResult> Create([FromBody] CreateWorkflowRequest request)
    {
        try
        {
            var workflow = await _workflowService.CreateAsync(request, GetUserId());
            return CreatedAtAction(nameof(GetById), new { id = workflow.Id }, workflow);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST /api/workflows/{id}/steps/{stepId}/process
    [HttpPost("{id:guid}/steps/{stepId:guid}/process")]
    [Permission("workflows.process")]
    public async Task<IActionResult> ProcessStep(Guid id, Guid stepId, [FromBody] ProcessWorkflowStepRequest request)
    {
        try
        {
            var workflow = await _workflowService.ProcessStepAsync(id, stepId, request, GetUserId(), GetUserName());
            if (workflow == null) return NotFound();
            return Ok(workflow);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // DELETE /api/workflows/{id}
    [HttpDelete("{id:guid}")]
    [Permission("workflows.delete")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _workflowService.DeleteAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
