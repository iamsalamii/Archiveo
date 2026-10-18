/**
 * Service de synchronisation de session inter-onglets et de contrôle de cache pour Archivéo (ANO-06).
 * Utilise BroadcastChannel en transport principal avec secours sur l'événement 'storage' de localStorage
 * pour assurer une invalidation immédiate et fiable sur tous les onglets ouverts du même domaine.
 */

export type SessionSyncAction =
  | { type: 'LOGOUT'; reason?: string; timestamp: number; id: string }
  | { type: 'LOGIN'; userId: string; timestamp: number; id: string };

export type SessionSyncActionInput =
  | { type: 'LOGOUT'; reason?: string; timestamp?: number }
  | { type: 'LOGIN'; userId: string; timestamp?: number };

type SessionSyncListener = (action: SessionSyncAction) => void;

class SessionSyncManager {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<SessionSyncListener> = new Set();
  private processedIds: Set<string> = new Set();
  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Initialiser le BroadcastChannel standard (supporté nativement par les navigateurs modernes)
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel('archiveo_session_channel');
        this.channel.onmessage = (event: MessageEvent) => {
          this.handleIncoming(event.data);
        };
      } catch (err) {
        console.warn('[SessionSync] BroadcastChannel non disponible, recours au fallback storage:', err);
      }
    }

    // 2. Écouter l'événement storage de localStorage (fallback et redondance inter-fenêtres)
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === 'archiveo_session_sync_pulse' && event.newValue) {
          try {
            const action = JSON.parse(event.newValue) as SessionSyncAction;
            this.handleIncoming(action);
          } catch {}
        }
      });
    }
  }

  private handleIncoming(action: unknown) {
    if (!action || typeof action !== 'object') return;
    const syncAction = action as SessionSyncAction;
    if (!syncAction.type || !syncAction.id) return;

    // Déduplication : si l'action a déjà été exécutée dans cet onglet, on ignore
    if (this.processedIds.has(syncAction.id)) return;
    this.processedIds.add(syncAction.id);

    // Élagage de la mémoire pour éviter les fuites sur sessions longues
    if (this.processedIds.size > 100) {
      const arr = Array.from(this.processedIds);
      this.processedIds = new Set(arr.slice(-50));
    }

    for (const listener of this.listeners) {
      try {
        listener(syncAction);
      } catch (err) {
        console.error('[SessionSync] Erreur dans un écouteur de session:', err);
      }
    }
  }

  public broadcast(actionWithoutId: SessionSyncActionInput) {
    if (typeof window === 'undefined') return;
    this.init();

    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const action: SessionSyncAction = {
      ...actionWithoutId,
      id,
      timestamp: actionWithoutId.timestamp || Date.now(),
    } as SessionSyncAction;

    // Marquer l'identifiant pour ne pas se re-traiter soi-même
    this.processedIds.add(id);

    // 1. Émettre via BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(action);
      } catch (err) {
        console.warn('[SessionSync] Erreur postMessage BroadcastChannel:', err);
      }
    }

    // 2. Émettre via une impulsion localStorage (déclenche storage event dans tous les autres onglets)
    try {
      localStorage.setItem('archiveo_session_sync_pulse', JSON.stringify(action));
      // Nettoyage rapide pour ne pas conserver de charge résiduelle
      setTimeout(() => {
        try {
          if (localStorage.getItem('archiveo_session_sync_pulse') === JSON.stringify(action)) {
            localStorage.removeItem('archiveo_session_sync_pulse');
          }
        } catch {}
      }, 500);
    } catch {}
  }

  public broadcastLogout(reason = 'user_logout') {
    this.broadcast({ type: 'LOGOUT', reason });
  }

  public broadcastLogin(userId: string) {
    this.broadcast({ type: 'LOGIN', userId });
  }

  public onSessionEvent(listener: SessionSyncListener): () => void {
    if (typeof window !== 'undefined') {
      this.init();
    }
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const sessionSync = new SessionSyncManager();
