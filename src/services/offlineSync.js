import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://dev-api.dataudipi.com';

const syncClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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

export const initOfflineSync = () => {
  if (syncInterval) clearInterval(syncInterval);
  
  // Attempt sync every 15 seconds
  syncInterval = setInterval(async () => {
    if (!window.electronAPI) return;

    try {
      const { success, queue, error } = await window.electronAPI.getSyncQueue();
      if (!success) {
        console.error('Failed to get sync queue', error);
        return;
      }

      if (queue.length > 0) {
        console.log(`[OfflineSync] Found ${queue.length} items in sync queue. Attempting sync...`);
        for (const action of queue) {
          try {
            // Attempt to send to real backend
            await syncClient({
              method: action.method,
              url: action.endpoint,
              data: action.payload,
            });
            // If successful, remove from local queue
            await window.electronAPI.dequeueSyncAction(action.id);
            console.log(`[OfflineSync] Successfully synced action ${action.id}`);
          } catch (e) {
            // If it fails due to network, stop the loop and try again later
            if (!e.response) {
              console.log(`[OfflineSync] Network still down. Stopping sync attempt.`);
              break; 
            } else {
              // If it fails with a 4xx or 5xx, we might want to log it and remove it to prevent blocking
              console.error(`[OfflineSync] Action ${action.id} failed with server error:`, e.response.status);
              await window.electronAPI.logError(`Sync failed for ${action.id}: ${e.message}`);
              await window.electronAPI.dequeueSyncAction(action.id);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error during offline sync interval', e);
    }
  }, 15000);
};

export const queueAction = async (endpoint, method, payload) => {
  if (window.electronAPI) {
    return await window.electronAPI.queueSyncAction(endpoint, method, payload);
  }
  return { success: false };
};

export const cacheData = async (endpoint, data) => {
  if (window.electronAPI) {
    // Generate a safe filename from the endpoint
    const filename = endpoint.replace(/[\/\?=\&]/g, '_') + '.json';
    return await window.electronAPI.saveOfflineData('cashier_data', filename, data);
  }
};

export const getCachedData = async (endpoint) => {
  if (window.electronAPI) {
    const filename = endpoint.replace(/[\/\?=\&]/g, '_') + '.json';
    const { success, data } = await window.electronAPI.getOfflineData('cashier_data', filename);
    if (success) return data;
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
