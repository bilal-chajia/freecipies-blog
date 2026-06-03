/**
 * Unified Block Registry — single source of truth for block identity.
 *
 * Each entry describes one editor block type: its content_json type, whether it
 * is a custom (non-default) BlockNote spec, and optional slash-menu metadata.
 * Downstream modules DERIVE their lookups from here instead of hand-maintaining
 * parallel lists:
 *   - utils/conversion.ts → editor-type → content-type map (+ adapter-coverage guard)
 *   - utils/constants.ts  → CUSTOM_BLOCK_TYPES
 *   - useSlashMenu.ts     → custom slash-menu items
 *   - schema.ts           → custom block specs (the React factories live there)
 *
 * This file is a leaf module: it imports only icons, so it can be pulled in
 * cheaply from anywhere (constants, the adapter round-trip tests, etc.) without
 * dragging in the adapter/React graph or creating import cycles.
 */
import type { LucideIcon } from 'lucide-react';
import {
  Image as ImageIcon,
  Video,
  SplitSquareVertical,
  AlertTriangle,
  HelpCircle,
  LayoutGrid,
  Table,
  Minus,
  List,
  ClipboardList,
} from 'lucide-react';

export interface SlashMeta {
  title: string;
  group: string;
  subtext: string;
  aliases: string[];
  icon: LucideIcon;
  /** Tailwind classes for the slash-menu icon. */
  iconClassName: string;
  /** Default props passed to safeInsertBlock when inserting. */
  defaultProps?: Record<string, unknown>;
  /** When set, the item only shows (pinned to the top) for this contentType. */
  contextual?: 'recipe';
}

export interface BlockDefinition {
  /** BlockNote editor block type id. */
  editorType: string;
  /** content_json block type (matches the storage adapter's `.type`). */
  contentType: string;
  /** True for custom (createReactBlockSpec) blocks registered in the schema. */
  isCustom: boolean;
  /** Slash-menu metadata; omit for blocks not offered in the slash menu. */
  slash?: SlashMeta;
  /**
   * Optional per-block props validator. Returns an array of error messages
   * (empty = valid). Dispatched by useEditorStateManager instead of a
   * hardcoded per-type if-chain, so new blocks add their rules here.
   */
  validate?: (props: Record<string, unknown>) => string[];
}

/**
 * Canonical block list. Custom entries are ordered to match the slash-menu
 * display order; default-mapped BlockNote blocks follow.
 */
