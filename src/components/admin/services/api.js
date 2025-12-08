import axios from 'axios';
import { useAuthStore } from '../store/useStore';

// API Base URL - Update this to match your Astro backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4321/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Request interceptor to add auth token and cache-busting
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Add timestamp to prevent caching for GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth state and dispatch event for React Router to handle
      useAuthStore.getState().clearAuth();
      localStorage.removeItem('admin_token');
      // Dispatch custom event for auth redirect - React components can listen to this
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// ============================================
// ARTICLES API
// ============================================

export const articlesAPI = {
  // Get all articles with pagination and filters
  getAll: (params = {}) => api.get('/articles', { params }),

  // Get single article by slug
  getBySlug: (slug) => api.get(`/articles/${slug}`),

  // Create new article
  create: (data) => api.post('/articles', data),

  // Update article
  update: (slug, data) => api.put(`/articles/${slug}`, data),

  // Delete article
  delete: (slug) => api.delete(`/articles/${slug}`),

  // Toggle online status
  toggleOnline: (slug) => api.patch(`/articles/${slug}/toggle-online`),

  // Toggle favorite status
  toggleFavorite: (slug) => api.patch(`/articles/${slug}/toggle-favorite`),
};

// ============================================
// CATEGORIES API
// ============================================

export const categoriesAPI = {
  getAll: (params = {}) => api.get('/categories', { params }),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
  create: (data) => api.post('/categories', data),
  update: (slug, data) => api.put(`/categories/${slug}`, data),
  delete: (slug) => api.delete(`/categories/${slug}`),
};

// ============================================
// AUTHORS API
// ============================================

export const authorsAPI = {
  getAll: (params = {}) => api.get('/authors', { params }),
  getBySlug: (slug) => api.get(`/authors/${slug}`),
  create: (data) => api.post('/authors', data),
  update: (slug, data) => api.put(`/authors/${slug}`, data),
  delete: (slug) => api.delete(`/authors/${slug}`),
};

// ============================================
// TAGS API
// ============================================

export const tagsAPI = {
  getAll: (params = {}) => api.get('/tags', { params }),
  getBySlug: (slug) => api.get(`/tags/${slug}`),
  create: (data) => api.post('/tags', data),
  update: (slug, data) => api.put(`/tags/${slug}`, data),
  delete: (slug) => api.delete(`/tags/${slug}`),
};

// ============================================
// MEDIA API
// ============================================

export const mediaAPI = {
  // Get all media files
  getAll: (params = {}) => api.get('/media', { params }),

  // Upload file to R2
  upload: (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.folder) formData.append('folder', options.folder);
    if (options.contextSlug) formData.append('contextSlug', options.contextSlug);
    if (options.alt) formData.append('alt', options.alt);
    if (options.attribution) formData.append('attribution', options.attribution);

    return api.post('/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload image from URL
  uploadFromUrl: (url, options = {}) => {
    return api.post('/upload-from-url', {
      url,
      alt: options.alt || '',
      attribution: options.attribution || '',
      convertToWebp: options.convertToWebp !== false,
      folder: options.folder || '',
      contextSlug: options.contextSlug || '',
    });
  },

  // Delete media file
  delete: (id) => api.delete(`/media/${id}`),

  // Replace image file (in-place)
  replaceImage: (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.put(`/media/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

// ============================================
// SETTINGS API
// ============================================

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  get: (key) => api.get(`/settings/${key}`),
  update: (key, value) => api.put(`/settings/${key}`, { value }),
};

// ============================================
// AUTH API
// ============================================

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
  refreshToken: () => api.post('/auth/refresh'),
};

// ============================================
// PINTEREST BOARDS API
// ============================================

export const pinterestBoardsAPI = {
  getAll: (params = {}) => api.get('/pinterest-boards', { params }),
  getBySlug: (slug) => api.get(`/pinterest-boards?slug=${slug}`),
  create: (data) => api.post('/pinterest-boards', data),
  update: (id, data) => api.put('/pinterest-boards', { id, ...data }),
  delete: (id) => api.delete(`/pinterest-boards?id=${id}`),
};

// ============================================
// PINTEREST PINS API
// ============================================

export const pinterestPinsAPI = {
  getAll: (params = {}) => api.get('/pins', { params }),
  getByArticle: (articleId) => api.get(`/pins?article_id=${articleId}`),
  create: (data) => api.post('/pins', data),
  update: (id, data) => api.put('/pins', { id, ...data }),
  delete: (id) => api.delete(`/pins?id=${id}`),
};

// ============================================
// PIN TEMPLATES API
// ============================================

export const templatesAPI = {
  getAll: (params = {}) => api.get('/templates', { params }),
  getBySlug: (slug) => api.get(`/templates/${slug}`),
  create: (data) => api.post('/templates', data),
  update: (slug, data) => api.put(`/templates/${slug}`, data),
  delete: (slug) => api.delete(`/templates/${slug}`),
  getDefault: () => api.get('/templates?is_default=true'),
};

// ============================================
// STATS API (Dashboard)
// ============================================

export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard'),
  getArticleStats: () => api.get('/stats/articles'),
  getPopularArticles: (limit = 10) => api.get(`/stats/popular?limit=${limit}`),
};

export default api;

