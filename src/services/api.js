import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { cacheData, getCachedData, queueAction } from './offlineSync';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://dev-api.dataudipi.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  // Without a timeout a dead-but-not-refused connection (very common on a
  // flaky restaurant link) hangs forever: the bill prints, the cashier moves
  // on, and the sale is never queued nor sent.
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth endpoints must never be replayed from the offline queue.
const NON_QUEUEABLE = [
  '/api/v1/auth/login',
  '/api/v1/auth/logout',
  '/api/v1/auth/refresh',
  '/api/v1/auth/signup',
];

export function newIdempotencyKey() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (e) {}
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function logOfflineFailure(config, reason) {
  const message = `OFFLINE WRITE FAILED ${config.method?.toUpperCase()} ${config.url}: ${reason} | body=${
    typeof config.data === 'string' ? config.data.slice(0, 1000) : ''
  }`;
  console.error(`[Offline API] ${message}`);
  try {
    if (typeof window !== 'undefined' && window.electronAPI?.logError) {
      await window.electronAPI.logError(message);
    }
  } catch (e) {}
}

export function rewriteImageUrl(url) {
  if (!url) return url;
  
  // Remove any explicit localhost references to prevent hardcoded dev URLs
  let cleanUrl = url.replace(/^https?:\/\/localhost(:\d+)?/, '');
  
  if (cleanUrl.startsWith('/')) {
    return `${API_BASE_URL.replace(/\/$/, '')}${cleanUrl}`;
  }
  return cleanUrl;
}

/**
 * Builds a stable key that includes the query string.
 * axios only merges `config.params` into the URL inside the adapter, so
 * `config.url` alone is NOT unique: every /api/v1/reports call with a
 * different date was being written to the SAME cache file, which is why
 * offline reports showed the wrong day's sales.
 */
function buildRequestKey(config) {
  const url = config.url || '';
  const params = config.params || {};
  const keys = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null).sort();
  if (!keys.length) return url;
  const qs = keys.map(k => `${k}=${String(params[k])}`).join('&');
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}

/** Merge `config.params` into the endpoint so a queued action keeps them. */
function buildQueueEndpoint(config) {
  return buildRequestKey(config);
}

