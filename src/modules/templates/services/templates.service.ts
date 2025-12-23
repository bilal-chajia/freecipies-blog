/**
 * Templates Module - Database Service
 * =====================================
 * Database operations for pin templates.
 */

import { eq, and, asc } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { pinTemplates, type PinTemplate, type NewPinTemplate } from '../schema/templates.schema';
import { createDb } from '../../../shared/database/drizzle';

/**
 * Get all templates
 */
export async function getTemplates(
  db: D1Database,
  options?: { category?: string; isActive?: boolean }
): Promise<PinTemplate[]> {
  const drizzle = createDb(db);

  const conditions: any[] = [];

  if (options?.category) {
    conditions.push(eq(pinTemplates.category, options.category));
  }
  if (options?.isActive !== undefined) {
    conditions.push(eq(pinTemplates.isActive, options.isActive));
  }

  return await drizzle
    .select()
    .from(pinTemplates)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(pinTemplates.name));
}

/**
 * Get a template by slug
 */
export async function getTemplateBySlug(db: D1Database, slug: string): Promise<PinTemplate | null> {
  const drizzle = createDb(db);
  return await drizzle.query.pinTemplates.findFirst({
    where: eq(pinTemplates.slug, slug),
  }) || null;
}

/**
 * Get a template by ID
 */
export async function getTemplateById(db: D1Database, id: number): Promise<PinTemplate | null> {
  const drizzle = createDb(db);
  return await drizzle.query.pinTemplates.findFirst({
    where: eq(pinTemplates.id, id),
  }) || null;
}

/**
 * Create a new template
 */
export async function createTemplate(
  db: D1Database,
  template: NewPinTemplate
): Promise<PinTemplate | null> {
  const drizzle = createDb(db);
  const [inserted] = await drizzle.insert(pinTemplates).values(template).returning();
  return inserted || null;
}

/**
 * Update a template
 */
export async function updateTemplate(
  db: D1Database,
  id: number,
  template: Partial<NewPinTemplate>
): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.update(pinTemplates)
    .set({ ...template, updatedAt: new Date().toISOString() })
    .where(eq(pinTemplates.id, id));
  return true;
}

/**
 * Delete a template
 */
export async function deleteTemplate(db: D1Database, id: number): Promise<boolean> {
  const drizzle = createDb(db);
  await drizzle.delete(pinTemplates).where(eq(pinTemplates.id, id));
  return true;
}
