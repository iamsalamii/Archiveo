using Archiveo.Api.Authorization;
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
    [Permission("signatures.read")]
    public async Task<IActionResult> GetAllSignatures()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Authentification requise." });
        }

        var isAdmin = User.IsInRole("Admin") || User.HasClaim(ClaimTypes.Role, "Admin");
        var hasPermission = isAdmin || await _signatureService.HasPermissionAsync(userId, "signatures.read");
        if (!hasPermission)
        {
            return StatusCode(403, new { message = "Accès refusé : la permission 'signatures.read' est requise pour accéder au registre global des signatures." });
        }

        var list = await _signatureService.GetAllSignaturesAsync();
        return Ok(list);
    }

    /// <summary>Détail d'une signature avec contrôle de confidentialité</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSignatureById(Guid id)
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            return Unauthorized(new { message = "Authentification requise." });
        }

        var isAdmin = User.IsInRole("Admin") || User.HasClaim(ClaimTypes.Role, "Admin");
        var result = await _signatureService.GetSignatureByIdSecuredAsync(id, userId, GetUserEmail(), isAdmin);
        if (result.NotFound)
        {
            return NotFound(new { message = "Demande de signature introuvable." });
        }

        if (!result.IsAuthorized)
        {
            return StatusCode(403, new { message = "Accès refusé : vous n'avez pas l'autorisation de consulter cette signature." });
        }

        return Ok(result.Signature);
    }

    /// <summary>Vérification publique de l'authenticité d'une signature / scellement électronique (standard eIDAS)</summary>
    [HttpGet("{id:guid}/verify")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifySignaturePublic(Guid id)
    {
        var verification = await _signatureService.VerifySignaturePublicAsync(id);
        if (!verification.Exists)
        {
            return NotFound(new { message = "Aucun scellement électronique authentique correspondant à cet identifiant." });
        }

        return Ok(verification.Proof);
    }


    /// <summary>Signatures associées à un document précis (avec vérification du périmètre et de l'accès document)</summary>
    [HttpGet("document/{documentId:guid}")]
    public async Task<IActionResult> GetSignaturesByDocument(Guid documentId)
    {
        var isAdmin = User.IsInRole("Admin") || User.HasClaim(ClaimTypes.Role, "Admin");
        var result = await _signatureService.GetByDocumentIdSecuredAsync(documentId, GetUserId(), GetUserEmail(), isAdmin);
        if (result.DocumentNotFound)
        {
            return NotFound(new { message = "Document introuvable ou inactif." });
        }

        if (!result.IsAuthorized)
        {
            return StatusCode(403, new { message = "Accès refusé : vous n'avez pas l'autorisation de consulter les signatures de ce document." });
        }

        return Ok(result.Signatures);
    }

    /// <summary>Initier une demande de signature</summary>
    [HttpPost("request")]
    public async Task<IActionResult> RequestSignature([FromBody] CreateSignatureRequest request)
    {
        try
        {
            var isAdmin = User.IsInRole("Admin") || User.HasClaim(ClaimTypes.Role, "Admin");
            var result = await _signatureService.RequestSignatureAsync(request, GetUserId(), GetUserName(), GetUserEmail(), isAdmin);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
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
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
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
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
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
            var isAdmin = User.IsInRole("Admin") || User.HasClaim(ClaimTypes.Role, "Admin");
            var certificate = await _signatureService.GetCertificateSecuredAsync(id, GetUserId(), GetUserEmail(), isAdmin);
            return Ok(certificate);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
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
}
