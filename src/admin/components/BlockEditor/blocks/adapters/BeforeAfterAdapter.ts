import type { BlockAdapter } from '../BlockAdapter';
import type { BeforeAfterBlock, BeforeAfterImage } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

export const BeforeAfterAdapter: BlockAdapter<BeforeAfterBlock> = {
    type: 'before_after',

    toEditor(block) {
        const toEditorImage = (img: BeforeAfterImage) => ({
            mediaId: img.media_id ? String(img.media_id) : '',
            alt: img.alt || '',
            label: img.label || '',
            variants: img.variants || {},
        });

        return {
            type: 'beforeAfter',
            props: {
                layout: block.layout || 'slider',
                before: toEditorImage(block.before),
                after: toEditorImage(block.after),
            },
        };
    },

    fromEditor(block: AppBlock): BeforeAfterBlock | null {
        const props = block.props as Record<string, unknown>;
        const beforeRaw = props.before as Record<string, unknown> | undefined;
        const afterRaw = props.after as Record<string, unknown> | undefined;

        if (!beforeRaw || !afterRaw) return null;

        const fromEditorImage = (raw: Record<string, unknown>) => {
            const mediaId = raw.mediaId;
            const media_id = typeof mediaId === 'string' && mediaId
                ? parseInt(mediaId, 10)
                : typeof mediaId === 'number'
                    ? mediaId
                    : 0;
            return {
                media_id,
                alt: String(raw.alt || ''),
                label: raw.label ? String(raw.label) : undefined,
                variants: raw.variants as Record<string, unknown> | undefined,
            };
        };

        const before = fromEditorImage(beforeRaw);
        const after = fromEditorImage(afterRaw);

        if (!before.media_id || !after.media_id) return null;

        return {
            type: 'before_after',
            layout: (props.layout as 'slider' | 'side_by_side') || 'slider',
            before,
            after,
        };
    },
};
