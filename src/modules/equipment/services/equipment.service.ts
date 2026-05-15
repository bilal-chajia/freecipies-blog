/**
 * Equipment Module - Database Service
 * =====================================
 * Database operations for equipment.
 */

import { eq, and, asc, isNull } from 'drizzle-orm';
import type { D1Database } from '@cloudflare/workers-types';
import { equipment, type Equipment, type NewEquipment } from '../schema/equipment.schema';
import { getDb, type DrizzleDb } from '../../../shared/database/drizzle';

/**
 * Get all equipment
 */
export async function getEquipment(
    db: D1Database | DrizzleDb,
    options?: { limit?: number; category?: string; activeOnly?: boolean }
): Promise<Equipment[]> {
    const drizzle = getDb(db);

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
export async function getEquipmentBySlug(db: D1Database | DrizzleDb, slug: string): Promise<Equipment | null> {
    const drizzle = getDb(db);
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
export async function getEquipmentById(db: D1Database | DrizzleDb, id: number): Promise<Equipment | null> {
    const drizzle = getDb(db);
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
    db: D1Database | DrizzleDb,
    item: NewEquipment
): Promise<Equipment | null> {
    const drizzle = getDb(db);
    const [inserted] = await drizzle.insert(equipment).values(item).returning();
    return inserted || null;
}

/**
 * Update an equipment
 */
export async function updateEquipment(
    db: D1Database | DrizzleDb,
    slug: string,
    item: Partial<NewEquipment>
): Promise<Equipment | null> {
    const drizzle = getDb(db);

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
export async function deleteEquipment(db: D1Database | DrizzleDb, slug: string): Promise<boolean> {
    const drizzle = getDb(db);
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
    db: D1Database | DrizzleDb,
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
