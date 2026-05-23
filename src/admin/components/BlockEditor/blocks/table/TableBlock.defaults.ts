import type { TableRow } from './TableBlock.types';

export const DEFAULT_HEADERS: TableRow = ['Column 1', 'Column 2'];

export const normalizeRows = (rows: TableRow[], columns: number): TableRow[] => {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const next = Array.isArray(row) ? [...row] : [];
    while (next.length < columns) next.push('');
    return next.slice(0, columns);
  });
};
