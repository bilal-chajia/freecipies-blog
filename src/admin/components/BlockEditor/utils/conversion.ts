import { 
    parseInlineMarkdown, 
    extractText 
} from './inlineContent';
import { 
    normalizeTipVariant, 
    buildVideoUrl, 
    resolveCoverUrl 
} from './blockHelpers';
import { parseJsonArray, parseJsonObject } from './json';
import type { ContentBlock } from '../../../../modules/articles/types/content-blocks.types';
import type { Block } from '@blocknote/core';
import type { ImageVariants } from '../../../../shared/types/images';
import { resolveVariantUrl } from '../../../../shared/types/images';

type AnyBlock = Block<any, any, any>;

/**
 * Data Conversion Utilities (TypeScript)
 */

export function contentJsonToBlocks(contentJson: string | any[] | { blocks: any[] } | undefined): AnyBlock[] | undefined {
    if (!contentJson) return undefined;

    // Handle string input
    let parsed = contentJson;
    if (typeof contentJson === 'string') {
        try {
            parsed = JSON.parse(contentJson);
        } catch (e) {
            console.warn('contentJsonToBlocks: failed to parse JSON string', e);
            return undefined;
        }
    }

    // Handle both { blocks: [...] } and direct array formats
    let blocks = parsed as any[];
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        blocks = (parsed as any).blocks;
    }

    if (!blocks || !Array.isArray(blocks)) {
        return undefined;
    }

    try {
        const rawBlocks = blocks.map((block: any, index: number) => {
            if (!block || typeof block !== 'object') return null;
            const id = block.id || `block-${index}`;
            const type = block.type as any;

            switch (type) {
                case 'paragraph':
                    return { id, type: 'paragraph', content: parseInlineMarkdown(block.text || '') };

                case 'heading':
                    return {
                        id,
                        type: 'heading',
                        props: { level: block.level || 2 },
                        content: parseInlineMarkdown(block.text || ''),
                    };

                case 'list':
                    const listType = block.style === 'ordered'
                        ? 'numberedListItem'
                        : block.style === 'checklist'
                            ? 'checkListItem'
                            : 'bulletListItem';
                    if (Array.isArray(block.items)) {
                        return block.items.map((item: any, i: number) => ({
                            id: `${id}-${i}`,
                            type: listType,
                            content: parseInlineMarkdown(typeof item === 'string' ? item : ''),
                        }));
                    }
                    return { id, type: listType, content: '' };

                case 'blockquote':
                    return { id, type: 'blockquote', content: parseInlineMarkdown(block.text || '') };

                case 'image':
                    const imgVariants = (block.variants || {}) as ImageVariants;
                    const bestUrl =
                        resolveVariantUrl(imgVariants.lg) ||
                        resolveVariantUrl(imgVariants.md) ||
                        resolveVariantUrl(imgVariants.sm) ||
                        resolveVariantUrl(imgVariants.xs) ||
                        resolveVariantUrl(imgVariants.original) ||
                        '';
                    const bestVariant: any = imgVariants.lg || imgVariants.md || imgVariants.sm || imgVariants.xs || imgVariants.original || {};

                    return {
                        id,
                        type: 'customImage',
                        props: {
                            url: bestUrl,
                            alt: block.alt || '',
                            caption: block.caption || '',
                            credit: block.credit || '',
                            width: bestVariant.width || 512,
                            height: bestVariant.height || 0,
                            mediaId: block.media_id?.toString() || '',
                            variantsJson: JSON.stringify(imgVariants),
                        },
                    };

                case 'video': {
                    const url = block.url || buildVideoUrl(block.provider, block.videoId);
                    return {
                        id,
                        type: 'video',
                        props: {
                            url,
                            provider: block.provider || '',
                            videoId: block.videoId || '',
                            aspectRatio: block.aspectRatio || '16:9',
                        }
                    };
                }

                case 'tip_box':
                case 'alert':
                    return {
                        id,
                        type: 'alert',
                        props: {
                            type: normalizeTipVariant(block.variant),
                            title: block.title || '',
                        },
                        content: parseInlineMarkdown(block.text || ''),
                    };

                case 'faq_section':
                    return {
                        id,
                        type: 'faqSection',
                        props: {
                            title: block.title || 'Frequently Asked Questions',
                            items: JSON.stringify(block.items || []),
                        }
                    };

                case 'divider':
                    return {
                        id,
                        type: 'divider',
                        props: { style: block.style || 'solid' }
                    };

                case 'main_recipe':
                    return {
                        id,
                        type: 'mainRecipe',
                        props: {}
                    };

                case 'roundup_item':
                    const parsedArticleId = parseInt(block.article_id, 10);
                    return {
                        id,
                        type: 'roundupItem',
                        props: {
                            articleId: Number.isFinite(parsedArticleId) ? parsedArticleId.toString() : '',
                            externalUrl: block.external_url || '',
                            title: block.title || '',
                            subtitle: block.subtitle || '',
                            note: block.note || '',
                            cover: block.cover || '',
                        }
                    };

                case 'roundup_list':
                case 'roundupList':
                    return {
                        id,
                        type: 'roundupList',
                        props: {
                            title: block.title || '',
                            description: block.description || '',
                            itemsJson: JSON.stringify(block.items || []),
                            showStats: block.show_stats !== false,
                        },
                    };

                case 'related_content': {
                    const parsedLimit = parseInt(block.limit, 10);
                    return {
                        id,
                        type: 'relatedContent',
                        props: {
                            title: block.title || '',
                            layout: block.layout || 'grid',
                            mode: block.mode || 'manual',
                            limit: Number.isFinite(parsedLimit) ? parsedLimit : 4,
                            recipesJson: JSON.stringify(block.recipes || []),
                            articlesJson: JSON.stringify(block.articles || []),
                            roundupsJson: JSON.stringify(block.roundups || []),
                        }
                    };
                }
                case 'before_after': {
                    return {
                        id,
                        type: 'beforeAfter',
                        props: {
                            layout: block.layout || 'slider',
                            beforeJson: JSON.stringify(block.before || null),
                            afterJson: JSON.stringify(block.after || null),
                        },
                    };
                }
                case 'table':
                case 'simpleTable': {
                    return {
                        id,
                        type: 'simpleTable',
                        props: {
                            headersJson: JSON.stringify(block.headers || block.props?.headersJson || []),
                            rowsJson: JSON.stringify(block.rows || block.props?.rowsJson || []),
                        }
                    };
                }

                default:
                    return { id, type: 'paragraph', content: block.text || `[${block.type}]` };
            }
        }).flat();

        const cleanBlocks = rawBlocks.filter(b => b && typeof b === 'object' && typeof (b as any).type === 'string');
        return cleanBlocks.length > 0 ? cleanBlocks as AnyBlock[] : [{ id: 'init-0', type: 'paragraph', props: {}, content: [], children: [] }] as AnyBlock[];
    } catch (error) {
        console.error('Error converting contentJson to blocks:', error);
        return [{ id: 'error-0', type: 'paragraph', props: {}, content: [], children: [] }] as AnyBlock[];
    }
}

