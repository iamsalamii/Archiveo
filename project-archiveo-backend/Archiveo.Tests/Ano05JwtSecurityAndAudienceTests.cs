using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using System.Text;
using Archiveo.Application.Security;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Suite de qualification approfondie pour l'anomalie ANO-05 :
/// Cohérence de l'audience JWT, politique de validation stricte, rejet systématique des placeholders
/// et protection absolue du secret de signature en staging et production.
/// </summary>
public class Ano05JwtSecurityAndAudienceTests
{
    private const string ValidSecret = "StrongAndRobustSecretKeyForTestingAtLeast32Chars1234567890!";
    private const string DifferentSecret = "AnotherDifferentSecretKeyOfMinimum32CharactersLengthForTesting!";
    private const string Issuer = JwtSecurityPolicy.DefaultIssuer;
    private const string CanonicalAudience = JwtSecurityPolicy.CanonicalAudience;
    private const string LegacyAudience = JwtSecurityPolicy.LegacyAudience;

    private TokenValidationParameters CreateStandardValidationParameters(string secret = ValidSecret)
    {
        return JwtSecurityPolicy.CreateValidationParameters(
            secret: secret,
            issuer: Issuer,
            canonicalAudience: CanonicalAudience,
            clockSkew: TimeSpan.FromSeconds(5) // Tolérance réduite pour les tests
        );
    }

