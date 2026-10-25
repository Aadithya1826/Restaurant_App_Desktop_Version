import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://dev-api.dataudipi.com';

const syncClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // A sync request must not hang forever, otherwise the whole queue stalls.
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

syncClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {}
  return config;
});

let syncInterval = null;
// Re-entrancy guard. Previously the 15s interval could fire again while the
// previous pass was still in flight on a slow link, so the SAME queued order
// was POSTed twice => duplicate sales records. This was the main duplicate bug.
let isSyncing = false;
let onlineListenerAttached = false;

const SYNC_INTERVAL_MS = 15000;
const MAX_ATTEMPTS = 50;

const emitStatus = (status) => {
  try { DeviceEventEmitter.emit('offline_sync_status', status); } catch (e) {}
};

const backoffFor = (attempts) =>
  Math.min(5000 * Math.pow(2, Math.max(0, attempts)), 5 * 60 * 1000);

const refreshAccessToken = async () => {
  try {
    const res = await syncClient.post('/api/v1/auth/refresh');
    if (res.data?.access_token) {
      await AsyncStorage.setItem('access_token', res.data.access_token);
      if (res.data.user) {
        await AsyncStorage.setItem('user', JSON.stringify(res.data.user));
      }
      return true;
    }
  } catch (e) {}
  return false;
};

/**
 * Drains the queue strictly in FIFO order.
 *
 * Guarantees:
 *  - exactly one pass runs at a time (no duplicate sends)
 *  - stops at the first undeliverable item so later items can never overtake an
 *    earlier one (an order must exist before its status update)
 *  - nothing is deleted without either a 2xx or an explicit dead-letter record
 */
export const processSyncQueue = async ({ force = false } = {}) => {
  if (!window.electronAPI) return { synced: 0, pending: 0 };
  if (isSyncing && !force) return { synced: 0, pending: 0, skipped: true };
  isSyncing = true;

  let synced = 0;
  try {
    const { success, queue, error } = await window.electronAPI.getSyncQueue();
    if (!success) {
      console.error('[OfflineSync] Failed to read sync queue', error);
      return { synced: 0, pending: 0 };
    }
    if (!queue.length) {
      emitStatus({ pending: 0, syncing: false });
      return { synced: 0, pending: 0 };
    }

    emitStatus({ pending: queue.length, syncing: true });
    let refreshedOnce = false;

    for (const action of queue) {
      // Respect the backoff window for items that recently failed.
      if (action.nextAttemptAt && Date.now() < action.nextAttemptAt) break;

      if ((action.attempts || 0) >= MAX_ATTEMPTS) {
        await window.electronAPI.deadLetterSyncAction(
          action.id,
          `Exceeded ${MAX_ATTEMPTS} attempts. Last error: ${action.lastError}`
        );
        continue;
      }

      try {
        await syncClient({
          method: action.method,
          url: action.endpoint,
          data: action.payload,
          headers: {
            // Lets the backend collapse a replay into the original record.
            'Idempotency-Key': action.idempotencyKey || action.id,
            'X-Client-Action-Id': action.id,
            'X-Offline-Replay': 'true',
            'X-Original-Timestamp': action.timestamp || '',
          },
        });

        const removed = await window.electronAPI.dequeueSyncAction(action.id);
        if (!removed?.success) {
          // If we cannot remove it we must STOP, otherwise the next pass
          // re-sends the same action and creates a duplicate.
          await window.electronAPI.logError(
            `Synced ${action.id} but failed to dequeue: ${removed?.error}. Halting sync to avoid duplicates.`
          );
          break;
        }
        synced += 1;
      } catch (e) {
        const status = e.response?.status;

        // --- No response at all: network error or timeout. ---
        if (!status) {
          // A timeout may mean the server DID process the request and only the
          // response was lost. We keep the item (never drop a sale) and rely on
          // the Idempotency-Key so the retry cannot duplicate it.
          await window.electronAPI.markSyncAttempt(
            action.id,
            e.message || 'network error',
            backoffFor(action.attempts || 0)
          );
          break; // still offline - stop the pass, preserve ordering
        }

        // --- Auth expired: refresh once, then retry. ---
        if (status === 401 || status === 403) {
          if (!refreshedOnce) {
            refreshedOnce = true;
            if (await refreshAccessToken()) continue; // retry same action now
          }
          await window.electronAPI.markSyncAttempt(action.id, `auth error ${status}`, 30000);
          break;
        }

        // --- Server error: keep and back off. ---
        if (status >= 500) {
          await window.electronAPI.markSyncAttempt(
            action.id,
            `server error ${status}`,
            backoffFor(action.attempts || 0)
          );
          break;
        }

        // --- Server says it already has this record: treat as success. ---
        if (status === 409) {
          await window.electronAPI.dequeueSyncAction(action.id);
          synced += 1;
          continue;
        }

        // --- Other 4xx: permanently rejected. Dead-letter, never delete. ---
        const detail = JSON.stringify(e.response?.data || {}).slice(0, 500);
        await window.electronAPI.logError(
          `Sync permanently rejected ${action.id} (${action.method} ${action.endpoint}) status ${status}: ${detail}`
        );
        await window.electronAPI.deadLetterSyncAction(action.id, `HTTP ${status}: ${detail}`);
      }
    }

    const stats = await window.electronAPI.getSyncStats();
    emitStatus({ pending: stats?.pending ?? 0, failed: stats?.failed ?? 0, syncing: false });
    return { synced, pending: stats?.pending ?? 0 };
  } catch (e) {
    console.error('[OfflineSync] Unexpected error during sync', e);
    return { synced, pending: 0 };
  } finally {
    isSyncing = false;
  }
};

