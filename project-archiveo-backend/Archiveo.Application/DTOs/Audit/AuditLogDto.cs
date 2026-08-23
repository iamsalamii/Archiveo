using System;

namespace Archiveo.Application.DTOs.Audit;

public class AuditLogDto
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
}