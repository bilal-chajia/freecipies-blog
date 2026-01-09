/**
 * BlockEditor Component
 * 
 * A visual block-based editor for article content.
 * Built on BlockNote for React with custom blocks.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockNoteViewWithPortal } from './BlockNoteViewWithPortal';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
    useCreateBlockNote,
} from '@blocknote/react';
import { BlockNoteSchema, defaultBlockSpecs, getBlockInfo, getNearestBlockPos } from '@blocknote/core';
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import '@blocknote/mantine/style.css';
import { cn } from '@/lib/utils';
import {
    Plus,
    Image as ImageIcon,
    Video,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Heading6,
    Link as LinkIcon,
    Bold,
    Italic,
    Check,
    X,
    Pilcrow,
    Quote,
    ListTree,
    Minus,
    AlertTriangle,
    HelpCircle,
    Utensils,
    LayoutGrid,
    Table,
    FileText,
    SplitSquareVertical
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { RelatedContentProvider } from './related-content-context';
import { BlockSelectionProvider } from './selection-context';

// Custom blocks
import {
    Alert,
    VideoBlock,
    ImageBlock,
    FAQSectionBlock,
    DividerBlock,
    RecipeEmbedBlock,
    MainRecipeBlock,
    RoundupListBlock,
    RelatedContentBlock,
    TableBlock,
    BeforeAfterBlock
} from './blocks';

import { RecipeDataContext } from './blocks/MainRecipeBlock';
import { RoundupDataContext } from './blocks/RoundupListBlock';

// Create custom schema with our blocks
const schema = BlockNoteSchema.create({
    blockSpecs: {
        ...defaultBlockSpecs,
        alert: Alert(),
        video: VideoBlock(),
        customImage: ImageBlock(),
        faqSection: FAQSectionBlock(),
        divider: DividerBlock(),
        recipeEmbed: RecipeEmbedBlock(),
        mainRecipe: MainRecipeBlock(),
        roundupList: RoundupListBlock(),
        relatedContent: RelatedContentBlock(),
        simpleTable: TableBlock(),
        beforeAfter: BeforeAfterBlock(),
    },
});
// Custom slash menu items
const getCustomSlashMenuItems = (editor, options = {}) => {
    const {
        contentType = 'article',
        hasRecipeContext = false,
        hasRoundupContext = false,
    } = options;

    const items = [
        {
            title: 'Alert Box',
            onItemClick: () =>
                editor.insertBlocks([{ type: 'alert', props: { type: 'warning' } }], editor.getTextCursorPosition().block, 'after'),
            aliases: ['alert', 'tip', 'warning'],
            group: 'Food Blog',
            subtext: 'Insert a tip/warning box',
        },
        {
            title: 'Embed Recipe',
            onItemClick: () =>
                editor.insertBlocks([{ type: 'recipeEmbed' }], editor.getTextCursorPosition().block, 'after'),
            aliases: ['recipe', 'embed', 'link'],
            group: 'Food Blog',
            subtext: 'Link to another recipe',
        },
        {
            title: 'Related Content',
            onItemClick: () =>
                editor.insertBlocks([{ type: 'relatedContent' }], editor.getTextCursorPosition().block, 'after'),
            aliases: ['related', 'recommend'],
            group: 'Food Blog',
            subtext: 'Curate related recipes or articles',
        },
        {
            title: 'Before / After',
            onItemClick: () =>
                editor.insertBlocks([{ type: 'beforeAfter' }], editor.getTextCursorPosition().block, 'after'),
            aliases: ['before', 'after', 'compare'],
            group: 'Food Blog',
            subtext: 'Compare two images',
        },
        {
            title: 'Table',
            onItemClick: () =>
                editor.insertBlocks([{ type: 'simpleTable' }], editor.getTextCursorPosition().block, 'after'),
            aliases: ['table', 'grid', 'matrix'],
            group: 'Layout',
            subtext: 'Add a table',
        },
        {
            title: 'Divider',
            onItemClick: () =>
                editor.insertBlocks([{ type: 'divider' }], editor.getTextCursorPosition().block, 'after'),
            aliases: ['divider', 'separator', 'line'],
            group: 'Layout',
            subtext: 'Add a horizontal divider',
        },
    ];

    if (contentType === 'recipe' && hasRecipeContext) {
        items.unshift({
            title: 'Recipe Details',
            onItemClick: () =>
                editor.insertBlocks([{ type: 'mainRecipe' }], editor.getTextCursorPosition().block, 'after'),
            aliases: ['recipe', 'main', 'details'],
            group: 'Food Blog',
            subtext: 'The main recipe editor for this post',
        });
    }

    if (contentType === 'roundup' && hasRoundupContext) {
        items.unshift({
            title: 'Roundup List',
            onItemClick: () =>
                editor.insertBlocks([{ type: 'roundupList' }], editor.getTextCursorPosition().block, 'after'),
            aliases: ['roundup', 'list', 'curated'],
            group: 'Food Blog',
            subtext: 'Manage the curated items list for this roundup',
        });
    }

    return [
        ...getDefaultReactSlashMenuItems(editor).filter((item) => item.title !== 'Table'),
        ...items,
    ];
};

const MAX_STRUCTURE_LABEL = 48;

const truncateLabel = (text = '') => {
    const value = String(text || '').trim();
    if (!value) return '';
    if (value.length <= MAX_STRUCTURE_LABEL) return value;
    return `${value.slice(0, MAX_STRUCTURE_LABEL - 3)}...`;
};

const getInlineTextLength = (content) => {
    if (!content) return 0;
    if (typeof content === 'string') return content.length;
    if (!Array.isArray(content)) return 0;
    return content.reduce((total, node) => {
        if (!node) return total;
        if (typeof node === 'string') return total + node.length;
        if (node.type === 'text') return total + (node.text || '').length;
        if (node.type === 'link') return total + getInlineTextLength(node.content);
        return total;
    }, 0);
};

const truncateInlineContent = (content, limit) => {
    if (!content) return '';
    if (!limit || limit <= 0) return '';
    if (typeof content === 'string') {
        return content.slice(0, limit);
    }
    if (!Array.isArray(content)) return '';

    let remaining = limit;
    const nodes = [];

    const takeText = (text, styles = {}) => {
        if (!text || remaining <= 0) return;
        const slice = text.slice(0, remaining);
        if (!slice) return;
        remaining -= slice.length;
        nodes.push({ type: 'text', text: slice, styles });
    };

    for (const node of content) {
        if (remaining <= 0) break;
        if (!node) continue;
        if (typeof node === 'string') {
            takeText(node);
            continue;
        }
        if (node.type === 'text') {
            takeText(node.text || '', node.styles || {});
            continue;
        }
        if (node.type === 'link') {
            const labelContent = Array.isArray(node.content)
                ? node.content
                : typeof node.content === 'string'
                    ? [{ type: 'text', text: node.content, styles: {} }]
                    : [];
            if (!labelContent.length) continue;
            const truncated = truncateInlineContent(labelContent, remaining);
            if (!truncated || (Array.isArray(truncated) && truncated.length === 0)) continue;
            const labelNodes = Array.isArray(truncated)
                ? truncated
                : [{ type: 'text', text: truncated, styles: {} }];
            const labelLength = getInlineTextLength(labelNodes);
            remaining -= Math.min(remaining, Math.max(0, labelLength));
            nodes.push({
                type: 'link',
                href: node.href,
                content: labelNodes,
            });
        }
    }

    return nodes;
};

const flattenBlocks = (blocks, depth = 0, acc = [], parentId = null) => {
    (blocks || []).forEach((block) => {
        acc.push({ block, depth, parentId });
        if (Array.isArray(block.children) && block.children.length > 0) {
            flattenBlocks(block.children, depth + 1, acc, block.id);
        }
    });
    return acc;
};

const getBlockLabel = (block) => {
    const contentText = extractText(block.content);
    switch (block.type) {
        case 'heading':
            return truncateLabel(contentText || `Heading ${block.props?.level || ''}`);
        case 'paragraph': {
            const previewNodes = truncateInlineContent(block.content, 15);
            const previewText = serializeInlineContent(previewNodes);
            const trimmed = (previewText || '').trim();
            if (!trimmed) return 'Paragraph';
            return `Paragraph (${trimmed})`;
        }
        case 'bulletListItem':
            return truncateLabel(contentText || 'Bullet item');
        case 'numberedListItem':
            return truncateLabel(contentText || 'Numbered item');
        case 'alert':
            return truncateLabel(block.props?.type ? `Alert (${block.props.type})` : 'Alert');
        case 'faqSection':
            return truncateLabel(block.props?.title || 'FAQ');
        case 'customImage':
            return 'Image';
        case 'video':
            return 'Video';
        case 'divider':
            return 'Divider';
        case 'simpleTable':
            return 'Table';
        case 'recipeEmbed':
            return truncateLabel(block.props?.headline || 'Embedded recipe');
        case 'relatedContent':
            return truncateLabel(block.props?.title || 'Related content');
        case 'beforeAfter':
            return 'Before / After';
        case 'blockquote':
            return truncateLabel(contentText || 'Quote');
        default:
            return truncateLabel(contentText || block.type);
    }
};

const getBlockIcon = (blockOrType) => {
    const type = typeof blockOrType === 'string' ? blockOrType : blockOrType?.type;
    const level = typeof blockOrType === 'object' ? blockOrType?.props?.level : undefined;
    switch (type) {
        case 'heading':
            switch (level) {
                case 2:
                    return Heading2;
                case 3:
                    return Heading3;
                case 4:
                    return Heading4;
                case 5:
                    return Heading5;
                case 6:
                    return Heading6;
                default:
                    return Heading1;
            }
        case 'bulletListItem':
            return List;
        case 'numberedListItem':
            return ListOrdered;
        case 'alert':
            return AlertTriangle;
        case 'faqSection':
            return HelpCircle;
        case 'customImage':
            return ImageIcon;
        case 'video':
            return Video;
        case 'divider':
            return Minus;
        case 'simpleTable':
            return Table;
        case 'recipeEmbed':
            return Utensils;
        case 'relatedContent':
            return LayoutGrid;
        case 'beforeAfter':
            return SplitSquareVertical;
        case 'blockquote':
            return Quote;
        case 'paragraph':
            return Pilcrow;
        default:
            return FileText;
    }
};

const CUSTOM_BLOCK_TYPES = new Set([
    'title',
    'headline',
    'customImage',
    'alert',
    'divider',
    'faqSection',
    'beforeAfter',
    'simpleTable',
    'video',
    'recipeEmbed',
    'relatedContent',
    'featuredImage',
    'mainRecipe',
    'roundupList',
]);

/**
 * Editor Toolbar Component
 */
