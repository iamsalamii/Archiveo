using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Parameters;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/parameters")]
[Authorize]
public class ParametersController : ControllerBase
{
    private readonly ParameterService _parameterService;

    public ParametersController(ParameterService parameterService)
    {
        _parameterService = parameterService;
    }

    // GET /api/parameters/groups
    [HttpGet("groups")]
    [Permission("parameters.read")]
    public async Task<IActionResult> GetAllGroups()
    {
        var groups = await _parameterService.GetAllGroupsAsync();
        return Ok(groups);
    }

    // GET /api/parameters/groups/{groupCode}/items
    [HttpGet("groups/{groupCode}/items")]
    [Permission("parameters.read")]
    public async Task<IActionResult> GetItemsByGroup(string groupCode)
    {
        var items = await _parameterService.GetItemsByGroupAsync(groupCode);
        return Ok(items);
    }

    // POST /api/parameters/groups
    [HttpPost("groups")]
    [Permission("parameters.create")]
    public async Task<IActionResult> CreateGroup([FromBody] CreateParameterGroupRequest request)
    {
        try
        {
            var group = await _parameterService.CreateGroupAsync(request);
            return CreatedAtAction(nameof(GetAllGroups), group);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST /api/parameters/groups/{groupCode}/items
    [HttpPost("groups/{groupCode}/items")]
    [Permission("parameters.create")]
    public async Task<IActionResult> CreateItem(string groupCode, [FromBody] CreateParameterItemRequest request)
    {
        try
        {
            var item = await _parameterService.CreateItemAsync(groupCode, request);
            return Ok(item);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT /api/parameters/groups/{groupCode}/items/{itemId}
    [HttpPut("groups/{groupCode}/items/{itemId}")]
    [Permission("parameters.update")]
    public async Task<IActionResult> UpdateItem(string groupCode, string itemId, [FromBody] UpdateParameterItemRequest request)
    {
        try
        {
            var item = await _parameterService.UpdateItemAsync(groupCode, itemId, request);
            if (item == null) return NotFound();
            return Ok(item);
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // DELETE /api/parameters/groups/{groupCode}/items/{itemId}
    [HttpDelete("groups/{groupCode}/items/{itemId}")]
    [Permission("parameters.delete")]
    public async Task<IActionResult> DeleteItem(string groupCode, string itemId)
    {
        var success = await _parameterService.DeleteItemAsync(groupCode, itemId);
        if (!success)
            return NotFound();
        return NoContent();
    }
}