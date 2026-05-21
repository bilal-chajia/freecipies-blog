import type { BlockAdapter } from '../BlockAdapter';
import type { RelatedContentBlock, RelatedContentItem } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonArray } from '../../utils/json';

type RelatedThumbnail = {
    url?: string;
    media_id?: number;
    alt?: string;
    placeholder?: string;
    focal_point?: { x: number; y: number };
    aspectRatio?: string;
    variants?: Record<string, any>;
    [key: string]: unknown;
};

type RelatedItem = {
    id: string | number;
    slug?: string;
    headline?: string;
    snapshot?: Record<string, unknown>;
    categoryName?: string | null;
    categoryColor?: string | null;
    thumbnail?: RelatedThumbnail | null;
    total_time?: number | null;
    difficulty?: string | null;
    reading_time?: number | null;
    item_count?: number | null;
};

function parseJsonObject(value: unknown): Record<string, unknown> | null {
    if (!value) return null;
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value !== 'string') return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : null;
    } catch {
        return null;
    }
}

function readNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function readString(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value : null;
}

function normalizeRelatedContentItem(value: unknown): RelatedContentItem | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const item = value as Record<string, unknown>;
    const articleId = readNumber(item.article_id) ?? readNumber(item.articleId) ?? readNumber(item.id);
    if (!articleId) return null;

    const snapshot =
        parseJsonObject(item.snapshot)
        ?? parseJsonObject(item.cached_card_json)
        ?? parseJsonObject(item.cachedCardJson);

    if (snapshot) {
        const snapshotId = readNumber(snapshot.id) ?? articleId;
        const slug = readString(snapshot.slug) ?? readString(item.slug);
        const headline = readString(snapshot.headline) ?? readString(snapshot.title) ?? readString(item.headline) ?? readString(item.title);
        if (!slug || !headline) return null;
        return {
            article_id: articleId,
            snapshot: {
                ...snapshot,
                id: snapshotId,
                slug,
                headline,
            },
        };
    }

    const slug = readString(item.slug);
    const headline = readString(item.headline) ?? readString(item.title);
    if (!slug || !headline) return null;

    return {
        article_id: articleId,
        snapshot: {
            id: articleId,
            type: readString(item.content_type) ?? readString(item.type) ?? 'article',
            slug,
            headline,
        },
    };
}

function readItems(value: unknown): RelatedContentItem[] {
    const raw = Array.isArray(value)
        ? value
        : parseJsonArray<unknown>(value);
    return raw
        .map((item) => normalizeRelatedContentItem(item))
        .filter((item): item is RelatedContentItem => Boolean(item));
}

function mapToRelatedItem(item: RelatedContentItem): RelatedItem {
    const snap = item.snapshot || {};
    const type = snap.type || snap.content_type || 'article';

    const category = snap.category as Record<string, any> | undefined;
    const image = snap.image as Record<string, any> | undefined;
    const recipe = snap.recipe as Record<string, any> | undefined;
    const roundup = snap.roundup_json as Record<string, any> | undefined;

    const relatedItem: RelatedItem = {
        id: item.article_id,
        slug: (snap.slug as string) || '',
        headline: (snap.headline as string) || '',
        snapshot: snap,
        categoryName: category?.label || category?.name || (snap.category_name as string) || null,
        categoryColor: category?.color || (snap.category_color as string) || null,
        thumbnail: image || null,
    };

    if (type === 'recipe') {
        relatedItem.total_time = recipe?.total_time_minutes ?? recipe?.total_time ?? null;
        relatedItem.difficulty = recipe?.difficulty ?? null;
    } else if (type === 'article') {
        relatedItem.reading_time = (snap.reading_time_minutes as number) ?? null;
    } else if (type === 'roundup') {
        relatedItem.item_count = roundup?.items?.length ?? null;
    }

    return relatedItem;
}

