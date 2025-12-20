/**
 * Pinterest Module - TypeScript Types
 */

export interface PinStatus {
  status: 'draft' | 'scheduled' | 'published' | 'failed';
}

export interface PinExport {
  batchId: string;
  exportedAt: string;
  pinterestPinId?: string;
}
