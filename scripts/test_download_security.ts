/**
 * Test Suite : Phase 3 - Sécurisation des téléchargements et gestion fiable des erreurs HTTP (ANO-03)
 */

// Mock environnement navigateur (sessionStorage + window)
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
  location: { pathname: '/documents', href: '/documents' },
};
(globalThis as any).sessionStorage = mockStorage;

import {
  downloadBinary,
  getDownloadErrorMessage,
  ApiDownloadError,
  isApiDownloadError,
  tokenService,
} from '../project-archiveo-frontend/services/api-client';

async function runTests() {
  console.log('=== TEST SUITE : PHASE 3 - SÉCURISATION TÉLÉCHARGEMENTS (ANO-03) ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, desc: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      process.exitCode = 1;
    }
  }

  // Sauvegarde du fetch global
  const originalFetch = global.fetch;

  try {
    // TEST 1 : 200 OK binaire standard avec extraction Content-Disposition
    {
      const fakePdfData = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]); // %PDF-1.7
      global.fetch = async () =>
        new Response(fakePdfData, {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-disposition': 'attachment; filename="contrat_officiel_2026.pdf"',
          },
        });

      const res = await downloadBinary('/api/documents/test-1/download', {
        fallbackFilename: 'fallback.pdf',
      });
      assert(res.contentType === 'application/pdf', '1. 200 OK : Content-Type binaire préservé');
      assert(res.filename === 'contrat_officiel_2026.pdf', '1. 200 OK : Nom extrait depuis Content-Disposition standard');
      assert(res.blob.size === fakePdfData.length, '1. 200 OK : Taille exacte du Blob binaire');
    }

    // TEST 2 : 200 OK binaire avec encodage RFC 5987 (accents et espaces UTF-8)
    {
      global.fetch = async () =>
        new Response(new Uint8Array([1, 2, 3]), {
          status: 200,
          headers: {
            'content-type': 'application/pdf',
            'content-disposition': "attachment; filename*=UTF-8''Dossier%20V%C3%A9rification%202026.pdf",
          },
        });

      const res = await downloadBinary('/api/documents/test-2/download');
      assert(res.filename === 'Dossier Vérification 2026.pdf', '2. RFC 5987 : Nom de fichier UTF-8 décodé avec exactitude');
    }

    // TEST 3 : 401 Unauthorized -> Déclenche révocation session et ApiDownloadError(401)
    {
      sessionStorage.setItem('archiveo_token', 'token_expiré_test');
      global.fetch = async () =>
        new Response(JSON.stringify({ message: 'Token expired' }), {
          status: 401,
          headers: { 'content-type': 'application/json' },
        });

      let threw = false;
      try {
        await downloadBinary('/api/documents/test-3/download');
      } catch (err: any) {
        threw = true;
        assert(isApiDownloadError(err) && err.status === 401, '3. 401 : ApiDownloadError(401) levée');
        assert(tokenService.get() === null, '3. 401 : Jeton révoqué de la session');
        const msg = getDownloadErrorMessage(err);
        assert(msg === 'Session expirée. Veuillez vous reconnecter.', '3. 401 : Message utilisateur clair');
      }
      assert(threw, '3. 401 : Doit rejeter la promesse');
    }

    // TEST 4 : 403 Forbidden -> Extraction du message d'autorisation backend
    {
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            message: "Accès refusé. Vous n'avez pas l'autorisation d'accéder à ce document.",
          }),
          {
            status: 403,
            headers: { 'content-type': 'application/json' },
          }
        );

      let threw = false;
      try {
        await downloadBinary('/api/documents/test-4/download');
      } catch (err: any) {
        threw = true;
        assert(isApiDownloadError(err) && err.status === 403, '4. 403 : ApiDownloadError(403) levée');
        const msg = getDownloadErrorMessage(err);
        assert(
          msg === "Accès refusé. Vous n'avez pas l'autorisation d'accéder à ce document.",
          '4. 403 : Message de sécurité backend conservé sans fausse alerte'
        );
        assert(msg !== 'Aucun fichier associé', '4. 403 : Ne prétend JAMAIS « Aucun fichier associé »');
      }
      assert(threw, '4. 403 : Doit rejeter la promesse');
    }

    // TEST 5 : 404 Not Found -> Distinction document ou fichier physique manquant
    {
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            message: 'Fichier physique introuvable sur le serveur de stockage.',
          }),
          {
            status: 404,
            headers: { 'content-type': 'application/json' },
          }
        );

      try {
        await downloadBinary('/api/documents/test-5/download');
      } catch (err: any) {
        assert(isApiDownloadError(err) && err.status === 404, '5. 404 : ApiDownloadError(404) levée');
        const msg = getDownloadErrorMessage(err);
        assert(msg === 'Fichier physique introuvable sur le serveur de stockage.', '5. 404 : Message explicite');
        assert(msg !== 'Aucun fichier associé', '5. 404 : Pas de masquage générique');
      }
    }

    // TEST 6 : 500 Erreur Serveur -> Message générique sécurisé sans divulgation interne
    {
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            message: 'System.IO.IOException: Disk sector failure at /var/data/vol1/sec.pdf',
          }),
          {
            status: 500,
            headers: { 'content-type': 'application/json' },
          }
        );

      try {
        await downloadBinary('/api/documents/test-6/download');
      } catch (err: any) {
        assert(isApiDownloadError(err) && err.status === 500, '6. 500 : ApiDownloadError(500) levée');
        const msg = getDownloadErrorMessage(err);
        assert(
          msg === 'Une erreur serveur est survenue lors du téléchargement. Veuillez réessayer ultérieurement.',
          '6. 500 : Message générique sécurisé sans fuite de stack trace ou chemins'
        );
      }
    }

    // TEST 7 : Annulation intentionnelle via AbortController -> Silencieux, zéro fausse alerte
    {
      const controller = new AbortController();
      controller.abort();

      const abortErr = new Error('The user aborted a request.');
      abortErr.name = 'AbortError';

      const msg = getDownloadErrorMessage(abortErr);
      assert(msg === null, '7. Abort : Interruption volontaire ignorée (aucun toast d’erreur)');
    }

    // TEST 8 : Erreur réseau native (TypeError / Failed to fetch)
    {
      const networkErr = new TypeError('Failed to fetch');
      const msg = getDownloadErrorMessage(networkErr);
      assert(
        msg === 'Erreur réseau : impossible de joindre le serveur pour le téléchargement.',
        '8. Réseau : Détection des pannes réseau avec notification adaptée'
      );
    }

    // TEST 9 : Protection contre le téléchargement accidentel de JSON d'erreur sous 200 OK
    {
      global.fetch = async () =>
        new Response(JSON.stringify({ message: 'Erreur inattendue formatée en JSON' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });

      let threw = false;
      try {
        await downloadBinary('/api/documents/test-9/download');
      } catch (err: any) {
        threw = true;
        assert(
          isApiDownloadError(err) && err.message === 'Erreur inattendue formatée en JSON',
          '9. Anti-corruption : Rejet du JSON sous 200 sans création de blob corrompu'
        );
      }
      assert(threw, '9. Anti-corruption : Doit rejeter le JSON inattendu');
    }
  } finally {
    global.fetch = originalFetch;
  }

  console.log(`\n=== RÉSUMÉ DES TESTS ANO-03 ===`);
  console.log(`Total: ${total} | Réussis: ${passed} | Échoués: ${total - passed}`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
