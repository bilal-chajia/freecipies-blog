import type { BlockAdapter } from '../BlockAdapter';
import type { RelatedContentBlock, RelatedContentItem } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonArray } from '../../utils/json';

function isRelatedItem(value: unknown): value is RelatedContentItem {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const item = value as Record<string, unknown>;
    const snapshot = item.snapshot as Record<string, unknown> | undefined;
    return (
        typeof item.article_id === 'number'
        && Boolean(snapshot)
        && snapshot?.id === item.article_id
        && typeof snapshot.slug === 'string'
        && typeof snapshot.headline === 'string'
    );
}

function readItems(value: unknown): RelatedContentItem[] {
    const raw = Array.isArray(value)
        ? value
        : parseJsonArray<unknown>(value);
    return raw.filter(isRelatedItem);
}

export const RelatedContentAdapter: BlockAdapter<RelatedContentBlock> = {
    type: 'related_content',

    toEditor(block) {
        const items = Array.isArray(block.items) ? block.items : [];
        return {
            type: 'relatedContent',
            props: {
                title: block.title || '',
                layout: block.layout || 'grid',
                limit: block.limit || 4,
                items,
                itemsJson: JSON.stringify(items),
            },
        };
    },

    fromEditor(block: AppBlock): RelatedContentBlock | null {
        const props = block.props as Record<string, unknown>;
        const items = [
            ...readItems(props.items),
            ...readItems(props.itemsJson),
        ];

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
