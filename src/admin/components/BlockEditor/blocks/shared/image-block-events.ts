export const IMAGE_BLOCK_OPEN_MEDIA_EVENT = 'imageblock:open-media';
export const IMAGE_BLOCK_OPEN_UPLOADER_EVENT = 'imageblock:open-uploader';

export interface ImageBlockOpenEventDetail {
  blockId?: string;
}

export function dispatchImageBlockEvent(type: string, detail: ImageBlockOpenEventDetail): void {
  document.dispatchEvent(new CustomEvent(type, { detail }));
}
