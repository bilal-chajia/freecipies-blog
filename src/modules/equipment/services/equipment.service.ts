/**
 * Equipment Module - Database Service
 * =====================================
 * Database operations for equipment.
 */

import { eq, and, asc, isNull, like, or } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { equipment, type Equipment, type NewEquipment } from '../schema/equipment.schema';
import { articles } from '../../articles/schema/articles.schema';
import { createDb } from '../../../shared/database/drizzle';

/**
 * Get all equipment
 */
export async function getEquipment(
    db: D1Database,
    options?: { limit?: number; category?: string; activeOnly?: boolean }
): Promise<Equipment[]> {
    const drizzle = createDb(db);

    const conditions = [isNull(equipment.deletedAt)];

    if (options?.activeOnly) {
        conditions.push(eq(equipment.isActive, true));
    }

    if (options?.category) {
        conditions.push(eq(equipment.category, options.category));
    }

    const query = drizzle
        .select()
        .from(equipment)
        .where(and(...conditions))
        .orderBy(asc(equipment.sortOrder), asc(equipment.name));

    if (options?.limit) {
        return await query.limit(options.limit);
    }

    return await query;
}

/**
 * Get a single equipment by slug
 */
export async function getEquipmentBySlug(db: D1Database, slug: string): Promise<Equipment | null> {
    const drizzle = createDb(db);
    const [found] = await drizzle
        .select()
        .from(equipment)
        .where(and(eq(equipment.slug, slug), isNull(equipment.deletedAt)))
        .limit(1);
    return found || null;
}

/**
 * Get a single equipment by ID
 */
export async function getEquipmentById(db: D1Database, id: number): Promise<Equipment | null> {
    const drizzle = createDb(db);
    const [found] = await drizzle
        .select()
        .from(equipment)
        .where(and(eq(equipment.id, id), isNull(equipment.deletedAt)))
        .limit(1);
    return found || null;
}

/**
 * Create a new equipment
 */
export async function createEquipment(
    db: D1Database,
    item: NewEquipment
): Promise<Equipment | null> {
    const drizzle = createDb(db);
    const [inserted] = await drizzle.insert(equipment).values(item).returning();
    return inserted || null;
}

/**
 * Update an equipment
 */
export async function updateEquipment(
    db: D1Database,
    slug: string,
    item: Partial<NewEquipment>
): Promise<Equipment | null> {
    const drizzle = createDb(db);

    const updateData = {
        ...item,
        updatedAt: new Date().toISOString(),
    };

    await drizzle.update(equipment)
        .set(updateData)
        .where(eq(equipment.slug, slug));

    return getEquipmentBySlug(db, slug);
}

/**
 * Soft delete an equipment
 */
export async function deleteEquipment(db: D1Database, slug: string): Promise<boolean> {
    const drizzle = createDb(db);
    await drizzle.update(equipment)
        .set({ deletedAt: new Date().toISOString() })
        .where(eq(equipment.slug, slug));
    return true;
}

/**
 * Escape special regex characters in a string.
 */
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Test if a term appears as a whole word (word-boundary) in the text.
 * Uses `\b` for Latin scripts; falls back to includes() for very short terms.
 */
function wordMatch(text: string, term: string): boolean {
    if (term.length < 2) return false;
    try {
        const regex = new RegExp(`\\b${escapeRegex(term)}\\b`, 'i');
        return regex.test(text);
    } catch {
        // Fallback if regex fails for some reason
        return text.toLowerCase().includes(term.toLowerCase());
    }
}

export interface EquipmentMatch extends Equipment {
    /** Confidence score: 100 = name match, 80 = brand, 60 = keyword */
    confidence: number;
    /** What triggered the match */
    matchedBy: 'name' | 'brand' | 'keyword';
    /** The specific term that matched */
    matchedTerm: string;
}

/**
 * Match equipment by scanning text against name, brand, and keywords.
 * Uses word-boundary matching to avoid false positives.
 * Returns matches sorted by confidence (highest first), deduplicated.
 */
