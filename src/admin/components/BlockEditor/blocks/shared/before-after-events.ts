export const BEFORE_AFTER_OPEN_MEDIA_EVENT = 'beforeafter:open-media';

export interface BeforeAfterOpenEventDetail {
    blockId: string;
    slotKey: 'before' | 'after';
}

export interface BeforeAfterOpenEvent extends Event {
    detail?: BeforeAfterOpenEventDetail;
}

export function dispatchBeforeAfterEvent(detail: BeforeAfterOpenEventDetail): void {
    document.dispatchEvent(new CustomEvent(BEFORE_AFTER_OPEN_MEDIA_EVENT, { detail }));
}
