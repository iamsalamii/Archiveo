import { apiClient, tokenService, invalidateApiCache } from '../project-archiveo-frontend/services/api-client.ts';

// Mock environnement navigateur
class MockStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

const mockStorage = new MockStorage();
(globalThis as any).window = {
  location: { pathname: '/dashboard', href: '/dashboard' },
};
(globalThis as any).sessionStorage = mockStorage;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  try {
    mockStorage.clear();
    invalidateApiCache();
    await fn();
    results.push({ name, passed: true });
    console.log(`[PASS] ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message });
    console.log(`[FAIL] ${name} -> ${err.message}`);
  }
}

async function main() {
  console.log('=== TEST SUITE : PHASE 2 - CACHE & CONCURRENCY AUDIT ===\n');

  // 1. Utilisateur A -> ressource privée -> Déconnexion -> Utilisateur B dans même onglet
  await runTest('1. Isolation Utilisateur A -> Déconnexion -> Utilisateur B', async () => {
    let serverCalls = 0;
    (globalThis as any).fetch = async (url: string, opts: any) => {
      serverCalls++;
      const auth = opts.headers?.Authorization;
      if (auth?.includes('token-A')) {
        return { ok: true, status: 200, json: async () => ({ user: 'Alice', secret: 'A-DATA' }) };
      }
      if (auth?.includes('token-B')) {
        return { ok: true, status: 200, json: async () => ({ user: 'Bob', secret: 'B-DATA' }) };
      }
      return { ok: false, status: 401, json: async () => ({ message: 'Unauthorized' }) };
    };

    tokenService.set('token-A-full-jwt-header-payload-signature');
    const resA1 = await apiClient.get<any>('/api/profile');
    if (resA1.user !== 'Alice') throw new Error(`Attendu Alice, reçu ${resA1.user}`);

    // Lecture en cache pour A
    const resA2 = await apiClient.get<any>('/api/profile');
    if (serverCalls !== 1) throw new Error(`Le cache de A n'a pas fonctionné (appels serveur: ${serverCalls})`);

    // Déconnexion
    tokenService.remove();

    // Connexion B
    tokenService.set('token-B-full-jwt-header-payload-signature');
    const resB = await apiClient.get<any>('/api/profile');
    if (resB.user !== 'Bob') {
      throw new Error(`FUITE DE CACHE : Utilisateur B a reçu les données de ${resB.user}!`);
    }
    if (resB.secret !== 'B-DATA') {
      throw new Error(`FUITE DE DONNÉES PRIVÉES : secret ${resB.secret} reçu au lieu de B-DATA`);
    }
  });

  // 2. Remplacement du jeton pendant une requête en cours
  await runTest('2. Remplacement du jeton pendant une requête en vol', async () => {
    let inflightResolve: any;
    (globalThis as any).fetch = async (url: string, opts: any) => {
      const auth = opts.headers?.Authorization;
      return new Promise((resolve) => {
        inflightResolve = () => {
          if (auth?.includes('token-A')) {
            resolve({ ok: true, status: 200, json: async () => ({ user: 'Alice', tokenUsed: 'A' }) });
          } else {
            resolve({ ok: true, status: 200, json: async () => ({ user: 'Bob', tokenUsed: 'B' }) });
          }
        };
      });
    };

    tokenService.set('token-A-full-jwt-long-signature-11111111');
    const promiseA = apiClient.get<any>('/api/sensitive');

    // Pendant que la requête est en vol, le token est remplacé par B
    tokenService.set('token-B-full-jwt-long-signature-22222222');

    // Maintenant la requête de A se termine
    inflightResolve();
    const resA = await promiseA;

    // Maintenant B demande /api/sensitive
    (globalThis as any).fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ user: 'Bob', tokenUsed: 'B' }),
    });

    const resB = await apiClient.get<any>('/api/sensitive');
    if (resB.user !== 'Bob') {
      throw new Error(`FUITE : La réponse retardée de A a pollué le cache de B! Reçu: ${JSON.stringify(resB)}`);
    }
  });

  // 3. Réponse d'une ancienne requête reçue après la déconnexion
  await runTest('3. Réponse retardée reçue après déconnexion (rejet de réinjection)', async () => {
    let delayedResolve: any;
    (globalThis as any).fetch = async () => {
      return new Promise((resolve) => {
        delayedResolve = () => {
          resolve({ ok: true, status: 200, json: async () => ({ confidential: 'SECRET-A' }) });
        };
      });
    };

    tokenService.set('token-A-full-jwt-for-delayed-test-12345678');
    const reqA = apiClient.get<any>('/api/confidential');

    // Utilisateur A se déconnecte avant la fin de la réponse
    tokenService.remove();

    // La réponse du serveur arrive enfin
    delayedResolve();
    await reqA;

    // Vérifier si la réponse a été réinjectée dans le cache après la déconnexion
    let anonFetchCount = 0;
    (globalThis as any).fetch = async () => {
      anonFetchCount++;
      return { ok: true, status: 200, json: async () => ({ publicData: 'NONE' }) };
    };

    const resAfterLogout = await apiClient.get<any>('/api/confidential');
    if ((resAfterLogout as any).confidential === 'SECRET-A') {
      throw new Error(`FUITE DE CACHE : Données confidentielles de A réinjectées en cache après déconnexion!`);
    }
    if (anonFetchCount === 0) {
      throw new Error(`Le serveur n'a pas été appelé après déconnexion, donnée servie depuis le cache!`);
    }
  });

  // 4. Test d'adversité : Collision des 16 derniers caractères + requête en vol
  await runTest('4. Immunité contre les collisions de suffixe (16 chars) et course en vol', async () => {
    const token1 = 'AAA_USER1_LONG_SECRET_KEY_1234567890abcdef';
    const token2 = 'BBB_USER2_OTHER_SECRET_KEY_1234567890abcdef'; // Même suffixe 16 chars!

    let slowResolve: any;
    (globalThis as any).fetch = async () => {
      return new Promise((resolve) => {
        slowResolve = () => {
          resolve({
            ok: true,
            status: 200,
            json: async () => ({ user: 'ALICE_PRIVATE_RECORD', balance: 999999 }),
          });
        };
      });
    };

    // User 1 lance la requête
    tokenService.set(token1);
    const promise1 = apiClient.get<any>('/api/private-account');

    // User 2 se connecte avant la réponse de User 1
    tokenService.set(token2);

    // La réponse de User 1 arrive enfin
    slowResolve();
    await promise1;

    // User 2 interroge son compte
    (globalThis as any).fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ user: 'BOB_PRIVATE_RECORD', balance: 0 }),
    });

    const bobResult = await apiClient.get<any>('/api/private-account');
    if (bobResult.user !== 'BOB_PRIVATE_RECORD') {
      throw new Error(`VIOLATION DE SÉCURITÉ : Bob a reçu ${bobResult.user} au lieu de ses données!`);
    }
  });

  // 5. Mutation réussie suivie d'une lecture
  await runTest('5. Mutation réussie suivie d’une lecture (fraîcheur garantie)', async () => {
    let docs = ['Doc 1'];
    let getCalls = 0;
    (globalThis as any).fetch = async (url: string, opts: any) => {
      const method = opts.method || 'GET';
      if (method === 'GET') {
        getCalls++;
        return { ok: true, status: 200, json: async () => [...docs] };
      }
      if (method === 'POST') {
        const body = JSON.parse(opts.body);
        docs.push(body.title);
        return { ok: true, status: 201, json: async () => ({ id: 'new', title: body.title }) };
      }
      return { ok: false, status: 400, json: async () => ({}) };
    };

    tokenService.set('token-valid-for-mutation-testing-123456');
    const read1 = await apiClient.get<string[]>('/api/documents');
    if (read1.length !== 1) throw new Error('Échec première lecture');

    await apiClient.post('/api/documents', { title: 'Doc 2' });

    const read2 = await apiClient.get<string[]>('/api/documents');
    if (read2.length !== 2) {
      throw new Error(`DONNÉE PÉRIMÉE : Attendu 2 docs après mutation, reçu ${read2.length}. Le cache n'a pas été invalidé!`);
    }
    if (getCalls !== 2) {
      throw new Error(`Le cache n'a pas rechargé depuis le serveur (appels serveur: ${getCalls})`);
    }
  });

  // 6. Mutation échouée suivie d'une lecture
  await runTest('6. Mutation échouée suivie d’une lecture (nettoyage résilient)', async () => {
    let getCalls = 0;
    (globalThis as any).fetch = async (url: string, opts: any) => {
      const method = opts.method || 'GET';
      if (method === 'GET') {
        getCalls++;
        return { ok: true, status: 200, json: async () => ({ count: 42 }) };
      }
      if (method === 'POST') {
        return { ok: false, status: 500, json: async () => ({ message: 'Server error' }) };
      }
    };

    tokenService.set('token-valid-failed-mutation-testing-123');
    await apiClient.get('/api/stats');
    if (getCalls !== 1) throw new Error('Échec initial');

    let failed = false;
    try {
      await apiClient.post('/api/stats', { invalid: true });
    } catch {
      failed = true;
    }
    if (!failed) throw new Error('La mutation aurait dû échouer');

    const readAfterFail = await apiClient.get<any>('/api/stats');
    if (readAfterFail.count !== 42) throw new Error('Lecture échouée après mutation en erreur');
  });

  // 7. Deux mutations concurrentes
  await runTest('7. Deux mutations concurrentes', async () => {
    let state = 0;
    (globalThis as any).fetch = async (url: string, opts: any) => {
      const method = opts.method || 'GET';
      if (method === 'GET') {
        return { ok: true, status: 200, json: async () => ({ state }) };
      }
      if (method === 'POST') {
        const body = JSON.parse(opts.body);
        state += body.inc;
        return { ok: true, status: 200, json: async () => ({ state }) };
      }
    };

    tokenService.set('token-concurrent-mutations-test-1234');
    await apiClient.get('/api/counter'); // mis en cache state = 0

    await Promise.all([
      apiClient.post('/api/counter', { inc: 5 }),
      apiClient.post('/api/counter', { inc: 10 }),
    ]);

    const read = await apiClient.get<any>('/api/counter');
    if (read.state !== 15) {
      throw new Error(`Attendu state 15, reçu ${read.state}. Course d'invalidation entre mutations concurrentes.`);
    }
  });

  // 8. Invalidation par pattern (listes, détails, compteurs)
  await runTest('8. Invalidation des listes, détails et compteurs dépendants', async () => {
    let docFetch = 0;
    let statsFetch = 0;
    (globalThis as any).fetch = async (url: string) => {
      if (url.includes('/api/documents')) {
        docFetch++;
        return { ok: true, status: 200, json: async () => ({ list: ['D1'] }) };
      }
      if (url.includes('/api/dashboard/stats')) {
        statsFetch++;
        return { ok: true, status: 200, json: async () => ({ total: 1 }) };
      }
      return { ok: true, status: 200, json: async () => ({}) };
    };

    tokenService.set('token-pattern-invalidation-test');
    await apiClient.get('/api/documents');
    await apiClient.get('/api/dashboard/stats');
    if (docFetch !== 1 || statsFetch !== 1) throw new Error('Mise en cache initiale échouée');

    // Invalidation ciblée
    apiClient.invalidateCache('/documents');

    await apiClient.get('/api/documents');
    await apiClient.get('/api/dashboard/stats');
    if (docFetch !== 2) throw new Error('/api/documents aurait dû être rechargé');
    if (statsFetch !== 1) throw new Error('/api/dashboard/stats aurait dû rester en cache');

    // Invalidation totale
    apiClient.invalidateCache();
    await apiClient.get('/api/dashboard/stats');
    if (statsFetch !== 2) throw new Error('/api/dashboard/stats aurait dû être invalidé');
  });

  // 9. Expiration du cache (TTL)
  await runTest('9. Expiration et nettoyage des entrées expirées', async () => {
    let serverCalls = 0;
    (globalThis as any).fetch = async () => {
      serverCalls++;
      return { ok: true, status: 200, json: async () => ({ time: Date.now() }) };
    };

    tokenService.set('token-ttl-test-token-12345678');
    const res1 = await apiClient.get('/api/time');
    const res2 = await apiClient.get('/api/time');
    if (serverCalls !== 1) throw new Error('Le cache initial a échoué');

    const realDateNow = Date.now;
    try {
      Date.now = () => realDateNow() + 30_000; // +30s (> 25s TTL)
      const res3 = await apiClient.get('/api/time');
      if (serverCalls !== 2) {
        throw new Error(`Le cache n'a pas expiré après 30 secondes (appels: ${serverCalls})`);
      }
    } finally {
      Date.now = realDateNow;
    }
  });

  console.log('\n=== RÉSUMÉ DES TESTS ===');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Total: ${results.length} | Réussis: ${passedCount} | Échoués: ${results.length - passedCount}`);
  if (passedCount !== results.length) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
