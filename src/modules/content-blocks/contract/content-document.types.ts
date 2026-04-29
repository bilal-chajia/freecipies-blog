import type { NormalizedContentBlock } from './content-blocks.types';

export type ContentDocumentVersion = 1;

export interface ContentDocument {
  version: ContentDocumentVersion;
  kind: 'content_document';
  blocks: NormalizedContentBlock[];
}

export const EMPTY_CONTENT_DOCUMENT: ContentDocument = {
  version: 1,
  kind: 'content_document',
  blocks: [],
};