export async function matchEquipmentInText(
    db: D1Database,
    text: string
): Promise<EquipmentMatch[]> {
    // Get all active equipment
    const allEquipment = await getEquipment(db, { activeOnly: true });

    const matches: EquipmentMatch[] = [];
    const seenIds = new Set<number>();

    for (const item of allEquipment) {
        let bestMatch: { confidence: number; matchedBy: EquipmentMatch['matchedBy']; matchedTerm: string } | null = null;

        // 1. Name match (highest confidence)
        if (wordMatch(text, item.name)) {
            bestMatch = { confidence: 100, matchedBy: 'name', matchedTerm: item.name };
        }

        // 2. Brand match
        if (!bestMatch && item.brand && wordMatch(text, item.brand)) {
            bestMatch = { confidence: 80, matchedBy: 'brand', matchedTerm: item.brand };
        }

        // 3. Keywords match
        if (!bestMatch && item.keywords) {
            try {
                const keywords: string[] = JSON.parse(item.keywords);
                for (const kw of keywords) {
                    if (kw && wordMatch(text, kw)) {
                        bestMatch = { confidence: 60, matchedBy: 'keyword', matchedTerm: kw };
                        break;
                    }
                }
            } catch { /* skip broken JSON */ }
        }

        if (bestMatch && !seenIds.has(item.id)) {
            seenIds.add(item.id);
            matches.push({ ...item, ...bestMatch });
        }
    }

    // Sort by confidence descending
    matches.sort((a, b) => b.confidence - a.confidence);

    return matches;
}

/**
 * After updating an equipment item, refresh cachedEquipmentJson
 * for every article that references it.
 *
 * Strategy:
 *  1. Fetch all articles that have a non-empty cachedEquipmentJson
 *  2. Filter to articles where the cached array contains the equipment id
 *  3. For each match, rebuild the array with fresh equipment data and save
 */
export async function refreshCachedEquipmentForArticles(
    db: D1Database,
    equipmentId: number
): Promise<number> {
    const drizzle = createDb(db);

    // 1. Fetch all articles with cached equipment
    const allArticles = await drizzle
        .select({
            id: articles.id,
            cachedEquipmentJson: articles.cachedEquipmentJson,
        })
        .from(articles)
        .where(isNull(articles.deletedAt))
        .all();

    // 2. Find articles that contain this equipment id
    const affected: { id: number; cached: any[] }[] = [];
    for (const art of allArticles) {
        if (!art.cachedEquipmentJson) continue;
        try {
            const cached = typeof art.cachedEquipmentJson === 'string'
                ? JSON.parse(art.cachedEquipmentJson)
                : art.cachedEquipmentJson;
            if (Array.isArray(cached) && cached.some((e: any) => e.id === equipmentId)) {
                affected.push({ id: art.id, cached });
            }
        } catch { /* skip broken JSON */ }
    }

    if (affected.length === 0) return 0;

    // 3. Fetch the updated equipment item
    const updatedEquip = await getEquipmentById(db, equipmentId);
    if (!updatedEquip) return 0;

    // Parse image URL from the updated equipment
    let imageUrl: string | undefined;
    try {
        const imgData = typeof updatedEquip.imageJson === 'string'
            ? JSON.parse(updatedEquip.imageJson)
            : updatedEquip.imageJson;
        imageUrl = imgData?.variants?.md?.url || imgData?.variants?.sm?.url || imgData?.url || undefined;
    } catch { /* ignore */ }

    // 4. For each affected article, replace the old entry with fresh data
    let count = 0;
    for (const art of affected) {
        const rebuilt = art.cached.map((entry: any) => {
            if (entry.id !== equipmentId) return entry;
            return {
                ...entry,
                name: updatedEquip.name,
                slug: updatedEquip.slug,
                brand: updatedEquip.brand || undefined,
                description: updatedEquip.description || undefined,
                category: updatedEquip.category || undefined,
                affiliate_url: updatedEquip.affiliateUrl || undefined,
                affiliate_provider: updatedEquip.affiliateProvider || undefined,
                affiliate_note: updatedEquip.affiliateNote || undefined,
                price_display: updatedEquip.priceDisplay || undefined,
                image_url: imageUrl,
            };
        });

        await drizzle.update(articles)
            .set({ cachedEquipmentJson: JSON.stringify(rebuilt) })
            .where(eq(articles.id, art.id));
        count++;
    }

    return count;
}
