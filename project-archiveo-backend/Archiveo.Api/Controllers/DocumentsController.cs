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

    private bool IsAdmin() =>
        User.IsInRole("Admin") || User.HasClaim(ClaimTypes.Role, "Admin");

    private IActionResult ForbidDocument() =>
        StatusCode(StatusCodes.Status403Forbidden, new { message = "Accès refusé. Vous n'avez pas l'autorisation d'accéder à ce document." });

    private IActionResult NotFoundDocument() =>
        NotFound(new { message = "Document introuvable." });

    // GET /api/documents
    [HttpGet]
    [Permission("documents.read")]
    public async Task<IActionResult> GetAll()
    {
        var docs = await _documentService.GetAllAsync(GetUserId(), IsAdmin());
        return Ok(docs);
    }

    // GET /api/documents/{id}
    [HttpGet("{id:guid}")]
    [Permission("documents.read")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var (notFound, isAuthorized, doc) = await _documentService.GetByIdSecuredAsync(id, GetUserId(), IsAdmin());
        if (notFound) return NotFoundDocument();
        if (!isAuthorized) return ForbidDocument();
        return Ok(doc);
    }

    // POST /api/documents (multipart/form-data avec fichier)
    [HttpPost]
    [Permission("documents.create")]
    public async Task<IActionResult> Create([FromForm] CreateDocumentRequest request, IFormFile? file)
    {
        try
        {
            var doc = await _documentService.CreateAsync(request, file, GetUserId(), IsAdmin());
            return CreatedAtAction(nameof(GetById), new { id = doc.Id }, doc);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
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
        var (notFound, isAuthorized, doc) = await _documentService.UpdateSecuredAsync(id, request, GetUserId(), IsAdmin());
        if (notFound) return NotFoundDocument();
        if (!isAuthorized) return ForbidDocument();
        return Ok(doc);
    }

    // DELETE /api/documents/{id}
    [HttpDelete("{id:guid}")]
    [Permission("documents.delete")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var (notFound, isAuthorized) = await _documentService.DeleteSecuredAsync(id, GetUserId(), IsAdmin());
        if (notFound) return NotFoundDocument();
        if (!isAuthorized) return ForbidDocument();
        return NoContent();
    }

    // POST /api/documents/{id}/validate
    [HttpPost("{id:guid}/validate")]
    [Permission("documents.validate")]
    public async Task<IActionResult> Validate(Guid id)
    {
        var (notFound, isAuthorized, doc) = await _documentService.ValidateSecuredAsync(id, GetUserId(), IsAdmin());
        if (notFound) return NotFoundDocument();
        if (!isAuthorized) return ForbidDocument();
        return Ok(doc);
    }

    // GET /api/documents/{id}/download
    [HttpGet("{id:guid}/download")]
    [Permission("documents.download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var (notFound, isAuthorized, filePath, fileName, mimeType) = await _documentService.GetFileSecuredAsync(id, GetUserId(), IsAdmin());
        if (notFound) return NotFoundDocument();
        if (!isAuthorized) return ForbidDocument();

        if (filePath == null || !System.IO.File.Exists(filePath)) return NotFoundDocument();

        var fileBytes = await System.IO.File.ReadAllBytesAsync(filePath);
        return File(fileBytes, mimeType ?? "application/octet-stream", fileName ?? "document");
    }

    [HttpGet("{id:guid}/versions")]
    [Permission("documents.read")]
    public async Task<IActionResult> GetVersions(Guid id)
    {
        var (notFound, isAuthorized, versions) = await _documentService.GetVersionsSecuredAsync(id, GetUserId(), IsAdmin());
        if (notFound) return NotFoundDocument();
        if (!isAuthorized) return ForbidDocument();
        return Ok(versions);
    }

    [HttpPost("{id:guid}/archive")]
    [Permission("documents.update")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var (notFound, isAuthorized, doc) = await _documentService.SetArchivedSecuredAsync(id, true, GetUserId(), IsAdmin());
        if (notFound) return NotFoundDocument();
        if (!isAuthorized) return ForbidDocument();
        return Ok(doc);
    }

    [HttpPost("{id:guid}/unarchive")]
    [Permission("documents.update")]
    public async Task<IActionResult> Unarchive(Guid id)
    {
        var (notFound, isAuthorized, doc) = await _documentService.SetArchivedSecuredAsync(id, false, GetUserId(), IsAdmin());
        if (notFound) return NotFoundDocument();
        if (!isAuthorized) return ForbidDocument();
        return Ok(doc);
    }

    [HttpPost("{id:guid}/versions")]
    [Permission("documents.update")]
    public async Task<IActionResult> CreateVersion(
        Guid id,
        [FromForm] UpdateDocumentRequest request,
        IFormFile? file)
    {
        var (notFound, isAuthorized, doc) = await _documentService.CreateVersionSecuredAsync(id, request, file, GetUserId(), IsAdmin());
        if (notFound) return NotFoundDocument();
        if (!isAuthorized) return ForbidDocument();
        return Ok(doc);
    }
}