import type { ImageSlot } from '@shared/types/images';

export type RelatedContentType = 'recipe' | 'article' | 'roundup';
export type RelatedLayout = 'grid' | 'carousel' | 'list';

export type RelatedThumbnail = Partial<ImageSlot> & {
    url?: string;
    focal_point?: {
        x: number;
        y: number;
    };
    aspectRatio?: string;
    [key: string]: unknown;
};

export type RelatedItem = {
    id: string | number;
    headline?: string;
    slug?: string;
    categoryName?: string;
    categoryColor?: string;
    thumbnail?: RelatedThumbnail;
    total_time?: number;
    difficulty?: string;
    reading_time?: number;
    item_count?: number;
};

export type TypedRelatedItem = RelatedItem & {
    __type: RelatedContentType;
};

export type RelatedGroup = {
    type: RelatedContentType;
    label: string;
    items: TypedRelatedItem[];
};
