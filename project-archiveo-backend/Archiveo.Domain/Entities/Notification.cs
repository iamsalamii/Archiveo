using System;

namespace Archiveo.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; }

    // Destinataire — null = broadcast à tous
    public Guid? UserId { get; set; }

    // "info" | "success" | "warning" | "error"
    public string Type { get; set; } = "info";

    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Category { get; set; }

    // Lien de redirection facultatif
    public string? Link { get; set; }

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
}
