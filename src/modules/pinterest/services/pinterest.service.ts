/**
 * Pinterest Module - Database Service
 * =====================================
 * Database operations for Pinterest boards and pins.
 */

import { eq, and, desc, isNull } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import {
  pinterestBoards,
  pinterestPins,
  type PinterestBoard,
  type NewPinterestBoard,
  type PinterestPin,
  type NewPinterestPin
} from '../schema/pinterest.schema';
import { getDb, type DrizzleDb } from '../../../shared/database/drizzle';
import { AppError, ErrorCodes } from '../../../shared/utils/error-handler';

// Helpers normalize JSON-like string fields for API responses.
function mapBoardToSnakeCase(board: PinterestBoard | null): any {
  if (!board) return board;

  let cover_image_url = board.cover_image_url;
  if (typeof cover_image_url === 'string' && cover_image_url.startsWith('{')) {
    try {
      cover_image_url = JSON.parse(cover_image_url);
    } catch {
      // Keep as string if parsing fails
    }
  }

  return {
    ...board,
    cover_image_url: cover_image_url,
  };
}

function mapPinToSnakeCase(pin: PinterestPin | null): any {
  if (!pin) return pin;
  return pin;
}

// ============================================================================
// BOARDS
// ============================================================================

/**
 * Get all Pinterest boards
 */
export async function getPinterestBoards(db: D1Database | DrizzleDb): Promise<any[]> {
  const drizzle = getDb(db);
  const boards = await drizzle
    .select()
    .from(pinterestBoards)
    .where(isNull(pinterestBoards.deleted_at));

  return boards.map(mapBoardToSnakeCase);
}

/**
 * Get a board by ID or slug
 */
export async function getPinterestBoard(db: D1Database | DrizzleDb, identifier: number | string): Promise<any | null> {
  const drizzle = getDb(db);
  const condition = typeof identifier === 'string'
    ? eq(pinterestBoards.slug, identifier)
    : eq(pinterestBoards.id, identifier);

  const board = await drizzle.query.pinterestBoards.findFirst({
    where: and(condition, isNull(pinterestBoards.deleted_at)),
  }) || null;

  return mapBoardToSnakeCase(board);
}

/**
 * Create a new board
 */
export async function createPinterestBoard(
  db: D1Database | DrizzleDb,
  data: any
): Promise<any | null> {
  const drizzle = getDb(db);

  // Check if a board with the same slug already exists
  const existingBoard = await drizzle.query.pinterestBoards.findFirst({
    where: eq(pinterestBoards.slug, data.slug),
  });

  if (existingBoard) {
    if (existingBoard.deleted_at) {
      throw new AppError(
        ErrorCodes.VALIDATION_ERROR,
        `A board with slug "${data.slug}" was previously deleted. Please use a different slug or restore the existing board.`,
        400
      );
    }
    throw new AppError(
      ErrorCodes.VALIDATION_ERROR,
      `A board with slug "${data.slug}" already exists. Please use a different slug.`,
      400
    );
  }

  const coverImageUrlRaw = data.cover_image_url;
  const cover_image_url = typeof coverImageUrlRaw === 'object' && coverImageUrlRaw !== null
    ? JSON.stringify(coverImageUrlRaw)
    : coverImageUrlRaw;

  const insertData = {
    slug: data.slug as string,
    name: data.name as string,
    description: data.description,
    board_url: data.board_url,
    cover_image_url: cover_image_url as string,
    ...(data.is_active !== undefined
      ? { is_active: data.is_active }
      : {}),
  };

  const [inserted] = await drizzle.insert(pinterestBoards).values(insertData).returning();
  return mapBoardToSnakeCase(inserted || null);
}

/**
 * Update a board
 */