const EditorToolbar = ({ editor, structureOpen, onToggleStructurePanel }) => {
    if (!editor) return null;

    const selectionRef = useRef({ text: '', url: '' });
    const faqLinkTargetRef = useRef(null);
    const faqSelectionRef = useRef({ start: 0, end: 0 });
    const [faqLinkOpen, setFaqLinkOpen] = useState(false);
    const [faqLinkUrl, setFaqLinkUrl] = useState('');
    const [faqLinkHasMatch, setFaqLinkHasMatch] = useState(false);

    useEffect(() => {
        if (!editor) return undefined;
        const updateSelection = () => {
            selectionRef.current = {
                text: editor.getSelectedText() || '',
                url: editor.getSelectedLinkUrl() || '',
            };
        };
        updateSelection();
        const unsubscribe = editor.onSelectionChange(updateSelection);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor]);

    const insertBlock = (type, props = {}) => {
        const currentBlock = editor.getTextCursorPosition().block;
        const inserted = editor.insertBlocks([{ type, props }], currentBlock, 'after');
        if (inserted?.[0]?.id) {
            editor.setTextCursorPosition(inserted[0].id, 'start');
        }
        editor.focus();
    };

    const findMarkdownLinkRange = (text, selectionStart, selectionEnd) => {
        const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const matchStart = match.index;
            const matchEnd = match.index + match[0].length;
            const hasSelection = selectionStart !== selectionEnd;
            const selectionInside = hasSelection
                ? selectionEnd > matchStart && selectionStart < matchEnd
                : selectionStart >= matchStart && selectionStart <= matchEnd;
            if (selectionInside) {
                return {
                    start: matchStart,
                    end: matchEnd,
                    label: match[1],
                };
            }
        }
        return null;
    };

    const applyFaqLink = () => {
        const textarea = faqLinkTargetRef.current;
        if (!textarea) return;
        const currentValue = textarea.value || '';
        const { start, end } = faqSelectionRef.current;
        const url = faqLinkUrl.trim();
        if (!url) return;
        const selectedText = currentValue.slice(start, end);
        const linkText = selectedText || url;
        const linkMarkdown = `[${linkText}](${url})`;
        const nextValue =
            currentValue.slice(0, start) +
            linkMarkdown +
            currentValue.slice(end);
        textarea.value = nextValue;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        requestAnimationFrame(() => {
            const caretPos = start + linkMarkdown.length;
            textarea.focus();
            textarea.setSelectionRange(caretPos, caretPos);
        });
        setFaqLinkOpen(false);
    };

    const removeFaqLink = () => {
        const textarea = faqLinkTargetRef.current;
        if (!textarea) return;
        const currentValue = textarea.value || '';
        const { start, end } = faqSelectionRef.current;
        const match = findMarkdownLinkRange(currentValue, start, end);
        if (!match) return;
        const nextValue =
            currentValue.slice(0, match.start) +
            match.label +
            currentValue.slice(match.end);
        textarea.value = nextValue;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        requestAnimationFrame(() => {
            const caretPos = match.start + match.label.length;
            textarea.focus();
            textarea.setSelectionRange(caretPos, caretPos);
        });
        setFaqLinkOpen(false);
    };

    return (
        <div className="border-b bg-gray-50">
            <div className="flex items-center gap-1 p-2 flex-wrap">
                <button
                    type="button"
                    onClick={onToggleStructurePanel}
                    className={`p-1.5 hover:bg-gray-200 rounded ${structureOpen ? 'bg-gray-200 text-gray-900' : 'text-gray-700'}`}
                    title="List View / Outline"
                >
                    <ListTree className="w-4 h-4" />
                </button>
                <button onClick={() => insertBlock('heading', { level: 2 })} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
                <button onClick={() => insertBlock('heading', { level: 3 })} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Heading 3"><Heading3 className="w-4 h-4" /></button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <button onClick={() => insertBlock('bulletListItem')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Bullet List"><List className="w-4 h-4" /></button>
                <button onClick={() => insertBlock('numberedListItem')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
                <button
                    type="button"
                    onMouseDown={(event) => {
                        event.preventDefault();
                    }}
                    onClick={() => {
                        const activeElement = document.activeElement;
                        if (activeElement instanceof HTMLTextAreaElement && activeElement.dataset.faqAnswer === 'true') {
                            const currentValue = activeElement.value || '';
                            const selectionStart = activeElement.selectionStart ?? currentValue.length;
                            const selectionEnd = activeElement.selectionEnd ?? selectionStart;
                            faqLinkTargetRef.current = activeElement;
                            faqSelectionRef.current = { start: selectionStart, end: selectionEnd };
                            setFaqLinkHasMatch(!!findMarkdownLinkRange(currentValue, selectionStart, selectionEnd));
                            setFaqLinkUrl('https://');
                            setFaqLinkOpen(true);
                            return;
                        }
                        const selectedText = selectionRef.current.text || editor.getSelectedText();
                        if (!selectedText) {
                            window.alert('Select text before adding a link.');
                            return;
                        }
                        const existingUrl = selectionRef.current.url || editor.getSelectedLinkUrl();
                        const url = window.prompt('Enter URL', existingUrl || 'https://');
                        if (!url) return;
                        editor.createLink(url, selectedText);
                        editor.focus();
                    }}
                    className="p-1.5 hover:bg-gray-200 rounded text-gray-700"
                    title="Link"
                >
                    <LinkIcon className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-300 mx-1" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="p-1.5 hover:bg-gray-200 rounded text-gray-700 inline-flex items-center gap-1"
                            title="Insert block"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-xs font-medium">Insert</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuItem onClick={() => insertBlock('customImage')}>
                            <ImageIcon className="w-4 h-4 mr-2" /> Image
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('video')}>
                            <Video className="w-4 h-4 mr-2" /> Video
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => insertBlock('alert', { type: 'tip' })}>
                            <AlertTriangle className="w-4 h-4 mr-2 text-amber-600" /> Alert / Tip
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('faqSection')}>
                            <HelpCircle className="w-4 h-4 mr-2 text-blue-600" /> FAQ Section
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('recipeEmbed')}>
                            <Utensils className="w-4 h-4 mr-2 text-green-600" /> Embed Recipe
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('relatedContent')}>
                            <LayoutGrid className="w-4 h-4 mr-2 text-purple-600" /> Related Content
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('beforeAfter')}>
                            <SplitSquareVertical className="w-4 h-4 mr-2" /> Before / After
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('simpleTable')}>
                            <Table className="w-4 h-4 mr-2" /> Table
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('divider')}>
                            <Minus className="w-4 h-4 mr-2" /> Divider
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {faqLinkOpen && (
                <div className="px-2 pb-2">
                    <div className="flex items-center gap-2 rounded-md border bg-white px-2 py-1 shadow-sm">
                        <LinkIcon className="w-4 h-4 text-gray-400" />
                        <input
                            type="url"
                            value={faqLinkUrl}
                            onChange={(event) => setFaqLinkUrl(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    applyFaqLink();
                                }
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setFaqLinkOpen(false);
                                }
                            }}
                            className="flex-1 text-sm outline-none"
                            placeholder="https://"
                            autoFocus
                        />
                        <button
                            type="button"
                            className="text-xs text-gray-500 hover:text-gray-700"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setFaqLinkOpen(false)}
                        >
                            Cancel
                        </button>
                        {faqLinkHasMatch && (
                            <button
                                type="button"
                                className="text-xs text-gray-500 hover:text-gray-700"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={removeFaqLink}
                            >
                                Remove
                            </button>
                        )}
                        <button
                            type="button"
                            className="rounded px-2 py-1 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={applyFaqLink}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const normalizeTipVariant = (variant) => {
    if (variant === 'error') return 'warning';
    if (variant === 'success') return 'tip';
    if (variant === 'note' || variant === 'tip' || variant === 'info' || variant === 'warning') {
        return variant;
    }
    return 'warning';
};