    private string CreateToken(
        string issuer = Issuer,
        string audience = CanonicalAudience,
        string secret = ValidSecret,
        DateTime? expires = null,
        IEnumerable<Claim>? extraClaims = null)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "test.user@archiveo.local"),
            new Claim(ClaimTypes.Role, "Admin")
        };

        if (extraClaims != null)
        {
            claims.AddRange(extraClaims);
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expires ?? DateTime.UtcNow.AddMinutes(30),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public void Test_01_Token_WithCanonicalAudience_IsAccepted()
    {
        // GIVEN: un jeton signé avec la clé valide et l'audience canonique "ArchiveoClient"
        var token = CreateToken(audience: CanonicalAudience);
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN: validation du jeton
        var principal = handler.ValidateToken(token, validationParams, out var validatedToken);

        // THEN: le jeton est validé et les claims sont intègres
        Assert.NotNull(principal);
        Assert.NotNull(validatedToken);
        Assert.Equal("test.user@archiveo.local", principal.FindFirst(ClaimTypes.Email)?.Value);
        Assert.Equal("Admin", principal.FindFirst(ClaimTypes.Role)?.Value);
    }

    [Fact]
    public void Test_02_Token_WithLegacyAudience_IsAccepted_ForBackwardCompatibility()
    {
        // GIVEN: un jeton émis avec l'audience historique "ArchiveoFrontend"
        var token = CreateToken(audience: LegacyAudience);
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN: validation du jeton
        var principal = handler.ValidateToken(token, validationParams, out var validatedToken);

        // THEN: le jeton reste accepté sans rupture de session pour les utilisateurs existants
        Assert.NotNull(principal);
        Assert.NotNull(validatedToken);
        Assert.Equal("test.user@archiveo.local", principal.FindFirst(ClaimTypes.Email)?.Value);
    }

    [Fact]
    public void Test_03_Token_WithRogueAudience_IsStrictlyRejected()
    {
        // GIVEN: un jeton avec une audience non autorisée
        var rogueAudience = "RogueThirdPartyAudience";
        var token = CreateToken(audience: rogueAudience);
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN / THEN: la validation doit impérativement lever SecurityTokenInvalidAudienceException
        var ex = Assert.Throws<SecurityTokenInvalidAudienceException>(() =>
        {
            handler.ValidateToken(token, validationParams, out _);
        });

        Assert.Contains("IDX10214", ex.Message); // Code d'erreur officiel IdentityModel pour rejet d'audience
    }

    [Fact]
    public void Test_04_Token_WithInvalidSignature_IsStrictlyRejected()
    {
        // GIVEN: un jeton signé avec une mauvaise clé secrète
        var token = CreateToken(secret: DifferentSecret);
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN / THEN: la validation doit échouer pour cause de signature invalide ou clé introuvable
        var ex = Assert.ThrowsAny<SecurityTokenException>(() =>
        {
            handler.ValidateToken(token, validationParams, out _);
        });

        Assert.True(
            ex is SecurityTokenInvalidSignatureException || ex is SecurityTokenSignatureKeyNotFoundException,
            $"Exception inattendue pour signature invalide: {ex.GetType().Name}");
    }

    [Fact]
    public void Test_05_Token_Expired_IsStrictlyRejected()
    {
        // GIVEN: un jeton expiré depuis plus de la marge de tolérance (ClockSkew = 5s)
        var token = CreateToken(expires: DateTime.UtcNow.AddMinutes(-10));
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN / THEN: la validation doit lever SecurityTokenExpiredException
        Assert.Throws<SecurityTokenExpiredException>(() =>
        {
            handler.ValidateToken(token, validationParams, out _);
        });
    }

    [Fact]
    public void Test_06_Token_WithInvalidIssuer_IsStrictlyRejected()
    {
        // GIVEN: un jeton signé avec un mauvais émetteur
        var token = CreateToken(issuer: "RogueIssuer");
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN / THEN: la validation doit lever SecurityTokenInvalidIssuerException
        Assert.Throws<SecurityTokenInvalidIssuerException>(() =>
        {
            handler.ValidateToken(token, validationParams, out _);
        });
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("court_12345")] // Moins de 32 caractères
    public void Test_07_StartupValidation_ThrowsWhenSecretIsMissingOrTooShort(string? invalidSecret)
    {
        // GIVEN / WHEN / THEN: la politique centrale doit interdire tout secret < 32 caractères
        Assert.Throws<InvalidOperationException>(() =>
        {
            JwtSecurityPolicy.ValidateSecret(invalidSecret, isSensitiveEnvironment: false);
        });
    }

    [Theory]
    [InlineData("SuperSecretKeyWithAtLeast32Chars123456")]
    [InlineData("ArchiveoSuperSecretKeyForJwtTokenGeneration2024SecureKey!")]
    [InlineData("01234567890123456789012345678901")]
    public void Test_08_StartupValidation_RejectsKnownHistoricalSecrets_InSensitiveEnvironment(string insecureSecret)
    {
        // GIVEN / WHEN / THEN: le démarrage doit être bloqué si un secret public historique est utilisé en staging/prod
        var ex = Assert.Throws<InvalidOperationException>(() =>
        {
            JwtSecurityPolicy.ValidateSecret(insecureSecret, isSensitiveEnvironment: true);
        });

        Assert.Contains("BLOCAGE DE SÉCURITÉ", ex.Message);
    }

    [Theory]
    [InlineData("RemplacerParUneCleSecreteAleatoireForteDeAuMoins32Caracteres!")] // Placeholder de .env.example
    [InlineData("RemplacerParUneCleSecreteAleatoireDeAuMoins32Caracteres!")]
    [InlineData("GENERER_UNE_CLE_SECRETE_ALEATOIRE_MINIMUM_32_CARACTERES_ICI")]
    [InlineData("VOTRE_CLE_SECRETE_PRODUCTION_MINIMUM_32_CARACTERES_123456")]
    [InlineData("ChangeMeInProductionSecretKey1234567890Secure!")]
    [InlineData("ExampleDummySecretKeyForDocumentationOnly123456789!")]
    [InlineData("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")] // Faible entropie (< 8 caractères uniques)
    public void Test_09_StartupValidation_RejectsPlaceholdersAndLowEntropy_InSensitiveEnvironment(string placeholderSecret)
    {
        // GIVEN: un placeholder issu de la documentation ou un secret générique
        // WHEN / THEN: ValidateSecret doit lever un blocage de sécurité immédiat
        var ex = Assert.Throws<InvalidOperationException>(() =>
        {
            JwtSecurityPolicy.ValidateSecret(placeholderSecret, isSensitiveEnvironment: true);
        });

        Assert.Contains("BLOCAGE DE SÉCURITÉ", ex.Message);
    }

    [Fact]
    public void Test_10_StartupValidation_AcceptsStrongSecret_InSensitiveEnvironment()
    {
        // GIVEN: une clé cryptographique aléatoire de plus de 32 caractères à haute entropie
        var strongRandomSecret = "k7$vP9!mQ2#zL5@wR8*yT1^uX4&cB0(eN3)";

        // WHEN / THEN: aucune exception ne doit être levée
        var exception = Record.Exception(() =>
        {
            JwtSecurityPolicy.ValidateSecret(strongRandomSecret, isSensitiveEnvironment: true);
        });

        Assert.Null(exception);
    }

    [Fact]
    public void Test_11_DevelopmentEnvironment_AllowsTestKeyWithoutProductionBlock()
    {
        // GIVEN: en environnement de développement local (isSensitiveEnvironment = false)
        var devSecret = "SuperSecretKeyWithAtLeast32Chars123456";

        // WHEN / THEN: le développeur local ne doit pas être bloqué par la politique stricte de production
        var exception = Record.Exception(() =>
        {
            JwtSecurityPolicy.ValidateSecret(devSecret, isSensitiveEnvironment: false);
        });

        Assert.Null(exception);
    }

    [Fact]
    public void Test_12_DockerCompose_EnvironmentVariables_MatchExpectedBackendKeys()
    {
        // GIVEN: fichier docker-compose.yml à la racine
        var dockerComposePath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "docker-compose.yml");
        if (File.Exists(dockerComposePath))
        {
            var content = File.ReadAllText(dockerComposePath);

            // THEN: docker-compose.yml doit injecter les sections exactes d'ASP.NET Core (JwtSettings__*)
            Assert.Contains("JwtSettings__Secret=", content);
            Assert.Contains("JwtSettings__Issuer=", content);
            Assert.Contains("JwtSettings__Audience=", content);

            // THEN: docker-compose.yml ne doit contenir aucun mot de passe postgres en clair en fallback
            Assert.DoesNotContain("Salamsafe52@$", content);
        }
    }

    [Fact]
    public void Test_13_GitTrackedConfiguration_ContainsNoHardcodedProductionSecrets()
    {
        // GIVEN: fichier appsettings.json du backend
        var appsettingsPath = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "Archiveo.Api", "appsettings.json");
        if (File.Exists(appsettingsPath))
        {
            var content = File.ReadAllText(appsettingsPath);

            // THEN: appsettings.json ne doit contenir aucun mot de passe ni clé secrète JWT en clair
            Assert.DoesNotContain("Salamsafe52@$", content);
            Assert.DoesNotContain("SuperSecretKey", content);
            Assert.DoesNotContain("ArchiveoSuperSecretKey", content);

            // THEN: l'audience par défaut dans appsettings.json doit être canonisée
            Assert.Contains("\"Audience\": \"ArchiveoClient\"", content);
        }
    }

    [Fact]
    public void Test_14_GetTokenLifetime_ReturnsConfiguredDays_WhenExpiryInDaysPresent()
    {
        // GIVEN: configuration injectant JwtSettings:ExpiryInDays = 7 (comme dans docker-compose.yml)
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:ExpiryInDays"] = "7"
            })
            .Build();

        // WHEN: résolution de la durée de vie du jeton
        var lifetime = JwtSecurityPolicy.GetTokenLifetime(config);

        // THEN: la durée de vie doit être exactement 7 jours
        Assert.Equal(TimeSpan.FromDays(7), lifetime);
    }

    [Fact]
    public void Test_15_GetTokenLifetime_ReturnsDefaultOneHour_WhenConfigurationMissingOrEmpty()
    {
        // GIVEN: configuration vide ou nulle (environnement par défaut sans surcharge)
        var emptyConfig = new ConfigurationBuilder().Build();

        // WHEN: résolution de la durée de vie
        var lifetimeEmpty = JwtSecurityPolicy.GetTokenLifetime(emptyConfig);
        var lifetimeNull = JwtSecurityPolicy.GetTokenLifetime(null);

        // THEN: repli déterministe sur 1 heure (DefaultLifetime) sans altération arbitraire
        Assert.Equal(TimeSpan.FromHours(1), lifetimeEmpty);
        Assert.Equal(TimeSpan.FromHours(1), lifetimeNull);
    }

    [Fact]
    public void Test_16_GetTokenLifetime_ReturnsConfiguredHours_WhenExpiryInHoursPresent()
    {
        // GIVEN: configuration avec JwtSettings:ExpiryInHours = 12
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["JwtSettings:ExpiryInHours"] = "12"
            })
            .Build();

        // WHEN: résolution de la durée de vie
        var lifetime = JwtSecurityPolicy.GetTokenLifetime(config);

        // THEN: la durée de vie doit être 12 heures
        Assert.Equal(TimeSpan.FromHours(12), lifetime);
    }
}
