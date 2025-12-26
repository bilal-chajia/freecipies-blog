/**
 * Tags Module - TypeScript Types
 */

import type { Tag } from '../schema/tags.schema';
import type { ExtractedTagStyle } from '@shared/utils';

export interface TagFilter {
  group: string;
  filters: string[];
}

export type HydratedTag = Tag & ExtractedTagStyle & {
  route: string;
};

export interface TagStyle {
  svg_code?: string;
  color?: string;
  variant?: string;
}
