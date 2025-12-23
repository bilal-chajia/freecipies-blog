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

// ============================================================================
// BOARDS
// ============================================================================

/**
 * Get all Pinterest boards
 */
export async function getPinterestBoards(db: D1Database): Promise<PinterestBoard[]> {
  const drizzle = createDb(db);
  return await drizzle
    .select()
    .from(pinterestBoards)
    .where(isNull(pinterestBoards.deletedAt));
}

/**
 * Get a board by ID
 */
export async function getPinterestBoardById(db: D1Database, id: number): Promise<PinterestBoard | null> {
  const drizzle = createDb(db);
  return await drizzle.query.pinterestBoards.findFirst({
    where: and(eq(pinterestBoards.id, id), isNull(pinterestBoards.deletedAt)),
  }) || null;
}

/**
 * Create a new board
 */
export async function createPinterestBoard(
  db: D1Database,
  board: NewPinterestBoard
): Promise<PinterestBoard | null> {
  const drizzle = createDb(db);
  const [inserted] = await drizzle.insert(pinterestBoards).values(board).returning();
  return inserted || null;
}

/**
 * Update a board
 */
export async function updatePinterestBoard(
  db: D1Database,
  id: number,
  board: Partial<NewPinterestBoard>
): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(pinterestBoards)
    .set({ ...board, updatedAt: new Date().toISOString() })
    .where(eq(pinterestBoards.id, id));
  return true;
}

/**
 * Delete a board
 */
export async function deletePinterestBoard(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(pinterestBoards)
    .set({ deletedAt: new Date().toISOString() })
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
): Promise<PinterestPin[]> {
  const drizzle = createDb(db);

  const conditions: any[] = [];

  if (options?.boardId) {
    conditions.push(eq(pinterestPins.boardId, options.boardId));
  }
  if (options?.articleId) {
    conditions.push(eq(pinterestPins.articleId, options.articleId));
  }
  if (options?.status) {
    conditions.push(eq(pinterestPins.status, options.status));
  }

  const query = drizzle
    .select()
    .from(pinterestPins)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(pinterestPins.createdAt));

  if (options?.limit) {
    return await query.limit(options.limit);
  }

  return await query;
}

/**
 * Create a new pin
 */
export async function createPinterestPin(
  db: D1Database,
  pin: NewPinterestPin
): Promise<PinterestPin | null> {
  const drizzle = createDb(db);
  const [inserted] = await drizzle.insert(pinterestPins).values(pin).returning();
  return inserted || null;
}

/**
 * Update a pin
 */
export async function updatePinterestPin(
  db: D1Database,
  id: number,
  pin: Partial<NewPinterestPin>
): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(pinterestPins)
    .set({ ...pin, updatedAt: new Date().toISOString() })
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
