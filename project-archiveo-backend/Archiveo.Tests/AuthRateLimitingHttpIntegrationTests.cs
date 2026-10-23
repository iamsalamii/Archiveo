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
/// Suite de tests d'intégration HTTP traversant le pipeline ASP.NET Core réel via TestServer (Phase 4D-2).
/// Valide le comportement du Rate Limiter (AuthLoginPolicy) de bout en bout :
/// - Véritables requêtes et réponses HTTP via HttpClient
/// - Traversée du middleware UseRateLimiter() et des attributs [EnableRateLimiting]
/// - Isolation PostgreSQL absolue (0 connexion vers les ports 5432/5433, aucune migration)
/// - Simulation d'adresses IP distantes stricte et déterministe via middleware dédié de test
/// </summary>
public class AuthRateLimitingHttpIntegrationTests
{
    private (TestServer Server, HttpClient Client, SpyUserStore UserStore, string DbName) CreateIsolatedTestServer()
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

                // Configuration du Rate Limiting réel de production (.NET 9)
                services.AddAuthRateLimiting();
            })
            .Configure(app =>
            {
                // Middleware de simulation d'IP distante exclusif au harnais de test
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
                            // IP non parseable : repli déterministe sans accepter de valeur invalide
                            context.Connection.RemoteIpAddress = IPAddress.Loopback;
                        }
                    }
                    else
                    {
                        // En-tête absent : repli déterministe
                        context.Connection.RemoteIpAddress = IPAddress.Loopback;
                    }

                    await next();
                });

                app.UseRouting();
                app.UseRateLimiter();
                app.UseEndpoints(endpoints =>
                {
                    endpoints.MapControllers();
                });
            });

        var server = new TestServer(builder);
        var client = server.CreateClient();
        return (server, client, spyUserStore, inMemoryDbName);
    }

    private HttpRequestMessage CreateLoginRequest(string ipAddress)
    {
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login")
        {
            Content = JsonContent.Create(new LoginRequest
            {
                Email = "test.agent@archiveo.local",
                Password = "InvalidPassword123!"
            })
        };
        request.Headers.Add("X-Test-IP", ipAddress);
        return request;
    }

    [Fact]
    public async Task Scenario_S1_UnderQuota_FirstTenRequests_AreAllowedThroughAndReturn401()
    {
        // S1 : Les 10 premières requêtes consécutives sous le quota nominal de 10 req/min
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip = "198.51.100.10";

            for (int i = 1; i <= AuthRateLimitingConfig.DefaultPermitLimit; i++)
            {
                using var request = CreateLoginRequest(ip);
                using var response = await client.SendAsync(request);

                // Doit traverser jusqu'au contrôleur et retourner 401 Unauthorized
                Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
                Assert.False(response.Headers.Contains("Retry-After"), $"La requête #{i} sous quota ne doit pas comporter Retry-After.");
            }

            // Vérification que le service métier d'authentification a bien été sollicité 10 fois
            Assert.Equal(10, spyStore.FindByEmailCallCount);
        }
    }

    [Fact]
    public async Task Scenario_S2_ExceedQuota_EleventhRequest_Returns429_WithRetryAfter_AndShortCircuitsPipeline()
    {
        // S2 : La 11e requête consécutive depuis la même IP dépasse le quota et court-circuite le contrôleur
        var (server, client, spyStore, dbName) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip = "198.51.100.20";

            // Épuiser le quota de 10
            for (int i = 1; i <= 10; i++)
            {
                using var req = CreateLoginRequest(ip);
                using var res = await client.SendAsync(req);
                Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
            }

            Assert.Equal(10, spyStore.FindByEmailCallCount);

            // 11e requête : dépassement de quota
            using var eleventhReq = CreateLoginRequest(ip);
            using var eleventhRes = await client.SendAsync(eleventhReq);

            // Assertions HTTP
            Assert.Equal(HttpStatusCode.TooManyRequests, eleventhRes.StatusCode);
            Assert.True(eleventhRes.Headers.Contains("Retry-After"), "La réponse 429 doit contenir l'en-tête 'Retry-After'.");

            var retryAfterValues = eleventhRes.Headers.GetValues("Retry-After");
            var retryAfterStr = Assert.Single(retryAfterValues);
            Assert.True(int.TryParse(retryAfterStr, out var seconds), "L'en-tête Retry-After doit être un entier valide.");
            Assert.True(seconds > 0, "L'en-tête Retry-After doit spécifier une durée positive.");

            // Le pipeline a été court-circuité : AuthService NE DOIT PAS être appelé pour la 11e requête
            Assert.Equal(10, spyStore.FindByEmailCallCount);

            // Vérification des logs d'audit en mémoire : seuls les 10 appels sous quota ont été audités
            using var scope = server.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var auditCount = await db.AuditLogs.CountAsync();
            Assert.Equal(10, auditCount);
        }
    }

    [Fact]
    public async Task Scenario_S3_JsonResponseFormat_MatchesContractStrictly()
    {
        // S3 : Vérification du contrat JSON retourné par HandleOnRejectedAsync
        var (server, client, _, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip = "198.51.100.30";

            // Épuiser le quota
            for (int i = 0; i < 10; i++)
            {
                using var req = CreateLoginRequest(ip);
                await client.SendAsync(req);
            }

            // Déclencher le 429
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
    public async Task Scenario_S4_IpPartitioning_AllowsIndependentTrafficFromOtherIps()
    {
        // S4 : Partitionnement IP - une seconde IP n'est pas bloquée par la saturation de la première
        var (server, client, spyStore, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip1 = "198.51.100.41";
            const string ip2 = "198.51.100.42";

            // Saturer IP 1
            for (int i = 0; i < 11; i++)
            {
                using var req = CreateLoginRequest(ip1);
                await client.SendAsync(req);
            }

            // Vérifier que IP 1 est bien bloquée
            using var blockedReq = CreateLoginRequest(ip1);
            using var blockedRes = await client.SendAsync(blockedReq);
            Assert.Equal(HttpStatusCode.TooManyRequests, blockedRes.StatusCode);

            // IP 2 émet une requête : doit être acceptée sous son propre quota
            using var ip2Req = CreateLoginRequest(ip2);
            using var ip2Res = await client.SendAsync(ip2Req);

            Assert.Equal(HttpStatusCode.Unauthorized, ip2Res.StatusCode);
            Assert.False(ip2Res.Headers.Contains("Retry-After"));

            // Les 10 premières d'IP 1 + la première d'IP 2 = 11 appels à AuthService
            Assert.Equal(11, spyStore.FindByEmailCallCount);
        }
    }

    [Fact]
    public async Task Scenario_S5_UnprotectedEndpoints_AreNotLimitedByAuthLoginPolicy()
    {
        // S5 : Vérifie qu'un endpoint non protégé par AuthLoginPolicy (ex: POST /api/auth/logout) n'est pas limité
        var (server, client, _, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            const string ip = "198.51.100.50";

            // Émettre 15 requêtes consécutives vers logout depuis la même IP
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
    public void Scenario_S6_Isolation_NoPostgresConnectionStringOrMigrationExecuted()
    {
        // S6 : Démontre l'isolation totale : la configuration n'utilise aucune chaîne de connexion PostgreSQL
        var (server, client, _, _) = CreateIsolatedTestServer();
        using (server)
        using (client)
        {
            using var scope = server.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            // Le provider utilisé doit impérativement être InMemory
            Assert.Equal("Microsoft.EntityFrameworkCore.InMemory", db.Database.ProviderName);
            Assert.False(db.Database.IsNpgsql(), "Le test ne doit en aucun cas utiliser le provider Npgsql.");
        }
    }
}
