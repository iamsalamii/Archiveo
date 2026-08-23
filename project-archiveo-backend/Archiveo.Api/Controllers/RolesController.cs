using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Roles;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/roles-management")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly RoleService _roleService;

    public RolesController(RoleService roleService)
    {
        _roleService = roleService;
    }

    [HttpGet("matrix")]
    [Permission("roles.read")]
    public async Task<IActionResult> GetMatrix()
    {
        var matrix = await _roleService.GetMatrixAsync();
        return Ok(matrix);
    }

    [HttpPost]
    [Permission("roles.create")]
    public async Task<IActionResult> CreateRole([FromBody] CreateRoleRequest request)
    {
        try
        {
            await _roleService.CreateRoleAsync(request);
            return Ok(new { message = "Role cree avec succes" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{roleId:guid}")]
    [Permission("roles.delete")]
    public async Task<IActionResult> DeleteRole(Guid roleId)
    {
        await _roleService.DeleteRoleAsync(roleId);
        return NoContent();
    }

    [HttpPut("{roleId:guid}/permissions")]
    [Permission("roles.assign_permissions")]
    public async Task<IActionResult> AssignPermissions(Guid roleId, [FromBody] AssignPermissionsRequest request)
    {
        try
        {
            await _roleService.AssignPermissionsAsync(roleId, request);
            return Ok(new { message = "Permissions mises a jour" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}