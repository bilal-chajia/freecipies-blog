import type { BlockAdapter } from '../BlockAdapter';
import type { ImageBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { getBestVariantUrl, type ImageSlot } from '@shared/types/images';
import { parseJsonObject } from '../../utils/json';

function getContentImage(imagesData: unknown, imageRef: string): (ImageSlot & Record<string, unknown>) | null {
    const images = parseJsonObject<Record<string, unknown>>(imagesData, {});
    const contentImages = parseJsonObject<Record<string, unknown>>(images.content_images, {});
    const slot = contentImages[imageRef];
    return slot && typeof slot === 'object' && !Array.isArray(slot)
        ? slot as ImageSlot & Record<string, unknown>
        : null;
}

function readCreditName(value: unknown): string {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const record = value as Record<string, unknown>;
    return typeof record.name === 'string' ? record.name : '';
}

export const ImageAdapter: BlockAdapter<ImageBlock> = {
    type: 'image',

    toEditor(block, context) {
        const slot = getContentImage(context?.imagesData, block.image_ref);
        const mediaId = slot?.media_id ?? block.image_ref;
        const variants = slot?.variants && typeof slot.variants === 'object' ? slot.variants : {};
        const url = getBestVariantUrl(slot || undefined) || '';

        return {
            type: 'customImage',
            props: {
                imageRef: block.image_ref,
                mediaId: String(mediaId || ''),
                url,
                alt: typeof slot?.alt === 'string' ? slot.alt : '',
                caption: typeof slot?.caption === 'string' ? slot.caption : '',
                credit: readCreditName(slot?.credit),
                creditJson: slot?.credit ? JSON.stringify(slot.credit) : '{}',
                width: typeof slot?.width === 'number' ? slot.width : 512,
                height: typeof slot?.height === 'number' ? slot.height : 0,
                variantsJson: JSON.stringify(variants),
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
            ...(typeof block.id === 'string' ? { id: block.id } : {}),
            type: 'image',
            image_ref: imageRef,
        };
    },
};
