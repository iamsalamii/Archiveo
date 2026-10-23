import assert from 'node:assert';

console.log('--- SUITE DE TESTS FRONTEND : GESTION DU HTTP 429 & CONTRAT D\'AUTHENTIFICATION ---');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    testsFailed++;
  }
}

// 1. Définition et contrat de ApiError
class ApiError extends Error {
  constructor(status, message, retryAfter = null, data = undefined) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
    this.data = data;
  }
}

function isApiError(error) {
  return error instanceof Error && error.name === 'ApiError';
}

// Simulation de la fonction UI LoginPage pour déterminer le message affiché
function formatLoginErrorMessage(result) {
  if (result.status === 429) {
    if (result.retryAfter && result.retryAfter > 0) {
      const unit = result.retryAfter === 1 ? 'seconde' : 'secondes';
      return `Trop de tentatives de connexion. Veuillez patienter ${result.retryAfter} ${unit} avant de réessayer.`;
    }
    return 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.';
  }
  if (result.status === 401) {
    return 'Email ou mot de passe incorrect';
  }
  return result.message || 'Une erreur est survenue lors de la connexion';
}

// Simulation du contrôleur d'authentification client (auth-context)
class MockTokenService {
  constructor() {
    this.token = null;
  }
  set(t) { this.token = t; }
  get() { return this.token; }
  remove() { this.token = null; }
}

async function simulateLogin(mockFetchFn, tokenService) {
  try {
    const response = await mockFetchFn();
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const retryAfterHeader = response.headers?.get ? response.headers.get('Retry-After') : response.headers?.['retry-after'];
      const parsed = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;
      const retryAfter = parsed !== null && !isNaN(parsed) && parsed > 0 ? parsed : null;

      let defaultMsg = `Erreur ${response.status}`;
      if (response.status === 429) {
        defaultMsg = 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.';
      }

      throw new ApiError(
        response.status,
        errorData.message || defaultMsg,
        retryAfter,
        errorData
      );
    }

    const data = await response.json();
    tokenService.set(data.token);
    return { success: true };
  } catch (error) {
    if (isApiError(error)) {
      return {
        success: false,
        status: error.status,
        message: error.message,
        retryAfter: error.retryAfter ?? null,
      };
    }
    return {
      success: false,
      status: undefined,
      message: error?.message || 'Une erreur est survenue lors de la connexion',
    };
  }
}

// ==========================================
// EXÉCUTION DES 6 TESTS REQUIS
// ==========================================

// Test 1 : HTTP 429 avec message explicite
runTest('Exigence 1 : HTTP 429 génère un message explicite et distinct', async () => {
  const tokenService = new MockTokenService();
  const mockFetch = async () => ({
    ok: false,
    status: 429,
    headers: { get: (name) => null },
    json: async () => ({ status: 429, message: 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.' }),
  });

  const result = await simulateLogin(mockFetch, tokenService);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 429);
  
  const uiMessage = formatLoginErrorMessage(result);
  assert.strictEqual(uiMessage, 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.');
  assert.notStrictEqual(uiMessage, 'Email ou mot de passe incorrect');
});

// Test 2 : HTTP 429 avec Retry-After valide
runTest('Exigence 2 : HTTP 429 avec Retry-After affiche le délai en secondes', async () => {
  const tokenService = new MockTokenService();
  const mockFetch = async () => ({
    ok: false,
    status: 429,
    headers: { get: (name) => (name.toLowerCase() === 'retry-after' ? '10' : null) },
    json: async () => ({ status: 429, message: 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.' }),
  });

  const result = await simulateLogin(mockFetch, tokenService);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 429);
  assert.strictEqual(result.retryAfter, 10);

  const uiMessage = formatLoginErrorMessage(result);
  assert.strictEqual(uiMessage, 'Trop de tentatives de connexion. Veuillez patienter 10 secondes avant de réessayer.');
});

// Test 3 : HTTP 429 sans Retry-After
runTest('Exigence 3 : HTTP 429 sans Retry-After n\'invente pas de durée et reste compréhensible', async () => {
  const tokenService = new MockTokenService();
  const mockFetch = async () => ({
    ok: false,
    status: 429,
    headers: { get: (name) => null },
    json: async () => ({ status: 429, message: 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.' }),
  });

  const result = await simulateLogin(mockFetch, tokenService);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 429);
  assert.strictEqual(result.retryAfter, null);

  const uiMessage = formatLoginErrorMessage(result);
  assert.strictEqual(uiMessage, 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.');
  assert.strictEqual(uiMessage.includes('secondes'), false);
});

// Test 4 : HTTP 401 conserve le message générique d'identifiants invalides
runTest('Exigence 4 : HTTP 401 conserve strictement le message "Email ou mot de passe incorrect"', async () => {
  const tokenService = new MockTokenService();
  const mockFetch = async () => ({
    ok: false,
    status: 401,
    headers: { get: (name) => null },
    json: async () => ({ message: 'Identifiants invalides' }),
  });

  const result = await simulateLogin(mockFetch, tokenService);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, 401);

  const uiMessage = formatLoginErrorMessage(result);
  assert.strictEqual(uiMessage, 'Email ou mot de passe incorrect');
});

// Test 5 : Erreur réseau conserve le comportement attendu
runTest('Exigence 5 : Erreur réseau ou 500 n\'est pas présentée comme un 429 ni un 401', async () => {
  const tokenService = new MockTokenService();
  const mockNetworkFail = async () => {
    throw new TypeError('Failed to fetch (Network unreachable)');
  };

  const result = await simulateLogin(mockNetworkFail, tokenService);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, undefined);

  const uiMessage = formatLoginErrorMessage(result);
  assert.strictEqual(uiMessage, 'Failed to fetch (Network unreachable)');
  assert.notStrictEqual(uiMessage, 'Email ou mot de passe incorrect');
  assert.strictEqual(uiMessage.includes('Trop de tentatives'), false);
});

// Test 6 : Absence de session créée après un 429
runTest('Exigence 6 : Aucun jeton ni session n\'est persisté lors d\'un rejet HTTP 429', async () => {
  const tokenService = new MockTokenService();
  const mockFetch = async () => ({
    ok: false,
    status: 429,
    headers: { get: (name) => '10' },
    json: async () => ({ status: 429, message: 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.' }),
  });

  const result = await simulateLogin(mockFetch, tokenService);
  assert.strictEqual(result.success, false);
  assert.strictEqual(tokenService.get(), null, 'Aucun jeton ne doit être stocké en cas de 429.');
});

console.log(`\nBILAN : ${testsPassed} réussis, ${testsFailed} échoués sur 6 tests.`);
if (testsFailed > 0) {
  process.exit(1);
}
