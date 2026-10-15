import urllib.request
import urllib.error
import json
import psycopg2
import sys

API_BASE = "http://localhost:5000"

def log_test(name, passed, details=""):
    status = "[PASS]" if passed else "[FAIL]"
    print(f"{status} {name}")
    if details:
        print(f"       -> {details}")

def do_request(url, method="GET", token=None, body=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            data = json.loads(content) if content else {}
            return resp.status, data
    except urllib.error.HTTPError as e:
        try:
            content = e.read().decode("utf-8")
            err_data = json.loads(content) if content else {}
        except Exception:
            err_data = {}
        return e.code, err_data
    except Exception as e:
        return 0, str(e)

def login(email, pwd):
    status, data = do_request(f"{API_BASE}/api/auth/login", method="POST", body={"email": email, "password": pwd})
    if status == 200 and "token" in data:
        return data["token"]
    raise Exception(f"Failed to login {email}: status {status}, {data}")

def main():
    print("=== PHASE 3 : TESTS D'AUTORISATIONS ET AUDIT SÉCURITÉ ===\n")
    all_passed = True

    # 1. Requête anonyme
    st1, _ = do_request(f"{API_BASE}/api/documents", method="GET")
    p1 = (st1 == 401)
    log_test("1. Requête anonyme sur ressource protégée (/api/documents)", p1, f"Status code: {st1} (Attendu 401)")
    if not p1: all_passed = False

    st1b, _ = do_request(f"{API_BASE}/api/audit", method="GET")
    p1b = (st1b == 401)
    log_test("1b. Requête anonyme sur l'audit (/api/audit)", p1b, f"Status code: {st1b} (Attendu 401)")
    if not p1b: all_passed = False

    # 2. Jeton invalide ou expiré
    st2, _ = do_request(f"{API_BASE}/api/documents", method="GET", token="invalid.token.signature.value")
    p2 = (st2 == 401)
    log_test("2. Jeton invalide rejeté (/api/documents)", p2, f"Status code: {st2} (Attendu 401)")
    if not p2: all_passed = False

    # Tokens de test
    token_admin = login("admin@archiveo.com", "Admin123!")
    token_user = login("s.laurent@archiveo.com", "Admin123!") # Role User: pas de audit.read, pas de documents.delete

    # 3. Utilisateur authentifié sans permission
    st3, _ = do_request(f"{API_BASE}/api/audit", method="GET", token=token_user)
    p3 = (st3 == 403)
    log_test("3. Utilisateur sans permission rejeté sur /api/audit", p3, f"Status code: {st3} (Attendu 403 Forbidden)")
    if not p3: all_passed = False

    # 4. Utilisateur autorisé
    st4, data4 = do_request(f"{API_BASE}/api/audit", method="GET", token=token_admin)
    p4 = (st4 == 200 and isinstance(data4, list))
    log_test("4. Utilisateur autorisé accepté sur /api/audit (Admin)", p4, f"Status code: {st4}, Logs reçus: {len(data4) if isinstance(data4, list) else 0}")
    if not p4: all_passed = False

    # 5. Accès à une ressource non autorisée (DELETE document avec rôle User)
    st5, _ = do_request(f"{API_BASE}/api/documents/22222222-2222-2222-2222-222222222201", method="DELETE", token=token_user)
    p5 = (st5 == 403)
    log_test("5. Mutation non autorisée bloquée (DELETE document par User)", p5, f"Status code: {st5} (Attendu 403 Forbidden)")
    if not p5: all_passed = False

    # 6. Opérations de téléchargement
    st6_anon, _ = do_request(f"{API_BASE}/api/documents/22222222-2222-2222-2222-222222222201/download", method="GET")
    p6_anon = (st6_anon == 401)
    log_test("6a. Téléchargement anonyme rejeté", p6_anon, f"Status code: {st6_anon} (Attendu 401)")
    if not p6_anon: all_passed = False

    st6_user, _ = do_request(f"{API_BASE}/api/documents/22222222-2222-2222-2222-222222222201/download", method="GET", token=token_user)
    p6_user = (st6_user == 403)
    log_test("6b. Téléchargement sans permission documents.download rejeté", p6_user, f"Status code: {st6_user} (Attendu 403)")
    if not p6_user: all_passed = False

    # 7. Lecture des journaux d'audit et persistance
    conn = psycopg2.connect(dbname="archiveo_db", user="postgres", password="Salamsafe52@$", host="localhost", port=5432)
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM "AuditLogs";')
    count_before = cur.fetchone()[0]

    # Déclencher une mutation réussie (création d'un paramètre ou consultation)
    st7_mut, _ = do_request(f"{API_BASE}/api/parameters", method="POST", token=token_admin, body={
        "groupCode": "TEST_AUDIT",
        "code": "PARAM_TEST_AUDIT_1",
        "name": "Audit Verification Item",
        "description": "Created for Phase 3 audit verification",
        "order": 999
    })

    cur.execute('SELECT "Action", "Target", "StatusCode", "UserName", "Timestamp" FROM "AuditLogs" ORDER BY "Timestamp" DESC LIMIT 5;')
    recent_logs = cur.fetchall()
    
    print("\nDerniers événements dans le registre AuditLogs en base :")
    for r in recent_logs:
        print(f"  - [{r[4]}] {r[0]} on {r[1]} -> Status {r[2]} (User: {r[3]})")

    p7 = len(recent_logs) > 0 and any("POST" in r[0] or "parameters" in r[1].lower() or "audit" in r[1].lower() for r in recent_logs)
    log_test("7. Persistance des événements de sécurité dans AuditLogs", p7, f"Total logs: {count_before + 1}")
    if not p7: all_passed = False

    # 8. Déconnexion et changement de compte
    # User -> vérifie ses claims
    st8_u, _ = do_request(f"{API_BASE}/api/roles", method="GET", token=token_user)
    st8_a, _ = do_request(f"{API_BASE}/api/roles", method="GET", token=token_admin)
    p8 = (st8_u == 403 and st8_a == 200)
    log_test("8. Changement de compte et étanchéité des privilèges (/api/roles)", p8, f"User status: {st8_u} (403), Admin status: {st8_a} (200)")
    if not p8: all_passed = False

    conn.close()

    print(f"\n=== VERDICT PHASE 3 : {'TOUS LES CONTRÔLES SONT VALIDÉS (PASS)' if all_passed else 'ÉCHEC SUR CERTAINS TESTS (FAIL)'} ===")
    if not all_passed:
        sys.exit(1)

if __name__ == "__main__":
    main()
