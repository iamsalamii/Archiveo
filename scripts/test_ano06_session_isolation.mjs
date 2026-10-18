import test from 'node:test';
import assert from 'node:assert/strict';

/**
 * ARCHIÉVO — QUALIFICATION TECHNIQUE ANO-06
 * Suite de tests automatisée pour la synchronisation multi-onglets, l'isolation de session,
 * la protection contre les réponses réseau tardives et l'invalidation du cache.
 */

// 1. Simulation d'un bus BroadcastChannel + localStorage inter-onglets
class MockEventHub {
  constructor() {
    this.broadcastListeners = new Map(); // channelName -> Set<callback>
    this.storageListeners = new Set();
    this.localStorageStore = new Map();
  }

  createBroadcastChannel(channelName, tabId) {
    if (!this.broadcastListeners.has(channelName)) {
      this.broadcastListeners.set(channelName, new Set());
    }

    const listeners = this.broadcastListeners.get(channelName);
    const channel = {
      name: channelName,
      tabId,
      onmessage: null,
      postMessage: (data) => {
        // Diffuser à TOUS les autres onglets abonnés au canal (sauf l'émetteur)
        for (const target of listeners) {
          if (target.tabId !== tabId && typeof target.onmessage === 'function') {
            setTimeout(() => target.onmessage({ data }), 0);
          }
        }
      },
      close: () => {
        listeners.delete(channel);
      }
    };
    listeners.add(channel);
    return channel;
  }

  createLocalStorage(tabId) {
    const hub = this;
    return {
      getItem: (key) => hub.localStorageStore.get(key) ?? null,
      setItem: (key, value) => {
        const oldValue = hub.localStorageStore.get(key) ?? null;
        hub.localStorageStore.set(key, String(value));
        // Émettre StorageEvent à tous les AUTRES onglets
        for (const listener of hub.storageListeners) {
          if (listener.tabId !== tabId) {
            setTimeout(() => {
              listener.callback({ key, oldValue, newValue: String(value) });
            }, 0);
          }
        }
      },
      removeItem: (key) => {
        const oldValue = hub.localStorageStore.get(key) ?? null;
        hub.localStorageStore.delete(key);
        for (const listener of hub.storageListeners) {
          if (listener.tabId !== tabId) {
            setTimeout(() => {
              listener.callback({ key, oldValue, newValue: null });
            }, 0);
          }
        }
      },
      clear: () => {
        hub.localStorageStore.clear();
      }
    };
  }

  addStorageEventListener(tabId, callback) {
    const entry = { tabId, callback };
    this.storageListeners.add(entry);
    return () => this.storageListeners.delete(entry);
  }
}

// 2. Modèle d'un onglet de navigation Archivéo
class SimulatedBrowserTab {
  constructor(tabId, hub) {
    this.tabId = tabId;
    this.hub = hub;
    const sessionMap = new Map();
    this.sessionStorage = {
      getItem: (k) => sessionMap.get(k) ?? null,
      setItem: (k, v) => sessionMap.set(k, String(v)),
      removeItem: (k) => sessionMap.delete(k),
      get: (k) => sessionMap.get(k) ?? null,
      set: (k, v) => sessionMap.set(k, String(v)),
      delete: (k) => sessionMap.delete(k),
      clear: () => sessionMap.clear()
    };
    this.localStorage = hub.createLocalStorage(tabId);
    this.broadcastChannel = hub.createBroadcastChannel('archiveo_session_channel', tabId);
    this.currentPath = '/dashboard';
    this.redirectedTo = null;

    // État interne de session et de cache
    this.sessionGeneration = 0;
    this.memoryCache = new Map();
    this.inFlightRequests = new Map();
    this.currentUser = null;
    this.processedActionIds = new Set();
    this.isUnmounted = false;

    // Initialisation des écouteurs
    this.broadcastChannel.onmessage = (event) => {
      this.handleIncomingSyncAction(event.data);
    };

    hub.addStorageEventListener(tabId, (event) => {
      if (event.key === 'archiveo_session_sync_pulse' && event.newValue) {
        try {
          const action = JSON.parse(event.newValue);
          this.handleIncomingSyncAction(action);
        } catch {}
      }
    });
  }

