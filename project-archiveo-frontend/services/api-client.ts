export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

// Le token est limité à la session du navigateur.
const TOKEN_KEY = 'archiveo_token';

// Compteur de génération de session pour neutraliser et annuler les requêtes en vol
let sessionGeneration = 0;

/**
 * Erreur spécifique levée lorsqu'une requête en vol est interrompue en raison d'un changement
 * de session utilisateur (déconnexion ou changement de compte).
 */
export class SessionAbortedError extends Error {
  readonly isSessionAborted = true;
  constructor(message = 'Requête annulée : la session utilisateur a changé ou a été fermée.') {
    super(message);
    this.name = 'SessionAbortedError';
  }
}

export function isSessionAbortedError(error: unknown): error is SessionAbortedError {
  return (
    error instanceof Error &&
    (error.name === 'SessionAbortedError' || (error as any).isSessionAborted === true)
  );
}

/**
 * Extrait le claim d'identité `sub` ou `nameid` du payload JWT de manière standard.
 * 
 * NOTE DE SÉCURITÉ : Le décodage côté client sert exclusivement à partitionner le cache
 * mémoire par utilisateur. La validation cryptographique du jeton (signature, expiration,
 * émetteur) est obligatoirement et strictement assurée par le serveur ASP.NET Core sur chaque appel.
 */
function extractSubjectFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json =
      typeof atob === 'function'
        ? atob(base64)
        : typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64').toString('binary')
        : null;

    if (!json) return null;
    const payload = JSON.parse(json);
    const sub =
      payload.sub ||
      payload.nameid ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
  } catch {
    return null;
  }
}

/**
 * Hachage cryptographique standard FIPS 180-4 SHA-256 synchrone pour isoler les jetons
 * non-JWT ou synthétiques sans jamais exposer le jeton en clair dans les clés ou journaux.
 */
function standardSha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i = 0, j = 0, result = '';
  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;

  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 300; i += candidate) isComposite[i] = true;
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii += '\x80';
  while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    words[i >> 2] = (words[i >> 2] || 0) | (j << ((3 - (i % 4)) * 8));
  }
  words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
  words[words[lengthProperty]] = asciiBitLength;

  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      w[i] = i < 16 ? w[i] || 0 : ((w[i - 16] + s0 + w[i - 7] + s1) | 0);

      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + w[i]) | 0;
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;

      hash[7] = hash[6]; hash[6] = hash[5]; hash[5] = hash[4]; hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2]; hash[2] = hash[1]; hash[1] = hash[0]; hash[0] = (temp1 + temp2) | 0;
    }

    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

/**
 * Calcule la clé de partition du cache pour isoler strictement les données utilisateur.
 * - Si le jeton est un JWT standard : partitionne par 'user:<sub|nameid>', assurant la stabilité
 *   lors des renouvellements (refresh tokens) pour un même utilisateur.
 * - Si le jeton est opaque ou non-JWT : partitionne par l'empreinte SHA-256 standard (32 hex).
 * - Si anonyme : 'anon'.
 */
export function getCachePartition(token: string | null): string {
  if (!token) return 'anon';
  const sub = extractSubjectFromJwt(token);
  if (sub) {
    return `user:${sub}`;
  }
  return `sha256:${standardSha256Hex(token).slice(0, 32)}`;
}

