using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Archiveo.Api.Filters;

public class AuditActionFilter : IAsyncActionFilter
{
    private readonly IServiceScopeFactory _scopeFactory;

    public AuditActionFilter(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var executed = await next();

        var http = context.HttpContext;
        var route = http.Request.Path.Value ?? "";

        // Ne pas logger la lecture de l'audit ni le health
        if (route.StartsWith("/api/audit")) return;

        // Ne logger que les verbes qui modifient + les lectures importantes
        var method = http.Request.Method;

        var controller = context.RouteData.Values["controller"]?.ToString() ?? "";
        var action = context.RouteData.Values["action"]?.ToString() ?? "";

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        db.AuditLogs.Add(new AuditLog
        {
            Id = Guid.NewGuid(),
            UserName = http.User.Identity?.Name ?? "anonyme",
            UserId = http.User.FindFirstValue(ClaimTypes.NameIdentifier),
            Action = method,
            Target = $"{controller}/{action}",
            TargetType = controller,
            StatusCode = http.Response.StatusCode,
            IpAddress = http.Connection.RemoteIpAddress?.ToString() ?? "",
            UserAgent = http.Request.Headers["User-Agent"].ToString(),
            Timestamp = DateTime.UtcNow
        });

        await db.SaveChangesAsync();
    }
}