import type { Block } from '@blocknote/core';
import type { LucideIcon } from 'lucide-react';
import { MAX_STRUCTURE_LABEL, BLOCK_TYPE_ICONS } from './constants';
import { extractText, truncateInlineContent, serializeInlineContent } from './inlineContent';
import type { ContentBlock } from '../../../../modules/articles/types/content-blocks.types';
import type { ImageVariants, ImageSlot } from '../../../../shared/types/images';

type AnyBlock = Block<any, any, any>;

export const truncateLabel = (text: string | null | undefined): string => {
    const value = String(text || '').trim();
    if (!value) return '';
    if (value.length <= MAX_STRUCTURE_LABEL) return value;
    return `${value.slice(0, MAX_STRUCTURE_LABEL - 3)}...`;
};

interface FlattenedBlock {
    block: AnyBlock;
    depth: number;
    parentId: string | null;
}

export const flattenBlocks = (blocks: AnyBlock[], depth = 0, acc: FlattenedBlock[] = [], parentId: string | null = null): FlattenedBlock[] => {
    (blocks || []).forEach((block) => {
        acc.push({ block, depth, parentId });
        if (Array.isArray(block.children) && block.children.length > 0) {
            flattenBlocks(block.children as AnyBlock[], depth + 1, acc, block.id);
        }
    });
    return acc;
};

export interface GroupedFlattenedBlock extends FlattenedBlock {
    itemCount?: number;
    isGroup?: boolean;
}

export const groupConsecutiveBlocks = (flatBlocks: FlattenedBlock[]): GroupedFlattenedBlock[] => {
    const result: GroupedFlattenedBlock[] = [];
    for (let i = 0; i < flatBlocks.length; i++) {
        const current = flatBlocks[i];
        const isList = ['bulletListItem', 'numberedListItem', 'checkListItem'].includes(current.block.type);

        if (isList) {
            const listType = current.block.type;
            const depth = current.depth;
            const parentId = current.parentId;

            let count = 1;
            let j = i + 1;
            while (j < flatBlocks.length) {
                const next = flatBlocks[j];
                // Group if same type, same depth, and same parent
                if (next.block.type === listType && next.depth === depth && next.parentId === parentId) {
                    count++;
                    j++;
                } else {
                    break;
                }
            }

            result.push({
                ...current,
                itemCount: count,
                isGroup: count > 1
            });
            i = j - 1;
        } else {
            result.push(current);
        }
    }
    return result;
};

export const getBlockLabel = (block: AnyBlock, itemCount: number = 1): string => {
    const contentText = extractText(block.content as any);
    const type = block.type as any;
    switch (type) {
        case 'heading':
            return truncateLabel(contentText || `Heading ${(block.props as any)?.level || ''}`);
        case 'paragraph': {
            const previewNodes = truncateInlineContent(block.content as any, 15);
            const previewText = serializeInlineContent(previewNodes as any);
            const trimmed = (previewText || '').trim();
            if (!trimmed) return 'Paragraph';
            return `Paragraph (${trimmed})`;
        }
        case 'bulletListItem': {
            const label = itemCount > 1 ? `List (${itemCount} items)` : (truncateLabel(contentText) || 'Bullet item');
            return label;
        }
        case 'numberedListItem': {
            const label = itemCount > 1 ? `Numbered List (${itemCount} items)` : (truncateLabel(contentText) || 'Numbered item');
            return label;
        }
        case 'checkListItem': {
            const label = itemCount > 1 ? `Checklist (${itemCount} items)` : (truncateLabel(contentText) || 'Check item');
            return label;
        }
        case 'alert':
            return truncateLabel((block.props as any)?.type ? `Alert (${(block.props as any).type})` : 'Alert');
        case 'faqSection':
            return truncateLabel((block.props as any)?.title || 'FAQ');
        case 'customImage':
            return 'Image';
        case 'video':
            return 'Video';
        case 'divider':
            return 'Divider';
        case 'simpleTable':
            return 'Table';
        case 'recipeEmbed':
            return truncateLabel((block.props as any)?.headline || 'Embedded recipe');
        case 'relatedContent':
            return truncateLabel((block.props as any)?.title || 'Related content');
        case 'beforeAfter':
            return 'Before / After';
        case 'blockquote':
            return truncateLabel(contentText || 'Quote');
        default:
            return truncateLabel(contentText || block.type);
    }
};
export const getBlockIcon = (blockOrType: string | Block<any, any, any>): any => {
    const type = typeof blockOrType === 'string' ? blockOrType : blockOrType?.type;
    const props = typeof blockOrType === 'object' ? (blockOrType as any)?.props : {};
    const level = props?.level;
    
    const iconOrFn = BLOCK_TYPE_ICONS[type] || BLOCK_TYPE_ICONS.default;
    
    if (typeof iconOrFn === 'function' && type === 'heading') {
        return (iconOrFn as any)(level);
    }
    return iconOrFn as LucideIcon;
};

export const normalizeTipVariant = (variant: string | undefined): 'tip' | 'warning' | 'info' | 'note' => {
    if (variant === 'error') return 'warning';
    if (variant === 'success') return 'tip';
    if (variant === 'note' || variant === 'tip' || variant === 'info' || variant === 'warning') {
        return variant;
    }
    return 'warning';
};

export const resolveCoverUrl = (cover: string | ImageSlot | undefined): string => {
    if (!cover) return '';
    if (typeof cover === 'string') return cover;
    const variants = (cover.variants || {}) as ImageVariants;
    return (
        variants.md?.url ||
        variants.sm?.url ||
        variants.lg?.url ||
        variants.xs?.url ||
        (cover as any).url ||
        ''
    );
};

export const buildVideoUrl = (provider: string | undefined, videoId: string | undefined): string => {
    if (!provider || !videoId) return '';
    if (provider === 'youtube') return `https://www.youtube.com/embed/${videoId}`;
    if (provider === 'vimeo') return `https://player.vimeo.com/video/${videoId}`;
    return '';
};
