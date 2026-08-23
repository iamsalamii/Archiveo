using System;
using System.Collections.Generic;

namespace Archiveo.Domain.Entities;

public class ParameterItem
{
    public Guid Id { get; set; }
    public string GroupCode { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
    public Guid? ParentId { get; set; }
    public ParameterItem? Parent { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public ParameterGroup Group { get; set; } = null!;
    public ICollection<ParameterItem> Children { get; set; } = new List<ParameterItem>();
}