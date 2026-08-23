using Archiveo.Api.Authorization;
using Archiveo.Application.DTOs.Notifications;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Archiveo.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly NotificationService _notificationService;

    public NotificationsController(NotificationService notificationService)
    {
        _notificationService = notificationService;
    }

    private Guid GetUserId() =>
        Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    // GET /api/notifications
    [HttpGet]
    public async Task<IActionResult> GetMine([FromQuery] int limit = 50)
    {
        var list = await _notificationService.GetForUserAsync(GetUserId(), limit);
        return Ok(list);
    }

    // PUT /api/notifications/{id}/read
    [HttpPut("{id:guid}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var success = await _notificationService.MarkAsReadAsync(id, GetUserId());
        if (!success) return NotFound();
        return NoContent();
    }

    // POST /api/notifications/mark-all-read
    [HttpPost("mark-all-read")]
    public async Task<IActionResult> MarkAllRead()
    {
        await _notificationService.MarkAllAsReadAsync(GetUserId());
        return NoContent();
    }

    // POST /api/notifications — usage interne ou admin
    [HttpPost]
    [Permission("notifications.create")]
    public async Task<IActionResult> Create([FromBody] CreateNotificationRequest request)
    {
        var notification = await _notificationService.CreateAndPushAsync(request);
        return CreatedAtAction(nameof(GetMine), notification);
    }
}
