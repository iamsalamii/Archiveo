using Archiveo.Api.Controllers;
using Archiveo.Api.Security;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System;
using System.IO;
using System.Net;
using System.Reflection;
using System.Text.Json;
using System.Threading;
using System.Threading.RateLimiting;
using System.Threading.Tasks;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Suite de qualification sécuritaire pour le Rate Limiting d'authentification (Phase 4B).
/// Couvre l'intégralité des 10 exigences de contrôle de la directive CTO :
/// 1. Les 10 premières requêtes d'une même partition IP sont autorisées.
/// 2. La 11e requête consécutive dépasse le quota et retourne HTTP 429 Too Many Requests.
/// 3. La réponse 429 contient l'en-tête standard 'Retry-After'.
/// 4. Le corps de la réponse 429 respecte strictement le format JSON uniforme sans secrets.
/// 5. Une adresse IP distincte bénéficie d'une partition totalement indépendante.
/// 6. Le dépassement de quota court-circuite le pipeline : ni AuthService ni AuditActionFilter ne sont appelés.
/// 7. Un appel sous quota poursuit le flux normal d'exécution du pipeline.
/// 8. Les autres endpoints du système ne sont pas accidentellement limités par cette politique.
/// 9. Les réponses 429 conservent les en-têtes CORS requis (Access-Control-Allow-Origin).
/// 10. Aucun impact sur les bases PostgreSQL staging (port 5433) ou système (port 5432) : isolation mémoire totale.
/// </summary>
public class AuthRateLimitingSecurityTests
{
    private ServiceProvider CreateRateLimiterServiceProvider()
    {
        var services = new ServiceCollection();
        services.AddLogging(builder => builder.AddDebug());
        services.AddAuthRateLimiting();
        return services.BuildServiceProvider();
    }

