export type ImageSlotKey = 'before' | 'after';

export type BeforeAfterSlot = {
    media_id?: number | string;
    alt?: string;
    label?: string;
    variants?: unknown;
};

export type MediaDialogItem = {
    id: number | string;
    altText?: string | null;
    alt_text?: string | null;
    name?: string | null;
};

export type BeforeAfterUpdates = {
    layout?: 'slider' | 'side_by_side';
    beforeImageRef?: string;
    afterImageRef?: string;
    beforeJson?: string;
    afterJson?: string;
};
