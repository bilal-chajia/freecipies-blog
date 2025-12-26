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

  // Get single article by slug (public)
  getBySlug: (slug) => api.get(`/articles/${slug}`),

  // Get single article by ID (admin)
  getById: (id) => api.get(`/admin/articles/${id}`),

  // Create new article
  create: (data) => api.post('/articles', data),

  // Update article by ID (admin)
  update: (id, data) => api.put(`/admin/articles/${id}`, data),

  // Delete article by ID (soft delete, admin)
  delete: (id) => api.delete(`/admin/articles/${id}`),

  // Toggle online status by ID (admin)
  toggleOnline: (id) => api.patch(`/admin/articles/${id}?action=toggle-online`),

  // Toggle favorite status by ID (admin)
  toggleFavorite: (id) => api.patch(`/admin/articles/${id}?action=toggle-favorite`),
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
  // Get all authors with filters
  getAll: (params = {}) => api.get('/authors', { params }),

  // Get author by slug (uses /authors/[slug].ts endpoint)
  getBySlug: (slug) => api.get(`/authors/${slug}`),

  // Get author by ID (uses /authors/[id].ts endpoint)
  getById: (id) => api.get(`/authors/${id}`),

  // Create new author (uses /authors/index.ts POST)
  create: (data) => api.post('/authors', data),

  // Update author by ID (uses /authors/[id].ts PUT)
  update: (id, data) => api.put(`/authors/${id}`, data),

  // Delete author by ID (uses /authors/[id].ts DELETE)
  delete: (id) => api.delete(`/authors/${id}`),

  // Toggle online status by ID (uses /authors/[id].ts PATCH)
  toggleOnline: (id) => api.patch(`/authors/${id}`, { action: 'toggle-online' }),

  // Toggle featured status by ID (uses /authors/[id].ts PATCH)
  toggleFeatured: (id) => api.patch(`/authors/${id}`, { action: 'toggle-featured' }),
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
  upload: async (file, options = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    if (options.folder) formData.append('folder', options.folder);
    if (options.contextSlug) formData.append('contextSlug', options.contextSlug);
    if (options.alt) formData.append('alt', options.alt);
    if (options.attribution) formData.append('attribution', options.attribution);

    const response = await api.post('/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Backfill url from variantsJson for backward compatibility
    if (response.data?.success && response.data?.data) {
      const data = response.data.data;
      if (!data.url && data.variantsJson) {
        try {
          const variants = typeof data.variantsJson === 'string' ? JSON.parse(data.variantsJson) : data.variantsJson;
          const url = variants.original?.url || variants.lg?.url || '';
          response.data.data.url = url;
          // Also set top-level url if some components look there (though typically they look at data.data)
          if (!response.data.url) response.data.url = url;
        } catch (e) {
          console.error('Failed to polyfill url from variantsJson', e);
        }
      }
    }

    return response;
  },

  // Upload image from URL
  uploadFromUrl: async (url, options = {}) => {
    const response = await api.post('/upload-from-url', {
      url,
      alt: options.alt || '',
      attribution: options.attribution || '',
      convertToWebp: options.convertToWebp !== false,
      folder: options.folder || '',
      contextSlug: options.contextSlug || '',
    });

    // Backfill url from variantsJson for backward compatibility
    if (response.data?.success && response.data?.data) {
      const data = response.data.data;
      if (!data.url && data.variantsJson) {
        try {
          const variants = typeof data.variantsJson === 'string' ? JSON.parse(data.variantsJson) : data.variantsJson;
          const url = variants.original?.url || variants.lg?.url || '';
          response.data.data.url = url;
          if (!response.data.url) response.data.url = url;
        } catch (e) {
          console.error('Failed to polyfill url from variantsJson', e);
        }
      }
    }

    return response;
  },

  // Delete media file
  delete: (id) => api.delete(`/media/${id}`),

  // Bulk delete multiple media files
  bulkDelete: (ids) => api.post('/media/bulk-delete', { ids }),

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

  // Get presigned URLs for direct R2 upload
  getUploadUrls: async (options) => {
    const params = new URLSearchParams({
      baseName: options.baseName,
      variants: options.variants.join(','),
      mimeType: options.mimeType || 'image/webp',
      originalExt: options.originalExt || 'jpg',
    });
    return api.get(`/media/upload-urls?${params.toString()}`);
  },

  // Confirm upload after all variants uploaded to R2
  confirmUpload: async (payload, config = {}) => {
    return api.post('/media/confirm', payload, config);
  },

  // Upload directly to presigned URL (no auth needed, URL is pre-signed)
  uploadToPresignedUrl: async (url, blob, contentType) => {
    const response = await fetch(url, {
      method: 'PUT',
      body: blob,
      headers: {
        'Content-Type': contentType,
      },
    });
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    return response;
  },

  // Upload variant via Worker (fallback when presigned URLs unavailable)
  uploadVariant: async (blob, options, config = {}) => {
    const formData = new FormData();
    formData.append('file', blob, options.filename || 'image.webp');
    formData.append('variantName', options.variantName);
    formData.append('baseName', options.baseName);
    formData.append('uploadId', options.uploadId);
    formData.append('width', options.width.toString());
    formData.append('height', options.height.toString());

    return api.post('/media/upload-variant', formData, {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(config.headers || {}),
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

  // Image upload settings
  getImageUploadSettings: (config = {}) => api.get('/settings/image-upload', config),
  updateImageUploadSettings: (settings) => api.put('/settings/image-upload', settings),
  resetImageUploadSettings: () => api.delete('/settings/image-upload'),
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
// BRANDING API (Logos & Favicons)
// ============================================

export const brandingAPI = {
  // Get current branding assets
  getAll: () => api.get('/branding'),

  // Upload logo (type: main, dark, mobile)
  uploadLogo: (type, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/branding/logo/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload favicon
  uploadFavicon: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/branding/favicon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Upload favicon variant (generated size)
  uploadFaviconVariant: (file, filename) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', filename);
    return api.put('/branding', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Delete logo
  deleteLogo: (type) => api.delete(`/branding/logo/${type}`),

  // Delete favicon and all variants
  deleteFavicon: () => api.delete('/branding/favicon'),
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
