import type { BlockAdapter } from '../BlockAdapter';
import type { BeforeAfterBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import type { ImageSlot } from '@shared/types/images';
import { parseJsonObject } from '../../utils/json';

function getContentImage(imagesData: unknown, imageRef: string): (ImageSlot & Record<string, unknown>) | null {
    const images = parseJsonObject<Record<string, unknown>>(imagesData, {});
    const contentImages = parseJsonObject<Record<string, unknown>>(images.content_images, {});
    const slot = contentImages[imageRef];
    return slot && typeof slot === 'object' && !Array.isArray(slot)
        ? slot as ImageSlot & Record<string, unknown>
        : null;
}

function toSlotJson(imagesData: unknown, imageRef: string, label: string) {
    const slot = getContentImage(imagesData, imageRef);
    if (!slot) return '';
    return JSON.stringify({
        ...slot,
        label,
    });
}

function readImageRef(
    primary: unknown,
    snakeCase: unknown,
    slot: Record<string, unknown>
): string {
    if (typeof primary === 'string' && primary.trim()) return primary;
    if (typeof snakeCase === 'string' && snakeCase.trim()) return snakeCase;
    if (typeof slot.media_id === 'string' && slot.media_id.trim()) return slot.media_id;
    if (typeof slot.media_id === 'number') return String(slot.media_id);
    return '';
}

export const BeforeAfterAdapter: BlockAdapter<BeforeAfterBlock> = {
    type: 'before_after',

    toEditor(block, context) {
        return {
            type: 'beforeAfter',
            props: {
                layout: block.layout || 'slider',
                beforeImageRef: block.before_image_ref,
                afterImageRef: block.after_image_ref,
                beforeLabel: block.before_label || '',
                afterLabel: block.after_label || '',
                beforeJson: toSlotJson(context?.imagesData, block.before_image_ref, block.before_label || 'Before'),
                afterJson: toSlotJson(context?.imagesData, block.after_image_ref, block.after_label || 'After'),
            },
        };
    },

    fromEditor(block: AppBlock): BeforeAfterBlock | null {
        const props = block.props as Record<string, unknown>;
        const beforeSlot = parseJsonObject<Record<string, unknown>>(props.beforeJson, {});
        const afterSlot = parseJsonObject<Record<string, unknown>>(props.afterJson, {});
        const beforeImageRef = readImageRef(props.beforeImageRef, props.before_image_ref, beforeSlot);
        const afterImageRef = readImageRef(props.afterImageRef, props.after_image_ref, afterSlot);

        if (!beforeImageRef || !afterImageRef) return null;

        return {
            ...(typeof block.id === 'string' ? { id: block.id } : {}),
            type: 'before_after',
            layout: (props.layout as 'slider' | 'side_by_side') || 'slider',
            before_image_ref: beforeImageRef,
            after_image_ref: afterImageRef,
            ...(typeof props.beforeLabel === 'string' && props.beforeLabel ? { before_label: props.beforeLabel } : {}),
            ...(typeof props.afterLabel === 'string' && props.afterLabel ? { after_label: props.afterLabel } : {}),
        };
    },
};
