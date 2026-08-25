using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Seeding;

public static class ParameterSeeder
{
    public static async Task SeedAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var groups = new List<ParameterGroup>
        {
            new() { Code = "DOC_TYPE", Name = "Types de documents", Icon = "FileText", Color = "blue", Order = 1 },
            new() { Code = "CATEGORY", Name = "Catégories", Icon = "Folder", Color = "green", Order = 2 },
            new() { Code = "SUB_CATEGORY", Name = "Sous-catégories", Icon = "FolderOpen", Color = "green", Order = 3 },
            new() { Code = "SERVICE", Name = "Services", Icon = "Building2", Color = "purple", Order = 4 },
            new() { Code = "DIRECTION", Name = "Directions", Icon = "Building", Color = "purple", Order = 5 },
            new() { Code = "DEPARTMENT", Name = "Départements", Icon = "Building", Color = "purple", Order = 6 },
            new() { Code = "UNIT", Name = "Unités", Icon = "Building", Color = "purple", Order = 7 },
            new() { Code = "AGENCY", Name = "Agences", Icon = "Building2", Color = "purple", Order = 8 },
            new() { Code = "SITE", Name = "Sites", Icon = "MapPin", Color = "orange", Order = 9 },
            new() { Code = "LOCATION", Name = "Localisations", Icon = "MapPin", Color = "orange", Order = 10 },
            new() { Code = "SUPPORT_TYPE", Name = "Types de support", Icon = "HardDrive", Color = "gray", Order = 11 },
            new() { Code = "FORMAT", Name = "Formats", Icon = "File", Color = "gray", Order = 12 },
            new() { Code = "CONFIDENTIALITY", Name = "Confidentialité", Icon = "Shield", Color = "red", Order = 13 },
            new() { Code = "SECURITY_LEVEL", Name = "Niveau de sécurité", Icon = "Lock", Color = "red", Order = 14 },
            new() { Code = "DOC_STATUS", Name = "Statuts", Icon = "CheckCircle", Color = "blue", Order = 15 },
            new() { Code = "PHYSICAL_STATE", Name = "États physiques", Icon = "Package", Color = "gray", Order = 16 },
            new() { Code = "LANGUAGE", Name = "Langues", Icon = "Globe", Color = "blue", Order = 17 },
            new() { Code = "COUNTRY", Name = "Pays", Icon = "Globe", Color = "blue", Order = 18 },
            new() { Code = "REGION", Name = "Régions", Icon = "Map", Color = "blue", Order = 19 },
            new() { Code = "CITY", Name = "Villes", Icon = "MapPin", Color = "blue", Order = 20 },
            new() { Code = "ORGANISM", Name = "Organismes", Icon = "Building2", Color = "purple", Order = 21 },
            new() { Code = "ARCHIVE_TYPE", Name = "Types d'archives", Icon = "Archive", Color = "orange", Order = 22 },
            new() { Code = "RETENTION", Name = "Durées de conservation", Icon = "Clock", Color = "orange", Order = 23 },
            new() { Code = "FINAL_SORT", Name = "Sort final", Icon = "Trash2", Color = "red", Order = 24 },
            new() { Code = "DESTRUCTION_REASON", Name = "Motifs de destruction", Icon = "Trash2", Color = "red", Order = 25 },
            new() { Code = "CLASSIFICATION", Name = "Types de classement", Icon = "Layers", Color = "blue", Order = 26 },
            new() { Code = "PRIORITY", Name = "Priorités", Icon = "AlertCircle", Color = "orange", Order = 27 },
            new() { Code = "TAG", Name = "Étiquettes", Icon = "Tag", Color = "blue", Order = 28 },
            new() { Code = "KEYWORD", Name = "Mots clés", Icon = "Hash", Color = "blue", Order = 29 },
            new() { Code = "COLLECTION", Name = "Collections", Icon = "Library", Color = "green", Order = 30 },
            new() { Code = "FUND", Name = "Fonds", Icon = "Library", Color = "green", Order = 31 },
            new() { Code = "SERIE", Name = "Séries", Icon = "Library", Color = "green", Order = 32 },
            new() { Code = "SUB_SERIE", Name = "Sous-séries", Icon = "Library", Color = "green", Order = 33 },
            new() { Code = "PRODUCER", Name = "Producteurs", Icon = "User", Color = "purple", Order = 34 },
            new() { Code = "SENDER", Name = "Expéditeurs", Icon = "Send", Color = "blue", Order = 35 },
            new() { Code = "AUTHOR", Name = "Auteurs", Icon = "User", Color = "purple", Order = 36 },
            new() { Code = "RECIPIENT", Name = "Destinataires", Icon = "User", Color = "purple", Order = 37 },
            new() { Code = "CORRESPONDENCE_TYPE", Name = "Types de courriers", Icon = "Mail", Color = "blue", Order = 38 },
            new() { Code = "SIGNATURE_TYPE", Name = "Types de signature", Icon = "PenTool", Color = "blue", Order = 39 },
            new() { Code = "VALIDATION_TYPE", Name = "Types de validation", Icon = "CheckSquare", Color = "green", Order = 40 },
            new() { Code = "VALIDATION_CIRCUIT", Name = "Circuits de validation", Icon = "Workflow", Color = "green", Order = 41 },
            new() { Code = "LOAN_TYPE", Name = "Types de prêt", Icon = "BookOpen", Color = "blue", Order = 42 },
            new() { Code = "LOAN_REASON", Name = "Motifs de prêt", Icon = "BookOpen", Color = "blue", Order = 43 },
            new() { Code = "CONSULTATION_TYPE", Name = "Types de consultation", Icon = "Eye", Color = "gray", Order = 44 },
            new() { Code = "ACCESS_TYPE", Name = "Types d'accès", Icon = "Key", Color = "red", Order = 45 },
            new() { Code = "USER_GROUP", Name = "Groupes utilisateurs", Icon = "Users", Color = "purple", Order = 46 },
            new() { Code = "PROFILE", Name = "Profils", Icon = "User", Color = "purple", Order = 47 },
            new() { Code = "PERMISSION", Name = "Permissions", Icon = "Shield", Color = "red", Order = 48 },
            new() { Code = "ROLE", Name = "Rôles", Icon = "UserCog", Color = "purple", Order = 49 },
            new() { Code = "NOTIFICATION_TYPE", Name = "Types de notifications", Icon = "Bell", Color = "orange", Order = 50 },
            new() { Code = "REMINDER_TYPE", Name = "Types de rappels", Icon = "Clock", Color = "orange", Order = 51 },
            new() { Code = "EMAIL_PARAM", Name = "Paramètres email", Icon = "Mail", Color = "blue", Order = 52 },
            new() { Code = "SMS_PARAM", Name = "Paramètres SMS", Icon = "MessageSquare", Color = "blue", Order = 53 },
            new() { Code = "WORKFLOW_PARAM", Name = "Paramètres workflow", Icon = "Workflow", Color = "green", Order = 54 },
            new() { Code = "OCR_PARAM", Name = "Paramètres OCR", Icon = "Scan", Color = "gray", Order = 55 },
            new() { Code = "AI_PARAM", Name = "Paramètres IA", Icon = "Brain", Color = "purple", Order = 56 },
            new() { Code = "BUILDING", Name = "Bâtiments & Sites", Icon = "Building", Color = "orange", Order = 57 },
            new() { Code = "ROOM", Name = "Magasins & Salles", Icon = "Warehouse", Color = "orange", Order = 58 },
            new() { Code = "BAY", Name = "Travées & Rayons", Icon = "Layers", Color = "blue", Order = 59 },
            new() { Code = "SHELF", Name = "Étagères & Tablettes", Icon = "Folder", Color = "blue", Order = 60 }
        };

