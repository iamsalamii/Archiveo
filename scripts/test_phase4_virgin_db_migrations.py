import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import subprocess
import sys

PG_HOST = "localhost"
PG_PORT = 5432
PG_USER = "postgres"
PG_PWD = "Salamsafe52@$"
VIRGIN_DB = "archiveo_virgin_test_db"
CONN_STR = f"Host={PG_HOST};Port={PG_PORT};Database={VIRGIN_DB};Username={PG_USER};Password={PG_PWD}"

def main():
    print("=== PHASE 4 : VÉRIFICATION SUR BASE VIERGE DES MIGRATIONS ET INDEX COMPOSITES ===\n")
    
    # 1. Connexion postgres pour créer la base vierge
    conn = psycopg2.connect(dbname="postgres", user=PG_USER, password=PG_PWD, host=PG_HOST, port=PG_PORT)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()

    cur.execute(f"DROP DATABASE IF EXISTS {VIRGIN_DB};")
    cur.execute(f"CREATE DATABASE {VIRGIN_DB};")
    print(f"[OK] Base de test vierge '{VIRGIN_DB}' créée avec succès.")
    conn.close()

    # 2. Exécution des migrations complètes via dotnet ef database update
    print("\nExécution séquentielle de l'ensemble des migrations EF Core sur la base vierge...")
    cmd = [
        "dotnet", "ef", "database", "update",
        "--connection", CONN_STR,
        "--project", "Archiveo.Infrastructure",
        "--startup-project", "Archiveo.Api"
    ]
    res = subprocess.run(cmd, cwd="project-archiveo-backend", capture_output=True, text=True)
    if res.returncode != 0:
        print("[FAIL] Erreur lors de l'exécution des migrations :")
        print(res.stderr)
        print(res.stdout)
        sys.exit(1)
    print("[PASS] Toutes les migrations EF Core se sont appliquées sans erreur !")

    # 3. Vérification de la création effective des 3 index composites sur la base vierge
    conn_virgin = psycopg2.connect(dbname=VIRGIN_DB, user=PG_USER, password=PG_PWD, host=PG_HOST, port=PG_PORT)
    cur_v = conn_virgin.cursor()

    cur_v.execute("""
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE indexname IN (
            'IX_Documents_IsActive_CreatedAt',
            'IX_ArchiveRecords_IsActive_ArchivedAt',
            'IX_LoanRecords_IsActive_BorrowDate'
        )
        ORDER BY tablename, indexname;
    """)
    indexes = cur_v.fetchall()
    print(f"\nIndex composites détectés sur la base vierge ({len(indexes)}/3) :")
    for idx in indexes:
        print(f"  - Table: {idx[0]} | Nom: {idx[1]} -> {idx[2]}")

    if len(indexes) == 3:
        print("\n[PASS] Les 3 index composites sont 100% créés et conformes sur base vierge !")
    else:
        print(f"\n[FAIL] Seulement {len(indexes)} index trouvés sur 3 attendus.")
        sys.exit(1)

    # 4. Vérification de l'historique des migrations
    cur_v.execute('SELECT "MigrationId" FROM "__EFMigrationsHistory" ORDER BY "MigrationId";')
    migrations = [r[0] for r in cur_v.fetchall()]
    print(f"\nHistorique des migrations appliquees ({len(migrations)}) :")
    for m in migrations:
        print(f"  [OK] {m}")

    conn_virgin.close()

    # Nettoyage : suppression de la base temporaire
    conn_clean = psycopg2.connect(dbname="postgres", user=PG_USER, password=PG_PWD, host=PG_HOST, port=PG_PORT)
    conn_clean.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur_c = conn_clean.cursor()
    cur_c.execute(f"DROP DATABASE IF EXISTS {VIRGIN_DB};")
    conn_clean.close()
    print(f"\n[OK] Base de test vierge '{VIRGIN_DB}' nettoyée et supprimée proprement.")

if __name__ == "__main__":
    main()
