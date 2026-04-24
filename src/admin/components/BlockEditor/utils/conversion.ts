/**
 * Data Conversion Utilities — Adapter-based dispatch
 *
 * Replaces the monolithic switch-case conversion with the BlockAdapter registry.
 * Each block type's conversion logic lives in its own adapter file.
 */
import type { ContentBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../types/editor.types';
import type { BlockAdapter } from '../blocks/BlockAdapter';
import { getBlockAdapter, blockAdapters } from '../blocks/BlockAdapter';
import { registerAllBlockAdapters } from '../blocks/adapters';
import { parseInlineMarkdown, extractText } from './inlineContent';

// ── Init: register all adapters on module load ──────────────────────────────
registerAllBlockAdapters();

// ── Reverse map: editor block type → adapter ───────────────────────────────
let editorTypeToAdapter: Map<string, BlockAdapter> | null = null;

function getEditorTypeMap(): Map<string, BlockAdapter> {
    if (editorTypeToAdapter) return editorTypeToAdapter;
    editorTypeToAdapter = new Map();
    for (const adapter of blockAdapters.values()) {
        // Probe: call toEditor on a minimal block to discover the editor type
        // We build the map lazily from a known mapping instead.
        // (See buildEditorTypeMap below)
    }
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
        'faqSection':       'faq_section',
        'relatedContent':   'related_content',
        'divider':          'divider',
        'simpleTable':      'table',
        'beforeAfter':      'before_after',
        'roundupList':      'roundup_item',
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
 *
 * Accepts:
 * - A JSON string
 * - A raw array of ContentBlock objects
 * - A wrapped { blocks: [...] } object
 *
 * Returns an array of partial AppBlock objects for the editor.
 */
export function contentJsonToBlocks(
    contentJson: string | any[] | { blocks: any[] } | undefined
): AppBlock[] | undefined {
    if (!contentJson) return undefined;

    // Parse input
    let parsed = contentJson;
    if (typeof contentJson === 'string') {
        try {
            parsed = JSON.parse(contentJson);
        } catch (e) {
            console.warn('[conversion] contentJsonToBlocks: failed to parse JSON string', e);
            return undefined;
        }
    }

    let blocks = parsed as any[];
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        blocks = (parsed as any).blocks;
    }
    if (!blocks || !Array.isArray(blocks)) return undefined;

    try {
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
                if (contentType === 'list' && Array.isArray(block.items)) {
                    const listItems = block.items.map((item: any, j: number) => ({
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
                    content: parseInlineMarkdown(block.text || `[${contentType}]`),
                });
            }
        }

        const cleanBlocks = rawBlocks.filter(
            (b) => b && typeof b === 'object' && typeof b.type === 'string'
        );

        return cleanBlocks.length > 0
            ? (cleanBlocks as AppBlock[])
            : ([{ id: 'init-0', type: 'paragraph', props: {}, content: [], children: [] }] as AppBlock[]);
    } catch (error) {
        console.error('[conversion] Error converting contentJson to blocks:', error);
        return [{ id: 'error-0', type: 'paragraph', props: {}, content: [], children: [] }] as AppBlock[];
    }
}

/**
 * Convert BlockNote editor blocks back into ContentBlock[] (API/storage format).
 *
 * Handles list item grouping: consecutive bulletListItem/numberedListItem/checkListItem
 * of the same style are merged into a single ListBlock.
 */
export function blocksToContentJson(blocks: AppBlock[]): ContentBlock[] {
    if (!blocks || !Array.isArray(blocks)) return [];

    const result: ContentBlock[] = [];
    let currentList: { type: 'list'; style: 'ordered' | 'unordered' | 'checklist'; items: string[] } | null = null;

    const editorTypeMap = getEditorTypeMap();

    for (const block of blocks) {
        // ── List grouping ────────────────────────────────────────────
        if (LIST_EDITOR_TYPES.has(block.type)) {
            const style = editorTypeToListStyle[block.type] || 'unordered';
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
        const adapter = editorTypeMap.get(block.type);
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

    return result;
}
