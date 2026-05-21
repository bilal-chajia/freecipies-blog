import api from './api-client';
import type { AxiosRequestConfig } from 'axios';

/* ------------------------------------------------------------------ */
/*  Upload payload helpers                                            */
/* ------------------------------------------------------------------ */

interface UploadVariantInput {
  upload_key?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
}

interface ConfirmUploadInput {
  uploadId?: string;
  baseName?: string;
  name?: string;
  altText?: string;
  caption?: string;
  credit?: string;
  aspectRatio?: string | null;
  focalPoint?: { x: number; y: number };
  mimeType?: string;
  variants?: {
    original?: UploadVariantInput;
    lg?: UploadVariantInput;
    md?: UploadVariantInput;
    sm?: UploadVariantInput;
    xs?: UploadVariantInput;
  };
  placeholder?: string;
}

interface StoredUploadVariant {
  upload_key: string;
  width: number;
  height: number;
  size_bytes?: number;
}

const toStoredUploadVariant = (variant: UploadVariantInput | undefined | null): StoredUploadVariant | undefined => {
  if (!variant) return undefined;
  if (!variant.upload_key || !variant.width || !variant.height) return undefined;
  const out: StoredUploadVariant = {
    upload_key: variant.upload_key,
    width: variant.width,
    height: variant.height,
  };
  if (typeof variant.size_bytes === 'number') {
    out.size_bytes = variant.size_bytes;
  }
  return out;
};

const toConfirmUploadPayload = (payload: ConfirmUploadInput) => ({
  upload_id: payload.uploadId,
  base_name: payload.baseName,
  name: payload.name,
  alt_text: payload.altText,
  caption: payload.caption,
  credit: payload.credit,
  aspect_ratio: payload.aspectRatio ?? null,
  focal_point: payload.focalPoint,
  mime_type: payload.mimeType,
  variants: {
    original: toStoredUploadVariant(payload.variants?.original),
    lg: toStoredUploadVariant(payload.variants?.lg),
    md: toStoredUploadVariant(payload.variants?.md),
    sm: toStoredUploadVariant(payload.variants?.sm),
    xs: toStoredUploadVariant(payload.variants?.xs),
  },
  placeholder: payload.placeholder,
});

/* ------------------------------------------------------------------ */
/*  ARTICLES API                                                      */
/* ------------------------------------------------------------------ */

export const articlesAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/articles', { params }),
  getBySlug: (slug: string) => api.get(`/articles/${slug}`),
  getById: (id: number | string) => api.get(`/admin/articles/${id}`),
  create: (data: unknown) => api.post('/articles', data),
  update: (id: number | string, data: unknown) => api.put(`/admin/articles/${id}`, data),
  delete: (id: number | string) => api.delete(`/admin/articles/${id}`),
  toggleOnline: (id: number | string) => api.patch(`/admin/articles/${id}?action=toggle-online`),
  toggleFavorite: (id: number | string) => api.patch(`/admin/articles/${id}?action=toggle-favorite`),
};

/* ------------------------------------------------------------------ */
/*  CATEGORIES API                                                    */
/* ------------------------------------------------------------------ */

export const categoriesAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/categories', { params }),
  getBySlug: (slug: string) => api.get(`/categories/${slug}`),
  create: (data: unknown) => api.post('/categories', data),
  update: (slug: string, data: unknown) => api.put(`/categories/${slug}`, data),
  delete: (slug: string) => api.delete(`/categories/${slug}`),
};

/* ------------------------------------------------------------------ */
/*  AUTHORS API                                                       */
/* ------------------------------------------------------------------ */

export const authorsAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/authors', { params }),
  getBySlug: (slug: string) => api.get(`/authors/${slug}`),
  getById: (id: number | string) => api.get(`/authors/${id}`),
  create: (data: unknown) => api.post('/authors', data),
  update: (id: number | string, data: unknown) => api.put(`/authors/${id}`, data),
  delete: (id: number | string) => api.delete(`/authors/${id}`),
  toggleOnline: (id: number | string) => api.patch(`/authors/${id}`, { action: 'toggle-online' }),
  toggleFeatured: (id: number | string) => api.patch(`/authors/${id}`, { action: 'toggle-featured' }),
};

/* ------------------------------------------------------------------ */
/*  TAGS API                                                          */
/* ------------------------------------------------------------------ */

export const tagsAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/tags', { params }),
  getBySlug: (slug: string) => api.get(`/tags/${slug}`),
  create: (data: unknown) => api.post('/tags', data),
  update: (slug: string, data: unknown) => api.put(`/tags/${slug}`, data),
  delete: (slug: string) => api.delete(`/tags/${slug}`),
};

/* ------------------------------------------------------------------ */
/*  EQUIPMENT API                                                     */
/* ------------------------------------------------------------------ */

export const equipmentAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/equipment', { params }),
  getBySlug: (slug: string) => api.get(`/equipment?slug=${slug}`),
  create: (data: unknown) => api.post('/equipment', data),
  update: (slug: string, data: unknown) => api.put(`/equipment?slug=${slug}`, data),
  delete: (slug: string) => api.delete(`/equipment?slug=${slug}`),
  match: (text: string) => api.get('/equipment', { params: { match: text } }),
};

