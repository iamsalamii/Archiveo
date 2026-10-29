using Archiveo.Api.Security;
using Archiveo.Application.DTOs.Auth;
using Archiveo.Application.Services;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AuthService _authService;
    private readonly PermissionService _permissionService;

    public AuthController(AuthService authService, PermissionService permissionService)
    {
        _authService = authService;
        _permissionService = permissionService;
    }

    [HttpPost("login")]
    [EnableRateLimiting(AuthRateLimitingConfig.PolicyName)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var response = await _authService.LoginAsync(request);
        if (response == null)
            return Unauthorized(new { message = "Identifiants invalides" });

        return Ok(response);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        return Ok(new { message = "Déconnexion réussie" });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var user = await _authService.GetUserByIdAsync(Guid.Parse(userId));
        if (user == null)
            return NotFound();

        return Ok(user);
    }

    [Authorize]
    [HttpGet("permissions")]
    public async Task<IActionResult> GetPermissions()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdValue, out var userId))
            return Unauthorized();

        return Ok(await _permissionService.GetForUserAsync(userId, HttpContext.RequestAborted));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId == null)
            return Unauthorized();

        var (succeeded, error) = await _authService.ChangePasswordAsync(Guid.Parse(userId), request);
        if (!succeeded)
            return BadRequest(new { message = error ?? "Impossible de changer le mot de passe" });

        return Ok(new { message = "Mot de passe changé avec succès" });
    }
}