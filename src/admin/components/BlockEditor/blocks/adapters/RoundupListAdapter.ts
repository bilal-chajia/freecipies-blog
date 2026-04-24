import type { BlockAdapter } from '../BlockAdapter';
import type { RoundupItemPlaceholderBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

export const RoundupListAdapter: BlockAdapter<RoundupItemPlaceholderBlock> = {
    type: 'roundup_item',

    toEditor(block) {
        return {
            type: 'roundupList',
            props: {
                title: block.title || '',
                description: block.subtitle || '',
                items: block.article_id || block.external_url
                    ? [{
                        article_id: block.article_id ?? null,
                        external_url: block.external_url || '',
                        title: block.title || '',
                        subtitle: block.subtitle || '',
                        note: block.note || '',
                        cover: block.cover ?? null,
                    }]
                    : [],
                showStats: true,
            },
        };
    },

    fromEditor(block: AppBlock): RoundupItemPlaceholderBlock | null {
        const props = block.props as Record<string, unknown>;
        const items = Array.isArray(props.items) ? props.items as unknown[] : [];

        // If no items, extract top-level props as a single item
        const firstItem = items[0] as Record<string, unknown> | undefined;
        if (!firstItem) {
            const article_id = props.article_id;
            const external_url = props.external_url;
            if (!article_id && !external_url) return null;
            return {
                type: 'roundup_item',
                article_id: typeof article_id === 'number' ? article_id : null,
                external_url: external_url ? String(external_url) : undefined,
                title: props.title ? String(props.title) : undefined,
                subtitle: props.description ? String(props.description) : undefined,
                note: props.note ? String(props.note) : undefined,
                cover: props.cover ? String(props.cover) : null,
            };
        }

        return {
            type: 'roundup_item',
            article_id: typeof firstItem.article_id === 'number' ? firstItem.article_id : null,
            external_url: firstItem.external_url ? String(firstItem.external_url) : undefined,
            title: firstItem.title ? String(firstItem.title) : undefined,
            subtitle: firstItem.subtitle ? String(firstItem.subtitle) : undefined,
            note: firstItem.note ? String(firstItem.note) : undefined,
            cover: firstItem.cover ? String(firstItem.cover) : null,
        };
    },
};