export async function updatePinterestBoard(
  db: D1Database | DrizzleDb,
  id: number,
  data: any
): Promise<boolean> {
  const drizzle = getDb(db);
  const updateData: Partial<NewPinterestBoard> = { updated_at: new Date().toISOString() };

  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.board_url !== undefined) updateData.board_url = data.board_url;

  if (data.cover_image_url !== undefined) {
    const raw = data.cover_image_url;
    updateData.cover_image_url = typeof raw === 'object' && raw !== null
      ? JSON.stringify(raw)
      : raw;
  }
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  await drizzle.update(pinterestBoards)
    .set(updateData)
    .where(eq(pinterestBoards.id, id));
  return true;
}

/**
 * Delete a board
 */
export async function deletePinterestBoard(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);
  // Soft delete
  await drizzle.update(pinterestBoards)
    .set({ deleted_at: new Date().toISOString(), is_active: false })
    .where(eq(pinterestBoards.id, id));
  return true;
}

// ============================================================================
// PINS
// ============================================================================

/**
 * Get pins with optional filters
 */
export async function getPinterestPins(
  db: D1Database | DrizzleDb,
  options?: { board_id?: number; article_id?: number; status?: string; limit?: number }
): Promise<any[]> {
  const drizzle = getDb(db);

  const conditions: any[] = [];

  if (options?.board_id) conditions.push(eq(pinterestPins.board_id, options.board_id));
  if (options?.article_id) conditions.push(eq(pinterestPins.article_id, options.article_id));
  if (options?.status) conditions.push(eq(pinterestPins.status, options.status));

  const query = drizzle
    .select()
    .from(pinterestPins)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(pinterestPins.created_at));

  let results;
  if (options?.limit) {
    results = await query.limit(options.limit);
  } else {
    results = await query;
  }

  return results.map(mapPinToSnakeCase);
}

/**
 * Get a pin by ID
 */
export async function getPinterestPinById(db: D1Database | DrizzleDb, id: number): Promise<any | null> {
  const drizzle = getDb(db);
  const pin = await drizzle.query.pinterestPins.findFirst({
    where: eq(pinterestPins.id, id),
  }) || null;
  return mapPinToSnakeCase(pin);
}

/**
 * Create a new pin
 */
export async function createPinterestPin(
  db: D1Database | DrizzleDb,
  data: any
): Promise<any | null> {
  const drizzle = getDb(db);
  const insertData = {
    article_id: data.article_id,
    board_id: data.board_id,
    section_name: data.section_name,
    image_url: data.image_url,
    destination_url: data.destination_url,
    title: data.title,
    description: data.description,
    tags_json: data.tags_json,
    status: data.status,
    pinterest_pin_id: data.pinterest_pin_id,
    exported_at: data.exported_at,
    export_batch_id: data.export_batch_id,
  };
  const [inserted] = await drizzle.insert(pinterestPins).values(insertData).returning();
  return mapPinToSnakeCase(inserted || null);
}

/**
 * Update a pin
 */
export async function updatePinterestPin(
  db: D1Database | DrizzleDb,
  id: number,
  data: any
): Promise<boolean> {
  const drizzle = getDb(db);
  const updateData: Partial<NewPinterestPin> = { updated_at: new Date().toISOString() };

  if (data.article_id !== undefined) updateData.article_id = data.article_id;
  if (data.board_id !== undefined) updateData.board_id = data.board_id;
  if (data.section_name !== undefined) updateData.section_name = data.section_name;
  if (data.image_url !== undefined) updateData.image_url = data.image_url;
  if (data.destination_url !== undefined) updateData.destination_url = data.destination_url;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.tags_json !== undefined) updateData.tags_json = data.tags_json;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.pinterest_pin_id !== undefined) updateData.pinterest_pin_id = data.pinterest_pin_id;
  if (data.exported_at !== undefined) updateData.exported_at = data.exported_at;
  if (data.export_batch_id !== undefined) updateData.export_batch_id = data.export_batch_id;

  await drizzle.update(pinterestPins)
    .set(updateData)
    .where(eq(pinterestPins.id, id));
  return true;
}

/**
 * Delete a pin
 */
export async function deletePinterestPin(db: D1Database | DrizzleDb, id: number): Promise<boolean> {
  const drizzle = getDb(db);
  await drizzle.delete(pinterestPins).where(eq(pinterestPins.id, id));
  return true;
}
