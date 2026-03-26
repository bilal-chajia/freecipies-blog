import { getVariantMap, parseVariantsJson } from '@shared/types/images';

export const parseJsonArray = (value: unknown) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== 'string') return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

export const clampNumber = (value: unknown, min: number, max: number, fallback: number) => {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
};

type BlockImageProps = Record<string, unknown>;

interface MediaSelectPayload {
    id?: string | number | null;
    url?: string;
    altText?: string;
    alt_text?: string;
    name?: string;
    credit?: string;
    credit_text?: string;
    variants?: Record<string, unknown>;
}

interface UploadPayload {
    id?: string | number | null;
    url?: string;
    altText?: string;
    credit?: string;
    width?: number;
    height?: number;
    variants?: Record<string, unknown>;
}

export const buildImageReplaceProps = (item: MediaSelectPayload, currentProps: BlockImageProps) => {
    const parsed = parseVariantsJson(item);
    const variants = getVariantMap(parsed);
    const url = variants.md?.url || variants.sm?.url || variants.lg?.url || item.url || '';
    const bestVariant = variants.md || variants.lg || variants.original;

    return {
        url,
        mediaId: item.id?.toString() || '',
        alt: item.altText || item.alt_text || item.name || '',
        credit: item.credit || item.credit_text || '',
        width: bestVariant?.width || Number(currentProps.width) || 512,
        height: bestVariant?.height || Number(currentProps.height) || 0,
        variantsJson: JSON.stringify(variants),
    };
};

export const buildImageUploadProps = (data: UploadPayload, currentProps: BlockImageProps) => {
    const variants = data.variants || {};
    const url = variants.md?.url || variants.sm?.url || variants.lg?.url || data.url;
    const bestVariant = variants.md || variants.lg || variants.original;

    return {
        url,
        mediaId: data.id?.toString() || '',
        alt: data.altText || '',
        credit: data.credit || '',
        width: bestVariant?.width || data.width || Number(currentProps.width) || 512,
        height: bestVariant?.height || data.height || Number(currentProps.height) || 0,
        variantsJson: JSON.stringify(variants),
    };
};
