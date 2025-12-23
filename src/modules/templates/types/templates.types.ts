/**
 * Templates Module - TypeScript Types
 */

export interface TemplateElement {
  id: string;
  type: 'text' | 'image' | 'shape' | 'background';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
  visible?: boolean;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
  // Image-specific
  src?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  // Shape-specific
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  borderRadius?: number;
}

export interface TemplateConfig {
  width: number;
  height: number;
  backgroundColor?: string;
  elements: TemplateElement[];
}
