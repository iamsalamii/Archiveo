using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Correspondences;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/correspondences")]
[Authorize]
public class CorrespondencesController : ControllerBase
{
    private readonly CorrespondenceService _correspondenceService;

    public CorrespondencesController(CorrespondenceService correspondenceService)
    {
        _correspondenceService = correspondenceService;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/correspondences?type=incoming
    [HttpGet]
    [Permission("correspondences.read")]
    public async Task<IActionResult> GetAll([FromQuery] string? type)
    {
        var list = await _correspondenceService.GetAllAsync(type);
        return Ok(list);
    }

    // GET /api/correspondences/{id}
    [HttpGet("{id:guid}")]
    [Permission("correspondences.read")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var correspondence = await _correspondenceService.GetByIdAsync(id);
        if (correspondence == null) return NotFound();
        return Ok(correspondence);
    }

    // POST /api/correspondences
    [HttpPost]
    [Permission("correspondences.create")]
    public async Task<IActionResult> Create([FromBody] CreateCorrespondenceRequest request)
    {
        try
        {
            var correspondence = await _correspondenceService.CreateAsync(request, GetUserId());
            return CreatedAtAction(nameof(GetById), new { id = correspondence.Id }, correspondence);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT /api/correspondences/{id}
    [HttpPut("{id:guid}")]
    [Permission("correspondences.update")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCorrespondenceRequest request)
    {
        var correspondence = await _correspondenceService.UpdateAsync(id, request, GetUserId());
        if (correspondence == null) return NotFound();
        return Ok(correspondence);
    }

    // DELETE /api/correspondences/{id}
    [HttpDelete("{id:guid}")]
    [Permission("correspondences.delete")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _correspondenceService.DeleteAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}
