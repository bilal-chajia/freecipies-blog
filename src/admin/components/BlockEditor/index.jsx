/**
 * BlockEditor Component
 * 
 * A visual block-based editor for article content.
 * Built on BlockNote for React with custom blocks.
 */

import { useEffect, useMemo, useRef } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { useCreateBlockNote } from '@blocknote/react';
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
    Quote,
    Minus,
    AlertTriangle,
    HelpCircle,
    Utensils
} from 'lucide-react';

// Custom blocks
import {
    Alert,
    VideoBlock,
    ImageBlock,
    FAQSectionBlock,
    DividerBlock,
    RecipeCardBlock
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
    },
});

// Custom slash menu items
const getCustomSlashMenuItems = (editor) => [
    ...getDefaultReactSlashMenuItems(editor),
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
    // Add other custom blocks here if needed...
];

/**
 * Editor Toolbar Component
 */
const EditorToolbar = ({ editor }) => {
    if (!editor) return null;

    const insertBlock = (type, props = {}) => {
        const currentBlock = editor.getTextCursorPosition().block;
        editor.insertBlocks([{ type, props }], currentBlock, 'after');
        editor.focus();
    };

    return (
        <div className="flex items-center gap-1 p-2 border-b bg-gray-50 flex-wrap">
            <button onClick={() => insertBlock('heading', { level: 2 })} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
            <button onClick={() => insertBlock('heading', { level: 3 })} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Heading 3"><Heading3 className="w-4 h-4" /></button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button onClick={() => insertBlock('bulletListItem')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Bullet List"><List className="w-4 h-4" /></button>
            <button onClick={() => insertBlock('numberedListItem')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Numbered List"><ListOrdered className="w-4 h-4" /></button>
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

            <div className="w-px h-4 bg-gray-300 mx-1" />

            <button onClick={() => insertBlock('divider')} className="p-1.5 hover:bg-gray-200 rounded text-gray-700" title="Divider"><Minus className="w-4 h-4" /></button>
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
                    return { id, type: 'paragraph', content: block.text || '' };

                case 'heading':
                    return { id, type: 'heading', props: { level: block.level || 2 }, content: block.text || '' };

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
                            content: item,
                        }));
                    }
                    return { id, type: listType, content: '' };

                case 'blockquote':
                    return { id, type: 'blockquote', content: block.text || '' };

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
                            width: bestVariant.width || 512,
                            height: bestVariant.height || 0,
                            size: block.size || 'full',
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
                        content: block.text || '',
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
                        size: block.props.size || 'full',
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
        return content.map(item => {
            if (typeof item === 'string') return item;
            if (item.type === 'text') return item.text || '';
            if (item.text) return item.text;
            return '';
        }).join('');
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
}) {
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

    useEffect(() => {
        if (!editor || !onChange) return;

        const handleChange = () => {
            const blocks = editor.document;
            const contentJson = blocksToContentJson(blocks);
            onChange(JSON.stringify(contentJson, null, 2));
        };

        editor.onEditorContentChange(handleChange);
    }, [editor, onChange]);

    if (!editor) return null;

    return (
        <div className={`block-editor-wrapper ${className} relative group flex flex-col`}>
            <EditorToolbar editor={editor} />
            <div className="flex-1 overflow-y-auto">
                <BlockNoteView
                    editor={editor}
                    theme="light"
                    slashMenu={false}
                >
                    <SuggestionMenuController
                        triggerCharacter="/"
                        getItems={async (query) => getCustomSlashMenuItems(editor).filter(item => item.title.toLowerCase().includes(query.toLowerCase()))}
                    />
                </BlockNoteView>
            </div>

            <style>{`
        .block-editor-wrapper {
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          overflow: hidden;
          min-height: 500px;
          height: 600px;
          background: white;
        }
        
        /* Remove default min-height from editor as wrapper handles it */
        .block-editor-wrapper .bn-editor {
          padding: 1rem; 
        }
      `}</style>
        </div>
    );
}

export { contentJsonToBlocks, blocksToContentJson };
