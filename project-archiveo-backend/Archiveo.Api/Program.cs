using Archiveo.Api.Filters;
using Archiveo.Api.Authorization;
using Archiveo.Api.Security;
using Archiveo.Application.Services;
using Archiveo.Application.Security;
using Microsoft.AspNetCore.RateLimiting;
using Archiveo.Infrastructure.Services;
using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Archiveo.Infrastructure.Seeding;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Ajouter les services avec le filtre d'audit
builder.Services.AddControllers(options =>
{
    options.Filters.Add<AuditActionFilter>();
});

builder.Services.AddScoped<AuditService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Archivéo API",
        Version = "v1",
        Description = "API de gestion électronique de documents, archivage et records management"
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Entrez votre token JWT. Exemple : Bearer eyJhbGciOi..."
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Configuration de la base de données
builder.Services.AddDbContext<ApplicationDbContext>(options =>
{
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("La chaîne de connexion DefaultConnection est requise."));
    options.ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// Configuration de Identity
builder.Services.AddIdentity<User, IdentityRole<Guid>>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 12;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequireUppercase = true;
    options.Password.RequireLowercase = true;
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.MaxFailedAccessAttempts = 5;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
})
.AddEntityFrameworkStores<ApplicationDbContext>()
.AddDefaultTokenProviders();

// Configuration JWT
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var jwtSecret = jwtSettings["Secret"]
    ?? builder.Configuration["JwtSettings:Secret"]
    ?? builder.Configuration["Jwt:Key"]
    ?? builder.Configuration["JWT_SECRET"];

var isSensitiveEnvironment = !builder.Environment.IsDevelopment() && !builder.Environment.IsEnvironment("Testing");
JwtSecurityPolicy.ValidateSecret(jwtSecret, isSensitiveEnvironment);

var jwtIssuer = jwtSettings["Issuer"]
    ?? builder.Configuration["JwtSettings:Issuer"]
    ?? builder.Configuration["Jwt:Issuer"]
    ?? builder.Configuration["JWT_ISSUER"]
    ?? JwtSecurityPolicy.DefaultIssuer;

var canonicalAudience = jwtSettings["Audience"]
    ?? builder.Configuration["JwtSettings:Audience"]
    ?? builder.Configuration["Jwt:Audience"]
    ?? builder.Configuration["JWT_AUDIENCE"]
    ?? JwtSecurityPolicy.CanonicalAudience;

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = JwtSecurityPolicy.CreateValidationParameters(
        jwtSecret!,
        jwtIssuer,
        canonicalAudience,
        TimeSpan.FromSeconds(30)
    );

    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddAuthorization();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

// Enregistrer les services
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<ParameterService>();
builder.Services.AddScoped<DocumentService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ArchiveService>();
builder.Services.AddScoped<LoanService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<RoleService>();
builder.Services.AddScoped<PermissionService>();
builder.Services.AddScoped<CorrespondenceService>();
builder.Services.AddScoped<WorkflowService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<SignatureService>();

// SignalR pour les notifications en temps réel
builder.Services.AddSignalR();

// Configuration CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:3000" };

        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configuration stricte des en-têtes transférés pour Reverse Proxy (Phase 5A)
builder.Services.AddConfiguredForwardedHeaders(builder.Configuration);

// Rate limiting natif ASP.NET Core (.NET 9) pour l'authentification
builder.Services.AddAuthRateLimiting();

var app = builder.Build();

// Middleware
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseForwardedHeaders();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    await next();
});
app.UseCors("AllowFrontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<Archiveo.Infrastructure.Services.NotificationHub>("/hubs/notifications");

// Appliquer les migrations et seed les données de test
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.Migrate();

    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<User>>();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();

    // Créer les rôles de base
    string[] roles = { "Admin", "User", "RecordsManager" };
    foreach (var role in roles)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            await roleManager.CreateAsync(new IdentityRole<Guid>(role));
        }
    }

    // Le compte de démonstration ne doit jamais être créé en production.
    if (app.Environment.IsDevelopment())
    {
        var adminEmail = "admin@archiveo.com";
        var adminPassword = builder.Configuration["SeedAdmin:Password"];
        if (string.IsNullOrWhiteSpace(adminPassword))
        {
            throw new InvalidOperationException("SeedAdmin:Password est requis uniquement pour le développement local.");
        }

        if (await userManager.FindByEmailAsync(adminEmail) == null)
        {
            var adminUser = new User
            {
                UserName = adminEmail,
                Email = adminEmail,
                FirstName = "Admin",
                LastName = "Système",
                Matricule = "ADMIN001",
                Function = "Administrateur",
                MustChangePassword = true
            };

            var result = await userManager.CreateAsync(adminUser, adminPassword);
            if (result.Succeeded)
            {
                await userManager.AddToRoleAsync(adminUser, "Admin");
            }
        }
    }

    // Seeding des paramètres
    await ParameterSeeder.SeedAsync(app.Services);
    await PermissionSeeder.SeedAsync(dbContext);
}

app.Run();