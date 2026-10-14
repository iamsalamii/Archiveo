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

        // Ne pas logger la lecture de l'audit ni les requêtes de routine non-mutantes
        if (route.StartsWith("/api/audit", StringComparison.OrdinalIgnoreCase)) return;

        var method = http.Request.Method;
        var isMutating = HttpMethods.IsPost(method) || HttpMethods.IsPut(method) || 
                         HttpMethods.IsDelete(method) || HttpMethods.IsPatch(method);
        var isSensitiveRead = route.Contains("/download", StringComparison.OrdinalIgnoreCase);

        // Seules les opérations avec impact sur les données ou sensibles sont auditées en base
        if (!isMutating && !isSensitiveRead) return;

        var controller = context.RouteData.Values["controller"]?.ToString() ?? "";
        var action = context.RouteData.Values["action"]?.ToString() ?? "";

        try
        {
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
        catch
        {
            // Éviter qu'un échec de télémétrie d'audit n'interrompe la réponse utilisateur
        }
    }
}