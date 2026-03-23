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

export const getBlockLabel = (block: AnyBlock): string => {
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
        case 'bulletListItem':
            return truncateLabel(contentText || 'Bullet item');
        case 'numberedListItem':
            return truncateLabel(contentText || 'Numbered item');
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
    if (provider === 'youtube') return `https://www.youtube.com/watch?v=${videoId}`;
    if (provider === 'vimeo') return `https://vimeo.com/${videoId}`;
    return '';
};
