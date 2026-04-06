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
import { createDb } from '../../../shared/database/drizzle';
import { AppError, ErrorCodes } from '../../../shared/utils/error-handler';

// Helpers mapping Drizzle to old snake_case format for the frontend
function mapBoardToSnakeCase(board: PinterestBoard | null): any {
  if (!board) return board;
  
  let coverImageUrl = board.coverImageUrl;
  if (typeof coverImageUrl === 'string' && coverImageUrl.startsWith('{')) {
    try {
      coverImageUrl = JSON.parse(coverImageUrl);
    } catch {
      // Keep as string if parsing fails
    }
  }

  return {
    ...board,
    board_url: board.boardUrl,
    cover_image_url: coverImageUrl,
    is_active: board.isActive,
    created_at: board.createdAt,
    updated_at: board.updatedAt,
    deleted_at: board.deletedAt,
  };
}

function mapPinToSnakeCase(pin: PinterestPin | null): any {
  if (!pin) return pin;
  return {
    ...pin,
    article_id: pin.articleId,
    board_id: pin.boardId,
    section_name: pin.sectionName,
    image_url: pin.imageUrl,
    destination_url: pin.destinationUrl,
    tags_json: pin.tagsJson,
    pinterest_pin_id: pin.pinterestPinId,
    exported_at: pin.exportedAt,
    export_batch_id: pin.exportBatchId,
    created_at: pin.createdAt,
    updated_at: pin.updatedAt,
  };
}

// ============================================================================
// BOARDS
// ============================================================================

/**
 * Get all Pinterest boards
 */
export async function getPinterestBoards(db: D1Database): Promise<any[]> {
  const drizzle = createDb(db);
  const boards = await drizzle
    .select()
    .from(pinterestBoards)
    .where(isNull(pinterestBoards.deletedAt));

  return boards.map(mapBoardToSnakeCase);
}

/**
 * Get a board by ID or slug
 */
export async function getPinterestBoard(db: D1Database, identifier: number | string): Promise<any | null> {
  const drizzle = createDb(db);
  const condition = typeof identifier === 'string'
    ? eq(pinterestBoards.slug, identifier)
    : eq(pinterestBoards.id, identifier);

  const board = await drizzle.query.pinterestBoards.findFirst({
    where: and(condition, isNull(pinterestBoards.deletedAt)),
  }) || null;

  return mapBoardToSnakeCase(board);
}

/**
 * Create a new board
 */
export async function createPinterestBoard(
  db: D1Database,
  data: any
): Promise<any | null> {
  const drizzle = createDb(db);

  // Check if a board with the same slug already exists
  const existingBoard = await drizzle.query.pinterestBoards.findFirst({
    where: eq(pinterestBoards.slug, data.slug),
  });

  if (existingBoard) {
    if (existingBoard.deletedAt) {
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

  const coverImageUrlRaw = data.coverImageUrl ?? data.cover_image_url;
  const coverImageUrl = typeof coverImageUrlRaw === 'object' && coverImageUrlRaw !== null 
    ? JSON.stringify(coverImageUrlRaw) 
    : coverImageUrlRaw;

  const insertData = {
    slug: data.slug as string,
    name: data.name as string,
    description: data.description,
    boardUrl: data.boardUrl ?? data.board_url,
    coverImageUrl: coverImageUrl as string,
    // Include isActive if either isActive or is_active is provided in the data
    ...(data.isActive !== undefined || data.is_active !== undefined
      ? { isActive: data.isActive ?? data.is_active }
      : {}),
  };

  const [inserted] = await drizzle.insert(pinterestBoards).values(insertData).returning();
  return mapBoardToSnakeCase(inserted || null);
}

/**
 * Update a board
 */
export async function updatePinterestBoard(
  db: D1Database,
  id: number,
  data: any
): Promise<boolean> {
  const drizzle = createDb(db);
  const updateData: Partial<NewPinterestBoard> = { updatedAt: new Date().toISOString() };

  if (data.slug !== undefined) updateData.slug = data.slug;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.boardUrl !== undefined || data.board_url !== undefined) updateData.boardUrl = data.boardUrl ?? data.board_url;
  
  if (data.coverImageUrl !== undefined || data.cover_image_url !== undefined) {
    const raw = data.coverImageUrl ?? data.cover_image_url;
    updateData.coverImageUrl = typeof raw === 'object' && raw !== null 
      ? JSON.stringify(raw) 
      : raw;
  }
  if (data.isActive !== undefined || data.is_active !== undefined) updateData.isActive = data.isActive ?? data.is_active;

  await drizzle.update(pinterestBoards)
    .set(updateData)
    .where(eq(pinterestBoards.id, id));
  return true;
}

/**
 * Delete a board
 */
export async function deletePinterestBoard(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);
  // Soft delete
  await drizzle.update(pinterestBoards)
    .set({ deletedAt: new Date().toISOString(), isActive: false })
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
  db: D1Database,
  options?: { boardId?: number; articleId?: number; status?: string; limit?: number }
): Promise<any[]> {
  const drizzle = createDb(db);

  const conditions: any[] = [];

  if (options?.boardId) conditions.push(eq(pinterestPins.boardId, options.boardId));
  if (options?.articleId) conditions.push(eq(pinterestPins.articleId, options.articleId));
  if (options?.status) conditions.push(eq(pinterestPins.status, options.status));

  const query = drizzle
    .select()
    .from(pinterestPins)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(pinterestPins.createdAt));

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
export async function getPinterestPinById(db: D1Database, id: number): Promise<any | null> {
  const drizzle = createDb(db);
  const pin = await drizzle.query.pinterestPins.findFirst({
    where: eq(pinterestPins.id, id),
  }) || null;
  return mapPinToSnakeCase(pin);
}

