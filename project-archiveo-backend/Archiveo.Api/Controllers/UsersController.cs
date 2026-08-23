using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Users;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;

    public UsersController(UserService userService)
    {
        _userService = userService;
    }

    [HttpGet]
    [Permission("users.read")]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllAsync();
        return Ok(users);
    }

    [HttpGet("{id:guid}")]
    [Permission("users.read")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var user = await _userService.GetByIdAsync(id);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPost]
    [Permission("users.create")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
    {
        try
        {
            var user = await _userService.CreateAsync(request);
            return Ok(user);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    [Permission("users.update")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request)
    {
        try
        {
            var user = await _userService.UpdateAsync(id, request);
            if (user == null) return NotFound();
            return Ok(user);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    [Permission("users.delete")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var success = await _userService.DeleteAsync(id);
        if (!success) return NotFound();
        return NoContent();
    }

    [HttpPut("{id:guid}/roles")]
    [Permission("users.assign_roles")]
    public async Task<IActionResult> AssignRoles(Guid id, [FromBody] AssignRolesRequest request)
    {
        var user = await _userService.AssignRolesAsync(id, request);
        if (user == null) return NotFound();
        return Ok(user);
    }

    [HttpPost("{id:guid}/reset-password")]
    [Permission("users.reset_password")]
    public async Task<IActionResult> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request)
    {
        try
        {
            var success = await _userService.ResetPasswordAsync(id, request);
            if (!success) return NotFound();
            return Ok(new { message = "Mot de passe reinitialise" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("/api/roles")]
    [Permission("roles.read")]
    public async Task<IActionResult> GetRoles()
    {
        var roles = await _userService.GetRolesAsync();
        return Ok(roles);
    }
}