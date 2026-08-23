namespace Archiveo.Application.DTOs.Auth;

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = null!;
}

public class UserDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Matricule { get; set; }
    public string? Function { get; set; }
    public bool MustChangePassword { get; set; }
    public string[] Roles { get; set; } = Array.Empty<string>();
}