// Gestion du token
export const tokenService = {
  get: () => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY);
  },
  set: (token: string) => {
    if (typeof window === 'undefined') return;
    sessionGeneration++;
    abortAllInFlight();
    invalidateApiCache();
    sessionStorage.setItem(TOKEN_KEY, token);
  },
  remove: () => {
    if (typeof window === 'undefined') return;
    sessionGeneration++;
    abortAllInFlight();
    invalidateApiCache();
    sessionStorage.removeItem(TOKEN_KEY);
  },
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface InFlightEntry<T> {
  promise: Promise<T>;
  controller: AbortController;
  sessionGen: number;
  token: string | null;
  subscribers: Set<{
    signal?: AbortSignal | null;
    cleanup?: () => void;
  }>;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightGets = new Map<string, InFlightEntry<any>>();
const DEFAULT_CACHE_TTL_MS = 25_000; // 25 secondes de rétention en mémoire

/**
 * Annule immédiatement toutes les requêtes HTTP actives sur le réseau lors d'un changement de session
 */
function abortAllInFlight() {
  for (const entry of inFlightGets.values()) {
    try {
      entry.controller.abort();
    } catch {}
  }
  inFlightGets.clear();
}

/**
 * Invalide le cache en mémoire (totalement ou par motif d'URL)
 */
export function invalidateApiCache(pattern?: string) {
  if (!pattern) {
    memoryCache.clear();
    return;
  }
  for (const key of memoryCache.keys()) {
    if (key.includes(pattern)) {
      memoryCache.delete(key);
    }
  }
}

// Wrapper fetch avec gestion du token, déduplication, annulation réseau et cache mémoire étanche
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const isGet = method === 'GET';
  const token = tokenService.get();
  const currentGen = sessionGeneration;
  const partition = getCachePartition(token);
  const cacheKey = `${partition}:${endpoint}`;

  if (isGet) {
    // 1. Vérification du cache mémoire valide
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      if (Date.now() - cached.timestamp < DEFAULT_CACHE_TTL_MS) {
        return cached.data as T;
      }
      memoryCache.delete(cacheKey);
    }

    // 2. Déduplication sécurisée : réutilisation de la requête en vol si même session
    const existingEntry = inFlightGets.get(cacheKey);
    if (existingEntry && existingEntry.sessionGen === currentGen) {
      return subscribeToInFlight<T>(existingEntry, options.signal, currentGen, token);
    }
  } else {
    // Pour toute mutation : invalidation préalable
    abortAllInFlight();
    invalidateApiCache();
  }

  // 3. Nouvelle requête réseau avec AbortController dédié
  const controller = new AbortController();
  const callerSignal = options.signal;

  const inFlightRecord: InFlightEntry<T> = {
    promise: Promise.resolve() as any, // initialisé ci-dessous
    controller,
    sessionGen: currentGen,
    token,
    subscribers: new Set(),
  };

  const networkPromise = (async (): Promise<T> => {
    try {
      const result = await apiFetchInternal<T>(endpoint, {
        ...options,
        signal: controller.signal,
      }, token);

      // Barrière de session stricte : si la session a changé pendant l'attente réseau,
      // la réponse est rejetée et n'est ni mise en cache, ni remise à l'appelant.
      if (sessionGeneration !== currentGen || tokenService.get() !== token) {
        throw new SessionAbortedError();
      }

      if (isGet) {
        memoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
      } else {
        invalidateApiCache();
      }

      return result;
    } catch (err: any) {
      if (isGet && (sessionGeneration !== currentGen || tokenService.get() !== token)) {
        throw new SessionAbortedError();
      }
      if (isGet && (controller.signal.aborted || err.name === 'AbortError')) {
        throw new SessionAbortedError('Requête annulée.');
      }
      if (!isGet) {
        invalidateApiCache();
      }
      throw err;
    } finally {
      if (inFlightGets.get(cacheKey) === inFlightRecord) {
        inFlightGets.delete(cacheKey);
      }
    }
  })();

  inFlightRecord.promise = networkPromise;

  if (isGet) {
    inFlightGets.set(cacheKey, inFlightRecord);
    return subscribeToInFlight<T>(inFlightRecord, callerSignal, currentGen, token);
  }

  return networkPromise;
}

/**
 * Souscrit un appelant supplémentaire à une requête en vol sans risquer d'annuler
 * prématurément le travail des autres appelants si l'un d'eux annule.
 */
function subscribeToInFlight<T>(
  entry: InFlightEntry<T>,
  callerSignal: AbortSignal | null | undefined,
  sessionGen: number,
  token: string | null
): Promise<T> {
  const subscriber = { signal: callerSignal };
  entry.subscribers.add(subscriber);

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      settled = true;
      entry.subscribers.delete(subscriber);
      if (callerSignal) {
        callerSignal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      if (settled) return;
      cleanup();
      if (entry.subscribers.size === 0) {
        try {
          entry.controller.abort();
        } catch {}
      }
      reject(new DOMException('Aborted', 'AbortError'));
    };

    if (callerSignal?.aborted) {
      onAbort();
      return;
    }

    if (callerSignal) {
      callerSignal.addEventListener('abort', onAbort, { once: true });
    }

    entry.promise
      .then((data) => {
        if (settled) return;
        cleanup();
        if (sessionGeneration !== sessionGen || tokenService.get() !== token) {
          reject(new SessionAbortedError());
        } else {
          resolve(data);
        }
      })
      .catch((err) => {
        if (settled) return;
        cleanup();
        if (sessionGeneration !== sessionGen || tokenService.get() !== token) {
          reject(new SessionAbortedError());
        } else {
          reject(err);
        }
      });
  });
}

async function apiFetchInternal<T>(
  endpoint: string,
  options: RequestInit,
  explicitToken?: string | null
): Promise<T> {
  const token = explicitToken !== undefined ? explicitToken : tokenService.get();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Gérer les erreurs
  if (!response.ok) {
    if (response.status === 401) {
      tokenService.remove();
      invalidateApiCache();

      const isPublicPage =
        typeof window !== 'undefined' &&
        (window.location.pathname === '/' ||
          window.location.pathname === '/login' ||
          window.location.pathname === '');

      if (!isPublicPage && typeof window !== 'undefined') {
        window.location.href = '/login';
      }

      throw new Error('Session expirée. Veuillez vous reconnecter.');
    }

    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erreur ${response.status}`);
  }

  // Cas particulier : réponse vide (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Méthodes HTTP simplifiées
export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),

  invalidateCache: invalidateApiCache,
  clearSession: () => {
    tokenService.remove();
  },
};