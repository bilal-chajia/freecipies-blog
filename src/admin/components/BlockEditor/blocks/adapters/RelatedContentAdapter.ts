import type { BlockAdapter } from '../BlockAdapter';
import type { RelatedContentBlock, RelatedContentItem } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonArray } from '../../utils/json';

type LegacyRelatedCard = RelatedContentItem & {
    id?: number;
    headline?: string;
    thumbnail?: unknown;
};

function compactImage(input: unknown): RelatedContentItem['image'] | undefined {
    if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
    const slot = input as Record<string, unknown>;
    const variants = slot.variants && typeof slot.variants === 'object'
        ? slot.variants as Record<string, Record<string, unknown> | undefined>
        : {};
    const sm = variants.sm && variants.sm.url && variants.sm.width && variants.sm.height
        ? { url: String(variants.sm.url), width: Number(variants.sm.width), height: Number(variants.sm.height) }
        : undefined;
    const md = variants.md && variants.md.url && variants.md.width && variants.md.height
        ? { url: String(variants.md.url), width: Number(variants.md.width), height: Number(variants.md.height) }
        : undefined;
    if (!slot.media_id || !slot.alt || (!sm && !md)) return undefined;
    return {
        media_id: Number(slot.media_id),
        alt: String(slot.alt),
        variants: {
            ...(sm ? { sm } : {}),
            ...(md ? { md } : {}),
        },
    };
}

function withContentType(items: LegacyRelatedCard[], contentType: RelatedContentItem['content_type']): RelatedContentItem[] {
    return items
        .map((item) => ({
            content_type: item.content_type || contentType,
            article_id: item.article_id || item.id,
            slug: item.slug,
            title: item.title || item.headline || item.slug,
            description: item.description,
            image: compactImage(item.image) || compactImage(item.thumbnail),
            total_time: item.total_time,
            difficulty: item.difficulty,
            reading_time: item.reading_time,
            item_count: item.item_count,
        }))
        .filter((item): item is RelatedContentItem => Boolean(item.slug && item.title));
}

export const RelatedContentAdapter: BlockAdapter<RelatedContentBlock> = {
    type: 'related_content',

    toEditor(block) {
        const items = Array.isArray(block.items) ? block.items : [];
        const toEditorItem = (item: RelatedContentItem) => ({
            ...item,
            id: item.article_id,
            headline: item.title,
            thumbnail: item.image,
        });
        const recipes = items.filter((item) => item.content_type === 'recipe').map(toEditorItem);
        const articles = items.filter((item) => item.content_type === 'article').map(toEditorItem);
        const roundups = items.filter((item) => item.content_type === 'roundup').map(toEditorItem);
        return {
            type: 'relatedContent',
            props: {
                title: block.title || '',
                layout: block.layout || 'grid',
                mode: block.mode || 'manual',
                limit: block.limit || 4,
                items: Array.isArray(block.items) ? block.items : [],
                recipesJson: JSON.stringify(recipes),
                articlesJson: JSON.stringify(articles),
                roundupsJson: JSON.stringify(roundups),
            },
        };
    },

    fromEditor(block: AppBlock): RelatedContentBlock | null {
        const props = block.props as Record<string, unknown>;

        const items: RelatedContentItem[] = Array.isArray(props.items)
            ? (props.items as RelatedContentItem[])
            : parseJsonArray<RelatedContentItem>(props.items);

        const recipes: LegacyRelatedCard[] = Array.isArray(props.recipes)
            ? (props.recipes as LegacyRelatedCard[])
            : parseJsonArray<LegacyRelatedCard>(props.recipes || props.recipesJson);
        const articles: LegacyRelatedCard[] = Array.isArray(props.articles)
            ? (props.articles as LegacyRelatedCard[])
            : parseJsonArray<LegacyRelatedCard>(props.articles || props.articlesJson);
        const roundups: LegacyRelatedCard[] = Array.isArray(props.roundups)
            ? (props.roundups as LegacyRelatedCard[])
            : parseJsonArray<LegacyRelatedCard>(props.roundups || props.roundupsJson);

        const canonicalItems = [
            ...items.map((item) => ({
                ...item,
                image: compactImage(item.image),
            })),
            ...withContentType(recipes, 'recipe'),
            ...withContentType(articles, 'article'),
            ...withContentType(roundups, 'roundup'),
        ].filter((item) => item.slug && item.title);

        if (canonicalItems.length === 0) return null;

        return {
            type: 'related_content',
            title: props.title ? String(props.title) : undefined,
            layout: (props.layout as 'grid' | 'carousel' | 'list') || 'grid',
            mode: (props.mode as 'manual' | 'auto') || 'manual',
            limit: typeof props.limit === 'number' ? props.limit : undefined,
            items: canonicalItems,
        };
    },
};
