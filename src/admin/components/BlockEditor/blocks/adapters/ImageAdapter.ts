import type { BlockAdapter } from '../BlockAdapter';
import type { ImageBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

export const ImageAdapter: BlockAdapter<ImageBlock> = {
    type: 'image',

    toEditor(block) {
        return {
            type: 'customImage',
            props: {
                imageRef: block.image_ref,
                mediaId: block.image_ref,
                alignment: 'center',
            },
        };
    },

    fromEditor(block: AppBlock): ImageBlock | null {
        const props = block.props as Record<string, unknown>;
        const imageRef = typeof props.imageRef === 'string' && props.imageRef.trim()
            ? props.imageRef
            : typeof props.image_ref === 'string' && props.image_ref.trim()
                ? props.image_ref
                : typeof props.mediaId === 'string' && props.mediaId.trim()
                    ? props.mediaId
                    : '';

        if (!imageRef) return null;

        return {
            type: 'image',
            image_ref: imageRef,
        };
    },
};
