import { useState, useEffect, useCallback } from 'react';
import { SyncQueueItem } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const SYNC_QUEUE_KEY = 'fin_tracker_sync_queue_v1';

export function useOfflineSync(user: any) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>(() => {
    try {
      const raw = localStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  // Persist sync queue to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(syncQueue));
    } catch (e) {
      console.warn('Could not persist sync queue:', e);
    }
  }, [syncQueue]);

  // Monitor browser online/offline transitions
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const enqueueSyncOperation = useCallback(
    async (
      entity: SyncQueueItem['entity'],
      action: SyncQueueItem['action'],
      payload: any
    ) => {
      // Demo or unauthenticated users rely strictly on instant localStorage cache
      if (!user || user.isDemo || !isSupabaseConfigured || !supabase) {
        setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        return;
      }

      const item: SyncQueueItem = {
        id: 'sync-' + Math.random().toString(36).substring(2, 9),
        entity,
        action,
        payload,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };

      // If offline, queue immediately for background retry
      if (!navigator.onLine) {
        setSyncQueue(prev => [...prev, item]);
        return;
      }

      try {
        setIsSyncing(true);
        await executeSupabaseMutation(entity, action, payload);
        setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        console.warn(`Supabase mutation failed for ${entity}.${action}, queuing for retry:`, err);
        setSyncQueue(prev => [...prev, item]);
      } finally {
        setIsSyncing(false);
      }
    },
    [user]
  );

  const flushSyncQueue = useCallback(async () => {
    if (!isOnline || syncQueue.length === 0 || !user || user.isDemo || !supabase) return;
    setIsSyncing(true);

    const remaining: SyncQueueItem[] = [];
    for (const item of syncQueue) {
      try {
        await executeSupabaseMutation(item.entity, item.action, item.payload);
      } catch (err) {
        if (item.retryCount < 3) {
          remaining.push({ ...item, retryCount: item.retryCount + 1 });
        }
      }
    }

    setSyncQueue(remaining);
    setLastSyncedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setIsSyncing(false);
  }, [isOnline, syncQueue, user]);

  // Automatically flush queue when connectivity is restored
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      flushSyncQueue();
    }
  }, [isOnline, syncQueue.length, flushSyncQueue]);

  return {
    isOnline,
    syncQueue,
    pendingCount: syncQueue.length,
    isSyncing,
    lastSyncedAt,
    enqueueSyncOperation,
    enqueueSync: enqueueSyncOperation,
    flushSyncQueue,
    flushQueue: flushSyncQueue,
  };
}

async function executeSupabaseMutation(
  entity: SyncQueueItem['entity'],
  action: SyncQueueItem['action'],
  payload: any
) {
  if (!supabase) return;
  const table: any = supabase.from(entity);

  if (action === 'insert') {
    const { error } = await table.insert(payload);
    if (error) throw error;
  } else if (action === 'upsert') {
    const { error } = await table.upsert(payload);
    if (error) throw error;
  } else if (action === 'update') {
    const { id, matchField = 'id', matchValue, values } = payload;
    const { error } = await table.update(values).eq(matchField, matchValue ?? id);
    if (error) throw error;
  } else if (action === 'delete') {
    const { id, matchField = 'id', matchValue } = payload;
    const { error } = await table.delete().eq(matchField, matchValue ?? id);
    if (error) throw error;
  }
}
