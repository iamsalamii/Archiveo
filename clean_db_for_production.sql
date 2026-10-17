-- ============================================================================
-- PROJET ARCHIVÉO — SCRIPT DE PURGE DE PRÉ-PRODUCTION / REMISE À ZÉRO
-- FICHIER : clean_db_for_production.sql
-- RÉVISION : ANO-04 (Architecture sécurisée & schéma PostgreSQL conforme)
-- ============================================================================
--
-- AVERTISSEMENT DE SÉCURITÉ MAJEUR :
-- Ce script est STRICTEMENT DESTRUCTIF. Il a pour but exclusif de réinitialiser
-- les données opérationnelles (documents, versions, signatures, prêts, archives,
-- courriers, workflows, logs d'audit et notifications) ainsi que les comptes
-- utilisateurs de démonstration avant la remise d'une instance propre au client.
--
-- IL NE DOIT JAMAIS ÊTRE EXÉCUTÉ EN PRODUCTION RÉELLE CONTENANT DES DONNÉES CLIENTS.
--
-- DONNÉES SUPPRIMÉES :
--   - 11 tables opérationnelles purgées par TRUNCATE ... CASCADE :
--       * "DocumentSignatures"
--       * "DocumentVersions"
--       * "ConsultationRecords"
--       * "LoanRecords"
--       * "WorkflowSteps"
--       * "Workflows"
--       * "Correspondences"
--       * "ArchiveRecords"
--       * "Documents"
--       * "AuditLogs"
--       * "Notifications"
--   - Utilisateurs de test ("Users", "UserRoles", "UserClaims", "UserLogins", "UserTokens")
--     sauf l'administrateur système ("admin@archiveo.com").
--
-- DONNÉES INTÉGRALEMENT PRÉSERVÉES :
--   - Configuration métier et dictionnaires ("ParameterGroups", "ParameterItems")
--   - Référentiel RBAC des habilitations ("Permissions", "Roles", "RolePermissions", "RoleClaims")
--   - Historique des migrations Entity Framework ("__EFMigrationsHistory")
--   - Compte administrateur système ("admin@archiveo.com") et ses attributions
--
-- TABLES OBSOLÈTES RETIRÉES (ANO-04) :
--   - "Loans"        -> inexistant dans le schéma réel, remplacé par "LoanRecords"
--   - "Archives"     -> inexistant dans le schéma réel, remplacé par "ArchiveRecords"
--   - "ActivityLogs" -> inexistant dans le schéma réel, remplacé par "AuditLogs"
--
-- PRÉCONDITION OBLIGATOIRE D'EXÉCUTION :
-- Pour empêcher toute exécution involontaire (ex. psql -f malencontreux),
-- l'opérateur DOIT définir la variable de session suivante avant exécution :
--     SET archiveo.allow_cleanup = 'true';
\set ON_ERROR_STOP on

BEGIN;

-- ============================================================================
-- ÉTAPE 0 : GARDE-FOUS DE SÉCURITÉ STRICTS (Vérification d'intention & compte admin)
-- ============================================================================
DO $$
DECLARE
    v_admin_count INT;
    v_current_db  TEXT;
BEGIN
    SELECT current_database() INTO v_current_db;

    -- 1. Contrôle du commutateur de sécurité explicite
    IF current_setting('archiveo.allow_cleanup', true) IS DISTINCT FROM 'true' THEN
        RAISE EXCEPTION
            'BLOCAGE DE SÉCURITÉ [ANO-04] : Exécution non autorisée sur la base « % ». '
            'Ce script détruit irréversiblement les documents et utilisateurs de test. '
            'Pour confirmer expressément cette purge dans votre session interactive, exécutez d''abord : '
            'SET archiveo.allow_cleanup = ''true'';', v_current_db;
    END IF;

    -- 2. Vérification préalable de la présence d'un compte administrateur
    SELECT COUNT(*) INTO v_admin_count
    FROM "Users"
    WHERE UPPER(TRIM(COALESCE("NormalizedEmail", "Email", ''))) = 'ADMIN@ARCHIVEO.COM';

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION
            'INTERRUPTION DE SÉCURITÉ [ANO-04] : Aucun compte administrateur « admin@archiveo.com » '
            'trouvé dans la table "Users" de la base « % ». '
            'L''opération est immédiatement abandonnée afin d''éviter de laisser une instance sans aucun accès administratif.',
            v_current_db;
    END IF;
END $$;

-- ============================================================================
-- ÉTAPE 1 : VIDAGE ATOMIQUE DES TABLES OPÉRATIONNELLES
-- ============================================================================
TRUNCATE TABLE
    "DocumentSignatures",
    "DocumentVersions",
    "ConsultationRecords",
    "LoanRecords",
    "WorkflowSteps",
    "Workflows",
    "Correspondences",
    "ArchiveRecords",
    "Documents",
    "AuditLogs",
    "Notifications"
CASCADE;

-- ============================================================================
-- ÉTAPE 2 : PURGE DES UTILISATEURS DE TEST ET CONSERVATION DE L'ADMINISTRATEUR
-- ============================================================================
DELETE FROM "UserRoles"
WHERE "UserId" NOT IN (
    SELECT "Id" FROM "Users"
    WHERE UPPER(TRIM(COALESCE("NormalizedEmail", "Email", ''))) = 'ADMIN@ARCHIVEO.COM'
);

DELETE FROM "UserClaims"
WHERE "UserId" NOT IN (
    SELECT "Id" FROM "Users"
    WHERE UPPER(TRIM(COALESCE("NormalizedEmail", "Email", ''))) = 'ADMIN@ARCHIVEO.COM'
);

DELETE FROM "UserLogins"
WHERE "UserId" NOT IN (
    SELECT "Id" FROM "Users"
    WHERE UPPER(TRIM(COALESCE("NormalizedEmail", "Email", ''))) = 'ADMIN@ARCHIVEO.COM'
);

DELETE FROM "UserTokens"
WHERE "UserId" NOT IN (
    SELECT "Id" FROM "Users"
    WHERE UPPER(TRIM(COALESCE("NormalizedEmail", "Email", ''))) = 'ADMIN@ARCHIVEO.COM'
);

DELETE FROM "Users"
WHERE UPPER(TRIM(COALESCE("NormalizedEmail", "Email", ''))) != 'ADMIN@ARCHIVEO.COM';

-- ============================================================================
-- ÉTAPE 3 : CONTRÔLE POST-NETTOYAGE ET VALIDATION TRANSACTIONNELLE
-- ============================================================================
DO $$
DECLARE
    v_admin_remaining INT;
BEGIN
    SELECT COUNT(*) INTO v_admin_remaining
    FROM "Users"
    WHERE UPPER(TRIM(COALESCE("NormalizedEmail", "Email", ''))) = 'ADMIN@ARCHIVEO.COM';

    IF v_admin_remaining = 0 THEN
        RAISE EXCEPTION
            'ERREUR CRITIQUE [ANO-04] : L''administrateur a été inopinément supprimé lors de la purge. '
            'Annulation totale de la transaction (ROLLBACK).';
    END IF;
END $$;

COMMIT;
