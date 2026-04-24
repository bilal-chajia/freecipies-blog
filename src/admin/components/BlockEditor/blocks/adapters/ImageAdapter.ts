import type { BlockAdapter } from '../BlockAdapter';
import type { ImageBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonObject } from '../../utils/json';

export const ImageAdapter: BlockAdapter<ImageBlock> = {
    type: 'image',

    toEditor(block) {
        return {
            type: 'customImage',
            props: {
                url: '',
                caption: block.caption || '',
                alt: block.alt || '',
                credit: block.credit || '',
                width: 512,
                height: 0,
                mediaId: block.media_id ? String(block.media_id) : '',
                variantsJson: block.variants ? JSON.stringify(block.variants) : '{}',
                alignment: 'center',
            },
        };
    },

    fromEditor(block: AppBlock): ImageBlock | null {
        const props = block.props as Record<string, unknown>;
        const mediaId = props.mediaId;
        const media_id = typeof mediaId === 'string' && mediaId
            ? parseInt(mediaId, 10)
            : typeof mediaId === 'number'
                ? mediaId
                : 0;
        if (!media_id) return null;

        const variants = parseJsonObject(props.variantsJson as unknown, {});

        return {
            type: 'image',
            media_id,
            alt: String(props.alt || ''),
            caption: props.caption ? String(props.caption) : undefined,
            credit: props.credit ? String(props.credit) : undefined,
            variants: Object.keys(variants).length > 0 ? variants : undefined,
        };
    },
};
