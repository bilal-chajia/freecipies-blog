import axios from 'axios';
import { useAuthStore } from '../store/useStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const RETRY_CONFIG = {
  maxRetries: 2,
  retryDelayMs: 1000,
  retryableStatuses: [500, 502, 503, 504],
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    if (!config._retryCount) config._retryCount = 0;
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      localStorage.removeItem('admin_token');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isRetryable = !status || RETRY_CONFIG.retryableStatuses.includes(status);
    const canRetry = config && config._retryCount < RETRY_CONFIG.maxRetries && isRetryable;

    if (canRetry) {
      config._retryCount += 1;
      const delay = RETRY_CONFIG.retryDelayMs * config._retryCount;
      console.warn(`[API] Retrying ${config.method?.toUpperCase()} ${config.url} (attempt ${config._retryCount}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