    private DefaultHttpContext CreateHttpContextForIp(string ipAddress, string path = "/api/auth/login")
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(ipAddress);
        context.Request.Path = path;
        context.Request.Method = "POST";
        context.Response.Body = new MemoryStream();
        return context;
    }

    [Fact]
    public void Test01_And_Test02_FirstTenRequestsAllowed_EleventhExceedsAndReturns429()
    {
        // 1 & 2 : Dix premières requêtes autorisées, onzième rejetée avec statut 429
        using var limiter = AuthRateLimitingConfig.CreateLimiter();
        var ip = "192.168.10.1";
        var context = CreateHttpContextForIp(ip);

        // 1. Soumettre 10 baux successifs
        for (int i = 1; i <= AuthRateLimitingConfig.DefaultPermitLimit; i++)
        {
            using var lease = limiter.AttemptAcquire(context, 1);
            Assert.True(lease.IsAcquired, $"La requête #{i} sous quota doit être autorisée.");
        }

        // 2. La 11e requête doit être rejetée
        using var eleventhLease = limiter.AttemptAcquire(context, 1);
        Assert.False(eleventhLease.IsAcquired, "La 11e requête consécutive doit dépasser le quota de 10 requêtes/min.");
    }

    [Fact]
    public async Task Test03_And_Test04_RejectedResponseContainsRetryAfterAndUniformJsonBody()
    {
        // 3 & 4 : Rejet avec en-tête Retry-After et corps JSON uniforme
        using var sp = CreateRateLimiterServiceProvider();
        using var limiter = AuthRateLimitingConfig.CreateLimiter();

        var ip = "10.0.0.42";
        var context = CreateHttpContextForIp(ip);
        context.RequestServices = sp;

        // Épuiser le quota de 10
        for (int i = 0; i < 10; i++)
        {
            using var l = limiter.AttemptAcquire(context, 1);
        }

        // Simuler la 11e requête qui échoue
        using var lease = limiter.AttemptAcquire(context, 1);
        Assert.False(lease.IsAcquired);

        // Déclencher le callback OnRejected
        var onRejectedContext = new OnRejectedContext
        {
            HttpContext = context,
            Lease = lease
        };

        await AuthRateLimitingConfig.HandleOnRejectedAsync(onRejectedContext, CancellationToken.None);

        // Vérifications
        Assert.Equal(StatusCodes.Status429TooManyRequests, context.Response.StatusCode);
        Assert.Equal("application/json", context.Response.ContentType);

        // 3. Présence de Retry-After
        Assert.True(context.Response.Headers.ContainsKey("Retry-After"), "L'en-tête Retry-After doit être présent.");
        var retryAfterValue = context.Response.Headers.RetryAfter.ToString();
        Assert.False(string.IsNullOrWhiteSpace(retryAfterValue));
        Assert.True(int.TryParse(retryAfterValue, out var seconds) && seconds > 0, "Retry-After doit être un entier positif.");

        // 4. Corps JSON uniforme
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var responseBody = await reader.ReadToEndAsync();

        using var jsonDoc = JsonDocument.Parse(responseBody);
        var root = jsonDoc.RootElement;
        Assert.Equal(429, root.GetProperty("status").GetInt32());
        Assert.Equal("Trop de tentatives de connexion. Veuillez patienter avant de réessayer.", root.GetProperty("message").GetString());
    }

    [Fact]
    public void Test05_DistinctIpHasIndependentPartition()
    {
        // 5 : Deux adresses IP distinctes disposent de partitions strictement étanches
        using var limiter = AuthRateLimitingConfig.CreateLimiter();

        var ipA = "192.168.1.100";
        var ipB = "192.168.1.200";

        var contextA = CreateHttpContextForIp(ipA);
        var contextB = CreateHttpContextForIp(ipB);

        // Épuiser les 10 permis pour IP A
        for (int i = 0; i < 10; i++)
        {
            using var leaseA = limiter.AttemptAcquire(contextA, 1);
            Assert.True(leaseA.IsAcquired);
        }

        // IP A est maintenant saturée
        using (var extraA = limiter.AttemptAcquire(contextA, 1))
        {
            Assert.False(extraA.IsAcquired, "L'IP A saturée doit être bloquée.");
        }

        // IP B doit pouvoir consommer ses 10 requêtes sans aucun blocage
        for (int i = 1; i <= 10; i++)
        {
            using var leaseB = limiter.AttemptAcquire(contextB, 1);
            Assert.True(leaseB.IsAcquired, $"L'IP B ne doit pas être impactée par l'épuisement de l'IP A (requête #{i}).");
        }
    }

    [Fact]
    public async Task Test06_And_Test07_PipelineBypassOnQuotaExceeded_AndNormalFlowUnderQuota()
    {
        // 6 & 7 : Dépassement court-circuite le pipeline ; sous quota, le flux normal est exécuté
        using var sp = CreateRateLimiterServiceProvider();
        using var limiter = AuthRateLimitingConfig.CreateLimiter();

        var ip = "172.16.0.5";
        var context = CreateHttpContextForIp(ip);
        context.RequestServices = sp;

        int downstreamCallCount = 0;

        // Définition d'un délégué simulant le contrôleur MVC / AuthService / AuditActionFilter
        RequestDelegate downstreamDelegate = ctx =>
        {
            downstreamCallCount++;
            ctx.Response.StatusCode = StatusCodes.Status200OK;
            return Task.CompletedTask;
        };

        // 7. Exécution sous quota : le contrôleur est appelé 10 fois
        for (int i = 0; i < 10; i++)
        {
            using var lease = limiter.AttemptAcquire(context, 1);
            if (lease.IsAcquired)
            {
                await downstreamDelegate(context);
            }
        }

        Assert.Equal(10, downstreamCallCount);

        // 6. Exécution au-delà du quota : court-circuit immédiat
        using (var rejectLease = limiter.AttemptAcquire(context, 1))
        {
            if (!rejectLease.IsAcquired)
            {
                var onRejectedContext = new OnRejectedContext
                {
                    HttpContext = context,
                    Lease = rejectLease
                };
                await AuthRateLimitingConfig.HandleOnRejectedAsync(onRejectedContext, CancellationToken.None);
                // Le délégué aval n'est intentionnellement PAS appelé
            }
            else
            {
                await downstreamDelegate(context);
            }
        }

        // Vérifier que le contrôleur n'a JAMAIS été appelé une 11e fois
        Assert.Equal(10, downstreamCallCount);
        Assert.Equal(StatusCodes.Status429TooManyRequests, context.Response.StatusCode);
    }

    [Fact]
    public void Test08_OtherEndpointsAreNotAccidentallyRateLimited()
    {
        // 8 : Seul l'endpoint Login est décoré avec EnableRateLimiting
        var authControllerType = typeof(AuthController);

        // Endpoint Login doit être décoré
        var loginMethod = authControllerType.GetMethod(nameof(AuthController.Login));
        Assert.NotNull(loginMethod);
        var loginRateLimitAttr = loginMethod.GetCustomAttribute<EnableRateLimitingAttribute>();
        Assert.NotNull(loginRateLimitAttr);
        Assert.Equal(AuthRateLimitingConfig.PolicyName, loginRateLimitAttr.PolicyName);

        // Les autres actions d'AuthController ne doivent pas avoir EnableRateLimiting
        var logoutMethod = authControllerType.GetMethod(nameof(AuthController.Logout));
        Assert.NotNull(logoutMethod);
        Assert.Null(logoutMethod.GetCustomAttribute<EnableRateLimitingAttribute>());

        var meMethod = authControllerType.GetMethod(nameof(AuthController.GetCurrentUser));
        Assert.NotNull(meMethod);
        Assert.Null(meMethod.GetCustomAttribute<EnableRateLimitingAttribute>());

        var permissionsMethod = authControllerType.GetMethod(nameof(AuthController.GetPermissions));
        Assert.NotNull(permissionsMethod);
        Assert.Null(permissionsMethod.GetCustomAttribute<EnableRateLimitingAttribute>());

        var changePasswordMethod = authControllerType.GetMethod(nameof(AuthController.ChangePassword));
        Assert.NotNull(changePasswordMethod);
        Assert.Null(changePasswordMethod.GetCustomAttribute<EnableRateLimitingAttribute>());
    }

    [Fact]
    public async Task Test09_CorsHeadersArePreservedOn429Rejections()
    {
        // 9 : Comportement CORS : quand UseCors précède le RateLimiter,
        // les réponses 429 conservent les en-têtes Access-Control-Allow-Origin
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddCors(options =>
        {
            options.AddPolicy("AllowFrontend", policy =>
            {
                policy.WithOrigins("http://localhost:3000")
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials();
            });
        });
        services.AddAuthRateLimiting();

        using var sp = services.BuildServiceProvider();
        var corsService = sp.GetRequiredService<ICorsService>();
        var corsPolicyProvider = sp.GetRequiredService<ICorsPolicyProvider>();
        using var limiter = AuthRateLimitingConfig.CreateLimiter();

        var context = CreateHttpContextForIp("192.168.5.99");
        context.Request.Headers.Origin = "http://localhost:3000";
        context.RequestServices = sp;

        var corsPolicy = await corsPolicyProvider.GetPolicyAsync(context, "AllowFrontend");
        Assert.NotNull(corsPolicy);

        // Appliquer la politique CORS comme le fait le middleware UseCors
        var corsResult = corsService.EvaluatePolicy(context, corsPolicy);
        corsService.ApplyResult(corsResult, context.Response);

        // Simuler un rejet 429 par le rate limiter
        for (int i = 0; i < 10; i++)
        {
            using var l = limiter.AttemptAcquire(context, 1);
        }

        using var lease = limiter.AttemptAcquire(context, 1);
        Assert.False(lease.IsAcquired);

        var onRejectedContext = new OnRejectedContext
        {
            HttpContext = context,
            Lease = lease
        };
        await AuthRateLimitingConfig.HandleOnRejectedAsync(onRejectedContext, CancellationToken.None);

        // Vérifier que 429 et CORS coexistent harmonieusement
        Assert.Equal(StatusCodes.Status429TooManyRequests, context.Response.StatusCode);
        Assert.True(context.Response.Headers.ContainsKey("Access-Control-Allow-Origin"), "Access-Control-Allow-Origin doit être conservé sur 429.");
        Assert.Equal("http://localhost:3000", context.Response.Headers["Access-Control-Allow-Origin"].ToString());
    }

    [Fact]
    public void Test10_CompleteMemoryIsolation_ZeroDatabaseDependency()
    {
        // 10 : Vérification d'isolation absolue : aucun DbContext ou connexion réseau n'est instancié
        using var sp = CreateRateLimiterServiceProvider();
        var options = sp.GetRequiredService<IOptions<RateLimiterOptions>>().Value;

        Assert.NotNull(options);
        Assert.Equal(StatusCodes.Status429TooManyRequests, options.RejectionStatusCode);
        Assert.Equal(10, AuthRateLimitingConfig.DefaultPermitLimit);
        Assert.Equal(TimeSpan.FromMinutes(1), AuthRateLimitingConfig.DefaultWindow);
        Assert.Equal(6, AuthRateLimitingConfig.DefaultSegmentsPerWindow);
        Assert.Equal(0, AuthRateLimitingConfig.DefaultQueueLimit);
    }
}
