using Archiveo.Application.DTOs.Signatures;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/signatures")]
[Authorize]
public class SignaturesController : ControllerBase
{
    private readonly SignatureService _signatureService;

    public SignaturesController(SignatureService signatureService)
    {
        _signatureService = signatureService;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string GetUserEmail() =>
        User.FindFirstValue(ClaimTypes.Email) ?? "";

    private string GetUserName() =>
        User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("preferred_username") ?? "Utilisateur";

    /// <summary>Documents en attente de signature pour l'utilisateur connecté</summary>
    [HttpGet("pending")]
    public async Task<IActionResult> GetPendingSignatures()
    {
        var list = await _signatureService.GetPendingForUserAsync(GetUserId(), GetUserEmail());
        return Ok(list);
    }

    /// <summary>Demandes de signatures initiées par l'utilisateur connecté</summary>
    [HttpGet("requested")]
    public async Task<IActionResult> GetRequestedSignatures()
    {
        var list = await _signatureService.GetRequestedByUserAsync(GetUserId());
        return Ok(list);
    }

    /// <summary>Toutes les signatures (superviseur / parapheur global)</summary>
    [HttpGet]
    public async Task<IActionResult> GetAllSignatures()
    {
        var list = await _signatureService.GetAllSignaturesAsync();
        return Ok(list);
    }

    /// <summary>Signatures associées à un document précis</summary>
    [HttpGet("document/{documentId:guid}")]
    public async Task<IActionResult> GetSignaturesByDocument(Guid documentId)
    {
        var list = await _signatureService.GetByDocumentIdAsync(documentId);
        return Ok(list);
    }

    /// <summary>Initier une demande de signature</summary>
    [HttpPost("request")]
    public async Task<IActionResult> RequestSignature([FromBody] CreateSignatureRequest request)
    {
        try
        {
            var result = await _signatureService.RequestSignatureAsync(request, GetUserId(), GetUserName());
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Apposer une signature sur un document</summary>
    [HttpPost("{id:guid}/sign")]
    public async Task<IActionResult> SignDocument(Guid id, [FromBody] SignDocumentRequest request)
    {
        try
        {
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";
            var isAdmin = User.IsInRole("Admin") || User.HasClaim(ClaimTypes.Role, "Admin");
            var result = await _signatureService.SignAsync(id, request, ip, GetUserId(), GetUserEmail(), isAdmin);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Refuser de signer un document</summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> RejectSignature(Guid id, [FromBody] RejectSignatureRequest request)
    {
        try
        {
            var isAdmin = User.IsInRole("Admin") || User.HasClaim(ClaimTypes.Role, "Admin");
            var result = await _signatureService.RejectAsync(id, request, GetUserId(), GetUserEmail(), isAdmin);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>Télécharger ou consulter le certificat de signature</summary>
    [HttpGet("{id:guid}/certificate")]
    public async Task<IActionResult> GetCertificate(Guid id)
    {
        try
        {
            var certificate = await _signatureService.GetCertificateAsync(id);
            return Ok(certificate);
        }
        catch (Exception ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}
