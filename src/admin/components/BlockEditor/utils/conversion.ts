/**
 * Data Conversion Utilities — Adapter-based dispatch
 *
 * Replaces the monolithic switch-case conversion with the BlockAdapter registry.
 * Each block type's conversion logic lives in its own adapter file.
 */
import type { ContentBlock, ContentDocument } from '@modules/content-blocks';
import { normalizeContentDocument } from '@modules/content-blocks';
import type { AppBlock } from '../types/editor.types';
import type { BlockAdapter, BlockAdapterContext } from '../blocks/BlockAdapter';
import { getBlockAdapter } from '../blocks/BlockAdapter';
import { registerAllBlockAdapters } from '../blocks/adapters';
import { parseInlineMarkdown, extractText } from './inlineContent';

// ── Init: register all adapters on module load ──────────────────────────────
registerAllBlockAdapters();

// ── Reverse map: editor block type → adapter ───────────────────────────────
const EDITOR_TYPE_TO_CONTENT_TYPE: Record<string, string> = {
  paragraph: 'paragraph',
  heading: 'heading',
  customImage: 'image',
  video: 'video',
  alert: 'tip_box',
  blockquote: 'blockquote',
  bulletListItem: 'list',
  numberedListItem: 'list',
  checkListItem: 'list',
  faqSection: 'main_faq',
  relatedContent: 'related_content',
  divider: 'divider',
  simpleTable: 'table',
  beforeAfter: 'before_after',
  roundupList: 'main_roundup',
  mainRecipe: 'main_recipe',
};

let editorTypeToAdapter: Map<string, BlockAdapter> | null = null;

function getEditorTypeMap(): Map<string, BlockAdapter> {
  if (editorTypeToAdapter) return editorTypeToAdapter;
  editorTypeToAdapter = new Map();

  for (const [editorType, contentType] of Object.entries(EDITOR_TYPE_TO_CONTENT_TYPE)) {
    const adapter = getBlockAdapter(contentType);
    if (adapter) {
      editorTypeToAdapter.set(editorType, adapter);
    }
  }
  return editorTypeToAdapter;
}

// ── List grouping helpers ───────────────────────────────────────────────────
const LIST_EDITOR_TYPES = new Set(['bulletListItem', 'numberedListItem', 'checkListItem']);

const editorTypeToListStyle: Record<string, 'ordered' | 'unordered' | 'checklist'> = {
    bulletListItem:   'unordered',
    numberedListItem: 'ordered',
    checkListItem:    'checklist',
};

function createUniqueEditorId(baseId: unknown, index: number, usedIds: Set<string>): string {
    const rawBase = typeof baseId === 'string' && baseId.trim()
        ? baseId.trim()
        : `block-${index}`;

    if (!usedIds.has(rawBase)) {
        usedIds.add(rawBase);
        return rawBase;
    }

    let suffix = 2;
    let nextId = `${rawBase}-${suffix}`;
    while (usedIds.has(nextId)) {
        suffix += 1;
        nextId = `${rawBase}-${suffix}`;
    }
    usedIds.add(nextId);
    return nextId;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert content_json (API/storage format) into BlockNote editor blocks.
 * The stored format is ContentDocument v1; legacy arrays are normalized here
 * only so local drafts/seeds do not crash the editor during development.
 */
export function contentJsonToBlocks(
    contentJson: unknown,
    context: BlockAdapterContext = {}
): AppBlock[] | undefined {
    if (!contentJson) return undefined;

    try {
        const { blocks } = normalizeContentDocument(contentJson);
        const rawBlocks: AppBlock[] = [];
        const usedEditorIds = new Set<string>();

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (!block || typeof block !== 'object') continue;

            const id = createUniqueEditorId(block.id, i, usedEditorIds);
            const contentType = block.type as string;
            const adapter = getBlockAdapter(contentType);

            if (adapter) {
                const partial = adapter.toEditor(block, context);
                // List blocks expand into multiple editor items
                if (contentType === 'list' && Array.isArray((block as { items?: unknown[] }).items)) {
                    const listItems = ((block as { items?: unknown[] }).items || []).map((item: unknown, j: number) => ({
                        id: createUniqueEditorId(`${id}-${j}`, i + j, usedEditorIds),
                        ...partial,
                        content: parseInlineMarkdown(typeof item === 'string' ? item : ''),
                    } as AppBlock));
                    rawBlocks.push(...listItems);
                } else {
                    rawBlocks.push({ id, ...partial } as AppBlock);
                }
            } else {
                // Fallback: unknown block types become paragraphs
                console.warn(`[conversion] No adapter for content type "${contentType}", falling back to paragraph`);
                rawBlocks.push({
                    id,
                    type: 'paragraph',
                    content: parseInlineMarkdown((block as { text?: string }).text || `[${contentType}]`),
                } as AppBlock);
            }
        }

        const cleanBlocks = rawBlocks.filter(
            (b): b is AppBlock => !!(b && typeof b === 'object' && typeof b.type === 'string')
        );

        return cleanBlocks.length > 0
            ? cleanBlocks
            : [{ id: 'init-0', type: 'paragraph', props: {}, content: [], children: [] }];
    } catch (error) {
        console.error('[conversion] Error converting contentJson to blocks:', error);
        return [{ id: 'error-0', type: 'paragraph', props: {}, content: [], children: [] }];
    }
}

/**
 * Convert BlockNote editor blocks back into ContentDocument v1 (API/storage format).
 *
 * Handles list item grouping: consecutive bulletListItem/numberedListItem/checkListItem
 * of the same style are merged into a single ListBlock.
 */
export function blocksToContentJson(blocks: AppBlock[]): ContentDocument {
    if (!blocks || !Array.isArray(blocks)) return normalizeContentDocument([]);

    const result: ContentBlock[] = [];
    let currentList: { type: 'list'; style: 'ordered' | 'unordered' | 'checklist'; items: string[] } | null = null;

    const editorTypeMap = getEditorTypeMap();

    for (const block of blocks) {
        // ── List grouping ────────────────────────────────────────────
        const editorType = String(block.type || '');
        if (LIST_EDITOR_TYPES.has(editorType)) {
            const style = editorTypeToListStyle[editorType] || 'unordered';
            const text = extractText((block as any).content);

            if (currentList && currentList.style === style) {
                currentList.items.push(text);
            } else {
                if (currentList) result.push(currentList as any);
                currentList = { type: 'list', style, items: [text] };
            }
            continue;
        }

        // Flush pending list
        if (currentList) {
            result.push(currentList as any);
            currentList = null;
        }

        // ── Adapter dispatch ─────────────────────────────────────────
        const adapter = editorTypeMap.get(editorType);
        if (adapter) {
            const contentBlock = adapter.fromEditor(block);
            if (contentBlock) {
                result.push({
                    id: block.id,
                    ...contentBlock,
                } as any);
            }
        } else {
            // Fallback: unknown editor types become paragraphs if they have text
            const text = extractText((block as any).content);
            if (text?.trim()) {
                result.push({ type: 'paragraph', text } as any);
            }
        }
    }

    // Flush trailing list
    if (currentList) result.push(currentList as any);

    return normalizeContentDocument(result);
}
