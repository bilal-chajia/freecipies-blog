/**
 * Helpers for reading/writing image slots inside images_json.content_images.
 *
 * images_json.content_images[imageRef] is the canonical store for body image
 * data (url/variants/alt/caption/credit). Block props are a transient mirror
 * seeded from here by the adapters; edits must write back here.
 *
 * Shared by ImageBlock, BeforeAfterBlock and their sidebar settings panels so
 * there is a single implementation (previously copy-pasted per block).
 */

export function parseImagesData(value: unknown): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : {};
    } catch {
        return {};
    }
}

export function upsertContentImageSlot(
    imagesData: unknown,
    imageRef: string,
    slot: Record<string, unknown>
): Record<string, unknown> {
    const images = parseImagesData(imagesData);
    const contentImages = parseImagesData(images.content_images);
    return {
        ...images,
        content_images: {
            ...contentImages,
            [imageRef]: slot,
        },
    };
}

export function patchContentImageSlot(
    imagesData: unknown,
    imageRef: unknown,
    patch: Record<string, unknown>
): Record<string, unknown> | null {
    if (typeof imageRef !== 'string' || !imageRef) return null;
    const images = parseImagesData(imagesData);
    const contentImages = parseImagesData(images.content_images);
    const currentSlot = contentImages[imageRef];
    if (!currentSlot || typeof currentSlot !== 'object' || Array.isArray(currentSlot)) return null;
    return upsertContentImageSlot(imagesData, imageRef, {
        ...(currentSlot as Record<string, unknown>),
        ...patch,
    });
}