const resolveCoverUrl = (cover) => {
    if (!cover) return '';
    if (typeof cover === 'string') return cover;
    const variants = cover.variants || {};
    return (
        variants.md?.url ||
        variants.sm?.url ||
        variants.lg?.url ||
        variants.xs?.url ||
        cover.url ||
        ''
    );
};

const buildVideoUrl = (provider, videoId) => {
    if (!provider || !videoId) return '';
    if (provider === 'youtube') return `https://www.youtube.com/watch?v=${videoId}`;
    if (provider === 'vimeo') return `https://vimeo.com/${videoId}`;
    return '';
};

const parseInlineStyles = (text = '') => {
    const nodes = [];
    let hasStyle = false;
    let index = 0;

    const pushPlain = (value) => {
        if (!value) return;
        nodes.push({ type: 'text', text: value, styles: {} });
    };

    while (index < text.length) {
        const nextTriple = text.indexOf('***', index);
        const nextBold = text.indexOf('**', index);
        const nextItalic = text.indexOf('*', index);
        let tokenIndex = -1;
        let token = null;

        const candidates = [
            { type: 'triple', index: nextTriple },
            { type: 'bold', index: nextBold },
            { type: 'italic', index: nextItalic },
        ].filter((candidate) => candidate.index !== -1);

        if (candidates.length > 0) {
            candidates.sort((a, b) => {
                if (a.index !== b.index) return a.index - b.index;
                const order = { triple: 0, bold: 1, italic: 2 };
                return order[a.type] - order[b.type];
            });
            tokenIndex = candidates[0].index;
            token = candidates[0].type;
        }

        if (tokenIndex === -1) {
            pushPlain(text.slice(index));
            break;
        }

        if (tokenIndex > index) {
            pushPlain(text.slice(index, tokenIndex));
        }

        if (token === 'triple') {
            const end = text.indexOf('***', tokenIndex + 3);
            if (end === -1) {
                pushPlain(text.slice(tokenIndex));
                break;
            }
            const inner = text.slice(tokenIndex + 3, end);
            nodes.push({ type: 'text', text: inner, styles: { bold: true, italic: true } });
            hasStyle = true;
            index = end + 3;
            continue;
        }

        if (token === 'bold') {
            const end = text.indexOf('**', tokenIndex + 2);
            if (end === -1) {
                pushPlain(text.slice(tokenIndex));
                break;
            }
            const inner = text.slice(tokenIndex + 2, end);
            nodes.push({ type: 'text', text: inner, styles: { bold: true } });
            hasStyle = true;
            index = end + 2;
            continue;
        }

        if (token === 'italic') {
            let end = text.indexOf('*', tokenIndex + 1);
            while (end !== -1 && text[end + 1] === '*') {
                end = text.indexOf('*', end + 2);
            }
            if (end === -1) {
                pushPlain(text.slice(tokenIndex));
                break;
            }
            const inner = text.slice(tokenIndex + 1, end);
            nodes.push({ type: 'text', text: inner, styles: { italic: true } });
            hasStyle = true;
            index = end + 1;
            continue;
        }
    }

    return { nodes, hasStyle };
};

const parseInlineMarkdown = (text) => {
    if (!text) return '';
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let lastIndex = 0;
    const parts = [];
    let hasRich = false;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            const segment = text.slice(lastIndex, match.index);
            const parsed = parseInlineStyles(segment);
            if (parsed.hasStyle) {
                parts.push(...parsed.nodes);
                hasRich = true;
            } else {
                parts.push(segment);
            }
        }

        const label = match[1];
        const href = match[2];
        const labelParsed = parseInlineStyles(label);
        const linkContent = labelParsed.nodes.length
            ? labelParsed.nodes
            : [{ type: 'text', text: label, styles: {} }];
        parts.push({
            type: 'link',
            href,
            content: linkContent,
        });
        hasRich = true;
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        const tail = text.slice(lastIndex);
        const parsed = parseInlineStyles(tail);
        if (parsed.hasStyle) {
            parts.push(...parsed.nodes);
            hasRich = true;
        } else {
            parts.push(tail);
        }
    }

    if (!hasRich) {
        return text;
    }

    const normalized = [];
    parts.forEach((part) => {
        if (!part) return;
        if (typeof part === 'string') {
            if (!part) return;
            normalized.push({ type: 'text', text: part, styles: {} });
        } else {
            normalized.push(part);
        }
    });

    return normalized;
};

const applyInlineStyles = (text, styles = {}) => {
    let output = text;
    if (styles.italic) {
        output = `*${output}*`;
    }
    if (styles.bold) {
        output = `**${output}**`;
    }
    return output;
};

const serializeInlineNode = (node) => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type === 'text') return applyInlineStyles(node.text || '', node.styles || {});
    if (node.type === 'link') {
        const label = serializeInlineContent(node.content || '');
        const href = node.href || '';
        if (!href) return label;
        return `[${label || href}](${href})`;
    }
    if (node.text) return node.text;
    return '';
};

const serializeInlineContent = (content) => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (!Array.isArray(content)) return '';
    return content.map(serializeInlineNode).join('');
};

// ... JSON conversion functions remain the same ...
function contentJsonToBlocks(contentJson) {
    // Handle string input (from useContentEditor which stores as JSON string)
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
    let blocks = parsed;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        blocks = parsed.blocks;
    }

    if (!blocks || !Array.isArray(blocks)) {
        return undefined;
    }


    try {
        const rawBlocks = blocks.map((block, index) => {
            if (!block || typeof block !== 'object') return null;
            const id = block.id || `block-${index}`;

            switch (block.type) {
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
                        return block.items.map((item, i) => ({
                            id: `${id}-${i}`,
                            type: listType,
                            content: parseInlineMarkdown(typeof item === 'string' ? item : ''),
                        }));
                    }
                    return { id, type: listType, content: '' };

                case 'blockquote':
                    return { id, type: 'blockquote', content: parseInlineMarkdown(block.text || '') };

                case 'image':
                    // Read format per DATABASE_SCHEMA.md content_json spec
                    const imgVariants = block.variants || {};
                    const bestUrl = imgVariants.lg?.url || imgVariants.md?.url || imgVariants.sm?.url || '';
                    const bestVariant = imgVariants.lg || imgVariants.md || imgVariants.sm || {};

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
                        props: { type: normalizeTipVariant(block.variant) },
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

                case 'recipe_card': {
                    const coverUrl = resolveCoverUrl(block.cover || block.thumbnail);
                    return {
                        id,
                        type: 'recipeEmbed',
                        props: {
                            articleId: block.article_id,
                            slug: block.slug,
                            headline: block.headline,
                            thumbnail: coverUrl,
                            difficulty: block.difficulty,
                            totalTime: block.total_time,
                        }
                    };
                }

                case 'related_content': {
                    const parsedLimit = Number.parseInt(block.limit, 10);
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
                case 'table': {
                    return {
                        id,
                        type: 'simpleTable',
                        props: {
                            headersJson: JSON.stringify(block.headers || []),
                            rowsJson: JSON.stringify(block.rows || []),
                        }
                    };
                }

                default:
                    return { id, type: 'paragraph', content: block.text || `[${block.type}]` };
            }
        }).flat();

        const cleanBlocks = rawBlocks.filter(b => b && typeof b === 'object' && typeof b.type === 'string');
        return cleanBlocks.length > 0 ? cleanBlocks : undefined;
    } catch (error) {
        console.error('Error converting contentJson to blocks:', error);
        return undefined;
    }
}

