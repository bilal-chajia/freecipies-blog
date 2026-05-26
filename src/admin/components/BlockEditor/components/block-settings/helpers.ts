import { getVariantMap, parseVariantsJson, resolveVariantUrl } from '@shared/types/images';
import type { ResolvedImageVariant } from '@shared/types/images';

export { parseJsonArray } from '../../utils/json';


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
    caption?: string;
    credit?: string | Record<string, unknown>;
    credit_text?: string;
    variants?: Record<string, unknown>;
}

interface UploadPayload {
    id?: string | number | null;
    url?: string;
    altText?: string;
    caption?: string;
    credit?: string | Record<string, unknown>;
    width?: number;
    height?: number;
    variants?: Record<string, unknown>;
}

type VariantMap = Partial<Record<'xs' | 'sm' | 'md' | 'lg' | 'original', ResolvedImageVariant>>;

const isVariantMap = (value: unknown): value is VariantMap => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return ['xs', 'sm', 'md', 'lg', 'original'].some((key) => {
        const variant = record[key];
        return !!variant && typeof variant === 'object' && !Array.isArray(variant);
    });
};

const serializeAuthorCredit = (credit: unknown) => {
    if (!credit || typeof credit !== 'object') return '{}';
    const record = credit as Record<string, unknown>;
    return record.type === 'author' ? JSON.stringify(record) : '{}';
};

const getAuthorCreditName = (credit: unknown, fallback = '') => {
    if (!credit || typeof credit !== 'object') return fallback;
    const record = credit as Record<string, unknown>;
    return record.type === 'author' && typeof record.name === 'string' ? record.name : fallback;
};

export const buildImageReplaceProps = (item: MediaSelectPayload, currentProps: BlockImageProps) => {
    const parsed = parseVariantsJson(item);
    const variants = getVariantMap(parsed);
    const url = resolveVariantUrl(variants.md) || resolveVariantUrl(variants.sm) || resolveVariantUrl(variants.lg) || item.url || '';
    const bestVariant = variants.md || variants.lg || variants.original;

    return {
        url,
        mediaId: item.id?.toString() || '',
        alt: item.altText || item.alt_text || item.name || '',
        caption: item.caption || '',
        credit: getAuthorCreditName(item.credit, item.credit_text || ''),
        creditJson: serializeAuthorCredit(item.credit),
        width: bestVariant?.width || Number(currentProps.width) || 512,
        height: bestVariant?.height || Number(currentProps.height) || 0,
        variantsJson: JSON.stringify(variants),
    };
};

export const buildImageUploadProps = (data: UploadPayload, currentProps: BlockImageProps) => {
    const variants = isVariantMap(data.variants) ? data.variants : {};
    const url = resolveVariantUrl(variants.md) || resolveVariantUrl(variants.sm) || resolveVariantUrl(variants.lg) || data.url;
    const bestVariant = variants.md || variants.lg || variants.original;

    return {
        url,
        mediaId: data.id?.toString() || '',
        alt: data.altText || '',
        caption: data.caption || '',
        credit: getAuthorCreditName(data.credit),
        creditJson: serializeAuthorCredit(data.credit),
        width: bestVariant?.width || data.width || Number(currentProps.width) || 512,
        height: bestVariant?.height || data.height || Number(currentProps.height) || 0,
        variantsJson: JSON.stringify(variants),
    };
};
