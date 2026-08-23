using System;
using System.Collections.Generic;

namespace Archiveo.Application.DTOs.Roles;

public class PermissionDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Module { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int Order { get; set; }
}

public class RoleDetailDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<PermissionDto> Permissions { get; set; } = new();
}

public class CreateRoleRequest
{
    public string Name { get; set; } = string.Empty;
}

public class AssignPermissionsRequest
{
    public List<Guid> PermissionIds { get; set; } = new();
}

public class PermissionMatrixDto
{
    public List<PermissionDto> AllPermissions { get; set; } = new();
    public List<RoleDetailDto> Roles { get; set; } = new();
}