function blocksToContentJson(blocks) {
    if (!blocks || !Array.isArray(blocks)) {
        return [];
    }

    const result = [];
    let currentList = null;

    for (const block of blocks) {
        if (block.type === 'bulletListItem' || block.type === 'numberedListItem' || block.type === 'checkListItem') {
            const style = block.type === 'numberedListItem'
                ? 'ordered'
                : block.type === 'checkListItem'
                    ? 'checklist'
                    : 'unordered';
            const text = extractText(block.content);

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

        switch (block.type) {
            case 'paragraph':
                const text = extractText(block.content);
                if (text.trim()) {
                    result.push({ type: 'paragraph', text });
                }
                break;

            case 'blockquote':
                result.push({
                    type: 'blockquote',
                    text: extractText(block.content),
                });
                break;

            case 'heading':
                result.push({
                    type: 'heading',
                    level: block.props?.level || 2,
                    text: extractText(block.content),
                });
                break;

            case 'customImage':
                if (block.props?.url) {
                    // Parse stored variants or create fallback
                    let variants = { lg: { url: block.props.url } };
                    try {
                        const parsed = JSON.parse(block.props.variantsJson || '{}');
                        if (Object.keys(parsed).length > 0) {
                            variants = parsed;
                        }
                    } catch { }

                    // Output per DATABASE_SCHEMA.md content_json image block spec
                    result.push({
                        type: 'image',
                        media_id: block.props.mediaId ? parseInt(block.props.mediaId, 10) : null,
                        alt: block.props.alt || '',
                        caption: block.props.caption || '',
                        credit: block.props.credit || '',
                        variants,
                    });
                }
                break;

            case 'video':
                if (block.props?.videoId) {
                    result.push({
                        type: 'video',
                        provider: block.props.provider,
                        videoId: block.props.videoId,
                        aspectRatio: block.props.aspectRatio,
                    });
                }
                break;

            case 'alert':
                const alertText = extractText(block.content);
                if (alertText.trim()) {
                    result.push({
                        type: 'tip_box',
                        variant: normalizeTipVariant(block.props?.type),
                        text: alertText,
                    });
                }
                break;

            case 'faqSection':
                try {
                    const items = JSON.parse(block.props.items || '[]');
                    if (items.length > 0) {
                        result.push({ type: 'faq_section', title: block.props.title, items: items });
                    }
                } catch { }
                break;

            case 'divider':
                result.push({ type: 'divider' });
                break;

            case 'recipeEmbed':
                if (block.props.articleId) {
                    const articleId = parseInt(block.props.articleId, 10);
                    if (!Number.isFinite(articleId)) break;
                    const cover = block.props.thumbnail
                        ? { variants: { lg: { url: block.props.thumbnail } } }
                        : undefined;
                    result.push({
                        type: 'recipe_card',
                        article_id: articleId,
                        headline: block.props.headline || '',
                        ...(block.props.slug ? { slug: block.props.slug } : {}),
                        ...(block.props.totalTime ? { total_time: block.props.totalTime } : {}),
                        ...(block.props.difficulty ? { difficulty: block.props.difficulty } : {}),
                        ...(cover ? { cover } : {}),
                    });
                }
                break;

            case 'relatedContent': {
                const recipes = (() => {
                    try {
                        const parsed = JSON.parse(block.props.recipesJson || '[]');
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                })();
                const articles = (() => {
                    try {
                        const parsed = JSON.parse(block.props.articlesJson || '[]');
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                })();
                const roundups = (() => {
                    try {
                        const parsed = JSON.parse(block.props.roundupsJson || '[]');
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                })();

                const parsedLimit = Number.parseInt(block.props.limit, 10);
                const limit = Number.isFinite(parsedLimit) ? parsedLimit : undefined;
                const mode = block.props.mode || undefined;

                if (recipes.length || articles.length || roundups.length || block.props.title || limit || mode) {
                    result.push({
                        type: 'related_content',
                        title: block.props.title || undefined,
                        layout: block.props.layout || 'grid',
                        ...(mode ? { mode } : {}),
                        ...(limit ? { limit } : {}),
                        recipes,
                        articles,
                        roundups,
                    });
                }
                break;
            }
            case 'beforeAfter': {
                const before = (() => {
                    try {
                        const parsed = JSON.parse(block.props.beforeJson || 'null');
                        return parsed && typeof parsed === 'object' ? parsed : null;
                    } catch {
                        return null;
                    }
                })();
                const after = (() => {
                    try {
                        const parsed = JSON.parse(block.props.afterJson || 'null');
                        return parsed && typeof parsed === 'object' ? parsed : null;
                    } catch {
                        return null;
                    }
                })();
                if (before?.media_id && after?.media_id) {
                    result.push({
                        type: 'before_after',
                        layout: block.props.layout || 'slider',
                        before,
                        after,
                    });
                }
                break;
            }
            case 'simpleTable': {
                const headers = (() => {
                    try {
                        const parsed = JSON.parse(block.props.headersJson || '[]');
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                })();
                const rows = (() => {
                    try {
                        const parsed = JSON.parse(block.props.rowsJson || '[]');
                        return Array.isArray(parsed) ? parsed : [];
                    } catch {
                        return [];
                    }
                })();
                if (headers.length || rows.length) {
                    result.push({
                        type: 'table',
                        headers,
                        rows,
                    });
                }
                break;
            }

            default:
                const content = extractText(block.content);
                if (content?.trim()) {
                    result.push({ type: 'paragraph', text: content });
                }
        }
    }

    if (currentList) result.push(currentList);
    return result;
}

function extractText(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return serializeInlineContent(content);
    }
    return '';
}

/**
 * BlockEditor Component
 */
export default function BlockEditor({
    value,
    onChange,
    contentType = 'article',
    isSidebarOpen = true,
    onStructureUpdate,
    onSelectedBlockChange,
    recipe,
    onRecipeChange,
    roundup,
    onRoundupChange,
    onEditorReady,
    placeholder = 'Start writing your article...',
    className = '',
    context,
}) {
    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const lastSerializedRef = useRef('');
    const lastPointerBlockIdRef = useRef(null);

    // Initial content setup
    const initialContent = useMemo(() => {
        return contentJsonToBlocks(value);
    }, []); // Only run once on mount

    // Create editor instance
    const editor = useCreateBlockNote({
        schema,
        initialContent,
        domAttributes: {
            editor: {
                class: 'min-h-[500px] pb-[30vh]',
            },
        },
        uploadFile: async (file) => {
            // TODO: Implement file upload
            return URL.createObjectURL(file);
        },
    });

    // Expose editor instance
    useEffect(() => {
        if (editor && onEditorReady) {
            onEditorReady(editor);
        }
    }, [editor, onEditorReady]);

    // Update content when value changes (for initial load)
    useEffect(() => {
        if (!editor || !value) return;

        // If editor is empty or we want to force update
        // We need to check if the content is actually different to avoid loops
        // For now, we'll trust that the parent component only passes loaded content

        async function updateContent() {
            const currentBlocks = editor.document;
            // Only update if editor is effectively empty (just has one empty paragraph)
            const isEmpty = currentBlocks.length === 0 ||
                (currentBlocks.length === 1 &&
                    currentBlocks[0].type === 'paragraph' &&
                    (!currentBlocks[0].content || currentBlocks[0].content.length === 0));

            // Check if value has blocks (handle string, array, or object with .blocks)
            let parsedValue = value;
            if (typeof value === 'string') {
                try {
                    parsedValue = JSON.parse(value);
                } catch {
                    parsedValue = null;
                }
            }
            const hasBlocks = Array.isArray(parsedValue) ? parsedValue.length > 0 :
                (parsedValue?.blocks && Array.isArray(parsedValue.blocks) && parsedValue.blocks.length > 0);

            if (isEmpty && hasBlocks) {
                const newBlocks = contentJsonToBlocks(value);
                if (newBlocks && newBlocks.length > 0) {
                    await editor.replaceBlocks(editor.document, newBlocks);
                }
            }
        }

        updateContent();
    }, [editor, value]);

    const [structureItems, setStructureItems] = useState([]);
    const structureItemsRef = useRef(structureItems);
    const [activeBlockId, setActiveBlockId] = useState(null);
    const [insertHandle, setInsertHandle] = useState(null);
    const [insertMenuOpen, setInsertMenuOpen] = useState(false);
    const insertMenuOpenRef = useRef(false);
    const toolbarActionBlockIdRef = useRef(null);
    const moveActionBlockIdRef = useRef(null);
    const activeBlockIdRef = useRef(activeBlockId);
    const canvasDragPointerRef = useRef({ x: 0, y: 0 });
    const canvasDragPointerListenerRef = useRef(null);
    const [linkToolbar, setLinkToolbar] = useState({
        open: false,
        top: 0,
        left: 0,
        text: '',
        url: '',
        selection: null,
        mode: 'buttons',
    });
    const linkToolbarRef = useRef(linkToolbar);
    const [activeStyles, setActiveStyles] = useState({});

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        structureItemsRef.current = structureItems;
    }, [structureItems]);

    useEffect(() => {
        if (!editor) return;

        const handleChange = () => {
            const blocks = editor.document;
            const flatBlocks = flattenBlocks(blocks);
            const nextItems = flatBlocks.map(({ block, depth, parentId }) => ({
                id: block.id,
                type: block.type,
                depth,
                parentId,
                level: block.props?.level,
                label: getBlockLabel(block),
                icon: getBlockIcon(block),
            }));
            setStructureItems(nextItems);
            if (editor.domElement) {
                const blockIds = new Set(flatBlocks.map(({ block }) => block.id));
                const customIds = new Set(
                    flatBlocks
                        .filter(({ block }) => CUSTOM_BLOCK_TYPES.has(block.type))
                        .map(({ block }) => block.id)
                );

                editor.domElement.querySelectorAll('[data-id][data-block-root]').forEach((node) => {
                    node.removeAttribute('data-block-root');
                });
                editor.domElement.querySelectorAll('[data-id][data-custom-block]').forEach((node) => {
                    node.removeAttribute('data-custom-block');
                });

                const escapeSelector = (value) => {
                    try {
                        return CSS.escape(value);
                    } catch {
                        return value.replace(/["\\]/g, '\\$&');
                    }
                };

                const nodesById = new Map();
                editor.domElement.querySelectorAll('[data-id]').forEach((node) => {
                    const id = node.getAttribute('data-id');
                    if (!id || !blockIds.has(id)) return;
                    if (!nodesById.has(id)) nodesById.set(id, []);
                    nodesById.get(id).push(node);
                });

                nodesById.forEach((nodes, id) => {
                    const selector = `[data-id="${escapeSelector(id)}"]`;
                    const rootNode = nodes.find((node) => !node.parentElement?.closest(selector)) || nodes[0];
                    if (!rootNode) return;
                    rootNode.setAttribute('data-block-root', 'true');
                    if (customIds.has(id)) {
                        rootNode.setAttribute('data-custom-block', 'true');
                    }
                });
            }
            if (onSelectedBlockChange && activeBlockId) {
                const activeBlock = flatBlocks.find(({ block }) => block.id === activeBlockId)?.block || null;
                onSelectedBlockChange(activeBlock);
            }
            if (onChangeRef.current) {
                const contentJson = blocksToContentJson(blocks);
                const serialized = JSON.stringify(contentJson, null, 2);
                if (serialized !== lastSerializedRef.current) {
                    lastSerializedRef.current = serialized;
                    onChangeRef.current(serialized);
                }
            }
        };

        handleChange();
        const unsubscribe = editor.onEditorContentChange(handleChange);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor]);

    // Keep activeBlockIdRef in sync with activeBlockId
    useEffect(() => {
        activeBlockIdRef.current = activeBlockId;
    }, [activeBlockId]);

    useEffect(() => {
        if (!editor) return undefined;
        const getBlockIdFromDom = () => {
            const selection = window.getSelection();
            if (!selection || !selection.anchorNode) return null;
            const anchorNode = selection.anchorNode.nodeType === Node.ELEMENT_NODE
                ? selection.anchorNode
                : selection.anchorNode.parentElement;
            if (!(anchorNode instanceof HTMLElement)) return null;
            const wrapper = anchorNode.closest('[data-block]');
            return wrapper?.getAttribute('data-block') || null;
        };
        const handleSelection = () => {
            if (moveActionBlockIdRef.current) {
                const moveId = moveActionBlockIdRef.current;
                moveActionBlockIdRef.current = null;
                const moveBlock = editor.getBlock(moveId) || null;
                if (moveBlock) {
                    setActiveBlockId(moveId);
                    onSelectedBlockChange?.(moveBlock);
                    requestAnimationFrame(() => {
                        try {
                            editor.setTextCursorPosition(moveId, 'start');
                        } catch {
                            // Ignore selection errors during block move.
                        }
                    });
                    return;
                }
            }
            if (toolbarActionBlockIdRef.current) {
                const toolbarId = toolbarActionBlockIdRef.current;
                const toolbarBlock = editor.getBlock(toolbarId) || null;
                if (toolbarBlock) {
                    setActiveBlockId(toolbarId);
                    onSelectedBlockChange?.(toolbarBlock);
                    toolbarActionBlockIdRef.current = null;
                    return;
                }
                toolbarActionBlockIdRef.current = null;
            }
            const activeElement = document.activeElement;
            const editorWrapper = wrapperRef.current;
            if (activeElement instanceof HTMLElement && editorWrapper) {
                // If focus is outside the editor canvas (sidebar, portals, toolbar, etc.)
                // we preserve the current block selection to prevent UI flickering/deselection.
                if (!editorWrapper.contains(activeElement)) {
                    const currentActiveId = activeBlockIdRef.current;
                    if (currentActiveId && editor.getBlock(currentActiveId)) {
                        return;
                    }
                }
            }
            const manualId = lastPointerBlockIdRef.current;
            if (manualId) {
                const manualBlock = editor.getBlock(manualId) || null;
                setActiveBlockId(manualId);
                onSelectedBlockChange?.(manualBlock);
                lastPointerBlockIdRef.current = null;
                return;
            }

            let block = null;
            try {
                block = editor.getTextCursorPosition().block;
            } catch {
                const domId = getBlockIdFromDom();
                if (domId) {
                    const domBlock = editor.getBlock(domId) || null;
                    setActiveBlockId(domId);
                    onSelectedBlockChange?.(domBlock);
                    lastPointerBlockIdRef.current = null;
                    return;
                }
            }

            setActiveBlockId(block?.id || null);
            onSelectedBlockChange?.(block || null);
            lastPointerBlockIdRef.current = null;
        };
        handleSelection();
        const unsubscribe = editor.onSelectionChange(handleSelection);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor, insertMenuOpen, onSelectedBlockChange]);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return undefined;

        const handlePointerDown = (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const moveButton = target.closest('button[aria-label="Move up"], button[aria-label="Move down"]');
            if (moveButton) {
                const blockRoot = moveButton.closest('[data-block]');
                const blockId = blockRoot?.getAttribute('data-block');
                if (blockId) {
                    moveActionBlockIdRef.current = blockId;
                }
                return;
            }
            if (target.closest('.wp-block-toolbar-wrap') || target.closest('.wp-block-toolbar')) {
                if (activeBlockId) {
                    toolbarActionBlockIdRef.current = activeBlockId;
                }
                return;
            }
            const customBlock = target.closest('.wp-block--custom');
            if (customBlock) {
                const blockId = customBlock.getAttribute('data-block');
                if (blockId) {
                    lastPointerBlockIdRef.current = blockId;
                    if (blockId !== activeBlockId) {
                        setActiveBlockId(blockId);
                        onSelectedBlockChange?.(editor?.getBlock(blockId) || null);
                    }
                    return;
                }
            }
            lastPointerBlockIdRef.current = null;
        };

        wrapper.addEventListener('pointerdown', handlePointerDown, true);
        return () => {
            wrapper.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [activeBlockId, editor, onSelectedBlockChange]);

    useEffect(() => {
        if (!editor) return undefined;

        const handleSelection = () => {
            if (linkToolbarRef.current.mode === 'link') {
                return;
            }
            const text = editor.getSelectedText() || '';
            if (!text) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const anchorNode = selection.anchorNode;
            if (anchorNode && editor.domElement && !editor.domElement.contains(anchorNode)) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const range = selection.getRangeAt(0);
            if (range.collapsed) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const rect = range.getBoundingClientRect();
            if (!rect || (!rect.width && !rect.height)) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const wrapper = wrapperRef.current;
            if (!wrapper) return;
            const wrapperRect = wrapper.getBoundingClientRect();
            const left = rect.left - wrapperRect.left + rect.width / 2;
            const top = rect.top - wrapperRect.top - 10;
            const url = editor.getSelectedLinkUrl() || '';
            const selectionState = editor._tiptapEditor?.state?.selection;
            const selectionRange = selectionState ? { from: selectionState.from, to: selectionState.to } : null;
            setLinkToolbar({
                open: true,
                top,
                left,
                text,
                url,
                selection: selectionRange,
                mode: 'buttons',
            });
            setActiveStyles(editor.getActiveStyles() || {});
        };

        handleSelection();
        const unsubscribe = editor.onSelectionChange(handleSelection);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor, activeBlockId, onSelectedBlockChange]);

    useEffect(() => {
        onStructureUpdate?.({
            items: structureItems,
            activeBlockId,
        });
    }, [structureItems, activeBlockId, onStructureUpdate]);

    useEffect(() => {
        if (!onSelectedBlockChange) return;
        if (!editor || !activeBlockId) {
            onSelectedBlockChange(null);
            return;
        }
        const block = editor.getBlock(activeBlockId) || null;
        onSelectedBlockChange(block);
    }, [editor, activeBlockId, onSelectedBlockChange]);

    useEffect(() => {
        if (!editor?.domElement) return;
        const root = editor.domElement;
        const prevSelected = root.querySelector('[data-selected="true"]');
        if (prevSelected) {
            prevSelected.removeAttribute('data-selected');
        }
        if (activeBlockId) {
            const byRoot = root.querySelector(`[data-block-root="true"][data-id="${activeBlockId}"]`);
            const byId = root.querySelector(`[data-id="${activeBlockId}"]`);
            const bySelection = root.querySelector('.ProseMirror-selectednode')?.closest('[data-id]');
            const nextSelected = byRoot || byId || bySelection;
            if (nextSelected) {
                nextSelected.setAttribute('data-selected', 'true');
                if (!nextSelected.hasAttribute('data-block-root')) {
                    nextSelected.setAttribute('data-block-root', 'true');
                }
            }
        }
    }, [editor, activeBlockId]);

    useEffect(() => {
        if (!editor?.domElement) return;

        const handleLinkClick = (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const link = target.closest('a');
            if (!link) return;
            if (!editor.domElement.contains(link)) return;
            event.preventDefault();
            event.stopPropagation();
        };

        document.addEventListener('click', handleLinkClick, true);
        document.addEventListener('pointerdown', handleLinkClick, true);

        return () => {
            document.removeEventListener('click', handleLinkClick, true);
            document.removeEventListener('pointerdown', handleLinkClick, true);
        };
    }, [editor]);

    useEffect(() => {
        if (!editor?.prosemirrorView || !wrapperRef.current) return;
        const root = editor.prosemirrorView?.dom || editor.domElement;
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;

        const updateHandle = (event) => {
            if (insertMenuOpenRef.current) return;
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            if (
                target.closest('.block-insert-button') ||
                target.closest('.block-editor-structure-panel') ||
                target.closest('.bn-side-menu') ||
                target.closest('.bn-formatting-toolbar') ||
                target.closest('.bn-form-popover')
            ) {
                setInsertHandle(null);
                return;
            }

            const isInsideEditor = (root instanceof HTMLElement && root.contains(target)) || wrapper.contains(target);
            if (!isInsideEditor) {
                setInsertHandle(null);
                return;
            }

            const blockOuter = target.closest('[data-id]');
            let blockId = blockOuter?.getAttribute('data-id') || null;
            let rect = blockOuter instanceof HTMLElement ? blockOuter.getBoundingClientRect() : null;
            const edgeThreshold = 10;

            if (!blockId || !rect) {
                const view = editor.prosemirrorView;
                const coords = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                });
                if (!coords) {
                    setInsertHandle(null);
                    return;
                }
                const nearest = getNearestBlockPos(view.state.doc, coords.pos);
                if (!nearest) {
                    setInsertHandle(null);
                    return;
                }
                const info = getBlockInfo(nearest);
                blockId = info?.bnBlock?.node?.attrs?.id || null;
                if (!blockId) {
                    setInsertHandle(null);
                    return;
                }
                let dom = view.nodeDOM(info.bnBlock.beforePos + 1) || view.nodeDOM(info.bnBlock.beforePos);
                if (!(dom instanceof HTMLElement)) {
                    const domAtPos = view.domAtPos(coords.pos).node;
                    dom = domAtPos instanceof HTMLElement ? domAtPos.closest('.bn-block-content') : null;
                }
                if (!(dom instanceof HTMLElement)) {
                    setInsertHandle(null);
                    return;
                }
                rect = dom.getBoundingClientRect();
            }

            const distanceTop = Math.abs(event.clientY - rect.top);
            const distanceBottom = Math.abs(rect.bottom - event.clientY);
            const isNearEdge = distanceTop <= edgeThreshold || distanceBottom <= edgeThreshold;

            if (!isNearEdge) {
                setInsertHandle(null);
                return;
            }
            const containerRect = (canvas || wrapper).getBoundingClientRect();
            const placement = distanceTop <= distanceBottom ? 'before' : 'after';
            const top = (placement === 'before' ? rect.top : rect.bottom) - containerRect.top;
            const left = rect.left - containerRect.left;
            const width = rect.width;
            setInsertHandle({
                blockId,
                placement,
                top,
                left,
                width,
            });
        };

        const clearHandle = () => {
            if (!insertMenuOpenRef.current) {
                setInsertHandle(null);
            }
        };

        wrapper.addEventListener('mousemove', updateHandle);
        wrapper.addEventListener('pointermove', updateHandle);
        wrapper.addEventListener('mouseleave', clearHandle);
        wrapper.addEventListener('pointerleave', clearHandle);
        wrapper.addEventListener('scroll', clearHandle);

        return () => {
            wrapper.removeEventListener('mousemove', updateHandle);
            wrapper.removeEventListener('pointermove', updateHandle);
            wrapper.removeEventListener('mouseleave', clearHandle);
            wrapper.removeEventListener('pointerleave', clearHandle);
            wrapper.removeEventListener('scroll', clearHandle);
        };
    }, [editor]);

    if (!editor) return null;

    const relatedContext = {
        categorySlug: context?.categorySlug || null,
        tagSlugs: Array.isArray(context?.tagSlugs) ? context.tagSlugs : [],
        currentSlug: context?.currentSlug || null,
    };

    const insertBlockAtHandle = (type, props = {}) => {
        if (!insertHandle) return;
        const inserted = editor.insertBlocks(
            [{ type, props }],
            insertHandle.blockId,
            insertHandle.placement,
        );
        if (inserted?.[0]?.id) {
            editor.setTextCursorPosition(inserted[0].id, 'start');
        }
        editor.focus();
        setInsertMenuOpen(false);
        setInsertHandle(null);
    };

    const canvasSensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        })
    );

    const updateCanvasDragPointer = useCallback((event) => {
        if (!event) return;
        if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
            canvasDragPointerRef.current = { x: event.clientX, y: event.clientY };
            return;
        }
        const touches = event.touches || event.changedTouches;
        if (touches && touches[0]) {
            canvasDragPointerRef.current = { x: touches[0].clientX, y: touches[0].clientY };
        }
    }, []);

    const startCanvasDragPointerTracking = useCallback((initialEvent) => {
        if (canvasDragPointerListenerRef.current) return;
        updateCanvasDragPointer(initialEvent);
        const handler = (event) => updateCanvasDragPointer(event);
        window.addEventListener('pointermove', handler, { capture: true });
        window.addEventListener('mousemove', handler, { capture: true });
        window.addEventListener('touchmove', handler, { capture: true, passive: true });
        canvasDragPointerListenerRef.current = handler;
    }, [updateCanvasDragPointer]);

    const stopCanvasDragPointerTracking = useCallback(() => {
        const handler = canvasDragPointerListenerRef.current;
        if (!handler) return;
        window.removeEventListener('pointermove', handler, { capture: true });
        window.removeEventListener('mousemove', handler, { capture: true });
        window.removeEventListener('touchmove', handler, { capture: true });
        canvasDragPointerListenerRef.current = null;
    }, []);

    useEffect(() => stopCanvasDragPointerTracking, [stopCanvasDragPointerTracking]);

    const reorderBlockRelativeToTarget = useCallback((draggedId, targetId, position) => {
        if (!editor || !draggedId || !targetId) return;
        if (draggedId === targetId) return;
        const items = structureItemsRef.current || [];
        const dragged = items.find((item) => item.id === draggedId);
        const target = items.find((item) => item.id === targetId);
        if (!dragged || !target) return;
        if (dragged.parentId !== target.parentId) return;

        const siblings = items
            .filter((item) => item.parentId === dragged.parentId)
            .map((item) => item.id);
        const fromIndex = siblings.indexOf(draggedId);
        const targetIndex = siblings.indexOf(targetId);
        if (fromIndex < 0 || targetIndex < 0) return;

        let desiredIndex = targetIndex + (position === 'after' ? 1 : 0);
        if (fromIndex < targetIndex) desiredIndex -= 1;
        desiredIndex = Math.max(0, Math.min(siblings.length - 1, desiredIndex));

        let steps = desiredIndex - fromIndex;
        editor.setTextCursorPosition(draggedId, 'start');
        while (steps < 0) {
            editor.moveBlocksUp();
            steps += 1;
        }
        while (steps > 0) {
            editor.moveBlocksDown();
            steps -= 1;
        }
        moveActionBlockIdRef.current = draggedId;
        setActiveBlockId(draggedId);
        editor.focus();
    }, [editor]);

    const getBlockFromPoint = useCallback((x, y) => {
        const root = editor?.domElement;
        if (!root) return null;
        const element = document.elementFromPoint(x, y);
        if (!(element instanceof HTMLElement)) return null;
        const candidate = element.closest('[data-id]');
        if (!(candidate instanceof HTMLElement)) return null;
        if (!root.contains(candidate)) return null;
        const id = candidate.getAttribute('data-id');
        if (!id) return null;
        return { id, element: candidate };
    }, [editor]);

    const handleCanvasDragStart = useCallback((event) => {
        startCanvasDragPointerTracking(event?.activatorEvent);
        const draggedId = event?.active?.id ? String(event.active.id) : null;
        if (draggedId) {
            setActiveBlockId(draggedId);
            toolbarActionBlockIdRef.current = draggedId;
        }
    }, [startCanvasDragPointerTracking]);

    const handleCanvasDragCancel = useCallback(() => {
        stopCanvasDragPointerTracking();
    }, [stopCanvasDragPointerTracking]);

    const handleCanvasDragEnd = useCallback((event) => {
        stopCanvasDragPointerTracking();
        const draggedId = event?.active?.id ? String(event.active.id) : null;
        if (!draggedId) return;
        const { x, y } = canvasDragPointerRef.current || {};
        if (typeof x !== 'number' || typeof y !== 'number') return;
        const target = getBlockFromPoint(x, y);
        const targetId = target?.id || null;
        if (!targetId || targetId === draggedId) return;
        const rect = target?.element?.getBoundingClientRect?.();
        const position = rect && rect.height ? (y < rect.top + rect.height / 2 ? 'before' : 'after') : 'after';
        reorderBlockRelativeToTarget(draggedId, targetId, position);
    }, [getBlockFromPoint, reorderBlockRelativeToTarget, stopCanvasDragPointerTracking]);

    useEffect(() => {
        if (!insertHandle) {
            setInsertMenuOpen(false);
        }
    }, [insertHandle]);

    useEffect(() => {
        insertMenuOpenRef.current = insertMenuOpen;
    }, [insertMenuOpen]);

    useEffect(() => {
        linkToolbarRef.current = linkToolbar;
    }, [linkToolbar]);

    return (
        <RelatedContentProvider value={relatedContext}>
            <BlockSelectionProvider activeBlockId={activeBlockId} setActiveBlockId={setActiveBlockId}>
                <RecipeDataContext.Provider value={{ recipe, setRecipe: onRecipeChange }}>
                    <RoundupDataContext.Provider value={{ roundup, setRoundup: onRoundupChange }}>
                        <div
                            ref={wrapperRef}
                            className={cn(
                                "block-editor-wrapper relative",
                                isSidebarOpen && "sidebar-open",
                                className
                            )}
                        >
                            <div className="block-editor-main flex min-h-0">
                                <div ref={canvasRef} className="block-editor-canvas flex-1 min-h-0 relative">
                                    <DndContext
                                        sensors={canvasSensors}
                                        onDragStart={handleCanvasDragStart}
                                        onDragEnd={handleCanvasDragEnd}
                                        onDragCancel={handleCanvasDragCancel}
                                    >
                                        <BlockNoteViewWithPortal
                                            editor={editor}
                                            theme="light"
                                            slashMenu={false}
                                            formattingToolbar={false}
                                            linkToolbar={false}
                                        >
                                            <SuggestionMenuController
                                                triggerCharacter="/"
                                                getItems={async (query) => getCustomSlashMenuItems(editor, {
                                                    contentType,
                                                    hasRecipeContext: typeof onRecipeChange === 'function',
                                                    hasRoundupContext: typeof onRoundupChange === 'function',
                                                }).filter(item => item.title.toLowerCase().includes(query.toLowerCase()))}
                                            />
                                        </BlockNoteViewWithPortal>
                                    </DndContext>
                                    {linkToolbar.open && (
                                        <div
                                            className="inline-link-toolbar"
                                            style={{
                                                top: `${linkToolbar.top}px`,
                                                left: `${linkToolbar.left}px`,
                                            }}
                                            onMouseDown={(event) => {
                                                if (!(event.target instanceof HTMLInputElement)) {
                                                    event.preventDefault();
                                                }
                                            }}
                                        >
                                            <div className="inline-link-toolbar-inner">
                                                <button
                                                    type="button"
                                                    className={cn('inline-link-button', activeStyles?.bold && 'is-active')}
                                                    onClick={() => {
                                                        editor.toggleStyles({ bold: true });
                                                        editor.focus();
                                                        setActiveStyles(editor.getActiveStyles() || {});
                                                    }}
                                                    title="Bold"
                                                >
                                                    <Bold className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={cn('inline-link-button', activeStyles?.italic && 'is-active')}
                                                    onClick={() => {
                                                        editor.toggleStyles({ italic: true });
                                                        editor.focus();
                                                        setActiveStyles(editor.getActiveStyles() || {});
                                                    }}
                                                    title="Italic"
                                                >
                                                    <Italic className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    className={cn('inline-link-button', linkToolbar.mode === 'link' && 'is-active')}
                                                    onClick={() => {
                                                        setLinkToolbar((prev) => ({
                                                            ...prev,
                                                            mode: 'link',
                                                            url: prev.url || 'https://',
                                                        }));
                                                    }}
                                                    title="Insert link"
                                                >
                                                    <LinkIcon className="w-4 h-4" />
                                                </button>
                                                {linkToolbar.mode === 'link' && (
                                                    <div className="inline-link-input">
                                                        <input
                                                            type="url"
                                                            value={linkToolbar.url}
                                                            onChange={(event) => {
                                                                const value = event.target.value;
                                                                setLinkToolbar((prev) => ({ ...prev, url: value }));
                                                            }}
                                                            onKeyDown={(event) => {
                                                                if (event.key === 'Enter') {
                                                                    event.preventDefault();
                                                                    const selectedText = linkToolbar.text || editor.getSelectedText();
                                                                    if (!selectedText || !linkToolbar.url) return;
                                                                    const selectionRange = linkToolbar.selection;
                                                                    if (selectionRange && editor._tiptapEditor?.commands?.setTextSelection) {
                                                                        editor._tiptapEditor.commands.setTextSelection(selectionRange);
                                                                    }
                                                                    editor.createLink(linkToolbar.url, selectedText);
                                                                    editor.focus();
                                                                    setLinkToolbar((prev) => ({ ...prev, open: false, mode: 'buttons' }));
                                                                }
                                                                if (event.key === 'Escape') {
                                                                    event.preventDefault();
                                                                    setLinkToolbar((prev) => ({ ...prev, mode: 'buttons' }));
                                                                }
                                                            }}
                                                            className="inline-link-input-field"
                                                            placeholder="https://"
                                                            autoFocus
                                                        />
                                                        <button
                                                            type="button"
                                                            className="inline-link-action"
                                                            onClick={() => {
                                                                const selectedText = linkToolbar.text || editor.getSelectedText();
                                                                if (!selectedText || !linkToolbar.url) return;
                                                                const selectionRange = linkToolbar.selection;
                                                                if (selectionRange && editor._tiptapEditor?.commands?.setTextSelection) {
                                                                    editor._tiptapEditor.commands.setTextSelection(selectionRange);
                                                                }
                                                                editor.createLink(linkToolbar.url, selectedText);
                                                                editor.focus();
                                                                setLinkToolbar((prev) => ({ ...prev, open: false, mode: 'buttons' }));
                                                            }}
                                                            title="Apply link"
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="inline-link-action"
                                                            onClick={() => setLinkToolbar((prev) => ({ ...prev, mode: 'buttons' }))}
                                                            title="Cancel"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {insertHandle && (
                                        <div
                                            className="block-insert-handle"
                                            style={{
                                                top: `${insertHandle.top}px`,
                                                left: `${insertHandle.left}px`,
                                                width: `${insertHandle.width}px`,
                                            }}
                                        >
                                            <div className="block-insert-line" />
                                            <DropdownMenu
                                                open={insertMenuOpen}
                                                onOpenChange={(open) => {
                                                    insertMenuOpenRef.current = open;
                                                    setInsertMenuOpen(open);
                                                    if (!open) {
                                                        setInsertHandle(null);
                                                    }
                                                }}
                                            >
                                                <DropdownMenuTrigger asChild>
                                                    <button
                                                        type="button"
                                                        className="block-insert-button"
                                                        onMouseDown={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            insertMenuOpenRef.current = true;
                                                            setInsertMenuOpen(true);
                                                        }}
                                                        title="Insert block"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="center" className="w-56">
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('paragraph')}>
                                                        <FileText className="w-4 h-4 mr-2" />
                                                        Paragraph
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 2 })}>
                                                        <Heading2 className="w-4 h-4 mr-2" />
                                                        Heading 2
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 3 })}>
                                                        <Heading3 className="w-4 h-4 mr-2" />
                                                        Heading 3
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 4 })}>
                                                        <Heading3 className="w-4 h-4 mr-2" />
                                                        Heading 4
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 5 })}>
                                                        <Heading3 className="w-4 h-4 mr-2" />
                                                        Heading 5
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 6 })}>
                                                        <Heading3 className="w-4 h-4 mr-2" />
                                                        Heading 6
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('bulletListItem')}>
                                                        <List className="w-4 h-4 mr-2" />
                                                        Bulleted list
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('numberedListItem')}>
                                                        <ListOrdered className="w-4 h-4 mr-2" />
                                                        Numbered list
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('blockquote')}>
                                                        <Quote className="w-4 h-4 mr-2" />
                                                        Quote
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('customImage')}>
                                                        <ImageIcon className="w-4 h-4 mr-2" />
                                                        Image
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('video')}>
                                                        <Video className="w-4 h-4 mr-2" />
                                                        Video
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('beforeAfter')}>
                                                        <SplitSquareVertical className="w-4 h-4 mr-2" />
                                                        Before / After
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('alert', { type: 'tip' })}>
                                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                                        Tip box
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('faqSection')}>
                                                        <HelpCircle className="w-4 h-4 mr-2" />
                                                        FAQ
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('simpleTable')}>
                                                        <Table className="w-4 h-4 mr-2" />
                                                        Table
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('divider')}>
                                                        <Minus className="w-4 h-4 mr-2" />
                                                        Divider
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {contentType === 'recipe' && typeof onRecipeChange === 'function' && (
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('mainRecipe')}>
                                                            <Utensils className="w-4 h-4 mr-2" />
                                                            Recipe details
                                                        </DropdownMenuItem>
                                                    )}
                                                    {contentType === 'roundup' && typeof onRoundupChange === 'function' && (
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('roundupList')}>
                                                            <LayoutGrid className="w-4 h-4 mr-2" />
                                                            Roundup list
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('recipeEmbed')}>
                                                        <Utensils className="w-4 h-4 mr-2" />
                                                        Embed recipe
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => insertBlockAtHandle('relatedContent')}>
                                                        <LayoutGrid className="w-4 h-4 mr-2" />
                                                        Related content
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <style>{`
        .block-editor-wrapper {
          border: none;
          border-radius: 0;
          overflow: visible;
          min-height: 500px;
          background: transparent;
          position: relative;
          display: flex;
          flex-direction: column;
          --gutter: 12px;
          --sidebar: 300px;
          --inserter: 220px;
        }

        .block-editor-main {
          display: flex;
          min-height: inherit;
          height: 100%;
          overflow: visible;
          position: relative;
        }

        .block-editor-canvas {
          position: relative;
          flex: 1;
          min-height: inherit;
          min-width: 0;
          overflow: visible;
        }

        .block-editor-wrapper .bn-container {
          min-height: inherit;
        }
        
        /* Remove default min-height from editor as wrapper handles it */
        .block-editor-wrapper .bn-editor {
          padding: 16px var(--gutter) 72px;
          min-height: 100%;
          height: auto;
          overflow-y: auto;
          overflow-x: visible;
          max-width: clamp(1000px, 98vw, 1500px);
          margin: 0 auto;
        }

        .block-editor-wrapper .bn-editor a {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .inline-link-toolbar {
          position: absolute;
          transform: translate(-50%, -100%);
          z-index: 30;
          pointer-events: auto;
        }

        .inline-link-toolbar-inner {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          border-radius: 999px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }

        .inline-link-button {
          align-items: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #4b5563;
          display: inline-flex;
          height: 26px;
          justify-content: center;
          width: 26px;
        }

        .inline-link-button:hover,
        .inline-link-button.is-active {
          background: #f3f4f6;
          color: #111827;
        }

        .inline-link-input {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding-left: 4px;
          border-left: 1px solid #e5e7eb;
        }

        .inline-link-input-field {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          height: 26px;
          padding: 0 8px;
          font-size: 12px;
          min-width: 160px;
        }

        .inline-link-action {
          align-items: center;
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          color: #374151;
          display: inline-flex;
          height: 26px;
          justify-content: center;
          width: 26px;
        }

        .inline-link-action:hover {
          background: #e5e7eb;
        }

        .block-editor-canvas .bn-editor {
          overflow-y: auto;
        }

        .block-insert-handle {
          position: absolute;
          height: 0;
          pointer-events: auto;
          z-index: 20;
        }

        .block-insert-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          --block-insert-gap: 18px;
          background: linear-gradient(
            to right,
            var(--wp-block-border-selected) 0,
            var(--wp-block-border-selected) calc(50% - var(--block-insert-gap)),
            transparent calc(50% - var(--block-insert-gap)),
            transparent calc(50% + var(--block-insert-gap)),
            var(--wp-block-border-selected) calc(50% + var(--block-insert-gap)),
            var(--wp-block-border-selected) 100%
          );
          pointer-events: none;
          transform-origin: center;
          animation: blockInsertLine 640ms cubic-bezier(0.2, 0, 0, 1);
          will-change: transform, opacity;
        }

        .block-insert-button {
          position: absolute;
          left: 50%;
          top: 0;
          transform: translate(-50%, -50%);
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
          color: #4b5563;
          pointer-events: auto;
          animation: blockInsertPop 640ms cubic-bezier(0.2, 0, 0, 1);
          will-change: transform, opacity;
        }

        .block-insert-button:hover {
          background: #f3f4f6;
          color: #111827;
        }

        @keyframes blockInsertPop {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.85);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes blockInsertLine {
          from {
            opacity: 0;
            transform: scaleX(0);
          }
          to {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .block-insert-line,
          .block-insert-button {
            animation: none;
          }
        }

        .block-editor-wrapper .bn-side-menu {
          display: flex;
          gap: 6px;
          align-items: center;
          padding: 2px;
          z-index: 30;
        }

        .block-editor-wrapper .bn-side-menu .bn-button {
          align-items: center;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
          display: inline-flex;
          height: 28px;
          justify-content: center;
          width: 28px;
        }

        .block-editor-wrapper .bn-side-menu .bn-button:hover {
          background: #f8fafc;
          border-color: #d1d5db;
        }

        .block-editor-wrapper .bn-side-menu [draggable="true"] {
          cursor: grab;
        }

        .block-editor-wrapper .bn-side-menu [draggable="true"]:active {
          cursor: grabbing;
        }

        .block-editor-wrapper .bn-formatting-toolbar {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
          padding: 4px 6px;
          z-index: 40;
        }

        .block-editor-wrapper .bn-formatting-toolbar .bn-button {
          border-radius: 999px;
        }

        .block-editor-wrapper .bn-suggestion-menu,
        .block-editor-wrapper .bn-menu-dropdown {
          border-radius: 12px;
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.12);
        }

        .block-editor-wrapper .bn-suggestion-menu-item {
          border-radius: 8px;
        }

        .block-editor-wrapper .bn-suggestion-menu-label {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 10px;
        }

        .bn-form-popover {
          background-color: var(--bn-colors-menu-background, #ffffff);
          border: var(--bn-border, 1px solid #e5e7eb);
          border-radius: var(--bn-border-radius-medium, 8px);
          box-shadow: var(--bn-shadow-medium, 0 10px 25px rgba(0, 0, 0, 0.12));
          color: var(--bn-colors-menu-text, #111827);
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 180px;
          padding: 6px;
        }

        .bn-form-popover .bn-text-input {
          width: 300px;
          max-width: min(320px, 75vw);
        }

        .bn-form-popover label {
          color: var(--bn-colors-menu-text, #6b7280);
          font-size: 11px;
          margin-bottom: 2px;
        }

        .bn-form-popover input,
        .bn-form-popover textarea,
        .bn-form-popover select {
          background-color: var(--bn-colors-background, #ffffff);
          border: 1px solid var(--bn-border-color, #e5e7eb);
          border-radius: 6px;
          color: var(--bn-colors-menu-text, #111827);
          font-size: 12px;
          padding: 6px 36px 6px 28px;
          width: 100%;
        }

        .bn-form-popover input::placeholder,
        .bn-form-popover textarea::placeholder {
          color: var(--bn-colors-menu-text, #6b7280);
        }

        .bn-form-popover svg {
          color: var(--bn-colors-menu-text, #6b7280);
        }

        .bn-link-submit {
          align-items: center;
          background: #f8fafc;
          border: 1px solid #e5e7eb;
          border-radius: 999px;
          color: #111827;
          cursor: pointer;
          display: inline-flex;
          height: 20px;
          justify-content: center;
          padding: 0;
          width: 20px;
        }

        .bn-link-submit:hover {
          background: #eef2f7;
        }

        .bn-link-submit-icon {
          height: 12px;
          width: 12px;
        }
      `}</style>
                        </div>
                    </RoundupDataContext.Provider>
                </RecipeDataContext.Provider>
            </BlockSelectionProvider>
        </RelatedContentProvider>
    );
}

export { contentJsonToBlocks, blocksToContentJson };
