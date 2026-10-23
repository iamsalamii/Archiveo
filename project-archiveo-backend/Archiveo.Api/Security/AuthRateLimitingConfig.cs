using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Text.Json;
using System.Threading;
using System.Threading.RateLimiting;
using System.Threading.Tasks;

namespace Archiveo.Api.Security;

/// <summary>
/// Configuration centralisée du Rate Limiting pour l'authentification (Phase 4B).
/// Protège l'endpoint POST /api/auth/login contre les attaques par force brute et le credential stuffing,
/// tout en préservant les ressources CPU (hachage de mot de passe) et base de données (AuditLogs).
/// </summary>
public static class AuthRateLimitingConfig
{
    public const string PolicyName = "AuthLoginPolicy";
    public const int DefaultPermitLimit = 10;
    public static readonly TimeSpan DefaultWindow = TimeSpan.FromMinutes(1);
    public const int DefaultSegmentsPerWindow = 6;
    public const int DefaultQueueLimit = 0;

    /// <summary>
    /// Crée un PartitionedRateLimiter pour HttpContext basé sur l'adresse IP distante.
    /// Utilisé directement par la politique et vérifiable unitairement en isolation mémoire.
    /// </summary>
    public static PartitionedRateLimiter<HttpContext> CreateLimiter()
    {
        return PartitionedRateLimiter.Create<HttpContext, string>(context =>
        {
            var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            return RateLimitPartition.GetSlidingWindowLimiter(
                partitionKey: remoteIp,
                factory: _ => new SlidingWindowRateLimiterOptions
                {
                    PermitLimit = DefaultPermitLimit,
                    Window = DefaultWindow,
                    SegmentsPerWindow = DefaultSegmentsPerWindow,
                    QueueLimit = DefaultQueueLimit
                }
            );
        });
    }

    /// <summary>
    /// Gestionnaire de rejet uniforme pour les requêtes dépassant le quota (HTTP 429).
    /// </summary>
    public static async ValueTask HandleOnRejectedAsync(OnRejectedContext context, CancellationToken cancellationToken)
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;

        var logger = context.HttpContext.RequestServices
            .GetService<ILoggerFactory>()?
            .CreateLogger("Archiveo.Security.RateLimiting");

        var remoteIp = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "inconnue";
        var path = context.HttpContext.Request.Path;

        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter = ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString();
        }
        else
        {
            // Durée indicative basée sur la taille d'un segment de la fenêtre glissante (10s)
            var segmentSeconds = (int)Math.Ceiling(DefaultWindow.TotalSeconds / DefaultSegmentsPerWindow);
            context.HttpContext.Response.Headers.RetryAfter = segmentSeconds.ToString();
        }

        logger?.LogWarning("Dépassement du quota de requêtes sur {Path} depuis l'adresse IP {RemoteIp}.", path, remoteIp);

        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsync(
            JsonSerializer.Serialize(new
            {
                status = 429,
                message = "Trop de tentatives de connexion. Veuillez patienter avant de réessayer."
            }),
            cancellationToken
        );
    }

    /// <summary>
    /// Enregistre la politique de rate limiting dédiée à l'authentification dans le conteneur IoC.
    /// </summary>
    public static IServiceCollection AddAuthRateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = HandleOnRejectedAsync;

            options.AddPolicy(PolicyName, context =>
            {
                var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                return RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey: remoteIp,
                    factory: _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = DefaultPermitLimit,
                        Window = DefaultWindow,
                        SegmentsPerWindow = DefaultSegmentsPerWindow,
                        QueueLimit = DefaultQueueLimit
                    }
                );
            });
        });

        return services;
    }
}
