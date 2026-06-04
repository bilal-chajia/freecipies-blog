/**
 * Pinterest Module - TypeScript Types
 */

export interface PinStatus {
  status: 'draft' | 'scheduled' | 'published' | 'failed';
}

export interface PinExport {
  batchId: string;
  exported_at: string;
  pinterest_pin_id?: string;
}
