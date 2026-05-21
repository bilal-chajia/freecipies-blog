/**
 * Data Conversion Utilities — Adapter-based dispatch
 *
 * Replaces the monolithic switch-case conversion with the BlockAdapter registry.
 * Each block type's conversion logic lives in its own adapter file.
 */
import type { ContentBlock, ContentDocument } from '@modules/content-blocks';
import { normalizeContentDocument } from '@modules/content-blocks';
import type { AppBlock } from '../types/editor.types';
import type { BlockAdapter } from '../blocks/BlockAdapter';
import { getBlockAdapter } from '../blocks/BlockAdapter';
import { registerAllBlockAdapters } from '../blocks/adapters';
import { parseInlineMarkdown, extractText } from './inlineContent';

// ── Init: register all adapters on module load ──────────────────────────────
registerAllBlockAdapters();

// ── Reverse map: editor block type → adapter ───────────────────────────────
let editorTypeToAdapter: Map<string, BlockAdapter> | null = null;

function getEditorTypeMap(): Map<string, BlockAdapter> {
    if (editorTypeToAdapter) return editorTypeToAdapter;
    editorTypeToAdapter = new Map();
    // Hardcoded mapping — kept in sync with adapter implementations
    const mapping: Record<string, string> = {
        'paragraph':        'paragraph',
        'heading':          'heading',
        'customImage':      'image',
        'video':            'video',
        'alert':            'tip_box',
        'blockquote':       'blockquote',
        'bulletListItem':   'list',
        'numberedListItem': 'list',
        'checkListItem':    'list',
        'faqSection':       'main_faq',
        'relatedContent':   'related_content',
        'divider':          'divider',
        'simpleTable':      'table',
        'beforeAfter':      'before_after',
        'roundupList': 'main_roundup',
        'mainRecipe': 'main_recipe',
  };

    for (const [editorType, contentType] of Object.entries(mapping)) {
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

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Convert content_json (API/storage format) into BlockNote editor blocks.
 * The stored format is ContentDocument v1; legacy arrays are normalized here
 * only so local drafts/seeds do not crash the editor during development.
 */
export function contentJsonToBlocks(
    contentJson: unknown
): AppBlock[] | undefined {
    if (!contentJson) return undefined;

    try {
        const { blocks } = normalizeContentDocument(contentJson);
        const rawBlocks: any[] = [];

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (!block || typeof block !== 'object') continue;

            const id = block.id || `block-${i}`;
            const contentType = block.type as string;
            const adapter = getBlockAdapter(contentType);

            if (adapter) {
                const partial = adapter.toEditor(block);
                // List blocks expand into multiple editor items
                if (contentType === 'list' && Array.isArray((block as any).items)) {
                    const listItems = (block as any).items.map((item: any, j: number) => ({
                        id: `${id}-${j}`,
                        ...partial,
                        content: parseInlineMarkdown(typeof item === 'string' ? item : ''),
                    }));
                    rawBlocks.push(...listItems);
                } else {
                    rawBlocks.push({ id, ...partial });
                }
            } else {
                // Fallback: unknown block types become paragraphs
                console.warn(`[conversion] No adapter for content type "${contentType}", falling back to paragraph`);
                rawBlocks.push({
                    id,
                    type: 'paragraph',
                    content: parseInlineMarkdown((block as any).text || `[${contentType}]`),
                });
            }
        }

        const cleanBlocks = rawBlocks.filter(
            (b) => b && typeof b === 'object' && typeof b.type === 'string'
        );

        return cleanBlocks.length > 0
            ? (cleanBlocks as unknown as AppBlock[])
            : ([{ id: 'init-0', type: 'paragraph', props: {}, content: [], children: [] }] as unknown as AppBlock[]);
    } catch (error) {
        console.error('[conversion] Error converting contentJson to blocks:', error);
        return [{ id: 'error-0', type: 'paragraph', props: {}, content: [], children: [] }] as unknown as AppBlock[];
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
                result.push(contentBlock as any);
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
