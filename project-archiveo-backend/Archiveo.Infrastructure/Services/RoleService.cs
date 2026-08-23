using Archiveo.Application.DTOs.Roles;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Services;

public class RoleService
{
    private readonly ApplicationDbContext _dbContext;
    private readonly RoleManager<IdentityRole<Guid>> _roleManager;

    public RoleService(
        ApplicationDbContext dbContext,
        RoleManager<IdentityRole<Guid>> roleManager)
    {
        _dbContext = dbContext;
        _roleManager = roleManager;
    }

    public async Task<PermissionMatrixDto> GetMatrixAsync()
    {
        var allPermissions = await _dbContext.Permissions
            .OrderBy(p => p.Order)
            .ToListAsync();

        var roles = await _dbContext.Roles
            .OrderBy(r => r.Name)
            .ToListAsync();

        var rolePermissions = await _dbContext.RolePermissions
            .Include(rp => rp.Permission)
            .ToListAsync();

        var roleDtos = roles.Select(r => new RoleDetailDto
        {
            Id = r.Id,
            Name = r.Name ?? "",
            Permissions = rolePermissions
                .Where(rp => rp.RoleId == r.Id)
                .Select(rp => MapPermission(rp.Permission!))
                .ToList()
        }).ToList();

        return new PermissionMatrixDto
        {
            AllPermissions = allPermissions.Select(MapPermission).ToList(),
            Roles = roleDtos
        };
    }

    public async Task CreateRoleAsync(CreateRoleRequest request)
    {
        var exists = await _roleManager.RoleExistsAsync(request.Name);
        if (exists)
            throw new Exception($"Le role '{request.Name}' existe deja");

        var result = await _roleManager.CreateAsync(new IdentityRole<Guid>(request.Name));
        if (!result.Succeeded)
            throw new Exception(string.Join(", ", result.Errors.Select(e => e.Description)));
    }

    public async Task DeleteRoleAsync(Guid roleId)
    {
        var role = await _dbContext.Roles.FindAsync(roleId);
        if (role == null) return;

        // Supprimer les permissions associ�es
        var rolePermissions = await _dbContext.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .ToListAsync();
        _dbContext.RolePermissions.RemoveRange(rolePermissions);

        // Supprimer les associations utilisateurs
        var userRoles = await _dbContext.UserRoles
            .Where(ur => ur.RoleId == roleId)
            .ToListAsync();
        _dbContext.UserRoles.RemoveRange(userRoles);

        _dbContext.Roles.Remove(role);
        await _dbContext.SaveChangesAsync();
    }

    public async Task AssignPermissionsAsync(Guid roleId, AssignPermissionsRequest request)
    {
        var roleExists = await _dbContext.Roles.AnyAsync(role => role.Id == roleId);
        if (!roleExists)
            throw new KeyNotFoundException("Le role est introuvable.");

        var permissionIds = request.PermissionIds.Distinct().ToList();
        var validPermissionCount = await _dbContext.Permissions
            .CountAsync(permission => permissionIds.Contains(permission.Id));
        if (validPermissionCount != permissionIds.Count)
            throw new ArgumentException("Une ou plusieurs permissions sont introuvables.");

        // Supprimer toutes les permissions actuelles du role
        var existing = await _dbContext.RolePermissions
            .Where(rp => rp.RoleId == roleId)
            .ToListAsync();
        _dbContext.RolePermissions.RemoveRange(existing);

        // Ajouter les nouvelles permissions
        foreach (var permissionId in permissionIds)
        {
            _dbContext.RolePermissions.Add(new RolePermission
            {
                RoleId = roleId,
                PermissionId = permissionId
            });
        }

        await _dbContext.SaveChangesAsync();
    }

    private PermissionDto MapPermission(Permission p)
    {
        return new PermissionDto
        {
            Id = p.Id,
            Code = p.Code,
            Name = p.Name,
            Module = p.Module,
            Description = p.Description,
            Order = p.Order
        };
    }
}