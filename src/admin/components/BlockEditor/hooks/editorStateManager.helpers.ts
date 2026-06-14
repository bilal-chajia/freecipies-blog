/**
 * Pure helpers for useEditorStateManager.
 *
 * The hook owns orchestration (the single onEditorContentChange subscription,
 * the 800ms debounce, and the React state/refs). These functions carry the
 * three heavy responsibilities it used to inline — structure building, per-block
 * validation, and serialization/emit — so each can be unit-tested in isolation
 * without changing the hook's timing.
 */
import type { LucideIcon } from 'lucide-react';
import {
    flattenBlocks,
    groupConsecutiveBlocks,
    getBlockLabel,
    getBlockIcon,
} from '../utils/blockHelpers';
import { blocksToContentJson } from '../utils/conversion';
import { validateBlockProps } from '../blocks/registry';
import { useBlockEditorStore } from '../store/blockEditorStore';

export type FlattenedBlock = ReturnType<typeof flattenBlocks>[number];

export interface StructureItem {
    id: string;
    type: string;
    depth: number;
    parent_id: string | null;
    level?: number;
    label: string;
    icon: LucideIcon;
}

/** Build the sidebar structure rows from already-flattened blocks. */
export function buildStructureItems(flatBlocks: FlattenedBlock[]): StructureItem[] {
    return groupConsecutiveBlocks(flatBlocks).map((item) => ({
        id: item.block.id,
        type: item.block.type,
        depth: item.depth,
        parent_id: item.parent_id,
        level: (item.block.props as Record<string, unknown> | undefined)?.level as number | undefined,
        label: getBlockLabel(item.block, item.itemCount),
        icon: getBlockIcon(item.block),
    }));
}

/** Run registry-driven per-block validation, writing results to the store. */
export function runBlockValidation(flatBlocks: FlattenedBlock[]): void {
    const { setBlockError, clearBlockError } = useBlockEditorStore.getState();
    flatBlocks.forEach(({ block }) => {
        const errors = validateBlockProps(
            String(block.type),
            block.props as Record<string, unknown>
        );
        if (errors.length > 0) {
            setBlockError(block.id, errors);
        } else {
            clearBlockError(block.id);
        }
    });
}

interface SerializeArgs {
    blocks: Parameters<typeof blocksToContentJson>[0];
    onChange?: (serialized: string) => void;
    lastEmittedValueRef: React.MutableRefObject<string>;
}

/**
 * Serialize the document and emit content changes only when they differ from the
 * last emitted value (preserving the hydration echo-guard contract).
 */
export function emitSerializedContent({
    blocks,
    onChange,
    lastEmittedValueRef,
}: SerializeArgs): void {
    if (onChange) {
        const serialized = JSON.stringify(blocksToContentJson(blocks), null, 2);
        if (serialized !== lastEmittedValueRef.current) {
            lastEmittedValueRef.current = serialized;
            onChange(serialized);
        }
    }
}
