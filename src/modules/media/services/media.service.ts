/**
 * Media Module - Database Service
 * =================================
 * Database operations for the media table.
 */

import { eq, and, or, like, desc, asc, isNull, gte, lte, count } from 'drizzle-orm';
import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { media, type Media, type NewMedia } from '../schema/media.schema';
import type { MediaQueryOptions } from '../types/media.types';
import { extractR2KeysFromMediaVariantsJson } from '../../../shared/images/image-contract';
import { MediaVariantsJsonSchema } from '../../../shared/validation/schemas/media';

// Import shared drizzle client
import { getDb, type DrizzleDb } from '../../../shared/database/drizzle';

/**
 * Build conditions for media queries
 */
function buildMediaConditions(options?: MediaQueryOptions) {
  const conditions = [isNull(media.deleted_at)];

  // Type filter (image, video, document)
  if (options?.type && options.type !== 'all') {
    const mimePatterns: Record<string, string> = {
      image: 'image/%',
      video: 'video/%',
      document: 'application/%',
    };
    const pattern = mimePatterns[options.type];
    if (pattern) {
      conditions.push(like(media.mime_type, pattern));
    }
  }

  // Search filter
  if (options?.search) {
    const searchPattern = `%${options.search}%`;
    conditions.push(
      or(
        like(media.name, searchPattern),
        like(media.alt_text, searchPattern)
      )!
    );
  }

  // Convert full JS ISO strings to SQLite format: "YYYY-MM-DD HH:MM:SS"
  const formatSqliteDate = (isoString: string) => {
    if (!isoString.includes('T')) {
      return isoString + ' 00:00:00';
    }
    return isoString.replace('T', ' ').substring(0, 19);
  };

  // Date range filters
  if (options?.dateFrom) {
    conditions.push(gte(media.created_at, formatSqliteDate(options.dateFrom)));
  }
  if (options?.dateTo) {
    const toDateStr = options.dateTo.includes('T') ? options.dateTo : `${options.dateTo}T23:59:59.999Z`;
    conditions.push(lte(media.created_at, formatSqliteDate(toDateStr)));
  }

  return conditions;
}

/**
 * Get all media files with filtering options
 */
export async function getMedia(
  db: D1Database | DrizzleDb,
  options?: MediaQueryOptions
): Promise<Media[]> {
  const drizzle = getDb(db);
  const conditions = buildMediaConditions(options);

  // Sort logic
  const sortColumn = options?.sortBy === 'name' ? media.name : media.created_at;
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
 * Count total media files matching filters
 */
export async function countMedia(
  db: D1Database | DrizzleDb,
  options?: MediaQueryOptions
): Promise<number> {
  const drizzle = getDb(db);
  const conditions = buildMediaConditions(options);

  const [result] = await drizzle
    .select({ total: count() })
    .from(media)
    .where(and(...conditions));

  return result?.total || 0;
}

/**
 * Get a single media file by ID
 */
export async function getMediaById(db: D1Database | DrizzleDb, id: number): Promise<Media | null> {
  const drizzle = getDb(db);
  return await drizzle.query.media.findFirst({
    where: and(eq(media.id, id), isNull(media.deleted_at)),
  }) || null;
}

/**
 * Create a new media record.
 * Validates `variantsJson` against the storage contract (all 5 variants + placeholder required).
 * @throws Error if variantsJson is missing, not valid JSON, or violates the storage schema.
 */
export async function createMedia(
  db: D1Database | DrizzleDb,
  data: NewMedia
): Promise<Media | null> {
  const drizzle = getDb(db);

  // F1: Enforce storage contract at the service boundary before every insert.
  // This catches malformed variantsJson from any caller (confirm.ts, seed scripts, etc.)
  if (!data.variants_json) {
    throw new Error('createMedia: variantsJson is required');
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(data.variants_json);
  } catch {
    throw new Error('createMedia: variantsJson is not valid JSON');
  }
  const result = MediaVariantsJsonSchema.safeParse(parsedJson);
  if (!result.success) {
    throw new Error(
      `createMedia: variantsJson violates storage contract — ${result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`
    );
  }

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

  const updateData: Partial<NewMedia> = { ...data, updated_at: new Date().toISOString() };

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
    .set({ deleted_at: new Date().toISOString() })
    .where(eq(media.id, id));
  return true;
}

/**
 * Hard delete a media record and its R2 objects (use with caution).
 * Deletes all R2 variant objects first, then removes the DB record.
 */
export async function hardDeleteMedia(
  db: D1Database | DrizzleDb,
  images: R2Bucket,
  id: number
): Promise<boolean> {
  const drizzle = getDb(db);

  // Fetch the record to get its variantsJson before deleting
  const [record] = await drizzle.select().from(media).where(eq(media.id, id)).limit(1);
  if (!record) return false;

  // Clean up R2 objects in parallel (best-effort — DB delete proceeds regardless)
  const r2Keys = extractR2KeysFromMediaVariantsJson(record.variants_json);
  if (r2Keys.length > 0) {
    await Promise.all(r2Keys.map(key => images.delete(key)));
  }

  // Remove DB record
  await drizzle.delete(media).where(eq(media.id, id));
  return true;
}
