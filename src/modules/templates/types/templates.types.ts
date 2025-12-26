/**
 * Template Module - Template Types
 * =================================
 * Type definitions for templates and related data structures.
 */

import type { TemplateElement } from './elements.types';

// Template interface (matches database schema)
export interface Template {
  id: number | null;
  slug: string | null;
  name: string;
  description?: string;
  category?: string;
  width: number;
  height: number;
  background_color: string;
  thumbnail_url?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Template with parsed elements (for editor state)
export interface TemplateWithElements extends Template {
  elements: TemplateElement[];
}

// Database row (raw from D1)
export interface TemplateRow {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  width: number;
  height: number;
  thumbnail_url: string | null;
  elements_json: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Article data for placeholder substitution
export interface ArticleData {
  title: string;
  categoryLabel?: string;
  authorName?: string;
  prepTime?: string;
  cookTime?: string;
  servings?: string;
  rating?: number;
  image?: string;
  [key: string]: unknown;
}

// Export options
export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;                    // 0.0 - 1.0
  pixelRatio?: number;                // 1, 2, 3 for DPI scaling
}

// Create template input
export interface CreateTemplateInput {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  width?: number;
  height?: number;
  elements_json?: string | TemplateElement[];
  thumbnail_url?: string;
  is_active?: boolean;
}

// Update template input
export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  width?: number;
  height?: number;
  elements_json?: string | TemplateElement[];
  thumbnail_url?: string;
  is_active?: boolean;
  slug?: string;  // For slug rename
}

// API Response types
export interface TemplateListResponse {
  success: boolean;
  data: Template[];
}

export interface TemplateDetailResponse {
  success: boolean;
  data: TemplateWithElements;
}

// Hydrate raw row to Template
export function hydrateTemplate(row: TemplateRow): TemplateWithElements {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? undefined,
    category: row.category ?? undefined,
    width: row.width,
    height: row.height,
    background_color: '#ffffff',  // Default, may need to extract from elements
    thumbnail_url: row.thumbnail_url,
    is_active: row.is_active === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
    elements: row.elements_json ? JSON.parse(row.elements_json) : [],
  };
}