export const initOfflineSync = () => {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => { processSyncQueue(); }, SYNC_INTERVAL_MS);

  // Flush the moment connectivity returns instead of waiting up to 15s.
  if (typeof window !== 'undefined' && window.addEventListener && !onlineListenerAttached) {
    onlineListenerAttached = true;
    window.addEventListener('online', () => { processSyncQueue(); });
  }

  processSyncQueue();
};

export const stopOfflineSync = () => {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = null;
};

export const getSyncStats = async () => {
  if (window.electronAPI?.getSyncStats) {
    return await window.electronAPI.getSyncStats();
  }
  return { success: false, pending: 0, failed: 0 };
};

export const queueAction = async (endpoint, method, payload, meta = {}) => {
  if (window.electronAPI) {
    return await window.electronAPI.queueSyncAction(endpoint, method, payload, meta);
  }
  // Running outside Electron (plain web): no durable store, so the caller MUST
  // be told the write did not persist rather than being shown a fake success.
  return { success: false, error: 'No offline storage available' };
};

// Cache keys must include query params, otherwise e.g. /api/v1/reports?date=A
// and ?date=B overwrite each other and the cashier sees the wrong day's sales.
const cacheKeyFor = (endpoint) =>
  String(endpoint).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) + '.json';

export const cacheData = async (endpoint, data) => {
  if (window.electronAPI) {
    return await window.electronAPI.saveOfflineData('cashier_data', cacheKeyFor(endpoint), {
      cachedAt: new Date().toISOString(),
      endpoint,
      data,
    });
  }
};

export const getCachedData = async (endpoint) => {
  if (window.electronAPI) {
    const { success, data } = await window.electronAPI.getOfflineData('cashier_data', cacheKeyFor(endpoint));
    if (success && data && Object.prototype.hasOwnProperty.call(data, 'data')) {
      return { data: data.data, cachedAt: data.cachedAt };
    }
  }
  return null;
};

export const backupData = async (role, category, filename, data) => {
  if (window.electronAPI) {
    return await window.electronAPI.saveOfflineData(`BackupData/${role}/${category}`, filename, data);
  } else {
    try {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${role}_${category}_${filename}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { success: true };
    } catch(e) {
      return { success: false, error: e.message };
    }
  }
};
