/**
 * Media Module - TypeScript Types
 * ================================
 * Uses unified types from @shared/types/images and Drizzle schema.
 */

import type {
  ImageVariant,
  StorageVariant,
  StrictStorageVariants,
  PartialStorageVariants,
  MediaVariantsJson,
} from '@shared/types/images';
import type { Media, NewMedia } from '../schema/media.schema';

// Re-export shared types for convenience
export type { ImageVariant, StorageVariant, StrictStorageVariants, PartialStorageVariants, MediaVariantsJson };

// Re-export Drizzle schema types as canonical MediaRecord
export type { Media, NewMedia };
export type MediaRecord = Media;

// Legacy aliases for backwards compatibility
export type MediaVariant = StorageVariant;
export type MediaVariants = PartialStorageVariants;

// C4: MediaUploadOptions and MediaUploadResult removed — zero callers.
//     If needed in future, import ImageUploadOptions/ImageUploadResult from @modules/media/services/r2.service.

export interface MediaQueryOptions {
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
}
