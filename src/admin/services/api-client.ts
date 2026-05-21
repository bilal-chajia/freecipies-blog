import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig, type AxiosResponse } from 'axios';
import { useAuthStore } from '../store/useStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const RETRY_CONFIG = {
  maxRetries: 2,
  retryDelayMs: 1000,
  retryableStatuses: [500, 502, 503, 504],
};

interface CustomAxiosConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

export const api: AxiosInstance = axios.create({
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
  (config: InternalAxiosRequestConfig) => {
    const customConfig = config as CustomAxiosConfig;
    const token = localStorage.getItem('admin_token');
    if (token) {
      customConfig.headers.Authorization = `Bearer ${token}`;
    }
    if (customConfig.method === 'get') {
      customConfig.params = {
        ...customConfig.params,
        _t: Date.now(),
      };
    }
    if (typeof customConfig._retryCount !== 'number') {
      customConfig._retryCount = 0;
    }
    return customConfig;
  },
  (error: AxiosError) => Promise.reject(error),
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const config = error.config as CustomAxiosConfig | undefined;

    if (error.response?.status === 401) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      (useAuthStore.getState() as { clearAuth: () => void }).clearAuth();
      localStorage.removeItem('admin_token');
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const isRetryable = !status || RETRY_CONFIG.retryableStatuses.includes(status);
    const canRetry =
      config &&
      typeof config._retryCount === 'number' &&
      config._retryCount < RETRY_CONFIG.maxRetries &&
      isRetryable;

    if (canRetry) {
      (config as CustomAxiosConfig)._retryCount! += 1;
      const delay = RETRY_CONFIG.retryDelayMs * (config as CustomAxiosConfig)._retryCount!;
      // eslint-disable-next-line no-console
      console.warn(
        `[API] Retrying ${config.method?.toUpperCase()} ${config.url} (attempt ${config._retryCount}/${RETRY_CONFIG.maxRetries}) after ${delay}ms`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    return Promise.reject(error);
  },
);

export default api;
