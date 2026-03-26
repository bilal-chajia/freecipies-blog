import { safeInsertBlock } from "./utils/insert-block";
import type { BlockNoteEditor } from "@blocknote/core";
import { 
    AlertTriangle, 
    Utensils, 
    LayoutGrid, 
    SplitSquareVertical, 
    Table, 
    Minus,
    ClipboardList,
    BookOpen,
    Image as ImageIcon,
    Video,
    HelpCircle,
    Type,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Heading6,
    Quote
} from "lucide-react";
import React from "react";

interface SlashMenuOptions {
    contentType?: 'article' | 'recipe' | 'roundup';
    hasRecipeContext?: boolean;
    hasRoundupContext?: boolean;
}

/**
 * Custom Slash Menu Items
 * 
 * Provides a curated list of blocks for the slash menu,
 * including custom food blog blocks.
 */
export const getCustomSlashMenuItems = (
    editor: BlockNoteEditor<any, any, any>, 
    query: string, 
    options: SlashMenuOptions = {}
): any[] => {
    const {
        contentType = 'article',
        hasRecipeContext = false,
        hasRoundupContext = false,
    } = options;
    const hasBlockType = (blocks: any[] | undefined, type: string): boolean => {
        if (!Array.isArray(blocks)) return false;
        for (const block of blocks) {
            if (!block) continue;
            if (block.type === type) return true;
            if (hasBlockType(block.children, type)) return true;
        }
        return false;
    };
    const hasRoundupListBlock = hasBlockType(editor.document, 'roundupList');

    // Define our premium custom blocks
    const customItems = [
        {
            title: 'Image',
            onItemClick: () =>
                safeInsertBlock(editor, 'customImage'),
            aliases: ['image', 'photo', 'picture', 'media'],
            group: 'Media',
            subtext: 'Upload or select from library',
            icon: React.createElement(ImageIcon, { className: "size-4 text-blue-500" }),
        },
        {
            title: 'Video',
            onItemClick: () =>
                safeInsertBlock(editor, 'video'),
            aliases: ['video', 'movie', 'youtube', 'media'],
            group: 'Media',
            subtext: 'Embed a video player',
            icon: React.createElement(Video, { className: "size-4 text-indigo-500" }),
        },
        {
            title: 'Before / After',
            onItemClick: () =>
                safeInsertBlock(editor, 'beforeAfter'),
            aliases: ['before', 'after', 'compare'],
            group: 'Media',
            subtext: 'Compare two images',
            icon: React.createElement(SplitSquareVertical, { className: "size-4 text-purple-500" }),
        },
        {
            title: 'Alert Box',
            onItemClick: () =>
                safeInsertBlock(editor, 'alert', { type: 'warning' }),
            aliases: ['alert', 'tip', 'warning'],
            group: 'Engagement',
            subtext: 'Insert a tip/warning box',
            icon: React.createElement(AlertTriangle, { className: "size-4 text-amber-500" }),
        },
        {
            title: 'FAQ Section',
            onItemClick: () =>
                safeInsertBlock(editor, 'faqSection'),
            aliases: ['faq', 'questions', 'answers'],
            group: 'Engagement',
            subtext: 'Add structured questions',
            icon: React.createElement(HelpCircle, { className: "size-4 text-sky-500" }),
        },
        {
            title: 'Embed Recipe',
            onItemClick: () =>
                safeInsertBlock(editor, 'recipeEmbed'),
            aliases: ['recipe', 'embed', 'link'],
            group: 'Linked Content',
            subtext: 'Link to another recipe',
            icon: React.createElement(Utensils, { className: "size-4 text-emerald-500" }),
        },
        {
            title: 'Related Content',
            onItemClick: () =>
                safeInsertBlock(editor, 'relatedContent'),
            aliases: ['related', 'recommend'],
            group: 'Linked Content',
            subtext: 'Curate related recipes or articles',
            icon: React.createElement(LayoutGrid, { className: "size-4 text-indigo-500" }),
        },
        {
            title: 'Table',
            onItemClick: () =>
                safeInsertBlock(editor, 'simpleTable'),
            aliases: ['table', 'grid', 'matrix'],
            group: 'Layout',
            subtext: 'Add a table',
            icon: React.createElement(Table, { className: "size-4 text-slate-500" }),
        },
        {
            title: 'Divider',
            onItemClick: () =>
                safeInsertBlock(editor, 'divider'),
            aliases: ['divider', 'separator', 'line'],
            group: 'Layout',
            subtext: 'Add a horizontal divider',
            icon: React.createElement(Minus, { className: "size-4 text-slate-400" }),
        },
    ];

    // Contextual blocks (pushed to the top if applicable)
    if (contentType === 'recipe' && hasRecipeContext) {
        customItems.unshift({
            title: 'Recipe Details',
            onItemClick: () =>
                safeInsertBlock(editor, 'mainRecipe'),
            aliases: ['recipe', 'main', 'details'],
            group: 'Primary',
            subtext: 'The main recipe editor',
            icon: React.createElement(ClipboardList, { className: "size-4 text-rose-500" }),
        });
    }

    if (contentType === 'roundup' && hasRoundupContext && !hasRoundupListBlock) {
        customItems.unshift({
            title: 'Roundup List',
            onItemClick: () =>
                safeInsertBlock(editor, 'roundupList'),
            aliases: ['roundup', 'list', 'curated'],
            group: 'Primary',
            subtext: 'Manage curated items',
            icon: React.createElement(BookOpen, { className: "size-4 text-rose-500" }),
        });
    }

    // Curated Essential Default Blocks
    const defaultItems = [
        {
            title: 'Text',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'paragraph' }),
            aliases: ['p', 'text', 'normal', 'paragraph'],
            group: 'Text',
            subtext: 'Write normal text',
            icon: React.createElement(Type, { className: "size-4 text-slate-500" }),
        },
        {
            title: 'Heading 1',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 1 } }),
            aliases: ['h1', 'title', 'header'],
            group: 'Text',
            subtext: 'Large heading',
            icon: React.createElement(Heading1, { className: "size-4 text-slate-700" }),
        },
        {
            title: 'Heading 2',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 2 } }),
            aliases: ['h2', 'title', 'header'],
            group: 'Text',
            subtext: 'Medium heading',
            icon: React.createElement(Heading2, { className: "size-4 text-slate-700" }),
        },
        {
            title: 'Heading 3',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 3 } }),
            aliases: ['h3', 'title', 'header'],
            group: 'Text',
            subtext: 'Small heading',
            icon: React.createElement(Heading3, { className: "size-4 text-slate-700" }),
        },
        {
            title: 'Heading 4',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 4 } }),
            aliases: ['h4', 'title'],
            group: 'Text',
            subtext: 'Level 4 heading',
            icon: React.createElement(Heading4, { className: "size-4 text-slate-600" }),
        },
        {
            title: 'Heading 5',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 5 } }),
            aliases: ['h5', 'title'],
            group: 'Text',
            subtext: 'Level 5 heading',
            icon: React.createElement(Heading5, { className: "size-4 text-slate-600" }),
        },
        {
            title: 'Heading 6',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 6 } }),
            aliases: ['h6', 'title'],
            group: 'Text',
            subtext: 'Level 6 heading',
            icon: React.createElement(Heading6, { className: "size-4 text-slate-600" }),
        },
        {
            title: 'Bullet List',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'bulletListItem' }),
            aliases: ['ul', 'li', 'list'],
            group: 'Text',
            subtext: 'Unordered list',
            icon: React.createElement(List, { className: "size-4 text-slate-600" }),
        },
        {
            title: 'Numbered List',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'numberedListItem' }),
            aliases: ['ol', 'li', 'list'],
            group: 'Text',
            subtext: 'Ordered list',
            icon: React.createElement(ListOrdered, { className: "size-4 text-slate-600" }),
        },
        {
            title: 'Quote',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'blockquote' }),
            aliases: ['quote', 'cite', 'citation'],
            group: 'Text',
            subtext: 'Add a blockquote',
            icon: React.createElement(Quote, { className: "size-4 text-slate-600" }),
        },
    ];

    const allItems = [
        ...customItems,
        ...defaultItems
    ];

    return allItems.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.aliases?.some((alias: string) => alias.toLowerCase().includes(query.toLowerCase()))
    );
};
