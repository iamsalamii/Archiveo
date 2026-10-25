using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
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
    /// de l'adresse IP cliente distante derrière un reverse proxy (Phases 5A, 5B et 5B-2).
    /// Applique une validation sémantique stricte des réseaux et proxys de confiance (fail-fast au démarrage).
    /// </summary>
    public static IServiceCollection AddConfiguredForwardedHeaders(this IServiceCollection services, IConfiguration? configuration = null)
    {
        // 1. Validation immédiate fail-fast au démarrage lors de l'enregistrement du service
        if (configuration != null)
        {
            var configuredProxies = configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>();
            if (configuredProxies != null)
            {
                foreach (var proxy in configuredProxies)
                {
                    if (string.IsNullOrWhiteSpace(proxy)) continue;
                    if (!IPAddress.TryParse(proxy.Trim(), out _))
                    {
                        throw new InvalidOperationException($"Configuration ForwardedHeaders:KnownProxies invalide : la valeur '{proxy}' n'est pas une adresse IP valide.");
                    }
                }
            }

            var networkStrings = ExtractConfiguredNetworkStrings(configuration);
            foreach (var netStr in networkStrings)
            {
                // Valide et lève une InvalidOperationException explicite si syntaxiquement invalide ou sémantiquement dangereux
                ParseAndValidateTrustedNetwork(netStr);
            }
        }

        // 2. Enregistrement des options dans le conteneur DI
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
                        if (!string.IsNullOrWhiteSpace(proxy) && IPAddress.TryParse(proxy.Trim(), out var ip))
                        {
                            options.KnownProxies.Add(ip);
                        }
                    }
                }

                var networkStrings = ExtractConfiguredNetworkStrings(configuration);
                foreach (var networkStr in networkStrings)
                {
                    var network = ParseAndValidateTrustedNetwork(networkStr);
                    options.KnownNetworks.Add(network);
                }
            }
        });

        return services;
    }

    /// <summary>
    /// Valide la syntaxe pure d'une chaîne CIDR (ex: "172.16.0.0/12").
    /// Ne porte aucun jugement sur l'acceptabilité sémantique pour la confiance (ex: 0.0.0.0/0 est syntaxiquement valide).
    /// </summary>
    public static bool TryParseCidrSyntax(string? cidr, out IPAddress? prefix, out int prefixLength)
    {
        prefix = null;
        prefixLength = -1;

        if (string.IsNullOrWhiteSpace(cidr))
        {
            return false;
        }

        var parts = cidr.Trim().Split('/');
        if (parts.Length != 2)
        {
            return false;
        }

        if (!IPAddress.TryParse(parts[0], out var parsedIp))
        {
            return false;
        }

        if (!int.TryParse(parts[1], out var parsedPrefixLength))
        {
            return false;
        }

        int maxPrefixLength = parsedIp.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork ? 32 : 128;
        if (parsedPrefixLength < 0 || parsedPrefixLength > maxPrefixLength)
        {
            return false;
        }

        prefix = parsedIp;
        prefixLength = parsedPrefixLength;
        return true;
    }

    /// <summary>
    /// Valide sémantiquement si un sous-réseau est acceptable comme réseau de reverse proxies de confiance.
    /// Rejette expressément les plages universelles (0.0.0.0/0, ::/0) et les adresses non-unicast TCP (multicast, broadcast).
    /// </summary>
    public static bool IsAcceptableTrustedNetwork(IPAddress prefix, int prefixLength, out string? failureReason)
    {
        failureReason = null;

        // Règle 1 : Interdiction formelle des plages universelles (prefixLength == 0)
        // 0.0.0.0/0 ou ::/0 englobent tout l'espace d'adressage et anéantiraient toute sécurité
        if (prefixLength == 0)
        {
            failureReason = $"La plage universelle '{prefix}/{prefixLength}' (prefixLength=0) ne peut pas être utilisée comme réseau de confiance car elle accorderait une confiance aveugle à l'intégralité d'Internet.";
            return false;
        }

        // Règle 2 : Interdiction des adresses de diffusion ou multicast
        if (prefix.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            var bytes = prefix.GetAddressBytes();

            // Broadcast IPv4 (255.255.255.255)
            if (bytes[0] == 255 && bytes[1] == 255 && bytes[2] == 255 && bytes[3] == 255)
            {
                failureReason = $"L'adresse de diffusion '{prefix}/{prefixLength}' ne peut pas être un reverse proxy TCP entrant.";
                return false;
            }

            // Multicast IPv4 (224.0.0.0/4 : 224.x.x.x à 239.x.x.x)
            if (bytes[0] >= 224 && bytes[0] <= 239)
            {
                failureReason = $"La plage multicast IPv4 '{prefix}/{prefixLength}' ne peut pas établir de connexions TCP unicast.";
                return false;
            }
        }
        else if (prefix.AddressFamily == System.Net.Sockets.AddressFamily.InterNetworkV6)
        {
            // Multicast IPv6 (ff00::/8)
            if (prefix.IsIPv6Multicast)
            {
                failureReason = $"La plage multicast IPv6 '{prefix}/{prefixLength}' ne peut pas établir de connexions TCP unicast.";
                return false;
            }
        }

        return true;
    }

    /// <summary>
    /// Tente de parser et de valider sémantiquement un CIDR pour KnownNetworks.
    /// Renvoie true uniquement si le format est syntaxiquement valide ET sémantiquement acceptable pour la confiance.
    /// </summary>
    public static bool TryParseCidr(string? cidr, out Microsoft.AspNetCore.HttpOverrides.IPNetwork? network)
    {
        network = null;
        if (!TryParseCidrSyntax(cidr, out var prefix, out var prefixLength) || prefix == null)
        {
            return false;
        }

        if (!IsAcceptableTrustedNetwork(prefix, prefixLength, out _))
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

    /// <summary>
    /// Parse et valide rigoureusement un sous-réseau de confiance.
    /// Lève une InvalidOperationException explicite (fail-fast) en cas d'erreur syntaxique ou sémantique.
    /// </summary>
    public static Microsoft.AspNetCore.HttpOverrides.IPNetwork ParseAndValidateTrustedNetwork(string rawNetwork)
    {
        if (string.IsNullOrWhiteSpace(rawNetwork))
        {
            throw new InvalidOperationException("Configuration ForwardedHeaders:KnownNetworks invalide : une entrée vide ou blanche a été fournie.");
        }

        var trimmed = rawNetwork.Trim();

        if (!TryParseCidrSyntax(trimmed, out var prefix, out var prefixLength) || prefix == null)
        {
            throw new InvalidOperationException($"Configuration ForwardedHeaders:KnownNetworks invalide : la valeur '{trimmed}' n'est pas un format CIDR valide (attendu : 'adresse/masque', ex: '172.16.0.0/12').");
        }

        if (!IsAcceptableTrustedNetwork(prefix, prefixLength, out var failureReason))
        {
            throw new InvalidOperationException($"Configuration ForwardedHeaders:KnownNetworks rejetée : {failureReason}");
        }

        return new Microsoft.AspNetCore.HttpOverrides.IPNetwork(prefix, prefixLength);
    }

    /// <summary>
    /// Extrait les chaînes de réseaux configurées en prenant en charge aussi bien les tableaux
    /// (indices __0, __1...) que les chaînes uniques délimitées par des virgules ou points-virgules
    /// (ex: "172.16.0.0/12, 10.0.0.0/8").
    /// </summary>
    public static List<string> ExtractConfiguredNetworkStrings(IConfiguration configuration)
    {
        var result = new List<string>();

        // 1. Essai de lecture en tant que tableau (KnownNetworks:0, KnownNetworks:1...)
        var arrayValues = configuration.GetSection("ForwardedHeaders:KnownNetworks").Get<string[]>();
        if (arrayValues != null && arrayValues.Length > 0)
        {
            foreach (var item in arrayValues)
            {
                if (!string.IsNullOrWhiteSpace(item))
                {
                    var subItems = item.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                    foreach (var sub in subItems)
                    {
                        var trimmed = sub.Trim();
                        if (!string.IsNullOrEmpty(trimmed))
                        {
                            result.Add(trimmed);
                        }
                    }
                }
            }
        }
        else
        {
            // 2. Essai de lecture en tant que chaîne unique (ex: "ForwardedHeaders:KnownNetworks"="172.16.0.0/12, 10.0.0.0/8")
            var singleValue = configuration.GetValue<string>("ForwardedHeaders:KnownNetworks");
            if (!string.IsNullOrWhiteSpace(singleValue))
            {
                var subItems = singleValue.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
                foreach (var sub in subItems)
                {
                    var trimmed = sub.Trim();
                    if (!string.IsNullOrEmpty(trimmed))
                    {
                        result.Add(trimmed);
                    }
                }
            }
        }

        return result;
    }
}
