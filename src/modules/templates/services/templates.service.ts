/**
 * Template Module - CRUD Service
 * ===============================
 * Database operations for templates using Drizzle ORM.
 */

import { eq } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { createDb } from '../../../shared/database/drizzle';
import { pinTemplates, type PinTemplate, type NewPinTemplate } from '../schema/templates.schema';
import type { TemplateElement, UpdateTemplateInput } from '../types';

/**
 * Helper to map Drizzle camelCase properties to snake_case 
 * for frontend backward compatibility
 */
function mapToSnakeCase(t: PinTemplate | undefined): any {
  if (!t) return t;
  return {
    ...t,
    elements_json: t.elementsJson,
    thumbnail_url: t.thumbnailUrl,
    is_active: t.isActive,
    background_color: t.backgroundColor,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

/**
 * Get all templates
 */
export async function getTemplates(
  db: D1Database,
  options: { activeOnly?: boolean } = {}
): Promise<any[]> {
  const drizzle = createDb(db);
  const { activeOnly = true } = options;
  
  let results;
  if (activeOnly) {
    results = await drizzle.select().from(pinTemplates).where(eq(pinTemplates.isActive, true)).all();
  } else {
    results = await drizzle.select().from(pinTemplates).all();
  }
  
  return results.map(mapToSnakeCase);
}

/**
 * Get template by slug
 */
export async function getTemplateBySlug(
  db: D1Database,
  slug: string
): Promise<any | undefined> {
  const drizzle = createDb(db);
  const result = await drizzle.select().from(pinTemplates).where(eq(pinTemplates.slug, slug)).get();
  return mapToSnakeCase(result);
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  db: D1Database,
  id: number
): Promise<any | undefined> {
  const drizzle = createDb(db);
  const result = await drizzle.select().from(pinTemplates).where(eq(pinTemplates.id, id)).get();
  return mapToSnakeCase(result);
}

/**
 * Create new template
 */
export async function createTemplate(
  db: D1Database,
  data: any
): Promise<any> {
  const drizzle = createDb(db);
  
  // Support both camelCase and snake_case inputs from frontend
  const rawElements = data.elementsJson ?? data.elements_json;
  const elementsStr = typeof rawElements === 'string'
    ? rawElements
    : JSON.stringify(rawElements || []);

  const result = await drizzle.insert(pinTemplates).values({
    slug: data.slug,
    name: data.name,
    description: data.description,
    category: data.category ?? 'general',
    width: data.width || data.canvas_width || 1000,
    height: data.height || data.canvas_height || 1500,
    elementsJson: elementsStr,
    thumbnailUrl: data.thumbnailUrl ?? data.thumbnail_url ?? null,
    backgroundColor: data.backgroundColor ?? data.background_color ?? '#ffffff',
    isActive: data.isActive ?? data.is_active ?? true,
  }).returning().get();

  return mapToSnakeCase(result);
}

/**
 * Update template by slug
 */
export async function updateTemplate(
  db: D1Database,
  slug: string,
  data: any
): Promise<any | undefined> {
  const drizzle = createDb(db);
  const updates: Partial<NewPinTemplate> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.category !== undefined) updates.category = data.category;
  
  const w = data.width ?? data.canvas_width;
  if (w !== undefined) updates.width = w;
  
  const h = data.height ?? data.canvas_height;
  if (h !== undefined) updates.height = h;
  
  const thumb = data.thumbnailUrl ?? data.thumbnail_url;
  if (thumb !== undefined) updates.thumbnailUrl = thumb;
  
  const active = data.isActive ?? data.is_active;
  if (active !== undefined) updates.isActive = active;
  
  const bg = data.backgroundColor ?? data.background_color;
  if (bg !== undefined) updates.backgroundColor = bg;
  
  if (data.slug !== undefined) updates.slug = data.slug;
  
  const rootElements = data.elementsJson ?? data.elements_json;
  if (rootElements !== undefined) {
    updates.elementsJson = typeof rootElements === 'string'
      ? rootElements
      : JSON.stringify(rootElements);
  }

  if (Object.keys(updates).length === 0) {
    return getTemplateBySlug(db, slug);
  }

  const result = await drizzle.update(pinTemplates)
    .set(updates)
    .where(eq(pinTemplates.slug, slug))
    .returning()
    .get();
    
  return mapToSnakeCase(result);
}

/**
 * Delete template by slug
 */
export async function deleteTemplate(
  db: D1Database,
  slug: string
): Promise<boolean> {
  const drizzle = createDb(db);
  const result = await drizzle.delete(pinTemplates)
    .where(eq(pinTemplates.slug, slug))
    .returning()
    .get();
  
  return result !== undefined;
}

/**
 * Check if slug exists
 */
export async function slugExists(
  db: D1Database,
  slug: string
): Promise<boolean> {
  const drizzle = createDb(db);
  const template = await drizzle.select({ id: pinTemplates.id })
    .from(pinTemplates)
    .where(eq(pinTemplates.slug, slug))
    .get();
  return template !== undefined;
}
