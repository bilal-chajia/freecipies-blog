/**
 * Media Module - Database Service
 * =================================
 * Database operations for the media table.
 */

import { eq, and, or, like, desc, asc, isNull } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { media, type Media, type NewMedia } from '../schema/media.schema';
import type { MediaQueryOptions, MediaRecord } from '../types/media.types';

// Import shared drizzle client
import { createDb } from '../../../shared/database/drizzle';

/**
 * Get all media files with filtering options
 */
export async function getMedia(
  db: D1Database,
  options?: MediaQueryOptions
): Promise<Media[]> {
  const drizzle = createDb(db);

  const conditions = [isNull(media.deletedAt)];

  if (options?.folder) {
    conditions.push(eq(media.folder, options.folder));
  }

  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(media.name, searchPattern),
        like(media.altText, searchPattern)
      )!
    );
  }

  const query = drizzle
    .select()
    .from(media)
    .where(and(...conditions))
    .orderBy(
      options?.order === 'asc' ? asc(media.createdAt) : desc(media.createdAt)
    );

  if (options?.limit) {
    if (options?.offset) {
      return await query.limit(options.limit).offset(options.offset);
    }
    return await query.limit(options.limit);
  }

  return await query;
}

/**
 * Get a single media file by ID
 */
export async function getMediaById(db: D1Database, id: number): Promise<Media | null> {
  const drizzle = createDb(db);
  return await drizzle.query.media.findFirst({
    where: and(eq(media.id, id), isNull(media.deletedAt)),
  }) || null;
}

/**
 * Create a new media record
 */
export async function createMedia(
  db: D1Database,
  data: NewMedia
): Promise<Media | null> {
  const drizzle = createDb(db);
  
  const [inserted] = await drizzle.insert(media).values(data).returning();
  return inserted || null;
}

/**
 * Update a media record
 */
export async function updateMedia(
  db: D1Database, 
  id: number, 
  data: Partial<NewMedia>
): Promise<boolean> {
  const drizzle = createDb(db);
  
  const updateData: any = { ...data };
  updateData.updatedAt = new Date().toISOString();
  
  await drizzle.update(media)
    .set(updateData)
    .where(eq(media.id, id));
  
  return true;
}

/**
 * Soft delete a media record
 */
export async function deleteMedia(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(media)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(media.id, id));
  return true;
}

/**
 * Hard delete a media record (use with caution)
 */
export async function hardDeleteMedia(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.delete(media).where(eq(media.id, id));
  return true;
}
