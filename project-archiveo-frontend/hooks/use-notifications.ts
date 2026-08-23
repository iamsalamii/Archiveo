import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { useEffect, useState, useRef } from 'react';
import { AppNotification } from '@/types';
import { getNotifications } from '@/services/api';
import { tokenService, API_BASE_URL } from '@/services/api-client';

/**
 * Hook to manage real‑time notifications via SignalR.
 * - Fetches the initial list from the backend.
 * - Listens to "ReceiveNotification" events and prepends them.
 * - Provides helpers to mark as read / mark all as read.
 */
export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const connectionRef = useRef<HubConnection | null>(null);

  // Initialise SignalR connection when authenticated
  useEffect(() => {
    const token = tokenService.get();
    if (!userId || !token) return;

    const hubUrl = `${API_BASE_URL}/hubs/notifications`;
    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => tokenService.get() || '',
        withCredentials: true,
      })
      .configureLogging(LogLevel.Warning)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection
      .start()
      .then(() => {
        console.info('🔔 SignalR Notification hub connected');
      })
      .catch((err) => {
        // Mode silencieux si le hub n'est pas joignable sans bloquer l'UI
        console.warn('SignalR notifications offline (polling fallback active)');
      });

    // Listen to incoming notifications from the server
    connection.on('ReceiveNotification', (notification: AppNotification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 50));
    });

    return () => {
      connection.stop().catch(() => {});
    };
  }, [userId]);

  // Load initial notifications once the userId is known
  useEffect(() => {
    if (!userId) return;
    getNotifications()
      .then((data) => setNotifications(data))
      .catch(() => {});
  }, [userId]);

  const markAllRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    // Fire a request to the backend for each unread notification
    for (const n of notifications) {
      if (!n.read) {
        try {
          await fetch(`${API_BASE_URL}/api/notifications/${n.id}/read`, {
            method: 'PUT',
            credentials: 'include',
          });
        } catch (e) {
          console.warn('Failed to mark notification as read', n.id, e);
        }
      }
    }
  };

  return { notifications, setNotifications, markAllRead };
}
