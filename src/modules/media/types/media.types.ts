/**
 * Media Module - TypeScript Types
 * ================================
 */

export interface MediaVariant {
  url: string;
  r2_key: string;
  width: number;
  height: number;
  sizeBytes?: number;
  size_bytes?: number;
}

export interface MediaVariants {
  original?: MediaVariant;
  lg?: MediaVariant;
  md?: MediaVariant;
  sm?: MediaVariant;
  xs?: MediaVariant;
}

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
  width?: number | null;
  height?: number | null;
  blurhash?: string | null;
  dominantColor?: string | null;
  variantsJson: string;
  folder?: string | null;
  tagsJson?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
}
