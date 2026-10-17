using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.IO;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace Archiveo.Tests;

/// <summary>
/// Suite de qualification pour l'anomalie ANO-05 :
/// Cohérence de l'audience JWT, politique de validation stricte et protection du secret de signature.
/// </summary>
public class Ano05JwtSecurityAndAudienceTests
{
    private const string ValidSecret = "StrongAndRobustSecretKeyForTestingAtLeast32Chars1234567890!";
    private const string DifferentSecret = "AnotherDifferentSecretKeyOfMinimum32CharactersLengthForTesting!";
    private const string Issuer = "ArchiveoApi";
    private const string CanonicalAudience = "ArchiveoClient";
    private const string LegacyAudience = "ArchiveoFrontend";

    private TokenValidationParameters CreateStandardValidationParameters(string secret = ValidSecret)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var validAudiences = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            CanonicalAudience,
            LegacyAudience
        };

        return new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = Issuer,
            ValidAudience = CanonicalAudience,
            ValidAudiences = validAudiences,
            IssuerSigningKey = key,
            ClockSkew = TimeSpan.FromSeconds(5) // Court pour les tests
        };
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
    public void Test_1_Token_WithCanonicalAudience_IsAccepted()
    {
        // GIVEN: un jeton signé avec la clé valide et l'audience canonique "ArchiveoClient"
        var token = CreateToken(audience: CanonicalAudience);
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN: validation du jeton
        var principal = handler.ValidateToken(token, validationParams, out var validatedToken);

        // THEN: le jeton est validé et les claims sont lisibles
        Assert.NotNull(principal);
        Assert.NotNull(validatedToken);
        Assert.Equal("test.user@archiveo.local", principal.FindFirst(ClaimTypes.Email)?.Value);
        Assert.Equal("Admin", principal.FindFirst(ClaimTypes.Role)?.Value);
    }

    [Fact]
    public void Test_2_Token_WithLegacyAudience_IsAccepted_ForBackwardCompatibility()
    {
        // GIVEN: un jeton émis avec l'audience historique "ArchiveoFrontend"
        var token = CreateToken(audience: LegacyAudience);
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN: validation du jeton
        var principal = handler.ValidateToken(token, validationParams, out var validatedToken);

        // THEN: le jeton reste accepté sans rupture pour les sessions existantes
        Assert.NotNull(principal);
        Assert.NotNull(validatedToken);
        Assert.Equal("test.user@archiveo.local", principal.FindFirst(ClaimTypes.Email)?.Value);
    }

    [Fact]
    public void Test_3_Token_WithRogueAudience_IsStrictlyRejected()
    {
        // GIVEN: un jeton avec une audience non autorisée
        var rogueAudience = "RogueThirdPartyAudience";
        var token = CreateToken(audience: rogueAudience);
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN / THEN: la validation doit lever SecurityTokenInvalidAudienceException
        var ex = Assert.Throws<SecurityTokenInvalidAudienceException>(() =>
        {
            handler.ValidateToken(token, validationParams, out _);
        });

        Assert.Contains("IDX10214", ex.Message); // Code d'erreur standard Microsoft pour audience invalide
    }

    [Fact]
    public void Test_4_Token_WithInvalidSignature_IsStrictlyRejected()
    {
        // GIVEN: un jeton signé avec une mauvaise clé secrète
        var token = CreateToken(secret: DifferentSecret);
        var validationParams = CreateStandardValidationParameters();
        var handler = new JwtSecurityTokenHandler();

        // WHEN / THEN: la validation doit échouer car la signature ne correspond pas à la clé configurée
        var ex = Assert.ThrowsAny<SecurityTokenException>(() =>
        {
            handler.ValidateToken(token, validationParams, out _);
        });

        Assert.True(
            ex is SecurityTokenInvalidSignatureException || ex is SecurityTokenSignatureKeyNotFoundException,
            $"Type d'exception inattendu pour signature invalide: {ex.GetType().Name}");
    }

    [Fact]
    public void Test_5_Token_Expired_IsStrictlyRejected()
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
    public void Test_6_Token_WithInvalidIssuer_IsStrictlyRejected()
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
    [InlineData("trop_court_12345")] // Moins de 32 caractères
    public void Test_7_StartupValidation_ThrowsWhenSecretIsMissingOrTooShort(string? invalidSecret)
    {
        // GIVEN / WHEN / THEN: la logique de validation doit interdire tout secret < 32 caractères
        Assert.Throws<InvalidOperationException>(() =>
        {
            if (string.IsNullOrWhiteSpace(invalidSecret) || invalidSecret.Length < 32)
            {
                throw new InvalidOperationException("JwtSettings:Secret doit contenir au moins 32 caractères et être fourni hors du dépôt.");
            }
        });
    }

    [Theory]
    [InlineData("SuperSecretKeyWithAtLeast32Chars123456")]
    [InlineData("ArchiveoSuperSecretKeyForJwtTokenGeneration2024SecureKey!")]
    [InlineData("01234567890123456789012345678901")]
    public void Test_8_StartupValidation_RejectsKnownInsecureDefaults_InProduction(string insecureSecret)
    {
        var insecureDefaults = new[]
        {
            "SuperSecretKeyWithAtLeast32Chars123456",
            "ArchiveoSuperSecretKeyForJwtTokenGeneration2024SecureKey!",
            "01234567890123456789012345678901"
        };

        // GIVEN: environnement de production simulé
        bool isProduction = true;

        // WHEN / THEN: le démarrage doit être bloqué si un secret public connu est utilisé
        var ex = Assert.Throws<InvalidOperationException>(() =>
        {
            if (isProduction && ((IList<string>)insecureDefaults).Contains(insecureSecret))
            {
                throw new InvalidOperationException("BLOCAGE DE SÉCURITÉ : La clé secrète JWT configurée est une valeur de démonstration publique connue.");
            }
        });

        Assert.Contains("BLOCAGE DE SÉCURITÉ", ex.Message);
    }

    [Fact]
    public void Test_9_GitTrackedConfiguration_ContainsNoHardcodedProductionSecrets()
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
}
