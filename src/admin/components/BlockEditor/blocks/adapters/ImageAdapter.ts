import type { BlockAdapter } from '../BlockAdapter';
import type { ImageBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonObject } from '../../utils/json';

const parseAuthorCredit = (value: unknown): ImageBlock['credit'] | undefined => {
    const parsed = parseJsonObject(value, null);
    if (!parsed || typeof parsed !== 'object') return undefined;
    if ((parsed as Record<string, unknown>).type !== 'author') return undefined;
    return parsed as ImageBlock['credit'];
};

export const ImageAdapter: BlockAdapter<ImageBlock> = {
    type: 'image',

    toEditor(block) {
        return {
            type: 'customImage',
            props: {
                url: '',
                caption: block.caption ?? '',
                alt: block.alt || '',
                credit: typeof block.credit === 'object' ? block.credit.name : '',
                creditJson: block.credit && typeof block.credit === 'object' ? JSON.stringify(block.credit) : '{}',
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
        const credit = parseAuthorCredit(props.creditJson);
        const caption = typeof props.caption === 'string' ? props.caption : '';

        return {
            type: 'image',
            media_id,
            alt: String(props.alt || ''),
            caption,
            credit,
            variants: Object.keys(variants).length > 0 ? variants : undefined,
        };
    },
};
