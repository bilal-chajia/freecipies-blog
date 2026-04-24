/**
 * BlockAdapter Interface + Registry
 *
 * Contract every custom block must implement for two-way conversion
 * between ContentBlock (API/storage) and AppBlock (BlockNote editor).
 */
import type { ContentBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../types/editor.types';

/**
 * Adapter interface for custom blocks.
 *
 * @template T - Specific ContentBlock subtype this adapter handles.
 */
export interface BlockAdapter<T extends ContentBlock = ContentBlock> {
    /** Block type identifier (matches ContentBlock discriminant). */
    type: string;

    /** Convert a ContentBlock into a partial AppBlock for the editor. */
    toEditor(block: T): Partial<AppBlock>;

    /** Convert an AppBlock back into a ContentBlock. Returns null on failure. */
    fromEditor(block: AppBlock): T | null;

    /** Optional validation for editor props before persistence. */
    validate?(props: Record<string, unknown>): boolean;
}

/**
 * Global registry of block adapters keyed by block type.
 */
export const blockAdapters = new Map<string, BlockAdapter>();

/**
 * Register a block adapter in the global registry.
 *
 * @param adapter - The BlockAdapter implementation to register.
 */
export function registerBlockAdapter(adapter: BlockAdapter): void {
    if (blockAdapters.has(adapter.type)) {
        console.warn(`[BlockAdapter] Overwriting existing adapter for type "${adapter.type}"`);
    }
    blockAdapters.set(adapter.type, adapter);
}

/**
 * Retrieve a registered block adapter by type.
 *
 * @param type - The block type identifier.
 * @returns The BlockAdapter if found, otherwise undefined.
 */
export function getBlockAdapter(type: string): BlockAdapter | undefined {
    return blockAdapters.get(type);
}
