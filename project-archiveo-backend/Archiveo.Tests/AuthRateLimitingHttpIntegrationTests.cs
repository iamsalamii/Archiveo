using Archiveo.Api.Controllers;
using Archiveo.Api.Filters;
using Archiveo.Api.Security;
using Archiveo.Application.DTOs.Auth;
using Archiveo.Application.Services;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Archiveo.Infrastructure.Services;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Doublure de test en mémoire (Spy) pour IUserStore/IUserEmailStore.
/// Permet d'observer rigoureusement les invocations d'authentification
/// sans aucune dépendance à PostgreSQL ni exécution de requêtes relationnelles.
/// </summary>
public class SpyUserStore : IUserStore<User>, IUserEmailStore<User>
{
    private int _findByEmailCallCount;
    public int FindByEmailCallCount => _findByEmailCallCount;

    public Task<User?> FindByEmailAsync(string normalizedEmail, CancellationToken cancellationToken)
    {
        Interlocked.Increment(ref _findByEmailCallCount);
        // Retourne null de manière déterministe : simule un échec d'authentification (401)
        return Task.FromResult<User?>(null);
    }

    public Task<string?> GetEmailAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.Email);
    public Task<bool> GetEmailConfirmedAsync(User user, CancellationToken cancellationToken) => Task.FromResult(false);
    public Task SetEmailAsync(User user, string? email, CancellationToken cancellationToken) => Task.CompletedTask;
    public Task SetEmailConfirmedAsync(User user, bool confirmed, CancellationToken cancellationToken) => Task.CompletedTask;
    public Task<string?> GetNormalizedEmailAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.NormalizedEmail);
    public Task SetNormalizedEmailAsync(User user, string? normalizedEmail, CancellationToken cancellationToken) => Task.CompletedTask;

    public Task<IdentityResult> CreateAsync(User user, CancellationToken cancellationToken) => Task.FromResult(IdentityResult.Success);
    public Task<IdentityResult> DeleteAsync(User user, CancellationToken cancellationToken) => Task.FromResult(IdentityResult.Success);
    public Task<User?> FindByIdAsync(string userId, CancellationToken cancellationToken) => Task.FromResult<User?>(null);
    public Task<User?> FindByNameAsync(string normalizedUserName, CancellationToken cancellationToken) => Task.FromResult<User?>(null);
    public Task<string?> GetNormalizedUserNameAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.NormalizedUserName);
    public Task<string> GetUserIdAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.Id.ToString());
    public Task<string?> GetUserNameAsync(User user, CancellationToken cancellationToken) => Task.FromResult(user.UserName);
    public Task SetNormalizedUserNameAsync(User user, string? normalizedName, CancellationToken cancellationToken) => Task.CompletedTask;
    public Task SetUserNameAsync(User user, string? userName, CancellationToken cancellationToken) => Task.CompletedTask;
    public Task<IdentityResult> UpdateAsync(User user, CancellationToken cancellationToken) => Task.FromResult(IdentityResult.Success);
    public void Dispose() { }
}