/**
 * Create a new pin
 */
export async function createPinterestPin(
  db: D1Database,
  data: any
): Promise<any | null> {
  const drizzle = createDb(db);
  const insertData = {
    articleId: data.articleId ?? data.article_id,
    boardId: data.boardId ?? data.board_id,
    sectionName: data.sectionName ?? data.section_name,
    imageUrl: data.imageUrl ?? data.image_url,
    destinationUrl: data.destinationUrl ?? data.destination_url,
    title: data.title,
    description: data.description,
    tagsJson: data.tagsJson ?? data.tags_json,
    status: data.status,
    pinterestPinId: data.pinterestPinId ?? data.pinterest_pin_id,
    exportedAt: data.exportedAt ?? data.exported_at,
    exportBatchId: data.exportBatchId ?? data.export_batch_id,
  };
  const [inserted] = await drizzle.insert(pinterestPins).values(insertData).returning();
  return mapPinToSnakeCase(inserted || null);
}

/**
 * Update a pin
 */
export async function updatePinterestPin(
  db: D1Database,
  id: number,
  data: any
): Promise<boolean> {
  const drizzle = createDb(db);
  const updateData: Partial<NewPinterestPin> = { updatedAt: new Date().toISOString() };

  if (data.articleId !== undefined || data.article_id !== undefined) updateData.articleId = data.articleId ?? data.article_id;
  if (data.boardId !== undefined || data.board_id !== undefined) updateData.boardId = data.boardId ?? data.board_id;
  if (data.sectionName !== undefined || data.section_name !== undefined) updateData.sectionName = data.sectionName ?? data.section_name;
  if (data.imageUrl !== undefined || data.image_url !== undefined) updateData.imageUrl = data.imageUrl ?? data.image_url;
  if (data.destinationUrl !== undefined || data.destination_url !== undefined) updateData.destinationUrl = data.destinationUrl ?? data.destination_url;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.tagsJson !== undefined || data.tags_json !== undefined) updateData.tagsJson = data.tagsJson ?? data.tags_json;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.pinterestPinId !== undefined || data.pinterest_pin_id !== undefined) updateData.pinterestPinId = data.pinterestPinId ?? data.pinterest_pin_id;
  if (data.exportedAt !== undefined || data.exported_at !== undefined) updateData.exportedAt = data.exportedAt ?? data.exported_at;
  if (data.exportBatchId !== undefined || data.export_batch_id !== undefined) updateData.exportBatchId = data.exportBatchId ?? data.export_batch_id;

  await drizzle.update(pinterestPins)
    .set(updateData)
    .where(eq(pinterestPins.id, id));
  return true;
}

/**
 * Delete a pin
 */
export async function deletePinterestPin(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.delete(pinterestPins).where(eq(pinterestPins.id, id));
  return true;
}