/* ------------------------------------------------------------------ */
/*  MEDIA API                                                         */
/* ------------------------------------------------------------------ */

interface UploadVariantOptions {
  filename?: string;
  variantName: string;
  baseName: string;
  uploadId: string;
  width: number;
  height: number;
}

export const mediaAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/media', { params }),
  delete: (id: number | string) => api.delete(`/media/${id}`),
  bulkDelete: (ids: (number | string)[]) => api.post('/media/bulk-delete', { ids }),
  confirmUpload: async (payload: ConfirmUploadInput, config: AxiosRequestConfig = {}) =>
    api.post('/media/confirm', toConfirmUploadPayload(payload), config),
  uploadVariant: async (blob: Blob, options: UploadVariantOptions, config: AxiosRequestConfig = {}) => {
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

/* ------------------------------------------------------------------ */
/*  SETTINGS API                                                      */
/* ------------------------------------------------------------------ */

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  get: (key: string) => api.get(`/settings/${key}`),
  update: (key: string, value: unknown) => api.put(`/settings/${key}`, { value }),
  getImageUploadSettings: (config: AxiosRequestConfig = {}) => api.get('/settings/image-upload', config),
  updateImageUploadSettings: (settings: unknown) => api.put('/settings/image-upload', settings),
  resetImageUploadSettings: () => api.delete('/settings/image-upload'),
};

/* ------------------------------------------------------------------ */
/*  AUTH API                                                          */
/* ------------------------------------------------------------------ */

export const authAPI = {
  login: (credentials: unknown) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  verify: () => api.get('/auth/verify'),
  refreshToken: () => api.post('/auth/refresh'),
};

/* ------------------------------------------------------------------ */
/*  PINTEREST BOARDS API                                              */
/* ------------------------------------------------------------------ */

export const pinterestBoardsAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/pinterest-boards', { params }),
  getBySlug: (slug: string) => api.get(`/pinterest-boards?slug=${slug}`),
  create: (data: unknown) => api.post('/pinterest-boards', data),
  update: (id: number | string, data: Record<string, unknown>) => api.put('/pinterest-boards', { id, ...data }),
  delete: (id: number | string) => api.delete(`/pinterest-boards?id=${id}`),
};

/* ------------------------------------------------------------------ */
/*  PINTEREST PINS API                                                */
/* ------------------------------------------------------------------ */

export const pinterestPinsAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/pins', { params }),
  getByArticle: (articleId: number | string) => api.get(`/pins?article_id=${articleId}`),
  create: (data: unknown) => api.post('/pins', data),
  update: (id: number | string, data: Record<string, unknown>) => api.put('/pins', { id, ...data }),
  delete: (id: number | string) => api.delete(`/pins?id=${id}`),
};

/* ------------------------------------------------------------------ */
/*  PIN TEMPLATES API                                                 */
/* ------------------------------------------------------------------ */

export const templatesAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/templates', { params }),
  getBySlug: (slug: string) => api.get(`/templates/${slug}`),
  create: (data: unknown) => api.post('/templates', data),
  update: (slug: string, data: unknown) => api.put(`/templates/${slug}`, data),
  delete: (slug: string) => api.delete(`/templates/${slug}`),
  getDefault: () => api.get('/templates?is_default=true'),
};

/* ------------------------------------------------------------------ */
/*  BRANDING API (Logos & Favicons)                                   */
/* ------------------------------------------------------------------ */

export const brandingAPI = {
  getAll: () => api.get('/branding'),
  uploadLogo: (type: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/branding/logo/${type}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadFavicon: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/branding/favicon', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadFaviconVariant: (file: File, filename: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', filename);
    return api.put('/branding', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteLogo: (type: string) => api.delete(`/branding/logo/${type}`),
  deleteFavicon: () => api.delete('/branding/favicon'),
};

/* ------------------------------------------------------------------ */
/*  STATS API (Dashboard)                                             */
/* ------------------------------------------------------------------ */

export const statsAPI = {
  getDashboard: () => api.get('/stats/dashboard'),
  getArticleStats: () => api.get('/stats/articles'),
  getPopularArticles: (limit = 10) => api.get(`/stats/popular?limit=${limit}`),
};

/* ------------------------------------------------------------------ */
/*  AI API                                                            */
/* ------------------------------------------------------------------ */

export const aiAPI = {
  getSettings: () => api.get('/admin/ai/settings'),
  updateSettings: (settings: unknown) => api.put('/admin/ai/settings', settings),
  validateApiKey: (provider: string, apiKey: string) => api.post('/admin/ai/settings', { provider, apiKey }),
  getProviders: () => api.get('/admin/ai/providers'),
  generate: (params: unknown) => api.post('/admin/ai/generate', params),
};

/* ------------------------------------------------------------------ */
/*  REDIRECTS API                                                     */
/* ------------------------------------------------------------------ */

export const redirectsAPI = {
  getAll: (params: Record<string, unknown> = {}) => api.get('/redirects', { params }),
  getById: (id: number | string) => api.get(`/redirects/${id}`),
  create: (data: unknown) => api.post('/redirects', data),
  update: (id: number | string, data: unknown) => api.put(`/redirects/${id}`, data),
  delete: (id: number | string) => api.delete(`/redirects/${id}`),
};

export default api;