  // Session sync receiver (analogue à auth-context.tsx / session-sync.ts)
  handleIncomingSyncAction(action) {
    if (!action || !action.id) return;
    if (this.processedActionIds.has(action.id)) return;
    this.processedActionIds.add(action.id);

    if (action.type === 'LOGOUT') {
      this.onLogoutReceived();
    } else if (action.type === 'LOGIN') {
      this.onLoginReceived(action.userId);
    }
  }

  onLogoutReceived() {
    this.sessionGeneration++;
    this.abortAllInFlight();
    this.invalidateCache();
    this.sessionStorage.delete('archiveo_token');
    this.sessionStorage.delete('archiveo_param_groups_cache');
    this.currentUser = null;
    this.isUnmounted = true; // AuthGuard démonte les composants privés

    if (this.currentPath !== '/' && this.currentPath !== '/login') {
      this.redirectedTo = '/login';
    }
  }

  onLoginReceived(newUserId) {
    if (this.currentUser && this.currentUser.id !== newUserId) {
      this.onLogoutReceived();
    }
  }

  // Token service & cache
  setToken(token, user) {
    this.sessionGeneration++;
    this.abortAllInFlight();
    this.invalidateCache();
    this.sessionStorage.set('archiveo_token', token);
    this.currentUser = user;
    this.isUnmounted = false;
  }

  logout() {
    this.sessionGeneration++;
    this.abortAllInFlight();
    this.invalidateCache();
    this.sessionStorage.delete('archiveo_token');
    this.sessionStorage.delete('archiveo_param_groups_cache');
    this.currentUser = null;
    this.isUnmounted = true;
    this.redirectedTo = '/login';

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.processedActionIds.add(id);

    const action = { type: 'LOGOUT', id, timestamp: Date.now() };
    this.broadcastChannel.postMessage(action);
    this.localStorage.setItem('archiveo_session_sync_pulse', JSON.stringify(action));
  }

  login(token, user) {
    this.setToken(token, user);
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    this.processedActionIds.add(id);
    const action = { type: 'LOGIN', userId: user.id, id, timestamp: Date.now() };
    this.broadcastChannel.postMessage(action);
    this.localStorage.setItem('archiveo_session_sync_pulse', JSON.stringify(action));
  }

  handle401() {
    this.logout();
  }

  abortAllInFlight() {
    for (const [key, req] of this.inFlightRequests) {
      req.aborted = true;
    }
    this.inFlightRequests.clear();
  }

  invalidateCache() {
    this.memoryCache.clear();
  }

  // Fetch avec gestion de génération de session et barrière post-réseau
  async apiFetch(endpoint, networkLatencyMs = 10, mockResponse = { data: 'ok' }) {
    const currentGen = this.sessionGeneration;
    const currentToken = this.sessionStorage.get('archiveo_token');
    const cacheKey = `${currentToken ? currentToken.slice(-16) : 'anon'}:${endpoint}`;

    if (this.memoryCache.has(cacheKey)) {
      return this.memoryCache.get(cacheKey);
    }

    const reqRecord = { aborted: false };
    this.inFlightRequests.set(endpoint, reqRecord);

    await new Promise((resolve) => setTimeout(resolve, networkLatencyMs));

    if (this.sessionGeneration !== currentGen || this.sessionStorage.get('archiveo_token') !== currentToken) {
      throw new Error('SessionAbortedError: Requête annulée, la session a changé.');
    }

    if (reqRecord.aborted) {
      throw new Error('SessionAbortedError: Requête annulée.');
    }

    this.memoryCache.set(cacheKey, mockResponse);
    this.inFlightRequests.delete(endpoint);
    return mockResponse;
  }
}

// =========================================================================
// EXÉCUTION DES SCÉNARIOS DE TEST ANO-06
// =========================================================================

