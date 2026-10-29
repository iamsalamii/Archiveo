using Archiveo.Application.DTOs.Auth;
using Archiveo.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Archiveo.Application.Services;

public class AuthService
{
    private readonly UserManager<User> _userManager;
    private readonly SignInManager<User> _signInManager;
    private readonly IConfiguration _configuration;

    public AuthService(UserManager<User> userManager, SignInManager<User> signInManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user == null || !user.IsActive)
            return null;

        var signInResult = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);
        if (!signInResult.Succeeded)
            return null;

        var roles = await _userManager.GetRolesAsync(user);
        var token = GenerateJwtToken(user, roles);

        return new LoginResponse
        {
            Token = token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email!,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Matricule = user.Matricule,
                Function = user.Function,
                MustChangePassword = user.MustChangePassword,
                Roles = roles.ToArray()
            }
        };
    }

    public async Task<UserDto?> GetUserByIdAsync(Guid userId)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            return null;

        var roles = await _userManager.GetRolesAsync(user);

        return new UserDto
        {
            Id = user.Id,
            Email = user.Email!,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Matricule = user.Matricule,
            Function = user.Function,
            MustChangePassword = user.MustChangePassword,
            Roles = roles.ToArray()
        };
    }

    public async Task<(bool Succeeded, string? ErrorMessage)> ChangePasswordAsync(Guid userId, ChangePasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user == null)
            return (false, "Utilisateur introuvable.");

        var result = await _userManager.ChangePasswordAsync(user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = string.Join(" ", result.Errors.Select(e => e.Description));
            return (false, errors);
        }

        user.MustChangePassword = false;
        await _userManager.UpdateAsync(user);

        return (true, null);
    }

    private string GenerateJwtToken(User user, IList<string> roles)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secret = jwtSettings["Secret"]
            ?? _configuration["JwtSettings:Secret"]
            ?? _configuration["Jwt:Key"]
            ?? _configuration["JWT_SECRET"]
            ?? throw new InvalidOperationException("JwtSettings:Secret est requis.");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var issuer = jwtSettings["Issuer"]
            ?? _configuration["JwtSettings:Issuer"]
            ?? _configuration["Jwt:Issuer"]
            ?? _configuration["JWT_ISSUER"]
            ?? Archiveo.Application.Security.JwtSecurityPolicy.DefaultIssuer;

        var audience = jwtSettings["Audience"]
            ?? _configuration["JwtSettings:Audience"]
            ?? _configuration["Jwt:Audience"]
            ?? _configuration["JWT_AUDIENCE"]
            ?? Archiveo.Application.Security.JwtSecurityPolicy.CanonicalAudience;

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(ClaimTypes.Name, $"{user.FirstName} {user.LastName}")
        };

        foreach (var role in roles)
        {
            claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var lifetime = Archiveo.Application.Security.JwtSecurityPolicy.GetTokenLifetime(_configuration);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(lifetime),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}