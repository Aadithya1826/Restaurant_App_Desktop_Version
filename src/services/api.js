import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export function rewriteImageUrl(url) {
  if (!url) return url;
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }
  return url;
}

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest.url === '/api/v1/auth/refresh') {
      return Promise.reject(error);
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
    const response = await api.post('/api/v1/inventory/scan', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
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
};

export default api;