test('Scénario 1 : Déconnexion dans Onglet A -> Onglet B ne conserve aucun état authentifié exploitable', async () => {
  const hub = new MockEventHub();
  const tabA = new SimulatedBrowserTab('tabA', hub);
  const tabB = new SimulatedBrowserTab('tabB', hub);

  const testUser = { id: 'user-001', name: 'Alice Agent' };
  const token = 'jwt-token-user-001';

  tabA.setToken(token, testUser);
  tabB.setToken(token, testUser);

  assert.equal(tabA.sessionStorage.get('archiveo_token'), token);
  assert.equal(tabB.sessionStorage.get('archiveo_token'), token);
  assert.equal(tabB.currentUser?.id, 'user-001');

  // WHEN: Déconnexion dans l'onglet A
  tabA.logout();

  // Attendre la propagation asynchrone (BroadcastChannel / storage event)
  await new Promise((r) => setTimeout(r, 20));

  // THEN: Onglet B doit avoir purgé son token et son utilisateur
  assert.equal(tabB.sessionStorage.get('archiveo_token'), null, 'Le token doit être absent de B');
  assert.equal(tabB.currentUser, null, 'L utilisateur doit être réinitialisé dans B');
  assert.equal(tabB.isUnmounted, true, 'AuthGuard doit démonter les vues protégées dans B');
  assert.equal(tabB.redirectedTo, '/login', 'Onglet B doit être redirigé vers /login');
});

test('Scénario 2 : Déconnexion dans Onglet A -> Les données sensibles de B en cache sont invalidées', async () => {
  const hub = new MockEventHub();
  const tabA = new SimulatedBrowserTab('tabA', hub);
  const tabB = new SimulatedBrowserTab('tabB', hub);

  tabA.setToken('jwt-001', { id: 'u1' });
  tabB.setToken('jwt-001', { id: 'u1' });

  // Onglet B charge des données confidentielles
  await tabB.apiFetch('/api/documents/confidential', 5, { secret: 'Confidential Payload' });
  tabB.sessionStorage.set('archiveo_param_groups_cache', JSON.stringify([{ id: 'g1' }]));

  assert.equal(tabB.memoryCache.size, 1, 'Le cache mémoire doit contenir 1 entrée');
  assert.ok(tabB.sessionStorage.get('archiveo_param_groups_cache'));

  // WHEN: Déconnexion dans Onglet A
  tabA.logout();
  await new Promise((r) => setTimeout(r, 20));

  // THEN: Tout le cache sensible de B doit être totalement purgé
  assert.equal(tabB.memoryCache.size, 0, 'Le cache mémoire de B doit être vide');
  assert.equal(tabB.sessionStorage.get('archiveo_param_groups_cache'), null, 'Le cache paramètres doit être purgé');
});

test('Scénario 3 : Une réponse réseau tardive ne doit pas réinjecter de données après déconnexion', async () => {
  const hub = new MockEventHub();
  const tabA = new SimulatedBrowserTab('tabA', hub);
  const tabB = new SimulatedBrowserTab('tabB', hub);

  tabA.setToken('jwt-001', { id: 'u1' });
  tabB.setToken('jwt-001', { id: 'u1' });

  // Onglet B lance une requête lente (50ms)
  const slowRequestPromise = tabB.apiFetch('/api/audit-logs', 50, { sensitive: 'Audit Data' });

  // À 10ms, Onglet A se déconnecte pendant que la requête de B est en vol
  await new Promise((r) => setTimeout(r, 10));
  tabA.logout();

  // WHEN: La réponse de B arrive après la déconnexion
  let errorCaught = null;
  try {
    await slowRequestPromise;
  } catch (err) {
    errorCaught = err;
  }

  // THEN: La requête doit être rejetée avec SessionAbortedError et ne jamais polluer le cache
  assert.ok(errorCaught, 'Une erreur SessionAbortedError doit être levée');
  assert.match(errorCaught.message, /SessionAbortedError/);
  assert.equal(tabB.memoryCache.size, 0, 'Aucune donnée tardive ne doit avoir été écrite en cache');
});

