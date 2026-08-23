using System;
using System.Collections.Generic;

namespace Archiveo.Application.DTOs.Users;

public class UserDto
{
    public Guid Id { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Function { get; set; }
    public string? Matricule { get; set; }
    public string? ServiceId { get; set; }
    public bool MustChangePassword { get; set; }
    public List<string> Roles { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
    public string? TemporaryPassword { get; set; }
}

public class CreateUserRequest
{
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Function { get; set; }
    public string? Matricule { get; set; }
    public string? ServiceId { get; set; }
    public string? Password { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class UpdateUserRequest
{
    public string UserName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Function { get; set; }
    public string? Matricule { get; set; }
    public string? ServiceId { get; set; }
}

public class AssignRolesRequest
{
    public List<string> Roles { get; set; } = new();
}

public class ResetPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
}

public class RoleDto
{
    public string Name { get; set; } = string.Empty;
}