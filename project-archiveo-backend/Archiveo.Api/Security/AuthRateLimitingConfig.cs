using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
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

    /// <summary>
    /// Configure de manière stricte les en-têtes transférés (ForwardedHeaders) pour la résolution sécurisée
    /// de l'adresse IP cliente distante derrière un reverse proxy (Phase 5A).
    /// </summary>
    public static IServiceCollection AddConfiguredForwardedHeaders(this IServiceCollection services, IConfiguration? configuration = null)
    {
        services.Configure<ForwardedHeadersOptions>(options =>
        {
            options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
            options.ForwardLimit = 1;

            options.KnownProxies.Clear();
            options.KnownNetworks.Clear();

            // Proxys de confiance vérifiés par défaut : Loopback (Nginx sur hôte)
            options.KnownProxies.Add(IPAddress.Loopback);
            options.KnownProxies.Add(IPAddress.IPv6Loopback);

            if (configuration != null)
            {
                var configuredProxies = configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>();
                if (configuredProxies != null)
                {
                    foreach (var proxy in configuredProxies)
                    {
                        if (IPAddress.TryParse(proxy, out var ip))
                        {
                            options.KnownProxies.Add(ip);
                        }
                    }
                }

                var configuredNetworks = configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>();
                if (configuredNetworks != null)
                {
                    foreach (var networkStr in configuredNetworks)
                    {
                        if (TryParseCidr(networkStr, out var network) && network != null)
                        {
                            options.KnownNetworks.Add(network);
                        }
                    }
                }
            }
        });

        return services;
    }

    /// <summary>
    /// Tente de parser une chaîne de caractères au format CIDR (ex: "172.16.0.0/12")
    /// en instance valide de Microsoft.AspNetCore.HttpOverrides.IPNetwork.
    /// Valide rigoureusement la famille d'adresses (IPv4/IPv6) et la plage du masque.
    /// </summary>
    public static bool TryParseCidr(string? cidr, out Microsoft.AspNetCore.HttpOverrides.IPNetwork? network)
    {
        network = null;
        if (string.IsNullOrWhiteSpace(cidr))
        {
            return false;
        }

        var parts = cidr.Trim().Split('/');
        if (parts.Length != 2)
        {
            return false;
        }

        if (!IPAddress.TryParse(parts[0], out var prefix))
        {
            return false;
        }

        if (!int.TryParse(parts[1], out var prefixLength))
        {
            return false;
        }

        int maxPrefixLength = prefix.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 32 : 128;
        if (prefixLength < 0 || prefixLength > maxPrefixLength)
        {
            return false;
        }

        try
        {
            network = new Microsoft.AspNetCore.HttpOverrides.IPNetwork(prefix, prefixLength);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
