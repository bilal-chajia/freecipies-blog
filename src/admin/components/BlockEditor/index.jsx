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
                    const listType = block.style === 'ordered' ? 'numberedListItem' : 'bulletListItem';
                    if (Array.isArray(block.items)) {
                        return block.items.map((item, i) => ({
                            id: `${id}-${i}`,
                            type: listType,
                            content: item,
                        }));
                    }
                    return { id, type: listType, content: '' };

                case 'blockquote':
                    return { id, type: 'paragraph', content: `> ${block.text || ''}` };

                case 'image':
                    return {
                        id,
                        type: 'customImage',
                        props: {
                            url: block.variants?.lg?.url || block.url || '',
                            caption: block.caption || '',
                            width: block.variants?.lg?.width || 512,
                            size: block.size || 'full',
                        },
                    };

                case 'video':
                    return {
                        id,
                        type: 'video',
                        props: {
                            url: block.url || '',
                            provider: block.provider || '',
                            videoId: block.videoId || '',
                            aspectRatio: block.aspectRatio || '16:9',
                        }
                    };

                case 'tip_box':
                case 'alert':
                    return {
                        id,
                        type: 'alert',
                        props: { type: block.variant || 'warning' },
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

                case 'recipe_card':
                    return {
                        id,
                        type: 'recipeCard',
                        props: {
                            articleId: block.article_id,
                            slug: block.slug,
                            headline: block.headline,
                            thumbnail: block.thumbnail,
                            difficulty: block.difficulty,
                            totalTime: block.total_time,
                        }
                    };

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
        if (block.type === 'bulletListItem' || block.type === 'numberedListItem') {
            const style = block.type === 'numberedListItem' ? 'ordered' : 'unordered';
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

            case 'heading':
                result.push({
                    type: 'heading',
                    level: block.props?.level || 2,
                    text: extractText(block.content),
                });
                break;

            case 'customImage':
                if (block.props?.url) {
                    result.push({
                        type: 'image',
                        url: block.props.url,
                        caption: block.props.caption || '',
                        variants: { lg: { url: block.props.url } },
                        size: block.props.size,
                    });
                }
                break;

            case 'video':
                if (block.props?.videoId) {
                    result.push({
                        type: 'video',
                        url: block.props.url,
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
                        variant: block.props?.type || 'warning',
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
                result.push({ type: 'divider', style: block.props.style });
                break;

            case 'recipeCard':
                if (block.props.articleId) {
                    result.push({
                        type: 'recipe_card',
                        article_id: block.props.articleId,
                        slug: block.props.slug,
                        headline: block.props.headline,
                        thumbnail: block.props.thumbnail,
                        difficulty: block.props.difficulty,
                        total_time: block.props.totalTime,
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
