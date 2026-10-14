export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:5000';

// Le token est limité à la session du navigateur.
const TOKEN_KEY = 'archiveo_token';

// Gestion du token
export const tokenService = {
  get: () => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(TOKEN_KEY);
  },
  set: (token: string) => {
    if (typeof window === 'undefined') return;
    invalidateApiCache();
    sessionStorage.setItem(TOKEN_KEY, token);
  },
  remove: () => {
    if (typeof window === 'undefined') return;
    invalidateApiCache();
    sessionStorage.removeItem(TOKEN_KEY);
  },
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const pendingGets = new Map<string, Promise<unknown>>();
const DEFAULT_CACHE_TTL_MS = 25_000; // 25 secondes de rétention en mémoire pour navigation instantanée

/**
 * Invalide le cache en mémoire (totalement ou par motif d'URL)
 */
export function invalidateApiCache(pattern?: string) {
  pendingGets.clear();
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

// Wrapper fetch avec gestion du token, déduplication et cache mémoire instantané
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const isGet = method === 'GET';
  const token = tokenService.get();
  const cacheKey = `${token ? token.slice(-16) : 'anon'}:${endpoint}`;

  if (isGet) {
    // 1. Nettoyer les entrées expirées et vérifier si une réponse valide existe
    const cached = memoryCache.get(cacheKey);
    if (cached) {
      if (Date.now() - cached.timestamp < DEFAULT_CACHE_TTL_MS) {
        return cached.data as T;
      } else {
        memoryCache.delete(cacheKey);
      }
    }

    // 2. Dédupliquer les requêtes concurrentes en vol
    const pending = pendingGets.get(cacheKey);
    if (pending) return pending as Promise<T>;
  } else {
    // Invalider le cache avant la mutation pour couper les lectures en vol
    invalidateApiCache();
  }

  const request = apiFetchInternal<T>(endpoint, options);

  if (isGet) {
    pendingGets.set(cacheKey, request);
    request
      .then((data) => {
        memoryCache.set(cacheKey, { data, timestamp: Date.now() });
      })
      .finally(() => pendingGets.delete(cacheKey))
      .catch(() => undefined);
    return request;
  } else {
    try {
      const result = await request;
      // Invalidation après confirmation de l'écriture en base
      invalidateApiCache();
      return result;
    } catch (error) {
      invalidateApiCache();
      throw error;
    }
  }
}

async function apiFetchInternal<T>(
  endpoint: string,
  options: RequestInit
): Promise<T> {
  const token = tokenService.get();

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
  get: <T>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'GET' }),

  post: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    }),

  put: <T>(endpoint: string, body?: unknown) =>
    apiFetch<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(endpoint: string) =>
    apiFetch<T>(endpoint, { method: 'DELETE' }),

  invalidateCache: invalidateApiCache,
};