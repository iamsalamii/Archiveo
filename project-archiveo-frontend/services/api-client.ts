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
    sessionStorage.setItem(TOKEN_KEY, token);
  },
  remove: () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(TOKEN_KEY);
  },
};

const pendingGets = new Map<string, Promise<unknown>>();

// Wrapper fetch avec gestion du token et des erreurs
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const isGet = (options.method ?? 'GET').toUpperCase() === 'GET';
  if (isGet) {
    const pending = pendingGets.get(endpoint);
    if (pending) return pending as Promise<T>;
  }

  const request = apiFetchInternal<T>(endpoint, options);
  if (isGet) {
    pendingGets.set(endpoint, request);
    request.finally(() => pendingGets.delete(endpoint)).catch(() => undefined);
  }
  return request;
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
      
      const isOnLoginPage = typeof window !== 'undefined' && window.location.pathname === '/login';
      
      if (!isOnLoginPage && typeof window !== 'undefined') {
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
};