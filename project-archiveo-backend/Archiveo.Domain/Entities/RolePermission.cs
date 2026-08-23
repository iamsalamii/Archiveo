using System;

namespace Archiveo.Domain.Entities;

public class RolePermission
{
    public Guid RoleId { get; set; }
    public Guid PermissionId { get; set; }
    public Permission? Permission { get; set; }
}