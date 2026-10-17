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
    SELECT u."Id", u."Email", u."FirstName", u."LastName", r."Name" as role
    FROM "Users" u
    LEFT JOIN "UserRoles" ur ON u."Id" = ur."UserId"
    LEFT JOIN "Roles" r ON ur."RoleId" = r."Id"
    LIMIT 20;
""")
rows = cur.fetchall()
print(f"Found {len(rows)} users:")
for r in rows:
    print(f"  - {r[1]} ({r[2]} {r[3]}) -> Role: {r[4]} [ID: {r[0]}]")

cur.execute('SELECT "Code", "Name" FROM "Permissions" LIMIT 15;')
perms = cur.fetchall()
print(f"\nSample Permissions ({len(perms)}):")
for p in perms:
    print(f"  - {p[0]}: {p[1]}")

conn.close()
