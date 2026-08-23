using System;

namespace Archiveo.Application.DTOs.Notifications;

public class NotificationDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string Type { get; set; } = "info";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Link { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

public class CreateNotificationRequest
{
    public Guid? UserId { get; set; }
    public string Type { get; set; } = "info";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? Link { get; set; }
}
