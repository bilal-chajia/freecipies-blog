/**
 * Template Module - CRUD Service
 * ===============================
 * Database operations for templates using Drizzle ORM.
 */

import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import { pinTemplates, type PinTemplate, type NewPinTemplate } from '../schema/templates.schema';
import type { TemplateElement, UpdateTemplateInput } from '../types';

/**
 * Get all templates
 */
export async function getTemplates(
  db: DrizzleD1Database,
  options: { activeOnly?: boolean } = {}
): Promise<PinTemplate[]> {
  const { activeOnly = true } = options;
  
  if (activeOnly) {
    return db.select().from(pinTemplates).where(eq(pinTemplates.isActive, true)).all();
  }
  return db.select().from(pinTemplates).all();
}

/**
 * Get template by slug
 */
export async function getTemplateBySlug(
  db: DrizzleD1Database,
  slug: string
): Promise<PinTemplate | undefined> {
  return db.select().from(pinTemplates).where(eq(pinTemplates.slug, slug)).get();
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  db: DrizzleD1Database,
  id: number
): Promise<PinTemplate | undefined> {
  return db.select().from(pinTemplates).where(eq(pinTemplates.id, id)).get();
}

/**
 * Create new template
 */
export async function createTemplate(
  db: DrizzleD1Database,
  data: {
    slug: string;
    name: string;
    description?: string;
    category?: string;
    width?: number;
    height?: number;
    elementsJson?: string | TemplateElement[];
    thumbnailUrl?: string;
    isActive?: boolean;
  }
): Promise<PinTemplate> {
  const elementsStr = typeof data.elementsJson === 'string'
    ? data.elementsJson
    : JSON.stringify(data.elementsJson || []);

  const result = await db.insert(pinTemplates).values({
    slug: data.slug,
    name: data.name,
    description: data.description,
    category: data.category ?? 'general',
    width: data.width ?? 1000,
    height: data.height ?? 1500,
    elementsJson: elementsStr,
    thumbnailUrl: data.thumbnailUrl,
    isActive: data.isActive ?? true,
  }).returning().get();

  return result;
}

/**
 * Update template by slug
 */
export async function updateTemplate(
  db: DrizzleD1Database,
  slug: string,
  data: UpdateTemplateInput
): Promise<PinTemplate | undefined> {
  const updates: Partial<NewPinTemplate> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.category !== undefined) updates.category = data.category;
  if (data.width !== undefined) updates.width = data.width;
  if (data.height !== undefined) updates.height = data.height;
  if (data.thumbnail_url !== undefined) updates.thumbnailUrl = data.thumbnail_url;
  if (data.is_active !== undefined) updates.isActive = data.is_active;
  if (data.slug !== undefined) updates.slug = data.slug;
  
  if (data.elements_json !== undefined) {
    updates.elementsJson = typeof data.elements_json === 'string'
      ? data.elements_json
      : JSON.stringify(data.elements_json);
  }

  if (Object.keys(updates).length === 0) {
    return getTemplateBySlug(db, slug);
  }

  return db.update(pinTemplates)
    .set(updates)
    .where(eq(pinTemplates.slug, slug))
    .returning()
    .get();
}

/**
 * Delete template by slug
 */
export async function deleteTemplate(
  db: DrizzleD1Database,
  slug: string
): Promise<boolean> {
  const result = await db.delete(pinTemplates)
    .where(eq(pinTemplates.slug, slug))
    .returning()
    .get();
  
  return result !== undefined;
}

/**
 * Check if slug exists
 */
export async function slugExists(
  db: DrizzleD1Database,
  slug: string
): Promise<boolean> {
  const template = await db.select({ id: pinTemplates.id })
    .from(pinTemplates)
    .where(eq(pinTemplates.slug, slug))
    .get();
  return template !== undefined;
}
