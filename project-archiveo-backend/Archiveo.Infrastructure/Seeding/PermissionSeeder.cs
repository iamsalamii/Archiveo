using Archiveo.Domain.Entities;
using Archiveo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Archiveo.Infrastructure.Seeding;

public static class PermissionSeeder
{
    public static async Task SeedAsync(ApplicationDbContext dbContext)
    {
        if (!await dbContext.Permissions.AnyAsync())
        {
            var permissions = new List<Permission>();
            int order = 1;

        // Dashboard
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "dashboard.read", Name = "Consulter le tableau de bord", Module = "dashboard", Order = order++ });

        // Documents
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "documents.read", Name = "Consulter les documents", Module = "documents", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "documents.create", Name = "Creer des documents", Module = "documents", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "documents.update", Name = "Modifier des documents", Module = "documents", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "documents.delete", Name = "Supprimer des documents", Module = "documents", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "documents.validate", Name = "Valider des documents", Module = "documents", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "documents.download", Name = "Telecharger des documents", Module = "documents", Order = order++ });

        // Archives
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "archives.read", Name = "Consulter les archives", Module = "archives", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "archives.create", Name = "Creer des archives", Module = "archives", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "archives.update", Name = "Modifier des archives", Module = "archives", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "archives.delete", Name = "Supprimer des archives", Module = "archives", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "archives.transition", Name = "Changer le statut des archives", Module = "archives", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "archives.destroy", Name = "Detruire des archives", Module = "archives", Order = order++ });

        // Loans
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "loans.read", Name = "Consulter les prets", Module = "loans", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "loans.create", Name = "Creer des prets", Module = "loans", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "loans.return", Name = "Retourner des prets", Module = "loans", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "loans.renew", Name = "Prolonger des prets", Module = "loans", Order = order++ });

        // Consultations
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "consultations.read", Name = "Consulter les consultations", Module = "consultations", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "consultations.create", Name = "Creer des consultations", Module = "consultations", Order = order++ });

        // Users
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "users.read", Name = "Consulter les utilisateurs", Module = "users", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "users.create", Name = "Creer des utilisateurs", Module = "users", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "users.update", Name = "Modifier des utilisateurs", Module = "users", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "users.delete", Name = "Supprimer des utilisateurs", Module = "users", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "users.assign_roles", Name = "Attribuer des roles", Module = "users", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "users.reset_password", Name = "Reinitialiser les mots de passe", Module = "users", Order = order++ });

        // Roles
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "roles.read", Name = "Consulter les roles", Module = "roles", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "roles.create", Name = "Creer des roles", Module = "roles", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "roles.update", Name = "Modifier des roles", Module = "roles", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "roles.delete", Name = "Supprimer des roles", Module = "roles", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "roles.assign_permissions", Name = "Attribuer des permissions", Module = "roles", Order = order++ });

        // Parameters
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "parameters.read", Name = "Consulter les parametres", Module = "parameters", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "parameters.create", Name = "Creer des parametres", Module = "parameters", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "parameters.update", Name = "Modifier des parametres", Module = "parameters", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "parameters.delete", Name = "Supprimer des parametres", Module = "parameters", Order = order++ });

        // Audit
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "audit.read", Name = "Consulter le journal d'audit", Module = "audit", Order = order++ });

        // Workflows
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "workflows.read", Name = "Consulter les workflows", Module = "workflows", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "workflows.create", Name = "Creer des workflows", Module = "workflows", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "workflows.update", Name = "Modifier des workflows", Module = "workflows", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "workflows.delete", Name = "Supprimer des workflows", Module = "workflows", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "workflows.validate", Name = "Valider des workflows", Module = "workflows", Order = order++ });

        // Correspondence
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "correspondence.read", Name = "Consulter la correspondance", Module = "correspondence", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "correspondence.create", Name = "Creer la correspondance", Module = "correspondence", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "correspondence.update", Name = "Modifier la correspondance", Module = "correspondence", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "correspondence.delete", Name = "Supprimer la correspondance", Module = "correspondence", Order = order++ });

        // Settings
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "settings.read", Name = "Consulter les parametres de configuration", Module = "settings", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "settings.update", Name = "Modifier les parametres de configuration", Module = "settings", Order = order++ });

        // Profile
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "profile.read", Name = "Consulter son profil", Module = "profile", Order = order++ });
        permissions.Add(new Permission { Id = Guid.NewGuid(), Code = "profile.update", Name = "Modifier son profil", Module = "profile", Order = order++ });

            dbContext.Permissions.AddRange(permissions);
            await dbContext.SaveChangesAsync();
        }

        var additionalPermissions = new[]
        {
            new Permission { Id = Guid.NewGuid(), Code = "loans.update", Name = "Modifier des prets", Module = "loans", Order = 1001 },
            new Permission { Id = Guid.NewGuid(), Code = "loans.delete", Name = "Desactiver des prets", Module = "loans", Order = 1002 },
            new Permission { Id = Guid.NewGuid(), Code = "consultations.update", Name = "Modifier des consultations", Module = "consultations", Order = 1003 },
            new Permission { Id = Guid.NewGuid(), Code = "consultations.delete", Name = "Desactiver des consultations", Module = "consultations", Order = 1004 },
            new Permission { Id = Guid.NewGuid(), Code = "workflows.process", Name = "Traiter une etape de workflow", Module = "workflows", Order = 1005 },
            new Permission { Id = Guid.NewGuid(), Code = "correspondences.read", Name = "Consulter les courriers", Module = "correspondences", Order = 1006 },
            new Permission { Id = Guid.NewGuid(), Code = "correspondences.create", Name = "Creer un courrier", Module = "correspondences", Order = 1007 },
            new Permission { Id = Guid.NewGuid(), Code = "correspondences.update", Name = "Modifier un courrier", Module = "correspondences", Order = 1008 },
            new Permission { Id = Guid.NewGuid(), Code = "correspondences.delete", Name = "Supprimer un courrier", Module = "correspondences", Order = 1009 },
            new Permission { Id = Guid.NewGuid(), Code = "signatures.read", Name = "Consulter toutes les signatures", Module = "signatures", Order = 1010 },
        };

        var existingCodes = await dbContext.Permissions
            .Where(permission => additionalPermissions.Select(item => item.Code).Contains(permission.Code))
            .Select(permission => permission.Code)
            .ToListAsync();
        var missingPermissions = additionalPermissions
            .Where(permission => !existingCodes.Contains(permission.Code))
            .ToList();
        if (missingPermissions.Count > 0)
        {
            dbContext.Permissions.AddRange(missingPermissions);
            await dbContext.SaveChangesAsync();
        }

        var adminRole = await dbContext.Roles.SingleOrDefaultAsync(r => r.Name == "Admin");
        if (adminRole == null)
            return;

        var assignedAdminPermissionIds = await dbContext.RolePermissions
            .Where(rp => rp.RoleId == adminRole.Id)
            .Select(rp => rp.PermissionId)
            .ToListAsync();
        var allPermissionIds = await dbContext.Permissions
            .Select(permission => permission.Id)
            .ToListAsync();
        var missingAdminPermissionIds = allPermissionIds
            .Except(assignedAdminPermissionIds)
            .ToList();
        if (missingAdminPermissionIds.Count > 0)
        {
            dbContext.RolePermissions.AddRange(missingAdminPermissionIds.Select(permissionId => new RolePermission
            {
                RoleId = adminRole.Id,
                PermissionId = permissionId
            }));
            await dbContext.SaveChangesAsync();
        }
    }
}