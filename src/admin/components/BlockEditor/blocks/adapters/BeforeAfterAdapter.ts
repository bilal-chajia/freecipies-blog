import type { BlockAdapter } from '../BlockAdapter';
import type { BeforeAfterBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';

export const BeforeAfterAdapter: BlockAdapter<BeforeAfterBlock> = {
    type: 'before_after',

    toEditor(block) {
        return {
            type: 'beforeAfter',
            props: {
                layout: block.layout || 'slider',
                beforeImageRef: block.before_image_ref,
                afterImageRef: block.after_image_ref,
                beforeLabel: block.before_label || '',
                afterLabel: block.after_label || '',
            },
        };
    },

    fromEditor(block: AppBlock): BeforeAfterBlock | null {
        const props = block.props as Record<string, unknown>;
        const beforeImageRef = typeof props.beforeImageRef === 'string' && props.beforeImageRef.trim()
            ? props.beforeImageRef
            : typeof props.before_image_ref === 'string' && props.before_image_ref.trim()
                ? props.before_image_ref
                : '';
        const afterImageRef = typeof props.afterImageRef === 'string' && props.afterImageRef.trim()
            ? props.afterImageRef
            : typeof props.after_image_ref === 'string' && props.after_image_ref.trim()
                ? props.after_image_ref
                : '';

        if (!beforeImageRef || !afterImageRef) return null;

        return {
            type: 'before_after',
            layout: (props.layout as 'slider' | 'side_by_side') || 'slider',
            before_image_ref: beforeImageRef,
            after_image_ref: afterImageRef,
            ...(typeof props.beforeLabel === 'string' && props.beforeLabel ? { before_label: props.beforeLabel } : {}),
            ...(typeof props.afterLabel === 'string' && props.afterLabel ? { after_label: props.afterLabel } : {}),
        };
    },
};
