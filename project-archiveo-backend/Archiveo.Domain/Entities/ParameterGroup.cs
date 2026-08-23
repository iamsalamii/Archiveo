using System;
using System.Collections.Generic;

namespace Archiveo.Domain.Entities;

public class ParameterGroup
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? Color { get; set; }
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ICollection<ParameterItem> Items { get; set; } = new List<ParameterItem>();
}