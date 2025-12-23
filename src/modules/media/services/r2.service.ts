/**
 * Media Module - R2 Storage Service
 * ==================================
 * Handles all R2 bucket operations for image and file storage.
 */

import type { R2Bucket, R2ObjectBody, R2Object, R2HTTPMetadata } from '@cloudflare/workers-types';

export interface ImageUploadOptions {
  file: File | Blob;
  filename: string;
  contentType?: string;
  metadata?: Record<string, string>;
  folder?: string;      // e.g., 'categories', 'authors', 'articles'
  contextSlug?: string; // e.g., 'healthy-recipes', 'john-doe'
}

export interface ImageUploadResult {
  success: boolean;
  key: string;
  url: string;
  filename: string;
  size: number;
  contentType: string;
}

/**
 * Upload an image to R2 storage
 */
export async function uploadImage(
  bucket: R2Bucket,
  options: ImageUploadOptions,
  publicUrl: string
): Promise<ImageUploadResult> {
  const { file, filename, contentType, metadata, folder, contextSlug } = options;

  // Generate unique key with timestamp and optional folder/slug
  const timestamp = Date.now();

  // Build the key path (without 'images/' prefix - publicUrl handles that)
  let key: string;
  if (folder && contextSlug) {
    // Organized naming: categories/healthy-recipes-1733468682123.webp
    const cleanSlug = contextSlug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const ext = filename.split('.').pop() || 'webp';
    key = `${folder}/${cleanSlug}-${timestamp}.${ext}`;
  } else if (folder) {
    // Just folder: categories/1733468682123-filename.webp
    key = `${folder}/${timestamp}-${filename}`;
  } else {
    // Default: 1733468682123-filename.webp
    key = `${timestamp}-${filename}`;
  }

  // Convert File/Blob to ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Upload to R2
  await bucket.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: contentType || file.type || 'image/jpeg',
    },
    customMetadata: {
      originalFilename: filename,
      uploadedAt: new Date().toISOString(),
      ...metadata,
    },
  });

  return {
    success: true,
    key,
    url: `${publicUrl}/${key}`,
    filename,
    size: arrayBuffer.byteLength,
    contentType: contentType || file.type || 'image/jpeg',
  };
}

/**
 * Get an image from R2 storage
 */
export async function getImage(
  bucket: R2Bucket,
  key: string
): Promise<R2ObjectBody | null> {
  const object = await bucket.get(key);
  return object;
}

/**
 * Delete an image from R2 storage
 */
export async function deleteImage(
  bucket: R2Bucket,
  key: string
): Promise<boolean> {
  try {
    await bucket.delete(key);
    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

/**
 * List images in R2 storage
 */
export async function listImages(
  bucket: R2Bucket,
  options?: {
    prefix?: string;
    limit?: number;
    cursor?: string;
  }
): Promise<{
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
}> {
  const result = await bucket.list({
    prefix: options?.prefix || 'images/',
    limit: options?.limit || 100,
    cursor: options?.cursor,
  });

  return {
    objects: result.objects,
    truncated: result.truncated,
    cursor: (result as any).cursor,
  };
}

/**
 * Get image metadata
 */
export async function getImageMetadata(
  bucket: R2Bucket,
  key: string
): Promise<{
  size: number;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
} | null> {
  const object = await bucket.head(key);

  if (!object) return null;

  return {
    size: object.size,
    uploaded: object.uploaded,
    httpMetadata: object.httpMetadata,
    customMetadata: object.customMetadata,
  };
}

/**
 * Generate a signed URL for temporary access (if needed)
 */
export function getImageUrl(key: string, publicUrl: string): string {
  return `${publicUrl}/${key}`;
}

/**
 * Upload multiple images in batch
 */
export async function uploadImagesBatch(
  bucket: R2Bucket,
  images: ImageUploadOptions[],
  publicUrl: string
): Promise<ImageUploadResult[]> {
  const results = await Promise.all(
    images.map(image => uploadImage(bucket, image, publicUrl))
  );

  return results;
}

/**
 * Validate image file
 */
export function validateImage(
  file: File | Blob,
  options?: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
  }
): { valid: boolean; error?: string } {
  const maxSize = options?.maxSize || 10 * 1024 * 1024; // 10MB default
  const allowedTypes = options?.allowedTypes || [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }

  return { valid: true };
}
