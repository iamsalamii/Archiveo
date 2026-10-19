using Archiveo.Application.DTOs.Users;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Security.Cryptography;

namespace Archiveo.Infrastructure.Services;

public class UserService
{
    private readonly UserManager<User> _userManager;
    private readonly ApplicationDbContext _dbContext;

    public UserService(
        UserManager<User> userManager,
        ApplicationDbContext dbContext)
    {
        _userManager = userManager;
        _dbContext = dbContext;
    }

    public async Task<List<UserDto>> GetAllAsync()
    {
        var users = await _dbContext.Users.AsNoTracking()
            .OrderBy(u => u.LastName)
            .ToListAsync();

        var userRoles = await (
            from ur in _dbContext.UserRoles.AsNoTracking()
            join r in _dbContext.Roles.AsNoTracking() on ur.RoleId equals r.Id
            select new { ur.UserId, RoleName = r.Name }
        ).ToListAsync();

        var rolesByUser = userRoles
            .Where(x => !string.IsNullOrEmpty(x.RoleName))
            .GroupBy(x => x.UserId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(x => x.RoleName!).ToList()
            );

        var dtos = new List<UserDto>(users.Count);
        foreach (var u in users)
        {
            var roles = rolesByUser.TryGetValue(u.Id, out var rList) ? rList : new List<string>();
            dtos.Add(Map(u, roles));
        }

        return dtos;
    }

    public async Task<UserDto?> GetByIdAsync(Guid id)
    {
        var u = await _userManager.FindByIdAsync(id.ToString());
        if (u == null) return null;
        var roles = await _userManager.GetRolesAsync(u);
        return Map(u, roles.ToList());
    }

    public async Task<UserDto> CreateAsync(CreateUserRequest request)
    {
        var user = new User
        {
            UserName = request.UserName,
            Email = request.Email,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Function = request.Function,
            Matricule = request.Matricule,
            ServiceId = request.ServiceId,
            PhoneNumber = request.Phone ?? request.WhatsAppNumber,
            WhatsAppNumber = request.WhatsAppNumber ?? request.Phone,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow
        };

        var temporaryPassword = string.IsNullOrWhiteSpace(request.Password)
            ? GenerateTemporaryPassword()
            : request.Password;
        var result = await _userManager.CreateAsync(user, temporaryPassword);
        if (!result.Succeeded)
            throw new Exception(string.Join(", ", result.Errors.Select(e => e.Description)));

        var roleResult = await _userManager.AddToRolesAsync(user, request.Roles);
        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            throw new Exception(string.Join(", ", roleResult.Errors.Select(e => e.Description)));
        }

        var createdUser = (await GetByIdAsync(user.Id))!;
        createdUser.TemporaryPassword = temporaryPassword;
        return createdUser;
    }

    public async Task<UserDto?> UpdateAsync(Guid id, UpdateUserRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return null;

        user.UserName = request.UserName;
        user.Email = request.Email;
        user.FirstName = request.FirstName;
        user.LastName = request.LastName;
        user.Function = request.Function;
        user.Matricule = request.Matricule;
        user.ServiceId = request.ServiceId;
        user.PhoneNumber = request.Phone ?? request.WhatsAppNumber;
        user.WhatsAppNumber = request.WhatsAppNumber ?? request.Phone;
        user.UpdatedAt = DateTime.UtcNow;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new Exception(string.Join(", ", result.Errors.Select(e => e.Description)));

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return false;

        user.IsActive = false;
        user.LockoutEnabled = true;
        user.LockoutEnd = DateTimeOffset.MaxValue;
        var result = await _userManager.UpdateAsync(user);
        return result.Succeeded;
    }

    public async Task<UserDto?> AssignRolesAsync(Guid id, AssignRolesRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return null;

        var currentRoles = await _userManager.GetRolesAsync(user);
        await _userManager.RemoveFromRolesAsync(user, currentRoles);
        await _userManager.AddToRolesAsync(user, request.Roles);

        return await GetByIdAsync(id);
    }

    public async Task<bool> ResetPasswordAsync(Guid id, ResetPasswordRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user == null) return false;

        var token = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, token, request.NewPassword);

        if (!result.Succeeded)
            throw new Exception(string.Join(", ", result.Errors.Select(e => e.Description)));

        // Force le changement au prochain login
        user.MustChangePassword = true;
        await _userManager.UpdateAsync(user);

        return true;
    }

    public async Task<List<RoleDto>> GetRolesAsync()
    {
        return await _dbContext.Roles
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto { Name = r.Name! })
            .ToListAsync();
    }

    private UserDto Map(User u, List<string> roles)
    {
        return new UserDto
        {
            Id = u.Id,
            UserName = u.UserName ?? "",
            Email = u.Email ?? "",
            FirstName = u.FirstName,
            LastName = u.LastName,
            Function = u.Function,
            Matricule = u.Matricule,
            ServiceId = u.ServiceId,
            Phone = u.PhoneNumber ?? u.WhatsAppNumber,
            WhatsAppNumber = u.WhatsAppNumber ?? u.PhoneNumber,
            MustChangePassword = u.MustChangePassword,
            Roles = roles,
            CreatedAt = u.CreatedAt,
            IsActive = u.IsActive
        };
    }

    private static string GenerateTemporaryPassword()
    {
        var random = Convert.ToBase64String(RandomNumberGenerator.GetBytes(18))
            .Replace("/", "A")
            .Replace("+", "b")
            .Replace("=", "9");
        return $"Aa1!{random}";
    }
}