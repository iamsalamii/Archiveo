using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Archiveo.Infrastructure.Services;

public class PermissionService
{
    private readonly ApplicationDbContext _dbContext;

    public PermissionService(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<string>> GetForUserAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await (
            from userRole in _dbContext.UserRoles
            join rolePermission in _dbContext.RolePermissions
                on userRole.RoleId equals rolePermission.RoleId
            join permission in _dbContext.Permissions
                on rolePermission.PermissionId equals permission.Id
            where userRole.UserId == userId
            select permission.Code
        )
        .Distinct()
        .OrderBy(code => code)
        .ToListAsync(cancellationToken);
    }
}