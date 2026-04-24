import type { LucideIcon } from 'lucide-react';
import type { InlineContent } from '@blocknote/core';

export type InlineNode = InlineContent<any, any>;

export interface BlockIconMap {
  [key: string]: LucideIcon | ((level?: number) => LucideIcon);
  default: LucideIcon;
}

export interface MarkdownLinkMatch {
  start: number;
  end: number;
  label: string;
}

export interface ParsedStyles {
  nodes: InlineNode[];
  hasStyle: boolean;
}

export interface BlockStructureRow {
  id: string;
  type: string;
  depth: number;
  parentId: string | null;
  level?: number;
  label: string;
  icon: LucideIcon;
}

export interface BlockEditorContextPayload {
  categorySlug?: string | null;
  tagSlugs?: string[];
  currentSlug?: string | null;
}

export interface BlockEditorProps {
  value: string | unknown[] | { blocks: unknown[] } | undefined;
  onChange?: (nextValue: string) => void;
  contentType?: 'article' | 'recipe' | 'roundup';
  isSidebarOpen?: boolean;
  onStructureUpdate?: (payload: { items: BlockStructureRow[]; activeBlockId: string | null }) => void;
  onSelectedBlockChange?: (block: unknown | null) => void;
  // Context-bridged props eliminated (Phase 3):
  // - recipe/onRecipeChange → MainRecipeBlock uses recipeJson prop
  // - faqs/onFaqsChange/faqs/onFaqTitleChange → FAQSectionBlock uses itemsJson prop
  // - roundup → RoundupListBlock is self-contained
  onRoundupChange?: (nextValue: unknown) => void; // Phase 4 will merge into content_json
  onEditorReady?: (editor: unknown) => void;
  forceSelectBlockId?: string | null;
  onForceSelectHandled?: () => void;
  placeholder?: string;
  className?: string;
  context?: BlockEditorContextPayload;
}