/// <summary>
/// Suite de tests d'intégration HTTP traversant le pipeline ASP.NET Core réel via TestServer (Phases 4D-2 et 5A).
/// Valide le comportement du Rate Limiter (AuthLoginPolicy) et la résolution sécurisée derrière Reverse Proxy :
/// - Véritables requêtes et réponses HTTP via HttpClient
/// - Traversée de UseForwardedHeaders() et UseRateLimiter() dans l'ordre de production
/// - Résolution de l'IP cliente depuis X-Forwarded-For uniquement pour les proxys de confiance (Loopback / configurés)
/// - Rejet strict des falsifications d'en-têtes par des pairs non autorisés
/// - Isolation PostgreSQL absolue (0 connexion vers les ports 5432/5433, aucune migration)
/// </summary>
public class AuthRateLimitingHttpIntegrationTests
{
    private (TestServer Server, HttpClient Client, SpyUserStore UserStore, string DbName) CreateIsolatedTestServer(IConfiguration? configuration = null)
    {
        var spyUserStore = new SpyUserStore();
        var inMemoryDbName = $"Test_RateLimiting_{Guid.NewGuid()}";

        var builder = new WebHostBuilder()
            .ConfigureServices(services =>
            {
                services.AddLogging(b => b.AddDebug());
                services.AddRouting();
                services.AddControllers(options =>
                {
                    options.Filters.Add<AuditActionFilter>();
                }).AddApplicationPart(typeof(AuthController).Assembly);

                // ApplicationDbContext 100% en mémoire pour les filtres d'audit et les services
                services.AddDbContext<ApplicationDbContext>(options =>
                {
                    options.UseInMemoryDatabase(inMemoryDbName);
                });

                // Identity en mémoire utilisant notre SpyUserStore
                services.AddIdentity<User, IdentityRole<Guid>>()
                    .AddEntityFrameworkStores<ApplicationDbContext>()
                    .AddDefaultTokenProviders();

                services.AddScoped<IUserStore<User>>(_ => spyUserStore);
                services.AddScoped<IUserEmailStore<User>>(_ => spyUserStore);
                services.AddScoped<AuthService>();
                services.AddScoped<PermissionService>();
                services.AddScoped<AuditService>();
                services.AddHttpContextAccessor();

                // Configuration stricte des ForwardedHeaders de production (Phase 5A)
                services.AddConfiguredForwardedHeaders(configuration);

                // Configuration du Rate Limiting réel de production (.NET 9)
                services.AddAuthRateLimiting();
            })
            .Configure(app =>
            {
                // Middleware de simulation du pair TCP distant (exclusif au harnais de test)
                app.Use(async (context, next) =>
                {
                    if (context.Request.Headers.TryGetValue("X-Test-IP", out var headerVal))
                    {
                        var rawIp = headerVal.ToString();
                        if (IPAddress.TryParse(rawIp, out var parsedIp))
                        {
                            context.Connection.RemoteIpAddress = parsedIp;
                        }
                        else
                        {
                            // IP non parseable : repli déterministe
                            context.Connection.RemoteIpAddress = IPAddress.Loopback;
                        }
                    }
                    else
                    {
                        // En-tête absent : repli déterministe sur Loopback
                        context.Connection.RemoteIpAddress = IPAddress.Loopback;
                    }

                    await next();
                });

                // Ordre de production : UseForwardedHeaders avant UseRateLimiter
                app.UseForwardedHeaders();

                app.UseRouting();
                app.UseRateLimiter();
                app.UseEndpoints(endpoints =>
                {
                    endpoints.MapControllers();
                    endpoints.MapGet("/api/test/remote-ip-probe", async ctx =>
                    {
                        await ctx.Response.WriteAsync(ctx.Connection.RemoteIpAddress?.ToString() ?? "null");
                    });
                    endpoints.MapGet("/api/test/scheme-probe", async ctx =>
                    {
                        await ctx.Response.WriteAsync(ctx.Request.Scheme);
                    });
                });
            });

        var server = new TestServer(builder);
        var client = server.CreateClient();
        return (server, client, spyUserStore, inMemoryDbName);
    }