        var existingGroups = await dbContext.ParameterGroups.Select(g => g.Code).ToListAsync();
        var groupsToAdd = groups.Where(g => !existingGroups.Contains(g.Code)).ToList();

        if (groupsToAdd.Count > 0)
        {
            dbContext.ParameterGroups.AddRange(groupsToAdd);
            await dbContext.SaveChangesAsync();
        }

        // Seed default items
        var items = new List<ParameterItem>
        {
            // SENDER
            new() { GroupCode = "SENDER", Code = "EXP_DG", Name = "Direction Générale", Order = 1 },
            new() { GroupCode = "SENDER", Code = "EXP_DAF", Name = "Direction Financière", Order = 2 },
            new() { GroupCode = "SENDER", Code = "EXP_DRH", Name = "Direction RH", Order = 3 },
            new() { GroupCode = "SENDER", Code = "EXP_EXT", Name = "Expéditeur externe", Order = 4 },
            new() { GroupCode = "SENDER", Code = "EXP_MIN", Name = "Ministère / Administration", Order = 5 },
            new() { GroupCode = "SENDER", Code = "EXP_PART", Name = "Partenaire commercial", Order = 6 },

            // RECIPIENT
            new() { GroupCode = "RECIPIENT", Code = "DEST_DG", Name = "Direction Générale", Order = 1 },
            new() { GroupCode = "RECIPIENT", Code = "DEST_DAF", Name = "Direction Financière", Order = 2 },
            new() { GroupCode = "RECIPIENT", Code = "DEST_ALL", Name = "Tout le personnel", Order = 3 },
            new() { GroupCode = "RECIPIENT", Code = "DEST_EXT", Name = "Destinataires externes", Order = 4 },

            // DIRECTION
            new() { GroupCode = "DIRECTION", Code = "DIR_GEN", Name = "Direction Générale", Order = 1 },
            new() { GroupCode = "DIRECTION", Code = "DIR_FIN", Name = "Direction Financière & Comptable", Order = 2 },
            new() { GroupCode = "DIRECTION", Code = "DIR_RH", Name = "Direction des Ressources Humaines", Order = 3 },
            new() { GroupCode = "DIRECTION", Code = "DIR_IT", Name = "Direction des Systèmes d'Information", Order = 4 },
            new() { GroupCode = "DIRECTION", Code = "DIR_JUR", Name = "Direction Juridique & Conformité", Order = 5 },

            // BUILDING / SITE
            new() { GroupCode = "SITE", Code = "SITE_CENTRAL", Name = "Bâtiment Central — Siège", Order = 1 },
            new() { GroupCode = "SITE", Code = "SITE_ANNEXE", Name = "Annexe Archives Nord", Order = 2 },
            new() { GroupCode = "SITE", Code = "SITE_DEPOT", Name = "Dépôt Régional d'Archivage", Order = 3 },
            new() { GroupCode = "BUILDING", Code = "BAT_A", Name = "Bâtiment Principal A", Order = 1 },
            new() { GroupCode = "BUILDING", Code = "BAT_B", Name = "Bâtiment Annexe B", Order = 2 },
            new() { GroupCode = "BUILDING", Code = "BAT_ARCH", Name = "Dépôt Central d'Archivage", Order = 3 },

            // ROOM / LOCATION
            new() { GroupCode = "LOCATION", Code = "MAG_A", Name = "Magasin A (Archives Courantes)", Order = 1 },
            new() { GroupCode = "LOCATION", Code = "MAG_B", Name = "Magasin B (Fonds Historique)", Order = 2 },
            new() { GroupCode = "LOCATION", Code = "SALLE_C", Name = "Salle d'Entreposage C", Order = 3 },
            new() { GroupCode = "LOCATION", Code = "COFFRE", Name = "Magasin Sécurisé & Coffre-fort", Order = 4 },
            new() { GroupCode = "ROOM", Code = "ROOM_A", Name = "Magasin A", Order = 1 },
            new() { GroupCode = "ROOM", Code = "ROOM_B", Name = "Magasin B", Order = 2 },
            new() { GroupCode = "ROOM", Code = "ROOM_C", Name = "Salle Historique C", Order = 3 },

            // BAY (Travées)
            new() { GroupCode = "BAY", Code = "T01", Name = "Travée T01", Order = 1 },
            new() { GroupCode = "BAY", Code = "T02", Name = "Travée T02", Order = 2 },
            new() { GroupCode = "BAY", Code = "T03", Name = "Travée T03", Order = 3 },
            new() { GroupCode = "BAY", Code = "T04", Name = "Travée T04", Order = 4 },
            new() { GroupCode = "BAY", Code = "T05", Name = "Travée T05", Order = 5 },

            // SHELF (Étagères)
            new() { GroupCode = "SHELF", Code = "E01", Name = "Étagère E01", Order = 1 },
            new() { GroupCode = "SHELF", Code = "E02", Name = "Étagère E02", Order = 2 },
            new() { GroupCode = "SHELF", Code = "E03", Name = "Étagère E03", Order = 3 },
            new() { GroupCode = "SHELF", Code = "E04", Name = "Étagère E04", Order = 4 },
            new() { GroupCode = "SHELF", Code = "E05", Name = "Étagère E05", Order = 5 },

            // EMAIL_PARAM
            new() { GroupCode = "EMAIL_PARAM", Code = "DEMO_EMAIL", Name = "contact@archiveo.enterprise", Description = "Email de réception des demandes de démo", Order = 1 },

            // DOC_TYPE
            new() { GroupCode = "DOC_TYPE", Code = "CONTRAT", Name = "Contrat", Order = 1 },
            new() { GroupCode = "DOC_TYPE", Code = "FACTURE", Name = "Facture", Order = 2 },
            new() { GroupCode = "DOC_TYPE", Code = "RAPPORT", Name = "Rapport", Order = 3 },
            new() { GroupCode = "DOC_TYPE", Code = "PROCEDURE", Name = "Procédure", Order = 4 },
            new() { GroupCode = "DOC_TYPE", Code = "COURRIER", Name = "Courrier", Order = 5 },

            // DOC_STATUS
            new() { GroupCode = "DOC_STATUS", Code = "BROUILLON", Name = "Brouillon", Color = "gray", Order = 1 },
            new() { GroupCode = "DOC_STATUS", Code = "EN_REVISION", Name = "En révision", Color = "orange", Order = 2 },
            new() { GroupCode = "DOC_STATUS", Code = "VALIDE", Name = "Validé", Color = "green", Order = 3 },
            new() { GroupCode = "DOC_STATUS", Code = "ARCHIVE", Name = "Archivé", Color = "blue", Order = 4 },
            new() { GroupCode = "DOC_STATUS", Code = "OBSOLETE", Name = "Obsolète", Color = "red", Order = 5 },

            // CONFIDENTIALITY
            new() { GroupCode = "CONFIDENTIALITY", Code = "PUBLIC", Name = "Public", Color = "green", Order = 1 },
            new() { GroupCode = "CONFIDENTIALITY", Code = "INTERNE", Name = "Interne", Color = "blue", Order = 2 },
            new() { GroupCode = "CONFIDENTIALITY", Code = "CONFIDENTIEL", Name = "Confidentiel", Color = "orange", Order = 3 },
            new() { GroupCode = "CONFIDENTIALITY", Code = "SECRET", Name = "Secret", Color = "red", Order = 4 },

            // SERVICE
            new() { GroupCode = "SERVICE", Code = "IT", Name = "Informatique", Order = 1 },
            new() { GroupCode = "SERVICE", Code = "RH", Name = "Ressources Humaines", Order = 2 },
            new() { GroupCode = "SERVICE", Code = "FINANCE", Name = "Finance", Order = 3 },
            new() { GroupCode = "SERVICE", Code = "COMMERCIAL", Name = "Commercial", Order = 4 },

            // LANGUAGE
            new() { GroupCode = "LANGUAGE", Code = "FR", Name = "Français", Order = 1 },
            new() { GroupCode = "LANGUAGE", Code = "EN", Name = "Anglais", Order = 2 },
            new() { GroupCode = "LANGUAGE", Code = "ES", Name = "Espagnol", Order = 3 },
            new() { GroupCode = "LANGUAGE", Code = "AR", Name = "Arabe", Order = 4 },
            new() { GroupCode = "LANGUAGE", Code = "DE", Name = "Allemand", Order = 5 },

            // COUNTRY (Liste complète et internationale)
            new() { GroupCode = "COUNTRY", Code = "CI", Name = "Côte d'Ivoire", Order = 1 },
            new() { GroupCode = "COUNTRY", Code = "FR", Name = "France", Order = 2 },
            new() { GroupCode = "COUNTRY", Code = "SN", Name = "Sénégal", Order = 3 },
            new() { GroupCode = "COUNTRY", Code = "CM", Name = "Cameroun", Order = 4 },
            new() { GroupCode = "COUNTRY", Code = "GA", Name = "Gabon", Order = 5 },
            new() { GroupCode = "COUNTRY", Code = "ML", Name = "Mali", Order = 6 },
            new() { GroupCode = "COUNTRY", Code = "BF", Name = "Burkina Faso", Order = 7 },
            new() { GroupCode = "COUNTRY", Code = "TG", Name = "Togo", Order = 8 },
            new() { GroupCode = "COUNTRY", Code = "BJ", Name = "Bénin", Order = 9 },
            new() { GroupCode = "COUNTRY", Code = "GN", Name = "Guinée", Order = 10 },
            new() { GroupCode = "COUNTRY", Code = "CG", Name = "Congo", Order = 11 },
            new() { GroupCode = "COUNTRY", Code = "CD", Name = "RD Congo", Order = 12 },
            new() { GroupCode = "COUNTRY", Code = "MA", Name = "Maroc", Order = 13 },
            new() { GroupCode = "COUNTRY", Code = "TN", Name = "Tunisie", Order = 14 },
            new() { GroupCode = "COUNTRY", Code = "DZ", Name = "Algérie", Order = 15 },
            new() { GroupCode = "COUNTRY", Code = "BE", Name = "Belgique", Order = 16 },
            new() { GroupCode = "COUNTRY", Code = "CH", Name = "Suisse", Order = 17 },
            new() { GroupCode = "COUNTRY", Code = "CA", Name = "Canada", Order = 18 },
            new() { GroupCode = "COUNTRY", Code = "US", Name = "États-Unis", Order = 19 },
            new() { GroupCode = "COUNTRY", Code = "GB", Name = "Royaume-Uni", Order = 20 },
            new() { GroupCode = "COUNTRY", Code = "DE", Name = "Allemagne", Order = 21 },
        };

        var existingItems = await dbContext.ParameterItems.Select(i => i.GroupCode + "_" + i.Code).ToListAsync();
        var itemsToAdd = items.Where(i => !existingItems.Contains(i.GroupCode + "_" + i.Code)).ToList();

        if (itemsToAdd.Count > 0)
        {
            dbContext.ParameterItems.AddRange(itemsToAdd);
            await dbContext.SaveChangesAsync();
        }
    }
}