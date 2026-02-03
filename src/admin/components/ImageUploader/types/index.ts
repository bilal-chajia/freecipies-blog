/**
 * Types for the ImageUploader module
 */

export interface UploadMetadata {
  filename: string;
  altText: string;
  caption: string;
  credit: string;
}

export interface CropSettings {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  aspect: string;
  croppedAreaPixels: CroppedArea | null;
}

export interface CroppedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FocalPoint {
  x: number;
  y: number;
}

export type QueueItemStatus = 'pending' | 'uploading' | 'done' | 'error' | 'skipped';

export interface QueueItem {
  id: string;
  type: 'file' | 'url';
  source: File | string;
  name: string;
  status: QueueItemStatus;
  previewUrl: string | null;
  finalName?: string;
  error?: string;
  result?: UploadResultData;
}

export interface UploadProgress {
  overall: number;
  generating: number;
  uploading: number;
  finalizing: number;
}

export interface UploadResultData {
  id: number;
  name: string;
  variants: Record<string, { url: string; width: number; height: number }>;
  placeholder: string;
}

export interface UploadResult {
  success: boolean;
  data?: UploadResultData;
  error?: string;
  aborted?: boolean;
  errorType?: string;
  errorDetails?: { type: string; message: string; details?: Record<string, unknown> };
}

export interface ImageUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (data: UploadResultData) => void;
  defaultFormat?: 'webp' | 'avif';
  variantSizes?: {
    lg?: number;
    md?: number;
    sm?: number;
    xs?: number;
  };
  allowMultiple?: boolean;
}

export type ImageFormat = 'webp' | 'avif';

export interface VariantSizeConfig {
  lg: number;
  md: number;
  sm: number;
  xs: number;
}

export interface UploadConfig {
  variantSizes: VariantSizeConfig;
  encodingQuality: {
    webp: number;
    avif: number;
    original: number;
    placeholder: number;
  };
  maxSizeBytes: number;
}
