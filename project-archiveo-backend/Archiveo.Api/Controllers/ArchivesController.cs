using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Archives;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/archives")]
[Authorize]
public class ArchivesController : ControllerBase
{
    private readonly ArchiveService _archiveService;

    public ArchivesController(ArchiveService archiveService)
    {
        _archiveService = archiveService;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    [HttpGet]
    [Permission("archives.read")]
    public async Task<IActionResult> GetAll()
    {
        var archives = await _archiveService.GetAllAsync();
        return Ok(archives);
    }

    [HttpGet("{id:guid}")]
    [Permission("archives.read")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var archive = await _archiveService.GetByIdAsync(id);
        if (archive == null) return NotFound();
        return Ok(archive);
    }

    [HttpPost]
    [Permission("archives.create")]
    public async Task<IActionResult> Create([FromBody] CreateArchiveRequest request)
    {
        try
        {
            var archive = await _archiveService.CreateAsync(request, GetUserId());
            return CreatedAtAction(nameof(GetById), new { id = archive.Id }, archive);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Permission("archives.update")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateArchiveRequest request)
    {
        var archive = await _archiveService.UpdateAsync(id, request, GetUserId());
        if (archive == null) return NotFound();
        return Ok(archive);
    }

    [HttpPost("{id:guid}/transition")]
    [Permission("archives.transition")]
    public async Task<IActionResult> Transition(Guid id, [FromBody] TransitionArchiveRequest request)
    {
        try
        {
            var archive = await _archiveService.TransitionAsync(id, request, GetUserId());
            if (archive == null) return NotFound();
            return Ok(archive);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [Permission("archives.delete")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _archiveService.DeleteAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }
}