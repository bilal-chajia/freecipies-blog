/**
 * Template Module - CRUD Service
 * ===============================
 * Database operations for templates using Drizzle ORM.
 */

import { eq } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { getDb, type DrizzleDb } from '../../../shared/database/drizzle';
import { pinTemplates, type PinTemplate, type NewPinTemplate } from '../schema/templates.schema';
import { stringifyStoredTemplateElements } from '../utils/elementSerialization';
import type { TemplateElement } from '../types/elements.types';

export interface TemplateApiPayload {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  background_color: string;
  width: number;
  height: number;
  thumbnail_url: string | null;
  elements_json: string;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateTemplatePayload {
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null;
  background_color?: string;
  width?: number;
  height?: number;
  elements_json?: string | Record<string, unknown>[];
  thumbnail_url?: string | null;
  is_active?: boolean;
}

export type UpdateTemplatePayload = Partial<CreateTemplatePayload>;

/**
 * Helper to serialize Drizzle row properties to contract snake_case.
 */
function mapToSnakeCase(t: PinTemplate | undefined): TemplateApiPayload | undefined {
  if (!t) return t;
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    category: t.category,
    elements_json: t.elements_json,
    thumbnail_url: t.thumbnail_url,
    is_active: Boolean(t.is_active),
    background_color: t.background_color ?? '#ffffff',
    width: t.width ?? 1000,
    height: t.height ?? 1500,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

function normalizeElementsJson(elements_json: CreateTemplatePayload['elements_json']): string {
  if (typeof elements_json === 'string') {
    const parsed = JSON.parse(elements_json);
    if (!Array.isArray(parsed)) {
      throw new Error('elements_json must be an array');
    }
    return stringifyStoredTemplateElements(parsed as TemplateElement[]);
  }

  if (Array.isArray(elements_json)) {
    return stringifyStoredTemplateElements(elements_json as unknown as TemplateElement[]);
  }

  return '[]';
}

/**
 * Get all templates
 */
export async function getTemplates(
  db: D1Database | DrizzleDb,
  options: { activeOnly?: boolean } = {}
): Promise<TemplateApiPayload[]> {
  const drizzle = getDb(db);
  const { activeOnly = true } = options;

  let results;
  if (activeOnly) {
    results = await drizzle.select().from(pinTemplates).where(eq(pinTemplates.is_active, true)).all();
  } else {
    results = await drizzle.select().from(pinTemplates).all();
  }

  return results.map((result) => mapToSnakeCase(result)).filter((result): result is TemplateApiPayload => Boolean(result));
}

/**
 * Get template by slug
 */
export async function getTemplateBySlug(
  db: D1Database | DrizzleDb,
  slug: string
): Promise<TemplateApiPayload | undefined> {
  const drizzle = getDb(db);
  const result = await drizzle.select().from(pinTemplates).where(eq(pinTemplates.slug, slug)).get();
  return mapToSnakeCase(result);
}

/**
 * Get template by ID
 */
export async function getTemplateById(
  db: D1Database | DrizzleDb,
  id: number
): Promise<TemplateApiPayload | undefined> {
  const drizzle = getDb(db);
  const result = await drizzle.select().from(pinTemplates).where(eq(pinTemplates.id, id)).get();
  return mapToSnakeCase(result);
}

/**
 * Create new template
 */
export async function createTemplate(
  db: D1Database | DrizzleDb,
  data: CreateTemplatePayload
): Promise<TemplateApiPayload> {
  const drizzle = getDb(db);

  const elementsStr = normalizeElementsJson(data.elements_json);

  const result = await drizzle.insert(pinTemplates).values({
    slug: data.slug,
    name: data.name,
    description: data.description,
    category: data.category ?? 'general',
    width: data.width ?? 1000,
    height: data.height ?? 1500,
    elements_json: elementsStr,
    thumbnail_url: data.thumbnail_url ?? null,
    background_color: data.background_color ?? '#ffffff',
    is_active: data.is_active ?? true,
  }).returning().get();

  return mapToSnakeCase(result) as TemplateApiPayload;
}

/**
 * Update template by slug
 */
export async function updateTemplate(
  db: D1Database | DrizzleDb,
  slug: string,
  data: UpdateTemplatePayload
): Promise<TemplateApiPayload | undefined> {
  const drizzle = getDb(db);
  const updates: Partial<NewPinTemplate> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.category !== undefined) updates.category = data.category;

  if (data.width !== undefined) updates.width = data.width;

  if (data.height !== undefined) updates.height = data.height;

  if (data.thumbnail_url !== undefined) updates.thumbnail_url = data.thumbnail_url;

  if (data.is_active !== undefined) updates.is_active = data.is_active;

  if (data.background_color !== undefined) updates.background_color = data.background_color;

  if (data.slug !== undefined) updates.slug = data.slug;

  if (data.elements_json !== undefined) {
    updates.elements_json = normalizeElementsJson(data.elements_json);
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
  db: D1Database | DrizzleDb,
  slug: string
): Promise<boolean> {
  const drizzle = getDb(db);
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
  db: D1Database | DrizzleDb,
  slug: string
): Promise<boolean> {
  const drizzle = getDb(db);
  const template = await drizzle.select({ id: pinTemplates.id })
    .from(pinTemplates)
    .where(eq(pinTemplates.slug, slug))
    .get();
  return template !== undefined;
}
