using System;
using System.Collections.Generic;

namespace Archiveo.Application.DTOs.Parameters;

public class ParameterGroupDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? Color { get; set; }
    public int Order { get; set; }
    public bool IsActive { get; set; }
    public List<ParameterItemDto> Items { get; set; } = new();
}

public class CreateParameterGroupRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? Color { get; set; }
    public int Order { get; set; }
}