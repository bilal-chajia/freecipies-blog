import type { BlockAdapter } from '../BlockAdapter';
import type { TableBlock } from '@modules/articles/types/content-blocks.types';
import type { AppBlock } from '../../types/editor.types';
import { parseJsonArray } from '../../utils/json';

function defaultHeadersForRows(rows: string[][]): string[] {
    const columnCount = rows.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
    return Array.from({ length: Math.max(1, columnCount) }, (_, index) => `Column ${index + 1}`);
}

export const TableAdapter: BlockAdapter<TableBlock> = {
    type: 'table',

    toEditor(block) {
        return {
            type: 'simpleTable',
            props: {
                headersJson: JSON.stringify(Array.isArray(block.headers) ? block.headers : []),
                rowsJson: JSON.stringify(Array.isArray(block.rows) ? block.rows : []),
            },
        };
    },

    fromEditor(block: AppBlock): TableBlock | null {
        const props = block.props as Record<string, unknown>;

        const headers: string[] = Array.isArray(props.headersJson)
            ? (props.headersJson as string[])
            : parseJsonArray<string>(props.headersJson ?? props.headers);
        const rows: string[][] = Array.isArray(props.rowsJson)
            ? (props.rowsJson as string[][])
            : parseJsonArray<string[]>(props.rowsJson ?? props.rows);

        const legacyHeaders: string[] = Array.isArray(props.headers)
            ? (props.headers as string[])
            : [];
        const legacyRows: string[][] = Array.isArray(props.rows)
            ? (props.rows as string[][])
            : [];

        const normalizedHeaders = headers.length ? headers : legacyHeaders;
        const normalizedRows = rows.length ? rows : legacyRows;

        if (!normalizedHeaders.length && !normalizedRows.length) return null;

        return {
            ...(typeof block.id === 'string' ? { id: block.id } : {}),
            type: 'table',
            headers: normalizedHeaders.length > 0 ? normalizedHeaders : defaultHeadersForRows(normalizedRows),
            rows: normalizedRows.length > 0 ? normalizedRows : [],
        };
    },
};
