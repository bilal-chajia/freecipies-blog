import type { BlockAdapter } from '../BlockAdapter';
import type { ListBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseInlineMarkdown, extractText } from '../../utils/inlineContent';

const styleToEditorType = {
    unordered: 'bulletListItem',
    ordered: 'numberedListItem',
    checklist: 'checkListItem',
} as const;

const editorTypeToStyle = {
    bulletListItem: 'unordered',
    numberedListItem: 'ordered',
    checkListItem: 'checklist',
} as const;

export const ListAdapter: BlockAdapter<ListBlock> = {
    type: 'list',

    toEditor(block) {
        const editorType = styleToEditorType[block.style] || 'bulletListItem';
        const firstItem = block.items[0] || '';
        return {
            type: editorType,
            props: {
                textAlignment: 'left',
                textColor: 'default',
            },
            content: parseInlineMarkdown(firstItem),
        };
    },

    fromEditor(block: AppBlock): ListBlock | null {
        const text = extractText(block.content as any);
        if (!text.trim()) return null;
        const style = editorTypeToStyle[block.type as keyof typeof editorTypeToStyle] || 'unordered';
        return {
            type: 'list',
            style: style as 'ordered' | 'unordered' | 'checklist',
            items: [text],
        };
    },
};
