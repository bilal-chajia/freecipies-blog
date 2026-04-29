import type { BlockAdapter } from '../BlockAdapter';
import type { TableBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonArray } from '../../utils/json';

export const TableAdapter: BlockAdapter<TableBlock> = {
    type: 'table',

    toEditor(block) {
        return {
            type: 'simpleTable',
            props: {
                headers: Array.isArray(block.headers) ? block.headers : [],
                rows: Array.isArray(block.rows) ? block.rows : [],
            },
        };
    },

    fromEditor(block: AppBlock): TableBlock | null {
        const props = block.props as Record<string, unknown>;

        const headers: string[] = Array.isArray(props.headers)
            ? (props.headers as string[])
            : parseJsonArray<string>(props.headers);
        const rows: string[][] = Array.isArray(props.rows)
            ? (props.rows as string[][])
            : parseJsonArray<string[]>(props.rows);

        if (!headers.length && !rows.length) return null;

        return {
            type: 'table',
            headers: headers.length > 0 ? headers : ['Column 1'],
            rows: rows.length > 0 ? rows : [],
        };
    },
};