export const BLOCK_REGISTRY: BlockDefinition[] = [
  // ── Custom blocks (registered in schema.ts) ────────────────────────────────
  {
    editorType: 'customImage',
    contentType: 'image',
    isCustom: true,
    slash: {
      title: 'Image',
      group: 'Media',
      subtext: 'Upload or select from library',
      aliases: ['image', 'photo', 'picture', 'media'],
      icon: ImageIcon,
      iconClassName: 'size-4 text-blue-500',
    },
    validate: (props) =>
      !props.url && !props.mediaId ? ['An image must be uploaded or selected.'] : [],
  },
  {
    editorType: 'video',
    contentType: 'video',
    isCustom: true,
    slash: {
      title: 'Video',
      group: 'Media',
      subtext: 'Embed a video player',
      aliases: ['video', 'movie', 'youtube', 'media'],
      icon: Video,
      iconClassName: 'size-4 text-indigo-500',
    },
    validate: (props) =>
      props.url && (!props.provider || !props.videoId)
        ? ['Invalid video URL. YouTube or Vimeo required.']
        : [],
  },
  {
    editorType: 'beforeAfter',
    contentType: 'before_after',
    isCustom: true,
    slash: {
      title: 'Before / After',
      group: 'Media',
      subtext: 'Compare two images',
      aliases: ['before', 'after', 'compare'],
      icon: SplitSquareVertical,
      iconClassName: 'size-4 text-purple-500',
    },
  },
  {
    editorType: 'alert',
    contentType: 'tip_box',
    isCustom: true,
    slash: {
      title: 'Alert Box',
      group: 'Engagement',
      subtext: 'Insert a tip/warning box',
      aliases: ['alert', 'tip', 'warning'],
      icon: AlertTriangle,
      iconClassName: 'size-4 text-amber-500',
      defaultProps: { type: 'warning' },
    },
  },
  {
    editorType: 'faqSection',
    contentType: 'main_faq',
    isCustom: true,
    slash: {
      title: 'FAQ Section',
      group: 'Engagement',
      subtext: 'Add structured questions',
      aliases: ['faq', 'questions', 'answers'],
      icon: HelpCircle,
      iconClassName: 'size-4 text-sky-500',
    },
  },
  {
    editorType: 'relatedContent',
    contentType: 'related_content',
    isCustom: true,
    slash: {
      title: 'Related Content',
      group: 'Linked Content',
      subtext: 'Curate related recipes or articles',
      aliases: ['related', 'recommend'],
      icon: LayoutGrid,
      iconClassName: 'size-4 text-indigo-500',
    },
  },
  {
    editorType: 'simpleTable',
    contentType: 'table',
    isCustom: true,
    slash: {
      title: 'Table',
      group: 'Layout',
      subtext: 'Add a table',
      aliases: ['table', 'grid', 'matrix'],
      icon: Table,
      iconClassName: 'size-4 text-muted-foreground',
    },
  },
  {
    editorType: 'divider',
    contentType: 'divider',
    isCustom: true,
    slash: {
      title: 'Divider',
      group: 'Layout',
      subtext: 'Add a horizontal divider',
      aliases: ['divider', 'separator', 'line'],
      icon: Minus,
      iconClassName: 'size-4 text-muted-foreground/70',
    },
  },
  {
    editorType: 'roundupList',
    contentType: 'main_roundup',
    isCustom: true,
    slash: {
      title: 'Roundup List',
      group: 'Engagement',
      subtext: 'Manage a collection of curated recipes',
      aliases: ['roundup', 'list', 'curated', 'collection'],
      icon: List,
      iconClassName: 'size-4 text-rose-500',
    },
  },
  {
    editorType: 'mainRecipe',
    contentType: 'main_recipe',
    isCustom: true,
    slash: {
      title: 'Recipe Details',
      group: 'Primary',
      subtext: 'The main recipe editor',
      aliases: ['recipe', 'main', 'details'],
      icon: ClipboardList,
      iconClassName: 'size-4 text-rose-500',
      contextual: 'recipe',
    },
  },

  // ── Default BlockNote blocks (type mapping only) ───────────────────────────
  { editorType: 'paragraph', contentType: 'paragraph', isCustom: false },
  { editorType: 'heading', contentType: 'heading', isCustom: false },
  { editorType: 'blockquote', contentType: 'blockquote', isCustom: false },
  { editorType: 'bulletListItem', contentType: 'list', isCustom: false },
  { editorType: 'numberedListItem', contentType: 'list', isCustom: false },
  { editorType: 'checkListItem', contentType: 'list', isCustom: false },
];

/** editor block type → content_json block type. */
export const EDITOR_TYPE_TO_CONTENT_TYPE: Record<string, string> =
  Object.fromEntries(BLOCK_REGISTRY.map((d) => [d.editorType, d.contentType]));

/** Editor block types backed by a custom schema spec. */
export const CUSTOM_EDITOR_TYPES: string[] = BLOCK_REGISTRY.filter(
  (d) => d.isCustom
).map((d) => d.editorType);

/** Registry entries that expose slash-menu metadata. */
export const SLASH_BLOCKS = BLOCK_REGISTRY.filter(
  (d): d is BlockDefinition & { slash: SlashMeta } => Boolean(d.slash)
);

/** editor block type → registry definition. */
const EDITOR_TYPE_TO_DEFINITION: Record<string, BlockDefinition> =
  Object.fromEntries(BLOCK_REGISTRY.map((d) => [d.editorType, d]));

/**
 * Run a block's registered props validator. Returns the error messages for the
 * block (empty array when valid or when the type has no validator).
 */
export function validateBlockProps(
  editorType: string,
  props: Record<string, unknown>
): string[] {
  return EDITOR_TYPE_TO_DEFINITION[editorType]?.validate?.(props) ?? [];
}
