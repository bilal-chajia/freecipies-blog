/**
 * BlockEditor Component
 * 
 * A visual block-based editor for article content.
 * Built on BlockNote for React with custom blocks.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { BlockNoteViewWithPortal } from './BlockNoteViewWithPortal';
import {
    useCreateBlockNote,
    FormattingToolbarController,
    FormattingToolbar,
    CreateLinkButton,
    SideMenuController,
    LinkToolbarController,
    BasicTextStyleButton
} from '@blocknote/react';
import { BlockNoteSchema, defaultBlockSpecs } from '@blocknote/core';
import { SuggestionMenuController, getDefaultReactSlashMenuItems } from "@blocknote/react";
import '@blocknote/mantine/style.css';
import {
    Plus,
    Image as ImageIcon,
    Video,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Link as LinkIcon,
    Quote,
    ListTree,
    Minus,
    AlertTriangle,
    HelpCircle,
    Utensils,
    LayoutGrid,
    Table,
    FileText,
    X,
    SplitSquareVertical
} from 'lucide-react';
import { RelatedContentProvider } from './related-content-context';

// Custom blocks
import {
    Alert,
    VideoBlock,
    ImageBlock,
    FAQSectionBlock,
    DividerBlock,
    RecipeCardBlock,
    RelatedContentBlock,
    TableBlock,
    BeforeAfterBlock
} from './blocks';

// Create custom schema with our blocks
const schema = BlockNoteSchema.create({
    blockSpecs: {
        ...defaultBlockSpecs,
        alert: Alert(),
        video: VideoBlock(),
        customImage: ImageBlock(),
        faqSection: FAQSectionBlock(),
        divider: DividerBlock(),
        recipeCard: RecipeCardBlock(),
        relatedContent: RelatedContentBlock(),
        simpleTable: TableBlock(),
        beforeAfter: BeforeAfterBlock(),
    },
});

// Custom slash menu items
const getCustomSlashMenuItems = (editor) => [
    ...getDefaultReactSlashMenuItems(editor).filter((item) => item.title !== 'Table'),
    // Custom items are added automatically by defaultBlockSpecs/schema usually, 
    // but we defining explicit ones ensures they appear with correct metadata
    {
        title: 'Alert Box',
        onItemClick: () => editor.insertBlocks([{ type: 'alert', props: { type: 'warning' } }], editor.getTextCursorPosition().block, 'after'),
        aliases: ['alert', 'tip', 'warning'],
        group: 'Food Blog',
        subtext: 'Insert a tip/warning box',
    },
    {
        title: 'Recipe Card',
        onItemClick: () => editor.insertBlocks([{ type: 'recipeCard' }], editor.getTextCursorPosition().block, 'after'),
        aliases: ['recipe'],
        group: 'Food Blog',
        subtext: 'Link to a recipe',
    },
    {
        title: 'Related Content',
        onItemClick: () => editor.insertBlocks([{ type: 'relatedContent' }], editor.getTextCursorPosition().block, 'after'),
        aliases: ['related', 'recommend'],
        group: 'Food Blog',
        subtext: 'Curate related recipes or articles',
    },
    {
        title: 'Before / After',
        onItemClick: () => editor.insertBlocks([{ type: 'beforeAfter' }], editor.getTextCursorPosition().block, 'after'),
        aliases: ['before', 'after', 'compare'],
        group: 'Food Blog',
        subtext: 'Compare two images',
    },
    {
        title: 'Table',
        onItemClick: () => editor.insertBlocks([{ type: 'simpleTable' }], editor.getTextCursorPosition().block, 'after'),
        aliases: ['table', 'grid', 'matrix'],
        group: 'Layout',
        subtext: 'Add a table',
    },
    {
        title: 'Divider',
        onItemClick: () => editor.insertBlocks([{ type: 'divider' }], editor.getTextCursorPosition().block, 'after'),
        aliases: ['divider', 'separator', 'line'],
        group: 'Layout',
        subtext: 'Add a horizontal divider',
    },
    // Add other custom blocks here if needed...
];

const MAX_STRUCTURE_LABEL = 48;

const truncateLabel = (text = '') => {
    const value = String(text || '').trim();
    if (!value) return '';
    if (value.length <= MAX_STRUCTURE_LABEL) return value;
    return `${value.slice(0, MAX_STRUCTURE_LABEL - 3)}...`;
};

const flattenBlocks = (blocks, depth = 0, acc = []) => {
    (blocks || []).forEach((block) => {
        acc.push({ block, depth });
        if (Array.isArray(block.children) && block.children.length > 0) {
            flattenBlocks(block.children, depth + 1, acc);
        }
    });
    return acc;
};

const getBlockLabel = (block) => {
    const contentText = extractText(block.content);
    switch (block.type) {
        case 'heading':
            return truncateLabel(contentText || `Heading ${block.props?.level || ''}`);
        case 'paragraph':
            return truncateLabel(contentText || 'Paragraph');
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
        case 'recipeCard':
            return truncateLabel(block.props?.headline || 'Recipe card');
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

const getBlockIcon = (type) => {
    switch (type) {
        case 'heading':
            return Heading1;
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
        case 'recipeCard':
            return Utensils;
        case 'relatedContent':
            return LayoutGrid;
        case 'beforeAfter':
            return SplitSquareVertical;
        case 'blockquote':
            return Quote;
        default:
            return FileText;
    }
};

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
        editor.insertBlocks([{ type, props }], currentBlock, 'after');
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
                <button onClick={() => {
                    const currentBlock = editor.getTextCursorPosition().block;
                    // Toggle block type logic is complex, simpler to just insert for now or use editor capabilities
                    // For simplistic toolbar we just insert 'after'
                    insertBlock('paragraph'); // This is just 'Reset' essentially if used on empty
                }} className="p-1.5 hover:bg-gray-200 rounded text-gray-700 hidden" title="Text"><span className="text-xs font-serif font-bold">T</span></button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                {/* Media */}
                <button onClick={() => insertBlock('customImage')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Image"><ImageIcon className="w-4 h-4" /></button>
                <button onClick={() => insertBlock('video')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Video"><Video className="w-4 h-4" /></button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                {/* Food Blog specific */}
                <button onClick={() => insertBlock('alert', { type: 'tip' })} className="p-1.5 hover:bg-gray-200 rounded text-amber-600" title="Tip/Alert"><AlertTriangle className="w-4 h-4" /></button>
                <button onClick={() => insertBlock('recipeCard')} className="p-1.5 hover:bg-gray-200 rounded text-green-600" title="Recipe Card"><Utensils className="w-4 h-4" /></button>
                <button onClick={() => insertBlock('faqSection')} className="p-1.5 hover:bg-gray-200 rounded text-blue-600" title="FAQ"><HelpCircle className="w-4 h-4" /></button>
                <button onClick={() => insertBlock('relatedContent')} className="p-1.5 hover:bg-gray-200 rounded text-purple-600" title="Related Content"><LayoutGrid className="w-4 h-4" /></button>
                <button onClick={() => insertBlock('beforeAfter')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Before/After"><SplitSquareVertical className="w-4 h-4" /></button>
                <button onClick={() => insertBlock('simpleTable')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Table"><Table className="w-4 h-4" /></button>

                <div className="w-px h-4 bg-gray-300 mx-1" />

                <button onClick={() => insertBlock('divider')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Divider"><Minus className="w-4 h-4" /></button>
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

const StructurePanel = ({
    open,
    tab,
    items,
    activeBlockId,
    onTabChange,
    onSelectBlock,
    onClose,
}) => {
    if (!open) return null;

    const outlineItems = items.filter((item) => item.type === 'heading');
    const visibleItems = tab === 'outline' ? outlineItems : items;

    return (
        <div className="block-editor-structure-panel">
            <div className="structure-panel-header">
                <div className="structure-tabs">
                    <button
                        type="button"
                        className={`structure-tab ${tab === 'list' ? 'is-active' : ''}`}
                        onClick={() => onTabChange('list')}
                    >
                        List View
                    </button>
                    <button
                        type="button"
                        className={`structure-tab ${tab === 'outline' ? 'is-active' : ''}`}
                        onClick={() => onTabChange('outline')}
                    >
                        Outline
                    </button>
                </div>
                <button
                    type="button"
                    className="structure-close"
                    onClick={onClose}
                    title="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="structure-panel-list">
                {visibleItems.length === 0 ? (
                    <div className="structure-empty">No blocks yet.</div>
                ) : (
                    visibleItems.map((item) => {
                        const Icon = getBlockIcon(item.type);
                        return (
                            <button
                                key={item.id}
                                type="button"
                                className={`structure-item ${activeBlockId === item.id ? 'is-active' : ''}`}
                                style={{ paddingLeft: `${12 + item.depth * 14}px` }}
                                onClick={() => onSelectBlock(item.id)}
                            >
                                <Icon className="structure-item-icon" />
                                <span className="structure-item-label">{item.label}</span>
                                {item.type === 'heading' && item.level ? (
                                    <span className="structure-item-meta">H{item.level}</span>
                                ) : null}
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );
};

const LinkFormattingToolbar = () => (
    <FormattingToolbar>
        <BasicTextStyleButton basicTextStyle="bold" />
        <BasicTextStyleButton basicTextStyle="italic" />
        <CreateLinkButton />
    </FormattingToolbar>
);

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

const parseInlineMarkdown = (text) => {
    if (!text) return '';
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    let lastIndex = 0;
    const parts = [];
    let hasLink = false;

    while ((match = pattern.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        parts.push({
            type: 'link',
            href: match[2],
            content: match[1],
        });
        hasLink = true;
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }

    return hasLink ? parts : text;
};

const serializeInlineNode = (node) => {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type === 'text') return node.text || '';
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
    if (!contentJson || !Array.isArray(contentJson)) {
        return undefined;
    }

    try {
        return contentJson.map((block, index) => {
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
                        type: 'recipeCard',
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

            case 'recipeCard':
                if (block.props.articleId) {
                    const articleId = parseInt(block.props.articleId, 10);
                    if (!Number.isFinite(articleId)) break;
                    const cover = block.props.thumbnail ? { url: block.props.thumbnail } : undefined;
                    result.push({
                        type: 'recipe_card',
                        article_id: articleId,
                        headline: block.props.headline || '',
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
    placeholder = 'Start writing your article...',
    className = '',
    context,
}) {
    const wrapperRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const lastSerializedRef = useRef('');
    const initialContent = useMemo(() => {
        if (!value) return undefined;
        try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            return contentJsonToBlocks(parsed);
        } catch (error) {
            console.error('Error parsing initial content:', error);
            return undefined;
        }
    }, []);

    const editor = useCreateBlockNote({
        schema,
        initialContent,
    });
    const [structurePanelOpen, setStructurePanelOpen] = useState(false);
    const [structureTab, setStructureTab] = useState('list');
    const [structureItems, setStructureItems] = useState([]);
    const [activeBlockId, setActiveBlockId] = useState(null);
    const [insertHandle, setInsertHandle] = useState(null);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        if (!editor) return;

        const handleChange = () => {
            const blocks = editor.document;
            const flatBlocks = flattenBlocks(blocks);
            const nextItems = flatBlocks.map(({ block, depth }) => ({
                id: block.id,
                type: block.type,
                depth,
                level: block.props?.level,
                label: getBlockLabel(block),
            }));
            setStructureItems(nextItems);
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

    useEffect(() => {
        if (!editor) return undefined;
        const handleSelection = () => {
            const block = editor.getTextCursorPosition().block;
            setActiveBlockId(block?.id || null);
        };
        handleSelection();
        const unsubscribe = editor.onSelectionChange(handleSelection);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor]);

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
        if (!editor?.domElement || !wrapperRef.current) return;
        const root = editor.domElement;
        const wrapper = wrapperRef.current;

        const updateHandle = (event) => {
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

            const blockOuter = target.closest('.bn-block-outer');
            if (!blockOuter || !root.contains(blockOuter)) {
                setInsertHandle(null);
                return;
            }
            const blockId = blockOuter.getAttribute('data-id');
            if (!blockId) {
                setInsertHandle(null);
                return;
            }
            const rect = blockOuter.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();
            const midpoint = rect.top + rect.height / 2;
            const placement = event.clientY < midpoint ? 'before' : 'after';
            const top = (placement === 'before' ? rect.top : rect.bottom) - wrapperRect.top;
            const left = rect.left - wrapperRect.left;
            const width = rect.width;
            setInsertHandle({
                blockId,
                placement,
                top,
                left,
                width,
            });
        };

        const clearHandle = () => setInsertHandle(null);

        root.addEventListener('mousemove', updateHandle);
        root.addEventListener('mouseleave', clearHandle);
        root.addEventListener('scroll', clearHandle);

        return () => {
            root.removeEventListener('mousemove', updateHandle);
            root.removeEventListener('mouseleave', clearHandle);
            root.removeEventListener('scroll', clearHandle);
        };
    }, [editor]);

    if (!editor) return null;

    const relatedContext = {
        categorySlug: context?.categorySlug || null,
        tagSlugs: Array.isArray(context?.tagSlugs) ? context.tagSlugs : [],
        currentSlug: context?.currentSlug || null,
    };

    const handleInsertBetween = () => {
        if (!insertHandle) return;
        const inserted = editor.insertBlocks(
            [{ type: 'paragraph' }],
            insertHandle.blockId,
            insertHandle.placement,
        );
        if (inserted?.[0]?.id) {
            editor.setTextCursorPosition(inserted[0].id, 'start');
        }
        editor.focus();
        setInsertHandle(null);
    };

    const handleSelectStructureBlock = (blockId) => {
        if (!blockId) return;
        editor.setTextCursorPosition(blockId, 'start');
        editor.focus();
    };

    return (
        <RelatedContentProvider value={relatedContext}>
            <div
                ref={wrapperRef}
                className={`block-editor-wrapper ${className} relative group flex flex-col ${structurePanelOpen ? 'structure-panel-open' : ''}`}
            >
                <EditorToolbar
                    editor={editor}
                    structureOpen={structurePanelOpen}
                    onToggleStructurePanel={() => setStructurePanelOpen((prev) => !prev)}
                />
                <div className="flex-1 min-h-0 relative">
                    <StructurePanel
                        open={structurePanelOpen}
                        tab={structureTab}
                        items={structureItems}
                        activeBlockId={activeBlockId}
                        onTabChange={setStructureTab}
                        onSelectBlock={handleSelectStructureBlock}
                        onClose={() => setStructurePanelOpen(false)}
                    />
                    <BlockNoteViewWithPortal
                        editor={editor}
                        theme="light"
                        slashMenu={false}
                        formattingToolbar={false}
                        linkToolbar={false}
                    >
                        <SideMenuController />
                        <FormattingToolbarController formattingToolbar={LinkFormattingToolbar} />
                        <LinkToolbarController />
                        <SuggestionMenuController
                            triggerCharacter="/"
                            getItems={async (query) => getCustomSlashMenuItems(editor).filter(item => item.title.toLowerCase().includes(query.toLowerCase()))}
                        />
                    </BlockNoteViewWithPortal>
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
                            <button
                                type="button"
                                className="block-insert-button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={handleInsertBetween}
                                title="Insert block"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                <style>{`
        .block-editor-wrapper {
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          overflow: visible;
          min-height: 500px;
          height: 600px;
          background: white;
        }

        .block-editor-wrapper .bn-container {
          height: 100%;
        }
        
        /* Remove default min-height from editor as wrapper handles it */
        .block-editor-wrapper .bn-editor {
          padding: 1rem; 
          padding-left: 2.75rem;
          min-height: 100%;
          height: 100%;
          overflow-y: auto;
          overflow-x: visible;
        }

        .block-editor-wrapper.structure-panel-open .bn-editor {
          padding-left: calc(2.75rem + 280px);
        }

        .block-editor-wrapper .bn-editor a {
          color: #2563eb;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .block-editor-structure-panel {
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 280px;
          background: #ffffff;
          border-right: 1px solid #e5e7eb;
          z-index: 25;
          display: flex;
          flex-direction: column;
        }

        .structure-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #e5e7eb;
          padding: 8px 10px;
          gap: 8px;
        }

        .structure-tabs {
          display: flex;
          gap: 4px;
          background: #f3f4f6;
          border-radius: 8px;
          padding: 3px;
        }

        .structure-tab {
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          color: #4b5563;
          background: transparent;
        }

        .structure-tab.is-active {
          background: #ffffff;
          color: #111827;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
        }

        .structure-close {
          width: 26px;
          height: 26px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
        }

        .structure-close:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .structure-panel-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px 6px 12px;
        }

        .structure-empty {
          padding: 16px;
          font-size: 12px;
          color: #9ca3af;
          text-align: center;
        }

        .structure-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 12px;
          color: #374151;
          text-align: left;
        }

        .structure-item:hover {
          background: #f3f4f6;
        }

        .structure-item.is-active {
          background: #e0e7ff;
          color: #1f2937;
        }

        .structure-item-icon {
          width: 14px;
          height: 14px;
          color: #6b7280;
          flex-shrink: 0;
        }

        .structure-item-label {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .structure-item-meta {
          font-size: 10px;
          color: #9ca3af;
        }

        .block-insert-handle {
          position: absolute;
          height: 0;
          pointer-events: none;
          z-index: 20;
        }

        .block-insert-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 1px;
          background: #e5e7eb;
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
        }

        .block-insert-button:hover {
          background: #f3f4f6;
          color: #111827;
        }

        .block-editor-wrapper .bn-side-menu {
          display: flex;
          gap: 6px;
          align-items: center;
          padding: 2px;
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
        </RelatedContentProvider>
    );
}

export { contentJsonToBlocks, blocksToContentJson };