    private HttpRequestMessage CreateLoginRequest(string peerIp, string? forwardedFor = null, string? forwardedProto = null)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new LoginRequest
            {
                Email = "test.agent@archiveo.local",
                Password = "InvalidPassword123!"
            })
        };
        request.Headers.Add("X-Test-IP", peerIp);
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            request.Headers.Add("X-Forwarded-For", forwardedFor);
        }
        if (!string.IsNullOrEmpty(forwardedProto))
        {
            request.Headers.Add("X-Forwarded-Proto", forwardedProto);
        }
        return request;
    }

    // =========================================================================
    // SCÉNARIOS PHASE 5A : RÉSOLUTION IP DERRIÈRE REVERSE PROXY (T1 à T5)
    // =========================================================================

    [Fact]
    public async Task Scenario_T1_TrustedProxy_ValidXForwardedFor_UsesClientIpForRateLimiting()
    {
        // T1 : Une requête provenant du proxy autorisé (127.0.0.1) avec un X-Forwarded-For valide
        // utilise l'IP cliente attendue pour la partition du rate limiter.
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string proxyIp = "127.0.0.1";
            const string clientIp = "203.0.113.10";

            // 10 requêtes sous quota
            for (int i = 1; i <= AuthRateLimitingConfig.DefaultPermitLimit; i++)
            {
                using var req = CreateLoginRequest(proxyIp, clientIp);
                using var res = await client.SendAsync(req);
                Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
                Assert.False(res.Headers.Contains("Retry-After"));
            }

            Assert.Equal(10, spyStore.FindByEmailCallCount);

            // 11e requête : doit dépasser le quota de l'IP cliente (429)
            using var req11 = CreateLoginRequest(proxyIp, clientIp);
            using var res11 = await client.SendAsync(req11);

            Assert.Equal(HttpStatusCode.TooManyRequests, res11.StatusCode);
            Assert.True(res11.Headers.Contains("Retry-After"));
            Assert.Equal(10, spyStore.FindByEmailCallCount); // AuthService court-circuité
        }
    }

    [Fact]
    public async Task Scenario_T2_TrustedProxy_DistinctClients_HaveIndependentQuotas()
    {
        // T2 : Deux IP clientes distinctes transmises par le proxy de confiance disposent de quotas indépendants.
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string proxyIp = "127.0.0.1";
            const string client1 = "203.0.113.21";
            const string client2 = "203.0.113.22";

            // Saturer Client 1 (11 requêtes)
            for (int i = 0; i < 11; i++)
            {
                using var req = CreateLoginRequest(proxyIp, client1);
                await client.SendAsync(req);
            }

            // Client 1 est bloqué
            using var reqBlocked = CreateLoginRequest(proxyIp, client1);
            using var resBlocked = await client.SendAsync(reqBlocked);
            Assert.Equal(HttpStatusCode.TooManyRequests, resBlocked.StatusCode);

            // Client 2 transite par le MÊME proxy : ne doit PAS être bloqué par Client 1 !
            using var reqClient2 = CreateLoginRequest(proxyIp, client2);
            using var resClient2 = await client.SendAsync(reqClient2);

            Assert.Equal(HttpStatusCode.Unauthorized, resClient2.StatusCode);
            Assert.False(resClient2.Headers.Contains("Retry-After"));
            Assert.Equal(11, spyStore.FindByEmailCallCount); // 10 de Client 1 + 1 de Client 2
        }
    }

    [Fact]
    public async Task Scenario_T3_UntrustedPeer_SpoofedXForwardedFor_IsIgnoredAndCannotBypassRateLimiter()
    {
        // T3 : Un client non autorisé (pair direct untrusted) ne peut pas modifier sa partition en fournissant arbitrairement X-Forwarded-For.
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string untrustedPeerIp = "198.51.100.99";

            // L'attaquant envoie 10 requêtes avec un X-Forwarded-For forgé
            for (int i = 1; i <= 10; i++)
            {
                using var req = CreateLoginRequest(untrustedPeerIp, $"203.0.113.{i}");
                using var res = await client.SendAsync(req);
                Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
            }

            Assert.Equal(10, spyStore.FindByEmailCallCount);

            // À la 11e requête, l'attaquant change son X-Forwarded-For pour tenter d'échapper au rate limiter
            using var reqEvasion = CreateLoginRequest(untrustedPeerIp, "192.0.2.254");
            using var resEvasion = await client.SendAsync(reqEvasion);

            // Puisque untrustedPeerIp n'est pas dans KnownProxies, X-Forwarded-For a été ignoré !
            // La partition est restée indexée sur untrustedPeerIp -> la 11e requête est bloquée en 429 !
            Assert.Equal(HttpStatusCode.TooManyRequests, resEvasion.StatusCode);
            Assert.Equal(10, spyStore.FindByEmailCallCount);
        }
    }

    [Fact]
    public async Task Scenario_T4_HeaderChain_MultipleValues_RespectsForwardLimitOne()
    {
        // T4 : Les valeurs multiples dans X-Forwarded-For ne permettent pas de contourner la limite ; ForwardLimit = 1 est respecté.
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string proxyIp = "127.0.0.1";
            // Chaîne à deux sauts : client réel (proche du proxy) = 203.0.113.30, IP forgée en amont = 198.51.100.1
            const string headerChain = "198.51.100.1, 203.0.113.30";

            for (int i = 1; i <= 10; i++)
            {
                using var req = CreateLoginRequest(proxyIp, headerChain);
                using var res = await client.SendAsync(req);
                Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
            }

            // 11e requête avec la même chaîne : doit être bloquée sur l'IP résolue (203.0.113.30)
            using var req11 = CreateLoginRequest(proxyIp, headerChain);
            using var res11 = await client.SendAsync(req11);

            Assert.Equal(HttpStatusCode.TooManyRequests, res11.StatusCode);
        }
    }

    [Fact]
    public async Task Scenario_T4_B_DynamicUpstreamSpoofing_SharesSamePartitionAndReachesQuota()
    {
        // T4-B : Renforcement anti-usurpation dynamique (Phase 5A-2).
        // Scénario : un client distant tente de saturer ou d'évader le rate limiter en injectant un en-tête falsifié
        // avec des adresses variables à gauche : "198.51.100.{i}, 203.0.113.30".
        // Le proxy de confiance (127.0.0.1) a reçu la requête depuis l'IP cliente réelle 203.0.113.30.
        // Avec ForwardLimit = 1 et parcours de droite à gauche, ForwardedHeadersMiddleware retient TOUJOURS
        // l'adresse 203.0.113.30 et ignore strictement la partie gauche variable.
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string proxyIp = "127.0.0.1";
            const string targetClientIp = "203.0.113.30";

            // 1. Preuve directe par la sonde que ForwardedHeadersMiddleware extrait l'IP de droite et non de gauche
            var probeReq = new HttpRequestMessage(HttpMethod.Get, "/api/test/remote-ip-probe");
            probeReq.Headers.Add("X-Test-IP", proxyIp);
            probeReq.Headers.Add("X-Forwarded-For", $"198.51.100.999, {targetClientIp}");
            using (var probeRes = await client.SendAsync(probeReq))
            {
                var probedIp = await probeRes.Content.ReadAsStringAsync();
                Assert.Equal(targetClientIp, probedIp); // Prouve que l'IP retenue est réellement 203.0.113.30 et non 198.51.100.999
            }

            // 2. Requêtes 1 à 10 : faire varier la valeur injectée à gauche à chaque requête
            for (int i = 1; i <= AuthRateLimitingConfig.DefaultPermitLimit; i++)
            {
                var dynamicChain = $"198.51.100.{i}, {targetClientIp}";
                using var req = CreateLoginRequest(proxyIp, dynamicChain);
                using var res = await client.SendAsync(req);

                Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
                Assert.False(res.Headers.Contains("Retry-After"));
            }

            Assert.Equal(10, spyStore.FindByEmailCallCount);

            // 3. 11e requête : l'attaquant injecte encore une IP de gauche différente (192.0.2.77)
            // Si le partitionnement dépendait de la valeur de gauche, la 11e requête aurait une nouvelle partition (192.0.2.77)
            // et renverrait 401 Unauthorized.
            // Mais parce que ForwardedHeadersMiddleware retient targetClientIp (203.0.113.30),
            // la partition est saturée (10/10) et la 11e requête est immédiatement bloquée en HTTP 429 !
            var evasionChain = $"192.0.2.77, {targetClientIp}";
            using var req11 = CreateLoginRequest(proxyIp, evasionChain);
            using var res11 = await client.SendAsync(req11);

            Assert.Equal(HttpStatusCode.TooManyRequests, res11.StatusCode);
            Assert.True(res11.Headers.Contains("Retry-After"));
            Assert.Equal(10, spyStore.FindByEmailCallCount); // AuthService non sollicité pour la 11e requête

            // 4. Preuve de non-contamination : un autre client légitime (203.0.113.31) via le MÊME proxy
            // avec une IP gauche réutilisée (198.51.100.1) n'est PAS bloqué.
            // Cela prouve que la partition est indexée strictement sur 203.0.113.30 et non sur 127.0.0.1 ni sur l'IP gauche.
            var otherClientChain = "198.51.100.1, 203.0.113.31";
            using var reqOther = CreateLoginRequest(proxyIp, otherClientChain);
            using var resOther = await client.SendAsync(reqOther);

            Assert.Equal(HttpStatusCode.Unauthorized, resOther.StatusCode);
            Assert.False(resOther.Headers.Contains("Retry-After"));
            Assert.Equal(11, spyStore.FindByEmailCallCount);
        }
    }

    [Fact]
    public async Task Scenario_T4_C_ForwardedProto_FromTrustedProxy_ResolvesSchemeToHttps()
    {
        // T4-C : Vérification de la résolution du Scheme HTTPS via X-Forwarded-Proto (Phase 5A-2).
        // Prouve que UseForwardedHeaders() résout correctement le Scheme avant UseHttpsRedirection().
        var (server, client, _, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string proxyIp = "127.0.0.1";

            // Requête depuis le proxy de confiance avec X-Forwarded-Proto: https
            var trustedReq = new HttpRequestMessage(HttpMethod.Get, "/api/test/scheme-probe");
            trustedReq.Headers.Add("X-Test-IP", proxyIp);
            trustedReq.Headers.Add("X-Forwarded-Proto", "https");

            using var trustedRes = await client.SendAsync(trustedReq);
            var trustedScheme = await trustedRes.Content.ReadAsStringAsync();
            Assert.Equal("https", trustedScheme);

            // Requête depuis un pair TCP non autorisé avec tentative de spoofing de schéma
            const string untrustedIp = "198.51.100.99";
            var untrustedReq = new HttpRequestMessage(HttpMethod.Get, "/api/test/scheme-probe");
            untrustedReq.Headers.Add("X-Test-IP", untrustedIp);
            untrustedReq.Headers.Add("X-Forwarded-Proto", "https");

            using var untrustedRes = await client.SendAsync(untrustedReq);
            var untrustedScheme = await untrustedRes.Content.ReadAsStringAsync();
            // Le pair n'est pas dans KnownProxies -> X-Forwarded-Proto est ignoré, le schéma reste http
            Assert.Equal("http", untrustedScheme);
        }
    }

    [Fact]
    public async Task Scenario_T5_DirectAccess_WithoutForwardedHeaders_PreservesNormalBehavior()
    {
        // T5 : Une requête directe sans en-tête transféré conserve le comportement nominal direct.
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string directIp = "198.51.100.40";

            for (int i = 1; i <= 10; i++)
            {
                using var req = CreateLoginRequest(directIp, forwardedFor: null);
                using var res = await client.SendAsync(req);
                Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
            }

            using var req11 = CreateLoginRequest(directIp, forwardedFor: null);
            using var res11 = await client.SendAsync(req11);

            Assert.Equal(HttpStatusCode.TooManyRequests, res11.StatusCode);
        }
    }

    // =========================================================================
    // SCÉNARIOS PHASE 5B : VALIDATION DU SOUS-RÉSEAU DOCKER BRIDGE (T7 à T9)
    // =========================================================================

    [Fact]
    public async Task Scenario_T7_KnownNetworks_DockerBridgeSubnet_ResolvesClientIpCorrectly()
    {
        // T7 : Validation du support de KnownNetworks (Phase 5B).
        // Scénario : Nginx sur l'hôte envoie une requête vers Kestrel dans le conteneur.
        // La requête traverse le bridge Docker (172.16.0.0/12) et arrive avec l'IP passerelle 172.18.0.1.
        // Avec ForwardedHeaders:KnownNetworks = ["172.16.0.0/12"], Kestrel reconnaît la passerelle
        // comme un proxy de confiance et résout correctement l'IP cliente réelle (203.0.113.88).
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ForwardedHeaders:KnownNetworks:0"] = "172.16.0.0/12"
            })
            .Build();

        var (server, client, spyStore, _) = CreateIsolatedTestServer(config);
        using (server)
        using (client)
        {
            const string dockerGatewayIp = "172.18.0.1";
            const string clientIp = "203.0.113.88";

            // 1. Sonde directe : l'IP résolue doit être clientIp et non la passerelle Docker
            var probeReq = new HttpRequestMessage(HttpMethod.Get, "/api/test/remote-ip-probe");
            probeReq.Headers.Add("X-Test-IP", dockerGatewayIp);
            probeReq.Headers.Add("X-Forwarded-For", clientIp);
            using (var probeRes = await client.SendAsync(probeReq))
            {
                var probedIp = await probeRes.Content.ReadAsStringAsync();
                Assert.Equal(clientIp, probedIp);
            }

            // 2. 10 requêtes sous quota pour clientIp
            for (int i = 1; i <= AuthRateLimitingConfig.DefaultPermitLimit; i++)
            {
                using var req = CreateLoginRequest(dockerGatewayIp, clientIp);
                using var res = await client.SendAsync(req);
                Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
            }

            Assert.Equal(10, spyStore.FindByEmailCallCount);

            // 3. 11e requête pour clientIp : doit retourner 429
            using var req11 = CreateLoginRequest(dockerGatewayIp, clientIp);
            using var res11 = await client.SendAsync(req11);
            Assert.Equal(HttpStatusCode.TooManyRequests, res11.StatusCode);
            Assert.True(res11.Headers.Contains("Retry-After"));

            // 4. Preuve de non-contamination : un autre client (203.0.113.89) via la MÊME passerelle n'est pas bloqué
            // Résout définitivement le risque de déni de service global (P0) !
            const string anotherClientIp = "203.0.113.89";
            using var reqOther = CreateLoginRequest(dockerGatewayIp, anotherClientIp);
            using var resOther = await client.SendAsync(reqOther);
            Assert.Equal(HttpStatusCode.Unauthorized, resOther.StatusCode);
            Assert.Equal(11, spyStore.FindByEmailCallCount);
        }
    }

    [Fact]
    public async Task Scenario_T8_KnownNetworks_UntrustedSubnetPeer_IsIgnoredAndCannotSpoofIp()
    {
        // T8 : Un pair TCP en dehors de KnownNetworks et KnownProxies ne peut pas forger d'IP.
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ForwardedHeaders:KnownNetworks:0"] = "172.16.0.0/12"
            })
            .Build();

        var (server, client, _, _) = CreateIsolatedTestServer(config);
        using (server)
        using (client)
        {
            const string untrustedPeerIp = "198.51.100.99";

            var probeReq = new HttpRequestMessage(HttpMethod.Get, "/api/test/remote-ip-probe");
            probeReq.Headers.Add("X-Test-IP", untrustedPeerIp);
            probeReq.Headers.Add("X-Forwarded-For", "203.0.113.88");

            using var probeRes = await client.SendAsync(probeReq);
            var probedIp = await probeRes.Content.ReadAsStringAsync();

            // 198.51.100.99 n'est pas dans 172.16.0.0/12 ni dans KnownProxies -> X-Forwarded-For est rejeté
            Assert.Equal(untrustedPeerIp, probedIp);
        }
    }

    [Fact]
    public void Scenario_T9_TryParseCidr_ValidAndInvalidFormats_HandledGracefully()
    {
        // T9 : Validation unitaire exhaustive de la robustesse de TryParseCidr
        // Formats valides IPv4
        Assert.True(AuthRateLimitingConfig.TryParseCidr("172.16.0.0/12", out var net1));
        Assert.NotNull(net1);
        Assert.True(net1.Contains(IPAddress.Parse("172.18.0.1")));
        Assert.False(net1.Contains(IPAddress.Parse("192.168.1.1")));

        Assert.True(AuthRateLimitingConfig.TryParseCidr("10.0.0.0/8", out var net2));
        Assert.NotNull(net2);
        Assert.True(net2.Contains(IPAddress.Parse("10.255.0.1")));

        Assert.True(AuthRateLimitingConfig.TryParseCidr("192.168.1.0/24", out var net3));
        Assert.NotNull(net3);

        Assert.True(AuthRateLimitingConfig.TryParseCidr("0.0.0.0/0", out var net4));
        Assert.NotNull(net4);

        // Formats valides IPv6
        Assert.True(AuthRateLimitingConfig.TryParseCidr("::1/128", out var net6));
        Assert.NotNull(net6);

        // Formats invalides : ne doivent lever AUCUNE exception et renvoyer false
        Assert.False(AuthRateLimitingConfig.TryParseCidr(null, out _));
        Assert.False(AuthRateLimitingConfig.TryParseCidr("", out _));
        Assert.False(AuthRateLimitingConfig.TryParseCidr("   ", out _));
        Assert.False(AuthRateLimitingConfig.TryParseCidr("172.16.0.0", out _)); // Manque le /masque
        Assert.False(AuthRateLimitingConfig.TryParseCidr("172.16.0.0/33", out _)); // Masque > 32 en IPv4
        Assert.False(AuthRateLimitingConfig.TryParseCidr("172.16.0.0/-1", out _)); // Masque négatif
        Assert.False(AuthRateLimitingConfig.TryParseCidr("invalid/24", out _)); // IP invalide
        Assert.False(AuthRateLimitingConfig.TryParseCidr("172.16.0.0/invalid", out _)); // Masque non numérique
        Assert.False(AuthRateLimitingConfig.TryParseCidr("172.16.0.0/12/34", out _)); // Trop de segments
    }

    // =========================================================================
    // SCÉNARIOS NON-RÉGRESSION PHASE 4D-2 (T6 / S1 à S6)
    // =========================================================================

    [Fact]
    public async Task Scenario_T6_S1_UnderQuota_FirstTenRequests_AreAllowedThroughAndReturn401()
    {
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip = "198.51.100.10";

            for (int i = 1; i <= AuthRateLimitingConfig.DefaultPermitLimit; i++)
            {
                using var request = CreateLoginRequest(ip);
                using var response = await client.SendAsync(request);

                Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
                Assert.False(response.Headers.Contains("Retry-After"));
            }

            Assert.Equal(10, spyStore.FindByEmailCallCount);
        }
    }

    [Fact]
    public async Task Scenario_T6_S2_ExceedQuota_EleventhRequest_Returns429_WithRetryAfter_AndShortCircuitsPipeline()
    {
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip = "198.51.100.20";

            for (int i = 1; i <= 10; i++)
            {
                using var req = CreateLoginRequest(ip);
                using var res = await client.SendAsync(req);
                Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
            }

            Assert.Equal(10, spyStore.FindByEmailCallCount);

            using var eleventhReq = CreateLoginRequest(ip);
            using var eleventhRes = await client.SendAsync(eleventhReq);

            Assert.Equal(HttpStatusCode.TooManyRequests, eleventhRes.StatusCode);
            Assert.True(eleventhRes.Headers.Contains("Retry-After"));

            var retryAfterValues = eleventhRes.Headers.GetValues("Retry-After");
            var retryAfterStr = Assert.Single(retryAfterValues);
            Assert.True(int.TryParse(retryAfterStr, out var seconds));
            Assert.True(seconds > 0);

            Assert.Equal(10, spyStore.FindByEmailCallCount);

            using var scope = server.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var auditCount = await db.AuditLogs.CountAsync();
            Assert.Equal(10, auditCount);
        }
    }

    [Fact]
    public async Task Scenario_T6_S3_JsonResponseFormat_MatchesContractStrictly()
    {
        var (server, client, _, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip = "198.51.100.30";

            for (int i = 0; i < 10; i++)
            {
                using var req = CreateLoginRequest(ip);
                await client.SendAsync(req);
            }

            using var req429 = CreateLoginRequest(ip);
            using var res429 = await client.SendAsync(req429);

            Assert.Equal(HttpStatusCode.TooManyRequests, res429.StatusCode);
            Assert.NotNull(res429.Content.Headers.ContentType);
            Assert.Equal("application/json", res429.Content.Headers.ContentType!.MediaType);

            var rawBody = await res429.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(rawBody);
            var root = doc.RootElement;

            Assert.True(root.TryGetProperty("status", out var statusProp));
            Assert.Equal(429, statusProp.GetInt32());

            Assert.True(root.TryGetProperty("message", out var msgProp));
            Assert.Equal("Trop de tentatives de connexion. Veuillez patienter avant de réessayer.", msgProp.GetString());
        }
    }

    [Fact]
    public async Task Scenario_T6_S4_IpPartitioning_AllowsIndependentTrafficFromOtherIps()
    {
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip1 = "198.51.100.41";
            const string ip2 = "198.51.100.42";

            for (int i = 0; i < 11; i++)
            {
                using var req = CreateLoginRequest(ip1);
                await client.SendAsync(req);
            }

            using var blockedReq = CreateLoginRequest(ip1);
            using var blockedRes = await client.SendAsync(blockedReq);
            Assert.Equal(HttpStatusCode.TooManyRequests, blockedRes.StatusCode);

            using var ip2Req = CreateLoginRequest(ip2);
            using var ip2Res = await client.SendAsync(ip2Req);

            Assert.Equal(HttpStatusCode.Unauthorized, ip2Res.StatusCode);
            Assert.False(ip2Res.Headers.Contains("Retry-After"));

            Assert.Equal(11, spyStore.FindByEmailCallCount);
        }
    }

    [Fact]
    public async Task Scenario_T6_S5_UnprotectedEndpoints_AreNotLimitedByAuthLoginPolicy()
    {
        var (server, client, _, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip = "198.51.100.50";

            for (int i = 1; i <= 15; i++)
            {
                using var logoutReq = new HttpRequestMessage(HttpMethod.Post, "/api/auth/logout");
                logoutReq.Headers.Add("X-Test-IP", ip);

                using var logoutRes = await client.SendAsync(logoutReq);
                Assert.Equal(HttpStatusCode.OK, logoutRes.StatusCode);
            }
        }
    }

    [Fact]
    public void Scenario_T6_S6_Isolation_NoPostgresConnectionStringOrMigrationExecuted()
    {
        var (server, client, _, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            using var scope = server.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            Assert.Equal("Microsoft.EntityFrameworkCore.InMemory", db.Database.ProviderName);
            Assert.False(db.Database.IsNpgsql(), "Le test ne doit en aucun cas utiliser le provider Npgsql.");
        }
    }
}
