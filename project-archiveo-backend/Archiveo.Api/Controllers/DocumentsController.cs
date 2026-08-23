using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Documents;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/documents")]
[Authorize]
public class DocumentsController : ControllerBase
{
    private readonly DocumentService _documentService;

    public DocumentsController(DocumentService documentService)
    {
        _documentService = documentService;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/documents
    [HttpGet]
    [Permission("documents.read")]
    public async Task<IActionResult> GetAll()
    {
        var docs = await _documentService.GetAllAsync();
        return Ok(docs);
    }

    // GET /api/documents/{id}
    [HttpGet("{id:guid}")]
    [Permission("documents.read")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var doc = await _documentService.GetByIdAsync(id);
        if (doc == null) return NotFound();
        return Ok(doc);
    }

    // POST /api/documents (multipart/form-data avec fichier)
    [HttpPost]
    [Permission("documents.create")]
    public async Task<IActionResult> Create([FromForm] CreateDocumentRequest request, IFormFile? file)
    {
        try
        {
            var doc = await _documentService.CreateAsync(request, file, GetUserId());
            return CreatedAtAction(nameof(GetById), new { id = doc.Id }, doc);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT /api/documents/{id}
    [HttpPut("{id:guid}")]
    [Permission("documents.update")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDocumentRequest request)
    {
        var doc = await _documentService.UpdateAsync(id, request, GetUserId());
        if (doc == null) return NotFound();
        return Ok(doc);
    }

    // DELETE /api/documents/{id}
    [HttpDelete("{id:guid}")]
    [Permission("documents.delete")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _documentService.DeleteAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    // POST /api/documents/{id}/validate
    [HttpPost("{id:guid}/validate")]
    [Permission("documents.validate")]
    public async Task<IActionResult> Validate(Guid id)
    {
        var doc = await _documentService.ValidateAsync(id, GetUserId());
        if (doc == null) return NotFound();
        return Ok(doc);
    }

    // GET /api/documents/{id}/download
    [HttpGet("{id:guid}/download")]
    [Permission("documents.download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var file = await _documentService.GetFileAsync(id);
        if (file == null) return NotFound();

        var (filePath, fileName, mimeType) = file.Value;
        if (!System.IO.File.Exists(filePath)) return NotFound();

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, mimeType, fileName);
    }

    [HttpGet("{id:guid}/versions")]
    [Permission("documents.read")]
    public async Task<IActionResult> GetVersions(Guid id)
    {
        return Ok(await _documentService.GetVersionsAsync(id));
    }

    [HttpPost("{id:guid}/archive")]
    [Permission("documents.update")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var document = await _documentService.SetArchivedAsync(id, true, GetUserId());
        return document == null ? NotFound() : Ok(document);
    }

    [HttpPost("{id:guid}/unarchive")]
    [Permission("documents.update")]
    public async Task<IActionResult> Unarchive(Guid id)
    {
        var document = await _documentService.SetArchivedAsync(id, false, GetUserId());
        return document == null ? NotFound() : Ok(document);
    }

    [HttpPost("{id:guid}/versions")]
    [Permission("documents.update")]
    public async Task<IActionResult> CreateVersion(
        Guid id,
        [FromForm] UpdateDocumentRequest request,
        IFormFile? file)
    {
        var document = await _documentService.CreateVersionAsync(id, request, file, GetUserId());
        return document == null ? NotFound() : Ok(document);
    }
}