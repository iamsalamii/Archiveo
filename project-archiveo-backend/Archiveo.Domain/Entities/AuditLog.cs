using System;

namespace Archiveo.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}