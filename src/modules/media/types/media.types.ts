/**
 * Media Module - TypeScript Types
 * ================================
 * Uses unified types from @shared/types/images
 */

import type {
  ImageVariant,
  StorageVariant,
  StorageVariants,
  MediaVariantsJson,
} from '@shared/types/images';

// Re-export shared types for convenience
export type { ImageVariant, StorageVariant, StorageVariants, MediaVariantsJson };

// Legacy alias for backwards compatibility
export type MediaVariant = StorageVariant;
export type MediaVariants = StorageVariants;

export interface MediaUploadOptions {
  file: File | Blob;
  filename: string;
  contentType?: string;
  folder?: string;
  contextSlug?: string;
  alt?: string;
  attribution?: string;
}

export interface MediaUploadResult {
  success: boolean;
  id?: number;
  url: string;
  key: string;
  filename: string;
  size: number;
  contentType: string;
}

export interface MediaQueryOptions {
  folder?: string;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  type?: string;
}

export interface MediaRecord {
  id: number;
  name: string;
  altText?: string | null;
  caption?: string | null;
  credit?: string | null;
  mimeType: string;
  aspectRatio?: string | null;
  variantsJson: string;
  focalPointJson?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}
