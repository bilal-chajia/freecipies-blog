import type { CSSProperties } from 'react';
import { getBestVariantUrl, getSrcSet, type ImageSlot } from '@shared/types/images';
import type { RelatedContentType, RelatedLayout, RelatedThumbnail, TypedRelatedItem } from './RelatedContentBlock.types';

export const GROUP_LABELS: Record<RelatedContentType, string> = {
    recipe: 'Recipes',
    article: 'Articles',
    roundup: 'Roundups',
};

export const TYPE_LABEL_SINGULAR: Record<RelatedContentType, string> = {
    recipe: 'Recipe',
    article: 'Article',
    roundup: 'Roundup',
};

/** Normalize hex color — strip alpha if 8 chars (#rrggbbaa -> #rrggbb) */
export const normalizeCategoryColor = (color?: string) => {
    if (!color) return '#ff6600';
    const hex = color.startsWith('#') ? color : `#${color}`;
    return hex.length === 9 ? hex.slice(0, 7) : hex;
};

export const resolveThumbnail = (slot?: RelatedThumbnail) => {
    if (!slot) return { url: '', srcSet: '', style: undefined };
    const resolvedSlot = slot as ImageSlot;
    const url = getBestVariantUrl(resolvedSlot) || slot.url || '';
    const srcSet = getSrcSet(resolvedSlot) || '';
    const style: CSSProperties = {};
    if (slot.focal_point) {
        style.objectPosition = `${slot.focal_point.x}% ${slot.focal_point.y}%`;
    }
    if (slot.aspectRatio) {
        style.aspectRatio = slot.aspectRatio.includes(':')
            ? slot.aspectRatio.replace(':', ' / ')
            : slot.aspectRatio;
    }
    return { url, srcSet, style: Object.keys(style).length ? style : undefined };
};

export const buildMeta = (item: TypedRelatedItem, itemType: RelatedContentType) => {
    const parts: string[] = [];
    if (itemType === 'recipe') {
        if (typeof item.total_time === 'number') parts.push(`${item.total_time} min`);
        if (item.difficulty) parts.push(String(item.difficulty));
    }
    if (itemType === 'article') {
        if (typeof item.reading_time === 'number') parts.push(`${item.reading_time} min read`);
    }
    if (itemType === 'roundup') {
        if (typeof item.item_count === 'number') parts.push(`${item.item_count} items`);
    }
    return parts;
};

export const getLayoutClasses = (layoutValue: RelatedLayout) => {
    if (layoutValue === 'list') {
        return {
            listClass: 'flex flex-col',
            isList: true,
            isCarousel: false,
        };
    }
    if (layoutValue === 'carousel') {
        return {
            listClass: 'grid grid-flow-col auto-cols-[260px] gap-6 overflow-x-auto pb-2 snap-x snap-mandatory',
            isList: false,
            isCarousel: true,
        };
    }
    return {
        listClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6',
        isList: false,
        isCarousel: false,
    };
};

export const parseList = (value: string): import('./RelatedContentBlock.types').RelatedItem[] => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};
