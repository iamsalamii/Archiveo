using Archiveo.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;

namespace Archiveo.Api.Authorization;

public static class PermissionPolicies
{
    public const string Prefix = "Permission:";
}

public sealed class PermissionAttribute : AuthorizeAttribute
{
    public PermissionAttribute(string permissionCode)
    {
        Policy = PermissionPolicies.Prefix + permissionCode;
    }
}

public sealed record PermissionRequirement(string PermissionCode) : IAuthorizationRequirement;

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly ApplicationDbContext _dbContext;

    public PermissionAuthorizationHandler(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userIdValue = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(userIdValue, out var userId))
            return;

        var hasPermission = await (
            from userRole in _dbContext.UserRoles
            join rolePermission in _dbContext.RolePermissions
                on userRole.RoleId equals rolePermission.RoleId
            join permission in _dbContext.Permissions
                on rolePermission.PermissionId equals permission.Id
            where userRole.UserId == userId && permission.Code == requirement.PermissionCode
            select permission.Id
        ).AnyAsync(context.Resource is HttpContext httpContext
            ? httpContext.RequestAborted
            : CancellationToken.None);

        if (hasPermission)
            context.Succeed(requirement);
    }
}

public sealed class PermissionPolicyProvider : DefaultAuthorizationPolicyProvider
{
    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
        : base(options)
    {
    }

    public override Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (!policyName.StartsWith(PermissionPolicies.Prefix, StringComparison.Ordinal))
            return base.GetPolicyAsync(policyName);

        var permissionCode = policyName[PermissionPolicies.Prefix.Length..];
        var policy = new AuthorizationPolicyBuilder()
            .RequireAuthenticatedUser()
            .AddRequirements(new PermissionRequirement(permissionCode))
            .Build();

        return Task.FromResult<AuthorizationPolicy?>(policy);
    }
}