test('Scénario 4 : Changement d utilisateur -> Aucune fuite de données vers le nouveau compte', async () => {
  const hub = new MockEventHub();
  const tabA = new SimulatedBrowserTab('tabA', hub);
  const tabB = new SimulatedBrowserTab('tabB', hub);

  // Étape 1 : Utilisateur A connecté
  tabA.setToken('jwt-user-A', { id: 'user-A', name: 'Alice' });
  tabB.setToken('jwt-user-A', { id: 'user-A', name: 'Alice' });

  await tabB.apiFetch('/api/profile', 5, { email: 'alice@archiveo.local' });
  assert.equal(tabB.memoryCache.size, 1);

  // Étape 2 : Déconnexion de A et connexion de B dans l'onglet A
  tabA.logout();
  await new Promise((r) => setTimeout(r, 20));

  tabA.login('jwt-user-B', { id: 'user-B', name: 'Bob' });
  await new Promise((r) => setTimeout(r, 20));

  // THEN: Onglet B ne doit contenir aucune donnée d'Alice
  assert.equal(tabB.memoryCache.size, 0);
  assert.equal(tabB.sessionStorage.get('archiveo_token'), null);
});

test('Scénario 5 : Réception d une erreur HTTP 401 dans un onglet -> Déconnexion synchronisée', async () => {
  const hub = new MockEventHub();
  const tabA = new SimulatedBrowserTab('tabA', hub);
  const tabB = new SimulatedBrowserTab('tabB', hub);

  tabA.setToken('expired-jwt', { id: 'u1' });
  tabB.setToken('expired-jwt', { id: 'u1' });

  // WHEN: Onglet A reçoit un 401 Unauthorized
  tabA.handle401();
  await new Promise((r) => setTimeout(r, 20));

  // THEN: Onglet B doit également avoir été invalidé et redirigé
  assert.equal(tabB.sessionStorage.get('archiveo_token'), null);
  assert.equal(tabB.redirectedTo, '/login');
});

test('Scénario 6 : Pas de boucle de redirection si l onglet est déjà sur une page publique', async () => {
  const hub = new MockEventHub();
  const tabA = new SimulatedBrowserTab('tabA', hub);
  const tabB = new SimulatedBrowserTab('tabB', hub);

  tabB.currentPath = '/login'; // Déjà sur /login

  // WHEN: Déconnexion déclenchée
  tabA.logout();
  await new Promise((r) => setTimeout(r, 20));

  // THEN: Pas de boucle de redirection
  assert.equal(tabB.redirectedTo, null, 'Pas de redirection redondante sur page login');
});

test('Scénario 7 : Fonctionnement normal et intégrité mono-onglet', async () => {
  const hub = new MockEventHub();
  const tabSingle = new SimulatedBrowserTab('tabSingle', hub);

  tabSingle.login('jwt-valid', { id: 'u1', name: 'Single User' });
  const data = await tabSingle.apiFetch('/api/documents', 5, { docs: [1, 2] });

  assert.deepEqual(data, { docs: [1, 2] });
  assert.equal(tabSingle.memoryCache.size, 1);
  assert.equal(tabSingle.sessionStorage.get('archiveo_token'), 'jwt-valid');

  // Second appel sert le cache
  const cachedData = await tabSingle.apiFetch('/api/documents', 0);
  assert.deepEqual(cachedData, { docs: [1, 2] });

  tabSingle.logout();
  assert.equal(tabSingle.sessionStorage.get('archiveo_token'), null);
  assert.equal(tabSingle.memoryCache.size, 0);
});

test('Scénario 8 : Préservation des données publiques (thème, langue)', async () => {
  const hub = new MockEventHub();
  const tabA = new SimulatedBrowserTab('tabA', hub);

  // Préférences publiques stockées dans localStorage
  tabA.localStorage.setItem('ged-theme', 'dark');
  tabA.localStorage.setItem('ged-locale', 'fr');

  tabA.login('jwt-user', { id: 'u1' });
  tabA.logout();

  // THEN: Les préférences d'interface restent intactes
  assert.equal(tabA.localStorage.getItem('ged-theme'), 'dark');
  assert.equal(tabA.localStorage.getItem('ged-locale'), 'fr');
});
