/**
 * useStructureTree Hook
 *
 * Manages the structure tree for the BlockEditor.
 * Handles flattening, grouping, and tree operations.
 */

import { useMemo } from 'react';
import type { Block } from '@blocknote/core';
import {
    flattenBlocks,
    groupConsecutiveBlocks,
    getBlockLabel,
    getBlockIcon,
} from '../utils/blockHelpers';
import { BLOCK_TYPE_ICONS } from '../utils/constants';

type AnyBlock = Block<any, any, any>;

export interface StructureItem {
    id: string;
    type: string;
    depth: number;
    parentId: string | null;
    level?: number;
    label: string;
    icon: any;
    itemCount?: number;
    isGroup?: boolean;
}

interface UseStructureTreeReturn {
    structureItems: StructureItem[];
    outlineItems: StructureItem[];
    visibleItems: StructureItem[];
}

/**
 * Build structure tree from blocks
 */
export function useStructureTree(
    blocks: AnyBlock[],
    panelTab: 'blocks' | 'list' | 'outline'
): UseStructureTreeReturn {
    // Flatten and group blocks
    const structureItems: StructureItem[] = useMemo(() => {
        const flatBlocks = flattenBlocks(blocks);
        const groupedBlocks = groupConsecutiveBlocks(flatBlocks);

        return groupedBlocks.map((item) => ({
            id: item.block.id,
            type: item.block.type,
            depth: item.depth,
            parentId: item.parentId,
            level: (item.block.props as any)?.level,
            label: getBlockLabel(item.block, item.itemCount),
            icon: getBlockIcon(item.block),
            itemCount: item.itemCount,
            isGroup: item.isGroup,
        }));
    }, [blocks]);

    // Filter to headings only for outline view
    const outlineItems: StructureItem[] = useMemo(
        () => structureItems.filter((item) => item.type === 'heading'),
        [structureItems]
    );

    // Get visible items based on panel tab
    const visibleItems: StructureItem[] = useMemo(() => {
        let items = panelTab === 'outline' ? outlineItems : structureItems;

        // Filter out trailing empty paragraph if it exists (common system-added block)
        if (panelTab === 'list' && items.length > 1) {
            const last = items[items.length - 1];
            if (last.type === 'paragraph' && (!last.label || last.label.trim() === '')) {
                return items.slice(0, -1);
            }
        }
        return items;
    }, [panelTab, outlineItems, structureItems]);

    return {
        structureItems,
        outlineItems,
        visibleItems,
    };
}

/**
 * Get indent depth for a structure item
 */
export function getIndentDepth(item: StructureItem, panelTab: string): number {
    if (panelTab === 'outline') {
        // For outline, use heading level (H2 = 0, H3 = 1, etc.)
        return Math.max(0, (item.level || 2) - 2);
    }
    // For list view, use block depth
    return item.depth || 0;
}

/**
 * Check if block can be converted
 */
export function canConvertBlock(type: string): boolean {
    return type === 'heading' || type === 'paragraph';
}

/**
 * Get available conversion options for a block
 */
export function getConversionOptions(type: string) {
    if (type === 'paragraph') {
        return [
            { type: 'heading', label: 'Heading 2', level: 2 },
            { type: 'heading', label: 'Heading 3', level: 3 },
            { type: 'heading', label: 'Heading 4', level: 4 },
            { type: 'heading', label: 'Heading 5', level: 5 },
            { type: 'heading', label: 'Heading 6', level: 6 },
        ];
    }
    if (type === 'heading') {
        return [{ type: 'paragraph', label: 'Paragraph' }];
    }
    return [];
}
