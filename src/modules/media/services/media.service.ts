/**
 * Media Module - Database Service
 * =================================
 * Database operations for the media table.
 */

import { eq, and, or, like, desc, asc, isNull, gte, lte } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { media, type Media, type NewMedia } from '../schema/media.schema';
import type { MediaQueryOptions, MediaRecord } from '../types/media.types';

// Import shared drizzle client
import { createDb, getDb, type DrizzleDb } from '../../../shared/database/drizzle';

/**
 * Get all media files with filtering options
 */
export async function getMedia(
  db: D1Database | DrizzleDb,
  options?: MediaQueryOptions
): Promise<Media[]> {
  const drizzle = getDb(db);

  const conditions = [isNull(media.deletedAt)];

  // Type filter (image, video, document)
  if (options?.type) {
    const mimePatterns: Record<string, string> = {
      image: 'image/%',
      video: 'video/%',
      document: 'application/%',
    };
    const pattern = mimePatterns[options.type];
    if (pattern) {
      conditions.push(like(media.mimeType, pattern));
    }
  }

  // Search filter
  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(media.name, searchPattern),
        like(media.altText, searchPattern)
      )!
    );
  }

  // Convert full JS ISO strings to SQLite format: "YYYY-MM-DD HH:MM:SS"
  const formatSqliteDate = (isoString: string) => {
    // If it's just a YYYY-MM-DD date or missing 'T', format it safely
    if (!isoString.includes('T')) {
      return isoString + ' 00:00:00';
    }
    return isoString.replace('T', ' ').substring(0, 19);
  };

  // Date range filters
  if (options?.dateFrom) {
    conditions.push(gte(media.createdAt, formatSqliteDate(options.dateFrom)));
  }
  if (options?.dateTo) {
    const toDateStr = options.dateTo.includes('T') ? options.dateTo : `${options.dateTo}T23:59:59.999Z`;
    conditions.push(lte(media.createdAt, formatSqliteDate(toDateStr)));
  }

  // Sort logic
  const sortColumn = options?.sortBy === 'name' ? media.name : media.createdAt;
  const orderFn = options?.order === 'asc' ? asc : desc;

  const query = drizzle
    .select()
    .from(media)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn));

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
export async function getMediaById(db: D1Database | DrizzleDb, id: number): Promise<Media | null> {
  const drizzle = getDb(db);
  return await drizzle.query.media.findFirst({
    where: and(eq(media.id, id), isNull(media.deletedAt)),
  }) || null;
}

/**
 * Create a new media record
 */
export async function createMedia(
  db: D1Database | DrizzleDb,
  data: NewMedia
): Promise<Media | null> {
  const drizzle = getDb(db);

  const [inserted] = await drizzle.insert(media).values(data).returning();
  return inserted || null;
}

/**
 * Update a media record
 */
export async function updateMedia(
  db: D1Database | DrizzleDb,
  id: number,
  data: Partial<NewMedia>
): Promise<boolean> {
  const drizzle = getDb(db);

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
export async function deleteMedia(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);
  await drizzle.update(media)
    .set({ deletedAt: new Date().toISOString() })
    .where(eq(media.id, id));
  return true;
}

/**
 * Hard delete a media record (use with caution)
 */
export async function hardDeleteMedia(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);
  await drizzle.delete(media).where(eq(media.id, id));
  return true;
}
