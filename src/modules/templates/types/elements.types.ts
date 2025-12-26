/**
 * Template Module - Element Types
 * ================================
 * Type definitions for all canvas elements supported in the template editor.
 */

// Element type discriminator
export type ElementType = 'text' | 'image' | 'shape' | 'logo' | 'overlay';

// Base element interface (all elements inherit from this)
export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  locked: boolean;
  visible?: boolean;
  opacity?: number;
}

// Text shadow configuration
export interface TextShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

// Text element with variable binding support
export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  binding?: string;                    // {{article.title}}, {{article.category}}
  fontFamily: string;
  fontSize: number;
  fontWeight: number;                  // 300, 400, 500, 600, 700, 800
  fill: string;
  align: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  shadow?: TextShadow;
  stroke?: string;
  strokeWidth?: number;
}

// Image element with dynamic source binding
export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  binding?: string;                    // {{article.image}}
  fit: 'cover' | 'contain' | 'fill';
  clipRadius?: number;
  imageOffset?: { x: number; y: number };
  imageScale?: number;
  placeholder?: string;                // Blurhash or LQIP
}

// Shape element (rectangles, circles, etc.)
export interface ShapeElement extends BaseElement {
  type: 'shape';
  shapeType?: 'rect' | 'circle' | 'ellipse';
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

// Logo element (company branding)
export interface LogoElement extends BaseElement {
  type: 'logo';
  src: string;
  fit: 'cover' | 'contain' | 'fill';
}

// Overlay element (semi-transparent layer)
export interface OverlayElement extends BaseElement {
  type: 'overlay';
  fill: string;                        // rgba format
}

// Union type for all elements
export type TemplateElement = 
  | TextElement 
  | ImageElement 
  | ShapeElement 
  | LogoElement 
  | OverlayElement;

// Type guards
export function isTextElement(el: TemplateElement): el is TextElement {
  return el.type === 'text';
}

export function isImageElement(el: TemplateElement): el is ImageElement {
  return el.type === 'image';
}

export function isShapeElement(el: TemplateElement): el is ShapeElement {
  return el.type === 'shape';
}

export function isLogoElement(el: TemplateElement): el is LogoElement {
  return el.type === 'logo';
}

export function isOverlayElement(el: TemplateElement): el is OverlayElement {
  return el.type === 'overlay';
}
