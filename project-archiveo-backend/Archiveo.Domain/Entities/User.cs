using Microsoft.AspNetCore.Identity;

namespace Archiveo.Domain.Entities;

public class User : IdentityUser<Guid>
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? Matricule { get; set; }
    public string? Function { get; set; }
    public string? ServiceId { get; set; }
    public string? ProfileId { get; set; }
    public bool MustChangePassword { get; set; } = true;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}