export function blocksToContentJson(blocks: AnyBlock[]): ContentBlock[] {
    if (!blocks || !Array.isArray(blocks)) {
        return [];
    }

    const result: ContentBlock[] = [];
    let currentList: any = null;

    for (const block of blocks) {
        if (block.type === 'bulletListItem' || block.type === 'numberedListItem' || block.type === 'checkListItem') {
            const style = block.type === 'numberedListItem'
                ? 'ordered'
                : block.type === 'checkListItem'
                    ? 'checklist'
                    : 'unordered';
            const text = extractText(block.content as any);

            if (currentList && currentList.style === style) {
                currentList.items.push(text);
            } else {
                if (currentList) result.push(currentList);
                currentList = { type: 'list', style, items: [text] };
            }
            continue;
        }

        if (currentList) {
            result.push(currentList);
            currentList = null;
        }

        const props = block.props as any;
        const type = block.type as any;

        switch (type) {
            case 'paragraph': {
                const text = extractText(block.content as any);
                if (text.trim()) {
                    result.push({ type: 'paragraph', text } as any);
                }
                break;
            }

            case 'blockquote':
                result.push({
                    type: 'blockquote',
                    text: extractText(block.content as any),
                } as any);
                break;

            case 'heading':
                result.push({
                    type: 'heading',
                    level: (props?.level || 2) as any,
                    text: extractText(block.content as any),
                } as any);
                break;

            case 'customImage':
                if (props?.url) {
                    let variants = { lg: { url: props.url } };
                    const parsed = parseJsonObject(props.variantsJson, {});
                    if (Object.keys(parsed).length > 0) {
                        variants = parsed as any;
                    }

                    result.push({
                        type: 'image',
                        media_id: props.mediaId ? parseInt(props.mediaId, 10) : null,
                        alt: props.alt || '',
                        caption: props.caption || '',
                        credit: props.credit || '',
                        variants,
                    } as any);
                }
                break;

            case 'video':
                if (props?.videoId || props?.url) {
                    result.push({
                        type: 'video',
                        url: props.url || '',
                        provider: props.provider as any,
                        videoId: props.videoId || '',
                        aspectRatio: (props.aspectRatio || '16:9') as any,
                    } as any);
                }
                break;

            case 'alert': {
                const alertText = extractText(block.content as any);
                if (alertText.trim()) {
                    const alertObj: any = {
                        type: 'tip_box',
                        variant: normalizeTipVariant(props?.type),
                        text: alertText,
                    };
                    if (props?.title) {
                        alertObj.title = props.title;
                    }
                    result.push(alertObj);
                }
                break;
            }

            case 'faqSection':
                result.push({ type: 'faq_section' } as any);
                break;

            case 'divider':
                result.push({ type: 'divider' } as any);
                break;

            case 'mainRecipe':
                result.push({ type: 'main_recipe' } as any);
                break;

            case 'roundupList':
                result.push({
                    type: 'roundup_list',
                    title: props.title || '',
                    description: props.description || '',
                    items: parseJsonArray(props.itemsJson),
                    show_stats: props.showStats !== false,
                } as any);
                break;

            case 'roundupItem':
                const parsedId = parseInt(props.articleId, 10);
                result.push({
                    type: 'roundup_item',
                    article_id: Number.isFinite(parsedId) ? parsedId : null,
                    external_url: props.externalUrl || '',
                    title: props.title || '',
                    subtitle: props.subtitle || '',
                    note: props.note || '',
                    cover: props.cover || null,
                } as any);
                break;

            case 'relatedContent': {
                const recipes = parseJsonArray(props.recipesJson);
                const articles = parseJsonArray(props.articlesJson);
                const roundups = parseJsonArray(props.roundupsJson);

                const parsedLimit = parseInt(props.limit, 10);
                const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
                const mode = props.mode || undefined;

                if (recipes.length || articles.length || roundups.length || props.title || limit || mode) {
                    result.push({
                        type: 'related_content',
                        title: props.title || undefined,
                        layout: (props.layout || 'grid') as any,
                        ...(mode ? { mode } : {}),
                        ...(limit ? { limit } : {}),
                        recipes,
                        articles,
                        roundups,
                    } as any);
                }
                break;
            }
            case 'beforeAfter': {
                const before = parseJsonObject<{ media_id?: number } | null>(props.beforeJson, null);
                const after = parseJsonObject<{ media_id?: number } | null>(props.afterJson, null);
                if (before?.media_id && after?.media_id) {
                    result.push({
                        type: 'before_after',
                        layout: (props.layout || 'slider') as any,
                        before,
                        after,
                    } as any);
                }
                break;
            }
            case 'simpleTable': {
                const headers = parseJsonArray(props.headersJson);
                const rows = parseJsonArray(props.rowsJson);
                if (headers.length || rows.length) {
                    result.push({
                        type: 'table',
                        headers,
                        rows,
                    } as any);
                }
                break;
            }

            default:
                const content = extractText(block.content as any);
                if (content?.trim()) {
                    result.push({ type: 'paragraph', text: content } as any);
                }
        }
    }

    if (currentList) result.push(currentList);
    return result;
}
