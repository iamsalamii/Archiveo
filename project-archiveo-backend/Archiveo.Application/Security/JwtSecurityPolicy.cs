using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Archiveo.Application.Security;

/// <summary>
/// Politique de sécurité centrale pour la configuration et la validation des jetons JWT d'Archivéo.
/// Assure la cohérence des audiences, le rejet systématique des secrets fictifs/placeholders
/// et la stricte intégrité cryptographique en environnements sensibles (staging / production).
/// </summary>
public static class JwtSecurityPolicy
{
    public const string CanonicalAudience = "ArchiveoClient";
    public const string LegacyAudience = "ArchiveoFrontend";
    public const string DefaultIssuer = "ArchiveoApi";
    public const int MinSecretLength = 32;

    private static readonly HashSet<string> KnownInsecureSecrets = new(StringComparer.OrdinalIgnoreCase)
    {
        "SuperSecretKeyWithAtLeast32Chars123456",
        "ArchiveoSuperSecretKeyForJwtTokenGeneration2024SecureKey!",
        "01234567890123456789012345678901",
        "RemplacerParUneCleSecreteAleatoireForteDeAuMoins32Caracteres!",
        "RemplacerParUneCleSecreteAleatoireDeAuMoins32Caracteres!",
        "GENERER_UNE_CLE_SECRETE_ALEATOIRE_MINIMUM_32_CARACTERES_ICI",
        "VeuillezDéfinirUneCléSecrèteDansVotreFichierEnv",
        "ArchiveoDefaultInsecureSecretKeyForTestingOnly32Chars!"
    };

    private static readonly string[] InsecureMarkers =
    {
        "remplacer",
        "replace",
        "changeme",
        "change_me",
        "change-me",
        "placeholder",
        "supersecret",
        "example",
        "dummy",
        "sample",
        "votre_cle",
        "votrecle",
        "secretkey",
        "secret_key"
    };

    /// <summary>
    /// Vérifie si une chaîne correspond à un placeholder de configuration,
    /// une valeur réservée à la démonstration ou un secret à entropie manifestement déficiente.
    /// </summary>
    public static bool IsInsecureOrPlaceholder(string? secret)
    {
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < MinSecretLength)
        {
            return true;
        }

        if (KnownInsecureSecrets.Contains(secret))
        {
            return true;
        }

        var lower = secret.ToLowerInvariant();
        foreach (var marker in InsecureMarkers)
        {
            if (lower.Contains(marker))
            {
                return true;
            }
        }

        // Détection d'entropie minimale : un secret de 32 caractères doit comporter au moins 8 caractères distincts
        if (secret.Distinct().Count() < 8)
        {
            return true;
        }

        return false;
    }

    /// <summary>
    /// Valide la clé secrète JWT lors du démarrage de l'application.
    /// En environnement sensible (production/staging), bloque immédiatement le démarrage si le secret est absent,
    /// trop court ou manifestement fictif.
    /// </summary>
    public static void ValidateSecret(string? secret, bool isSensitiveEnvironment)
    {
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < MinSecretLength)
        {
            throw new InvalidOperationException(
                $"ERREUR DE CONFIGURATION CRITIQUE : 'JwtSettings:Secret' doit contenir au moins {MinSecretLength} caractères " +
                "et être fourni hors du dépôt (variable d'environnement ou coffre-fort de secrets).");
        }

        if (isSensitiveEnvironment && IsInsecureOrPlaceholder(secret))
        {
            throw new InvalidOperationException(
                "BLOCAGE DE SÉCURITÉ : La clé secrète JWT configurée est un placeholder, une valeur de démonstration ou un secret public connu du projet. " +
                "En environnement sensible (production ou staging), vous devez impérativement définir un secret aléatoire fort " +
                "via la variable d'environnement 'JwtSettings__Secret' (ou 'JWT_SECRET').");
        }
    }

    /// <summary>
    /// Crée les TokenValidationParameters standardisés d'Archivéo avec politique d'audience stricte et rétrocompatible.
    /// </summary>
    public static TokenValidationParameters CreateValidationParameters(
        string secret,
        string? issuer = null,
        string? canonicalAudience = null,
        TimeSpan? clockSkew = null)
    {
        var key = Encoding.UTF8.GetBytes(secret);
        var effectiveIssuer = !string.IsNullOrWhiteSpace(issuer) ? issuer : DefaultIssuer;
        var effectiveAudience = !string.IsNullOrWhiteSpace(canonicalAudience) ? canonicalAudience : CanonicalAudience;

        var validAudiences = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            effectiveAudience,
            CanonicalAudience,
            LegacyAudience
        };

        return new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = effectiveIssuer,
            ValidAudience = effectiveAudience,
            ValidAudiences = validAudiences,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ClockSkew = clockSkew ?? TimeSpan.FromSeconds(30)
        };
    }

    /// <summary>
    /// Durée de validité par défaut des jetons JWT en l'absence de configuration explicite (1 heure).
    /// </summary>
    public static readonly TimeSpan DefaultLifetime = TimeSpan.FromHours(1);

    /// <summary>
    /// Résout la durée de vie du jeton JWT à partir de la configuration (JwtSettings:ExpiryInDays ou JwtSettings:ExpiryInHours).
    /// Si aucune valeur valide n'est configurée, utilise la durée par défaut (1 heure) sans altération arbitraire.
    /// </summary>
    public static TimeSpan GetTokenLifetime(IConfiguration? configuration)
    {
        if (configuration == null)
        {
            return DefaultLifetime;
        }

        var jwtSettings = configuration.GetSection("JwtSettings");
        var expiryInDaysStr = jwtSettings["ExpiryInDays"]
            ?? configuration["JwtSettings:ExpiryInDays"]
            ?? configuration["JWT_EXPIRY_IN_DAYS"];

        if (int.TryParse(expiryInDaysStr, out var days) && days > 0)
        {
            return TimeSpan.FromDays(days);
        }

        var expiryInHoursStr = jwtSettings["ExpiryInHours"]
            ?? configuration["JwtSettings:ExpiryInHours"]
            ?? configuration["JWT_EXPIRY_IN_HOURS"];

        if (int.TryParse(expiryInHoursStr, out var hours) && hours > 0)
        {
            return TimeSpan.FromHours(hours);
        }

        return DefaultLifetime;
    }
}
