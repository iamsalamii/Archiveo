import urllib.request
import urllib.error
import json
import time
import statistics
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
import sys

API_BASE = "http://localhost:5000"
FRONTEND_BASE = "http://localhost:3000"

def get_admin_token():
    req = urllib.request.Request(
        f"{API_BASE}/api/auth/login",
        data=json.dumps({"email": "admin@archiveo.com", "password": "Admin123!"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode("utf-8"))
        return data["token"]

def measure_endpoint(url, method="GET", token=None, body=None, iterations=15):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data = json.dumps(body).encode("utf-8") if body else None

    times = []
    # Cold run
    t0 = time.perf_counter()
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req) as res:
        res.read()
    t_cold = (time.perf_counter() - t0) * 1000.0

    # Warm runs
    for _ in range(iterations):
        t0 = time.perf_counter()
        req = urllib.request.Request(url, data=data, headers=headers, method=method)
        with urllib.request.urlopen(req) as res:
            res.read()
        times.append((time.perf_counter() - t0) * 1000.0)

    med = statistics.median(times)
    avg = statistics.mean(times)
    stdev = statistics.stdev(times) if len(times) > 1 else 0.0
    t_min = min(times)
    t_max = max(times)
    return {
        "cold_ms": round(t_cold, 2),
        "median_ms": round(med, 2),
        "mean_ms": round(avg, 2),
        "stdev_ms": round(stdev, 2),
        "min_ms": round(t_min, 2),
        "max_ms": round(t_max, 2)
    }

def main():
    print("=== PHASE 5 : BENCHMARK PERFORMANCES ET TESTS DE CHARGE ===\n")
    token = get_admin_token()

    endpoints = [
        ("Authentification (POST /api/auth/login)", f"{API_BASE}/api/auth/login", "POST", {"email": "admin@archiveo.com", "password": "Admin123!"}),
        ("Liste Documents (GET /api/documents)", f"{API_BASE}/api/documents", "GET", None),
        ("Registre Archives (GET /api/archives)", f"{API_BASE}/api/archives", "GET", None),
        ("Prêts & Sorties (GET /api/loans)", f"{API_BASE}/api/loans", "GET", None),
        ("Nomenclature & Parametres (GET /api/parameters/groups)", f"{API_BASE}/api/parameters/groups", "GET", None),
        ("Circuits de Signature & Workflows (GET /api/workflows)", f"{API_BASE}/api/workflows", "GET", None),
        ("Journal d'Audit (GET /api/audit?limit=100)", f"{API_BASE}/api/audit?limit=100", "GET", None),
    ]

    print("1. MESURES DES TEMPS DE REPONSE API (.NET 9 + EF CORE)")
    print(f"{'Endpoint':<45} | {'A froid':<9} | {'Mediane':<9} | {'Moyenne':<9} | {'Ecart-type':<10} | {'Min/Max'}")
    print("-" * 105)

    for name, url, method, body in endpoints:
        res = measure_endpoint(url, method=method, token=token if method == "GET" else None, body=body)
        min_max = f"{res['min_ms']}/{res['max_ms']} ms"
        print(f"{name:<45} | {res['cold_ms']:>6} ms | {res['median_ms']:>6} ms | {res['mean_ms']:>6} ms | {res['stdev_ms']:>7} ms | {min_max}")

    # 2. Mesure des ressources Frontend (Next.js)
    print("\n2. MESURES DES RESSOURCES STATIQUES FRONTEND")
    frontend_urls = [
        ("Page Landing HTML (/) ", f"{FRONTEND_BASE}/"),
        ("Login Page (/login)", f"{FRONTEND_BASE}/login"),
    ]
    for name, url in frontend_urls:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as res:
            content = res.read()
            print(f"  - {name:<30} -> Taille: {len(content):>7} octets | Code: {res.status}")

    # 3. Test de charge sur base de données isolée (10 000 documents)
    print("\n3. TEST DE CHARGE SUR BASE ISOLEE (10 000 DOCUMENTS)")
    ISOLATED_DB = "archiveo_perf_test_isolated"
    conn_pg = psycopg2.connect(dbname="postgres", user="postgres", password="Salamsafe52@$", host="localhost", port=5432)
    conn_pg.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur_pg = conn_pg.cursor()
    cur_pg.execute(f"DROP DATABASE IF EXISTS {ISOLATED_DB};")
    cur_pg.execute(f"CREATE DATABASE {ISOLATED_DB};")
    conn_pg.close()

    # Appliquer schéma et insérer 10 000 documents
    conn_iso = psycopg2.connect(dbname=ISOLATED_DB, user="postgres", password="Salamsafe52@$", host="localhost", port=5432)
    cur_iso = conn_iso.cursor()
    
    # Table simplifiée conforme pour tester l'impact de l'index composite
    cur_iso.execute("""
        CREATE TABLE "Documents" (
            "Id" UUID PRIMARY KEY,
            "Reference" VARCHAR(50) UNIQUE NOT NULL,
            "Title" VARCHAR(255) NOT NULL,
            "IsActive" BOOLEAN NOT NULL,
            "CreatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
        );
        INSERT INTO "Documents" ("Id", "Reference", "Title", "IsActive", "CreatedAt")
        SELECT 
            gen_random_uuid(),
            'DOC-' || i,
            'Document Test Volumetrie #' || i,
            (i % 5 != 0), -- 80% IsActive = true, 20% false
            NOW() - (i || ' minutes')::interval
        FROM generate_series(1, 10000) AS i;
    """)
    conn_iso.commit()

    # Plan de requête SANS index
    cur_iso.execute("""
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT "Id", "Title", "CreatedAt"
        FROM "Documents"
        WHERE "IsActive" = TRUE
        ORDER BY "CreatedAt" DESC
        LIMIT 50;
    """)
    plan_no_index = [r[0] for r in cur_iso.fetchall()]
    time_no_index = next(line for line in plan_no_index if "Execution Time" in line)

    # Création de l'index composite
    cur_iso.execute("""
        CREATE INDEX "IX_Documents_IsActive_CreatedAt" 
        ON "Documents" ("IsActive", "CreatedAt" DESC);
    """)
    conn_iso.commit()

    # Plan de requête AVEC index composite
    cur_iso.execute("""
        EXPLAIN (ANALYZE, BUFFERS)
        SELECT "Id", "Title", "CreatedAt"
        FROM "Documents"
        WHERE "IsActive" = TRUE
        ORDER BY "CreatedAt" DESC
        LIMIT 50;
    """)
    plan_with_index = [r[0] for r in cur_iso.fetchall()]
    time_with_index = next(line for line in plan_with_index if "Execution Time" in line)
    scan_type = next(line for line in plan_with_index if "Scan" in line)

    print(f"  - Sans index composite (10 000 lignes) : {time_no_index.strip()} (Seq Scan + Quicksort en memoire)")
    print(f"  - Avec index composite (10 000 lignes) : {time_with_index.strip()} ({scan_type.strip()})")

    conn_iso.close()

    # Nettoyage
    conn_clean = psycopg2.connect(dbname="postgres", user="postgres", password="Salamsafe52@$", host="localhost", port=5432)
    conn_clean.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur_clean = conn_clean.cursor()
    cur_clean.execute(f"DROP DATABASE IF EXISTS {ISOLATED_DB};")
    conn_clean.close()
    print("  [OK] Base isolee de test de volumetrie supprimee proprement.")

if __name__ == "__main__":
    main()