function mapToRelatedContentItem(item: RelatedItem, type: 'recipe' | 'article' | 'roundup'): RelatedContentItem {
    const article_id = Number(item.id);
    const snapshot: Record<string, any> = item.snapshot
        ? {
            ...item.snapshot,
            id: article_id,
            type: item.snapshot.type || type,
            slug: item.slug || item.snapshot.slug || '',
            headline: item.headline || item.snapshot.headline || '',
        }
        : {
        id: article_id,
        type,
        slug: item.slug || '',
        headline: item.headline || '',
    };

    if (item.categoryName || item.categoryColor) {
        snapshot.category = {
            label: item.categoryName || null,
            color: item.categoryColor || null,
        };
    }

    if (item.thumbnail) {
        snapshot.image = item.thumbnail;
    }

    if (type === 'recipe') {
        snapshot.recipe = {
            total_time_minutes: item.total_time ?? null,
            difficulty: item.difficulty ?? null,
        };
    } else if (type === 'article') {
        snapshot.reading_time_minutes = item.reading_time ?? null;
    } else if (type === 'roundup') {
        snapshot.roundup_json = {
            items: item.item_count ? Array(item.item_count).fill({}) : [],
        };
    }

    return {
        article_id,
        snapshot,
    };
}

export const RelatedContentAdapter: BlockAdapter<RelatedContentBlock> = {
    type: 'related_content',

    toEditor(block) {
        const items = readItems((block as unknown as Record<string, unknown>).items);

        // Partition items by snapshot type
        const recipeItems: RelatedItem[] = [];
        const articleItems: RelatedItem[] = [];
        const roundupItems: RelatedItem[] = [];

        items.forEach(item => {
            const snap = item.snapshot || {};
            const type = snap.type || snap.content_type || 'article';
            const mapped = mapToRelatedItem(item);
            if (type === 'recipe') {
                recipeItems.push(mapped);
            } else if (type === 'roundup') {
                roundupItems.push(mapped);
            } else {
                articleItems.push(mapped);
            }
        });

        return {
            type: 'relatedContent',
            props: {
                title: block.title || '',
                layout: block.layout || 'grid',
                limit: block.limit || 4,
                recipesJson: JSON.stringify(recipeItems),
                articlesJson: JSON.stringify(articleItems),
                roundupsJson: JSON.stringify(roundupItems),
                itemsJson: JSON.stringify(items),
            },
        };
    },

    fromEditor(block: AppBlock): RelatedContentBlock | null {
        const props = block.props as Record<string, unknown>;

        // Try reading from type-specific JSON properties first (BlockNote active fields)
        const recipes = parseJsonArray<RelatedItem>(props.recipesJson || '[]');
        const articles = parseJsonArray<RelatedItem>(props.articlesJson || '[]');
        const roundups = parseJsonArray<RelatedItem>(props.roundupsJson || '[]');

        const items: RelatedContentItem[] = [];

        // Map from specific types if present
        recipes.forEach(item => items.push(mapToRelatedContentItem(item, 'recipe')));
        articles.forEach(item => items.push(mapToRelatedContentItem(item, 'article')));
        roundups.forEach(item => items.push(mapToRelatedContentItem(item, 'roundup')));

        // Backward compatibility fallback for direct items/itemsJson
        if (items.length === 0) {
            const rawItems = [
                ...readItems(props.items),
                ...readItems(props.itemsJson),
            ];
            items.push(...rawItems);
        }

        const deduped = Array.from(
            new Map(items.map((item) => [item.article_id, item])).values()
        );

        if (deduped.length === 0) return null;

        return {
            id: typeof block.id === 'string' ? block.id : `related-${Date.now()}`,
            type: 'related_content',
            title: props.title ? String(props.title) : undefined,
            layout: (props.layout as 'grid' | 'carousel' | 'list') || 'grid',
            limit: typeof props.limit === 'number' ? props.limit : undefined,
            items: deduped,
        };
    },
};
