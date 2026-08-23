using System;

namespace Archiveo.Application.DTOs.Parameters;

public class ParameterItemDto
{
    public Guid Id { get; set; }
    public string GroupCode { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public int Order { get; set; }
    public bool IsActive { get; set; }
    public Guid? ParentId { get; set; }
}

public class CreateParameterItemRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public int Order { get; set; }
    public Guid? ParentId { get; set; }
}

public class UpdateParameterItemRequest
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public int Order { get; set; }
    public Guid? ParentId { get; set; }
}