function parseRequestBody(config) {
  const data = config.data;
  if (data === undefined || data === null || data === '') return {};
  if (typeof data === 'object') return data; // already a plain object
  try {
    return JSON.parse(data);
  } catch (e) {
    return null; // signals "not queueable"
  }
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Stable idempotency key per logical request. If the request is retried
    // (by us or by the offline queue) the server sees the same key and can
    // refuse to create a second record for the same sale.
    if (['post', 'patch', 'put', 'delete'].includes(config.method)) {
      if (!config.headers['Idempotency-Key']) {
        config.headers['Idempotency-Key'] = newIdempotencyKey();
      }
    }

    const adminSelectedRestaurant = await AsyncStorage.getItem('admin_selected_restaurant');
    if (adminSelectedRestaurant) {
      if (config.method === 'get' || config.method === 'delete') {
        config.params = { ...config.params, restaurant_id: adminSelectedRestaurant };
      } else if (config.method === 'post' || config.method === 'patch' || config.method === 'put') {
        if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
          config.data.restaurant_id = parseInt(adminSelectedRestaurant);
        } else if (config.data instanceof FormData) {
          config.data.append('restaurant_id', adminSelectedRestaurant);
        }
      }
    }
  } catch (err) {
    console.error('Error in request interceptor', err);
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Cache GET requests successfully fetched from server (params included).
    if (response.config.method === 'get' && response.status >= 200 && response.status < 300) {
      cacheData(buildRequestKey(response.config), response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    if (!originalRequest) return Promise.reject(error);

    if (originalRequest.url === '/api/v1/auth/refresh') {
      return Promise.reject(error);
    }

    const isNetworkFailure =
      !error.response ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ECONNABORTED';

    if (isNetworkFailure) {
      if (originalRequest.method === 'get') {
        const cached = await getCachedData(buildRequestKey(originalRequest));
        if (cached) {
          console.log(`[Offline API] Served from cache: ${originalRequest.url}`);
          return Promise.resolve({
            data: cached.data,
            status: 200,
            config: originalRequest,
            _offline: true,
            _cachedAt: cached.cachedAt, // callers can warn "data as of ..."
          });
        }
        // No cache: do NOT fabricate data, let the caller handle the failure.
        return Promise.reject(error);
      }

      if (['post', 'patch', 'put', 'delete'].includes(originalRequest.method)) {
        // Login/logout/refresh must never be queued and replayed.
        if (NON_QUEUEABLE.some(p => (originalRequest.url || '').startsWith(p))) {
          return Promise.reject(error);
        }

        // FormData (file uploads) cannot be serialised to the queue.
        if (originalRequest.data instanceof FormData) {
          return Promise.reject(error);
        }

        const body = parseRequestBody(originalRequest);
        if (body === null) {
          await logOfflineFailure(originalRequest, 'Unserialisable request body');
          return Promise.reject(error);
        }

        const queued = await queueAction(
          buildQueueEndpoint(originalRequest),
          originalRequest.method,
          body,
          { idempotencyKey: originalRequest.headers?.['Idempotency-Key'] }
        );

        if (!queued?.success) {
          // CRITICAL: the old code returned `{ success: true }` here no matter
          // what, so a failed enqueue looked like a completed sale and the
          // transaction vanished. Now we surface the failure.
          await logOfflineFailure(originalRequest, queued?.error || 'queue failed');
          const err = new Error('Offline save failed - transaction NOT recorded');
          err.offlineQueueFailed = true;
          err.config = originalRequest;
          return Promise.reject(err);
        }

        console.log(`[Offline API] Queued mutation ${queued.id}: ${originalRequest.url}`);
        return Promise.resolve({
          data: { success: true, _offline: true, _queueId: queued.id },
          status: 202,
          config: originalRequest,
          _offline: true,
          _queued: true,
          _queueId: queued.id,
        });
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await api.post('/api/v1/auth/refresh');
        if (refreshResponse.data.access_token) {
          await AsyncStorage.setItem('access_token', refreshResponse.data.access_token);
          await AsyncStorage.setItem('user', JSON.stringify(refreshResponse.data.user));

          originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        Alert.alert("Session Expired", "Please log in again.");
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('user');
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status >= 500) {
      Alert.alert("Server Error", "We've been notified.");
    } else if (error.response?.status === 403) {
      Alert.alert("Access Denied", "You don't have permission to do this.");
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: async (email, password, role = undefined) => {
    const response = await api.post('/api/v1/auth/login', { email, password, role });
    if (response.data.access_token) {
      await AsyncStorage.setItem('access_token', response.data.access_token);
      await AsyncStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  signup: async (name, email, password, role = null, restaurantId = null) => {
    const response = await api.post('/api/v1/auth/signup', { name, email, password, role, restaurant_id: restaurantId });
    return response.data;
  },

  logout: async () => {
    try {
      await api.post('/api/v1/auth/logout');
    } finally {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('user');
    }
  },

  getCurrentUser: async () => {
    const user = await AsyncStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken: async () => await AsyncStorage.getItem('access_token'),

  isAuthenticated: async () => {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  },
};

export const restaurantService = {
  getPublicRestaurants: async () => {
    const response = await api.get('/api/v1/public/restaurants');
    return response.data;
  },

  getAdminRestaurants: async () => {
    const response = await api.get('/api/v1/restaurants');
    return response.data;
  },

  createRestaurant: async (restaurantData) => {
    const response = await api.post('/api/v1/restaurants', restaurantData);
    return response.data;
  },

  getRestaurant: async (restaurantId) => {
    const response = await api.get(`/api/v1/restaurants/${restaurantId}`);
    return response.data;
  },

  updateRestaurant: async (restaurantId, updateData) => {
    const response = await api.patch(`/api/v1/restaurants/${restaurantId}`, updateData);
    return response.data;
  },

  deleteRestaurant: async (restaurantId) => {
    const response = await api.delete(`/api/v1/restaurants/${restaurantId}`);
    return response.data;
  },
};

export const tableService = {
  getTables: async (params = {}) => {
    const response = await api.get('/api/v1/tables', { params });
    return response.data;
  },
  
  updateTable: async (tableId, tableData) => {
    const response = await api.patch(`/api/v1/tables/${tableId}`, tableData);
    return response.data;
  },

  createTable: async (tableData) => {
    const response = await api.post('/api/v1/tables', tableData);
    return response.data;
  },

  deleteTable: async (tableId) => {
    const response = await api.delete(`/api/v1/tables/${tableId}`);
    return response.data;
  },
};

export const menuService = {
  getItems: async (params = {}) => {
    const response = await api.get('/api/v1/menu/items', { params });
    return response.data;
  },

  getCategories: async (params = {}) => {
    const response = await api.get('/api/v1/menu/categories', { params });
    return response.data;
  },

  createItem: async (itemData) => {
    const response = await api.post('/api/v1/menu/items', itemData);
    return response.data;
  },

  updateItem: async (itemId, itemData) => {
    const response = await api.patch(`/api/v1/menu/items/${itemId}`, itemData);
    return response.data;
  },

  generateImage: async (itemId) => {
    const response = await api.post(`/api/v1/menu/items/${itemId}/generate-image`);
    return response.data;
  },

  deleteItem: async (itemId) => {
    const response = await api.delete(`/api/v1/menu/items/${itemId}`);
    return response.data;
  },

  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/v1/menu/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const orderService = {
  getLiveOrders: async (params = {}) => {
    const response = await api.get('/api/v1/orders/live', { params });
    return response.data;
  },

  getAllOrders: async (params = {}) => {
    const response = await api.get('/api/v1/orders', { params });
    return response.data;
  },

  updateOrderStatus: async (orderId, status) => {
    const response = await api.patch(`/api/v1/orders/${orderId}/status`, { status });
    return response.data;
  },

  updateOrderPaymentStatus: async (orderId, payment_status) => {
    const response = await api.patch(`/api/v1/orders/${orderId}/payment-status`, { payment_status });
    return response.data;
  },
};

export const inventoryService = {
  getInventory: async (params = {}) => {
    const response = await api.get('/api/v1/inventory', { params });
    return response.data;
  },

  updateInventory: async (inventoryId, data) => {
    const response = await api.patch(`/api/v1/inventory/${inventoryId}`, data);
    return response.data;
  },

  createItem: async (itemData) => {
    const response = await api.post('/api/v1/inventory', itemData);
    return response.data;
  },

  scanInventory: async (formData) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/api/v1/inventory/scan`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error('Scan failed');
        error.response = { data };
        throw error;
      }
      return data;
    } catch (e) {
      if (e.response) throw e;
      const error = new Error('Network error during scan');
      error.response = { data: { detail: e.message } };
      throw error;
    }
  },

  bulkUpdateInventory: async (items) => {
    const response = await api.post('/api/v1/inventory/bulk', items);
    return response.data;
  },

  deleteItem: async (inventoryId) => {
    const response = await api.delete(`/api/v1/inventory/${inventoryId}`);
    return response.data;
  },
};

export const managerService = {
  getManagers: async () => {
    const response = await api.get('/api/v1/managers');
    return response.data;
  },

  createManager: async (managerData) => {
    const response = await api.post('/api/v1/managers', managerData);
    return response.data;
  },

  updateManager: async (managerId, updateData) => {
    const response = await api.patch(`/api/v1/managers/${managerId}`, updateData);
    return response.data;
  },

  deleteManager: async (managerId) => {
    const response = await api.delete(`/api/v1/managers/${managerId}`);
    return response.data;
  },
};

export const reportsService = {
  getReports: async (params = {}) => {
    const response = await api.get('/api/v1/reports', { params });
    return response.data;
  },
  getHourlyReport: async (params = {}) => {
    const response = await api.get('/api/v1/reports/hourly', { params });
    return response.data;
  },
  getItemWiseReport: async (params = {}) => {
    const response = await api.get('/api/v1/reports/items', { params });
    return response.data;
  },
  getConsumptionReport: async (date) => {
    const response = await api.get('/api/v1/reports/consumption', { params: { report_date: date } });
    return response.data;
  },
};

export const recipeService = {
  getRecipes: async (menuItemId = null) => {
    const params = menuItemId ? { menu_item_id: menuItemId } : {};
    const response = await api.get('/api/v1/recipes', { params });
    return response.data;
  },

  updateRecipe: async (payload) => {
    const response = await api.post('/api/v1/recipes', payload);
    return response.data;
  },
};

export default api;
