import { safeInsertBlock } from "./utils/insert-block";
import type { BlockNoteEditor } from "@blocknote/core";
import {
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
import { SLASH_BLOCKS } from "./blocks/registry";

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

    // Custom blocks, derived from the unified block registry.
    const toSlashItem = (block: typeof SLASH_BLOCKS[number]) => ({
        title: block.slash.title,
        onItemClick: () =>
            safeInsertBlock(editor, block.editorType, block.slash.defaultProps),
        aliases: block.slash.aliases,
        group: block.slash.group,
        subtext: block.slash.subtext,
        icon: React.createElement(block.slash.icon, { className: block.slash.iconClassName }),
    });

    const customItems = SLASH_BLOCKS
        .filter((block) => !block.slash.contextual)
        .map(toSlashItem);

    // Contextual blocks (pinned to the top when their context matches).
    SLASH_BLOCKS
        .filter((block) => block.slash.contextual === contentType)
        .forEach((block) => customItems.unshift(toSlashItem(block)));

    // Curated Essential Default Blocks
    const defaultItems = [
        {
            title: 'Text',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'paragraph' }),
            aliases: ['p', 'text', 'normal', 'paragraph'],
            group: 'Text',
            subtext: 'Write normal text',
            icon: React.createElement(Type, { className: "size-4 text-muted-foreground" }),
        },
        {
            title: 'Heading 1',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 1 } }),
            aliases: ['h1', 'title', 'header'],
            group: 'Text',
            subtext: 'Large heading',
            icon: React.createElement(Heading1, { className: "size-4 text-foreground" }),
        },
        {
            title: 'Heading 2',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 2 } }),
            aliases: ['h2', 'title', 'header'],
            group: 'Text',
            subtext: 'Medium heading',
            icon: React.createElement(Heading2, { className: "size-4 text-foreground" }),
        },
        {
            title: 'Heading 3',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 3 } }),
            aliases: ['h3', 'title', 'header'],
            group: 'Text',
            subtext: 'Small heading',
            icon: React.createElement(Heading3, { className: "size-4 text-foreground" }),
        },
        {
            title: 'Heading 4',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 4 } }),
            aliases: ['h4', 'title'],
            group: 'Text',
            subtext: 'Level 4 heading',
            icon: React.createElement(Heading4, { className: "size-4 text-muted-foreground/90" }),
        },
        {
            title: 'Heading 5',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 5 } }),
            aliases: ['h5', 'title'],
            group: 'Text',
            subtext: 'Level 5 heading',
            icon: React.createElement(Heading5, { className: "size-4 text-muted-foreground/90" }),
        },
        {
            title: 'Heading 6',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'heading', props: { level: 6 } }),
            aliases: ['h6', 'title'],
            group: 'Text',
            subtext: 'Level 6 heading',
            icon: React.createElement(Heading6, { className: "size-4 text-muted-foreground/90" }),
        },
        {
            title: 'Bullet List',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'bulletListItem' }),
            aliases: ['ul', 'li', 'list'],
            group: 'Text',
            subtext: 'Unordered list',
            icon: React.createElement(List, { className: "size-4 text-muted-foreground/90" }),
        },
        {
            title: 'Numbered List',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'numberedListItem' }),
            aliases: ['ol', 'li', 'list'],
            group: 'Text',
            subtext: 'Ordered list',
            icon: React.createElement(ListOrdered, { className: "size-4 text-muted-foreground/90" }),
        },
        {
            title: 'Quote',
            onItemClick: () => editor.updateBlock(editor.getTextCursorPosition().block, { type: 'blockquote' }),
            aliases: ['quote', 'cite', 'citation'],
            group: 'Text',
            subtext: 'Add a blockquote',
            icon: React.createElement(Quote, { className: "size-4 text-muted-foreground/90" }),
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
