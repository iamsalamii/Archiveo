import os
import psycopg2

conn = psycopg2.connect(
    dbname=os.environ.get("DB_NAME", "archiveo_db"),
    user=os.environ.get("DB_USER", "postgres"),
    password=os.environ.get("DB_PASSWORD", ""),
    host=os.environ.get("DB_HOST", "localhost"),
    port=int(os.environ.get("DB_PORT", "5432"))
)
cur = conn.cursor()
cur.execute("""
    SELECT p."Code", p."Name"
    FROM "Roles" r
    JOIN "RolePermissions" rp ON r."Id" = rp."RoleId"
    JOIN "Permissions" p ON rp."PermissionId" = p."Id"
    WHERE r."Name" = 'User';
""")
rows = cur.fetchall()
print(f"Permissions for 'User' role ({len(rows)}):")
for r in rows:
    print(f"  - {r[0]}: {r[1]}")

conn.close()
