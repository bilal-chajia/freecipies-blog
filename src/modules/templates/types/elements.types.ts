/**
 * Template Module - Element Types
 * ================================
 * Canonical element types. Mirror docs/TEMPLATE_JSON_CONTRACT.md 1:1.
 * snake_case end-to-end: the in-memory editor shape IS the stored JSON shape.
 */

export type ElementType = 'text' | 'image_slot' | 'shape' | 'logo' | 'overlay';

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
  name?: string;
}

export interface TextShadow {
  enabled: boolean;
  color: string;
  blur: number;
  offset_x: number;
  offset_y: number;
}

export interface TextEffect {
  type: 'none' | 'shadow' | 'lift' | 'hollow' | 'outline' | 'echo' | 'glitch' | 'neon' | 'splice';
  color?: string;
  offset?: number;
  direction?: number;
  blur?: number;
  transparency?: number;
  thickness?: number;
}

export interface TextBackground {
  color?: string;
  opacity?: number;
  padding?: number;
  border_radius?: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content?: string;
  binding?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: string | number;
  font_style?: string;
  color?: string;
  text_align?: 'left' | 'center' | 'right' | 'justify';
  vertical_align?: 'top' | 'middle' | 'bottom';
  line_height?: number;
  letter_spacing?: number;
  text_transform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  text_decoration?: string;
  shadow?: TextShadow;
  effect?: TextEffect;
  background?: TextBackground;
  auto_fit?: boolean;
  wrap?: string;
  ellipsis?: boolean;
  stroke?: string;
  stroke_width?: number;
}

export interface ImageSlotElement extends BaseElement {
  type: 'image_slot';
  image_url?: string;
  src?: string;
  binding?: string;
  fit?: 'cover' | 'contain' | 'fill';
  clip_radius?: number;
  image_offset?: { x: number; y: number };
  image_scale?: number;
  placeholder?: string;
  border_radius?: number;
  source_type?: string;
}

export interface ShapeElement extends BaseElement {
  type: 'shape';
  shape_type?: 'rect' | 'circle' | 'ellipse';
  fill?: string;
  stroke?: string;
  stroke_width?: number;
  border_radius?: number;
}

export interface LogoElement extends BaseElement {
  type: 'logo';
  src?: string;
  fit?: 'cover' | 'contain' | 'fill';
}

export interface OverlayElement extends BaseElement {
  type: 'overlay';
  fill?: string;
}

export type TemplateElement =
  | TextElement
  | ImageSlotElement
  | ShapeElement
  | LogoElement
  | OverlayElement;

export function isTextElement(el: TemplateElement): el is TextElement {
  return el.type === 'text';
}

export function isImageSlotElement(el: TemplateElement): el is ImageSlotElement {
  return el.type === 'image_slot';
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
