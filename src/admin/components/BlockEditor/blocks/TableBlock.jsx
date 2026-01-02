/**
 * Custom Block: Table
 *
 * Simple editable table for content_json.
 * 
 * REFACTORED for WordPress Block Editor design:
 * - Proper selected/unselected visual states
 * - Block toolbar with row/column add buttons
 * - Clean visual styling
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useMemo, useRef, useState } from 'react';
import { Table2, Plus, Trash2, Columns, Rows } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

const parseList = (value, fallback = []) => {
    if (!value) return fallback;
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
};

const toJson = (value) => JSON.stringify(value || []);

const normalizeRows = (rows, columns) => {
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => {
        const next = Array.isArray(row) ? [...row] : [];
        while (next.length < columns) next.push('');
        return next.slice(0, columns);
    });
};

export const TableBlock = createReactBlockSpec(
    {
        type: 'simpleTable',
        propSchema: {
            headersJson: { default: '[]' },
            rowsJson: { default: '[]' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const wrapperRef = useRef(null);
            const tableRef = useRef(null);
            const [isSelected, setIsSelected] = useState(false);

            const headers = useMemo(
                () => parseList(block.props.headersJson),
                [block.props.headersJson]
            );
            const rows = useMemo(
                () => parseList(block.props.rowsJson),
                [block.props.rowsJson]
            );
            const [rowInsert, setRowInsert] = useState(null);
            const [colInsert, setColInsert] = useState(null);

            const safeHeaders = headers.length > 0 ? headers : ['Column 1', 'Column 2'];
            const safeRows = normalizeRows(rows, safeHeaders.length);

            const updateBlockProps = (updates) => {
                editor.updateBlock(block, {
                    type: 'simpleTable',
                    props: { ...block.props, ...updates },
                });
            };

            const updateHeaders = (nextHeaders) => {
                const normalizedRows = normalizeRows(safeRows, nextHeaders.length);
                updateBlockProps({
                    headersJson: toJson(nextHeaders),
                    rowsJson: toJson(normalizedRows),
                });
            };

            const updateRows = (nextRows) => {
                updateBlockProps({ rowsJson: toJson(normalizeRows(nextRows, safeHeaders.length)) });
            };

            const insertColumnAt = (index) => {
                const nextHeaders = [...safeHeaders];
                nextHeaders.splice(index, 0, `Column ${nextHeaders.length + 1}`);
                const nextRows = safeRows.map((row) => {
                    const next = Array.isArray(row) ? [...row] : [];
                    next.splice(index, 0, '');
                    return next;
                });
                updateBlockProps({
                    headersJson: toJson(nextHeaders),
                    rowsJson: toJson(nextRows),
                });
            };

            const addColumn = () => {
                insertColumnAt(safeHeaders.length);
            };

            const removeColumn = (index) => {
                if (safeHeaders.length <= 1) return;
                const nextHeaders = safeHeaders.filter((_, i) => i !== index);
                const nextRows = safeRows.map((row) => {
                    const next = Array.isArray(row) ? [...row] : [];
                    next.splice(index, 1);
                    return next;
                });
                updateBlockProps({
                    headersJson: toJson(nextHeaders),
                    rowsJson: toJson(nextRows),
                });
            };

            const addRow = () => {
                const nextRows = [...safeRows, Array(safeHeaders.length).fill('')];
                updateRows(nextRows);
            };

            const insertRowAt = (index) => {
                const nextRows = [...safeRows];
                nextRows.splice(index, 0, Array(safeHeaders.length).fill(''));
                updateRows(nextRows);
            };

            const removeRow = (index) => {
                const nextRows = safeRows.filter((_, i) => i !== index);
                updateRows(nextRows);
            };

            const updateHoverIndicators = (event) => {
                if (!isSelected) return;
                const wrapper = wrapperRef.current;
                const table = tableRef.current;
                if (!wrapper || !table) return;

                const rect = wrapper.getBoundingClientRect();
                const scrollLeft = wrapper.scrollLeft || 0;
                const scrollTop = wrapper.scrollTop || 0;
                const x = event.clientX - rect.left + scrollLeft;
                const y = event.clientY - rect.top + scrollTop;
                const threshold = 8;

                const tableRect = table.getBoundingClientRect();
                const tableLeft = tableRect.left - rect.left + scrollLeft;
                const tableTop = tableRect.top - rect.top + scrollTop;
                const tableWidth = tableRect.width;
                const tableHeight = tableRect.height;

                const tbody = table.querySelector('tbody');
                if (tbody) {
                    const rowsEls = Array.from(tbody.querySelectorAll('tr'));
                    const boundaries = [];
                    const tbodyRect = tbody.getBoundingClientRect();
                    boundaries.push(tbodyRect.top - rect.top + scrollTop);
                    rowsEls.forEach((row) => {
                        const rowRect = row.getBoundingClientRect();
                        boundaries.push(rowRect.bottom - rect.top + scrollTop);
                    });
                    if (safeRows.length === 0) {
                        boundaries.push(tbodyRect.bottom - rect.top + scrollTop);
                    }
                    if (boundaries.length > 0) {
                        let closest = -1;
                        let min = Infinity;
                        boundaries.forEach((pos, idx) => {
                            const dist = Math.abs(y - pos);
                            if (dist < min) {
                                min = dist;
                                closest = idx;
                            }
                        });
                        if (min <= threshold) {
                            const top = boundaries[closest] - scrollTop;
                            setRowInsert({
                                index: closest,
                                top,
                                left: tableLeft - scrollLeft,
                                width: tableWidth,
                            });
                        } else {
                            setRowInsert(null);
                        }
                    } else {
                        setRowInsert(null);
                    }
                } else {
                    setRowInsert(null);
                }

                const headerRow = table.querySelector('thead tr');
                let colCells = [];
                if (headerRow) {
                    colCells = Array.from(headerRow.querySelectorAll('th.table-col'));
                }
                if (colCells.length > 0) {
                    const boundaries = [];
                    const firstRect = colCells[0].getBoundingClientRect();
                    boundaries.push(firstRect.left - rect.left + scrollLeft);
                    colCells.forEach((cell) => {
                        const cellRect = cell.getBoundingClientRect();
                        boundaries.push(cellRect.right - rect.left + scrollLeft);
                    });
                    let closest = -1;
                    let min = Infinity;
                    boundaries.forEach((pos, idx) => {
                        const dist = Math.abs(x - pos);
                        if (dist < min) {
                            min = dist;
                            closest = idx;
                        }
                    });
                    if (min <= threshold) {
                        const left = boundaries[closest] - scrollLeft;
                        setColInsert({
                            index: closest,
                            left,
                            top: tableTop - scrollTop,
                            height: tableHeight,
                        });
                    } else {
                        setColInsert(null);
                    }
                } else {
                    setColInsert(null);
                }
            };

            const clearIndicators = () => {
                setRowInsert(null);
                setColInsert(null);
            };

            return (
                <div
                    className={cn(
                        'wp-block',
                        isSelected && 'is-selected',
                        'relative my-2',
                        'border rounded-lg p-4 bg-card shadow-sm',
                        'transition-shadow duration-[var(--wp-transition-duration)]',
                        !isSelected && 'hover:shadow-[0_0_0_1px_var(--wp-block-border-hover)]',
                        isSelected && 'shadow-[0_0_0_2px_var(--wp-block-border-selected)]'
                    )}
                    data-block-type="table"
                    tabIndex={0}
                    onFocus={() => setIsSelected(true)}
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            setIsSelected(false);
                            clearIndicators();
                        }
                    }}
                >
                    {/* Toolbar */}
                    <AnimatePresence>
                        {isSelected && (
                            <motion.div
                                initial={{ opacity: 0, y: 4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 4 }}
                                className={cn(
                                    'absolute -top-[44px] left-0',
                                    'flex items-center h-10 px-1',
                                    'bg-[var(--wp-toolbar-bg)] border border-[var(--wp-toolbar-border)]',
                                    'rounded-[var(--wp-toolbar-border-radius)]',
                                    'shadow-[var(--wp-toolbar-shadow)]',
                                    'z-[var(--wp-z-block-toolbar)]'
                                )}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-center px-1.5 text-muted-foreground">
                                    <Table2 className="w-4 h-4" />
                                </div>

                                <div className="w-px h-5 mx-1 bg-[var(--wp-toolbar-separator-color)]" />

                                <span className="px-2 text-xs text-muted-foreground">
                                    {safeHeaders.length}×{safeRows.length}
                                </span>

                                <div className="w-px h-5 mx-1 bg-[var(--wp-toolbar-separator-color)]" />

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={addColumn}
                                            className={cn(
                                                'flex items-center justify-center gap-1',
                                                'h-8 px-2 rounded-sm text-xs',
                                                'hover:bg-[var(--wp-toolbar-button-hover-bg)]'
                                            )}
                                        >
                                            <Columns className="w-3.5 h-3.5" />
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">
                                        Add column
                                    </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            type="button"
                                            onClick={addRow}
                                            className={cn(
                                                'flex items-center justify-center gap-1',
                                                'h-8 px-2 rounded-sm text-xs',
                                                'hover:bg-[var(--wp-toolbar-button-hover-bg)]'
                                            )}
                                        >
                                            <Rows className="w-3.5 h-3.5" />
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">
                                        Add row
                                    </TooltipContent>
                                </Tooltip>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Header */}
                    <div className="flex items-center gap-2 mb-3">
                        <Table2 className="w-4 h-4 text-muted-foreground" />
                        <h4 className="text-sm font-medium">Table</h4>
                        {isSelected && (
                            <span className="text-[11px] text-muted-foreground">
                                Hover between cells to add rows/columns
                            </span>
                        )}
                    </div>

                    <div
                        ref={wrapperRef}
                        className="relative overflow-x-auto"
                        onMouseMove={updateHoverIndicators}
                        onMouseLeave={clearIndicators}
                    >
                        {/* Column insert indicator */}
                        {colInsert && (
                            <>
                                <div
                                    className="absolute z-10 bg-primary/70"
                                    style={{
                                        left: colInsert.left,
                                        top: colInsert.top,
                                        height: colInsert.height,
                                        width: 2,
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => insertColumnAt(Math.min(colInsert.index, safeHeaders.length))}
                                    className="absolute z-20 w-5 h-5 rounded-full border border-primary/60 bg-background text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
                                    style={{ top: Math.max(0, colInsert.top - 14), left: Math.max(0, colInsert.left - 9) }}
                                    title="Insert column"
                                >
                                    <Plus className="w-3 h-3 mx-auto" />
                                </button>
                            </>
                        )}

                        {/* Row insert indicator */}
                        {rowInsert && (
                            <>
                                <div
                                    className="absolute z-10 bg-primary/70"
                                    style={{
                                        top: rowInsert.top,
                                        left: rowInsert.left,
                                        width: rowInsert.width,
                                        height: 2,
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => insertRowAt(Math.min(rowInsert.index, safeRows.length))}
                                    className="absolute z-20 w-5 h-5 rounded-full border border-primary/60 bg-background text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
                                    style={{ left: Math.max(0, rowInsert.left - 14), top: Math.max(0, rowInsert.top - 9) }}
                                    title="Insert row"
                                >
                                    <Plus className="w-3 h-3 mx-auto" />
                                </button>
                            </>
                        )}

                        <table ref={tableRef} className="w-full border-collapse text-sm">
                            <thead>
                                <tr>
                                    {safeHeaders.map((header, index) => (
                                        <th key={`h-${index}`} className="table-col border border-border p-2 bg-muted/50">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={header}
                                                    onChange={(e) => {
                                                        const next = [...safeHeaders];
                                                        next[index] = e.target.value;
                                                        updateHeaders(next);
                                                    }}
                                                    className={cn(
                                                        'w-full px-2 py-1 text-xs font-medium',
                                                        'bg-background border border-input rounded-md',
                                                        'focus:outline-none focus:ring-2 focus:ring-ring'
                                                    )}
                                                />
                                                {isSelected && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeColumn(index)}
                                                        className="text-muted-foreground hover:text-destructive"
                                                        title="Remove column"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                    {isSelected && (
                                        <th className="table-action-col border border-border p-2 bg-muted/50 text-center text-xs text-muted-foreground">
                                            Row
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {safeRows.map((row, rowIndex) => (
                                    <tr key={`r-${rowIndex}`}>
                                        {row.map((cell, cellIndex) => (
                                            <td key={`c-${rowIndex}-${cellIndex}`} className="table-col border border-border p-2">
                                                <input
                                                    type="text"
                                                    value={cell || ''}
                                                    onChange={(e) => {
                                                        const nextRows = safeRows.map((r) => [...r]);
                                                        nextRows[rowIndex][cellIndex] = e.target.value;
                                                        updateRows(nextRows);
                                                    }}
                                                    className={cn(
                                                        'w-full px-2 py-1 text-xs',
                                                        'bg-background border border-input rounded-md',
                                                        'focus:outline-none focus:ring-2 focus:ring-ring'
                                                    )}
                                                />
                                            </td>
                                        ))}
                                        {isSelected && (
                                            <td className="border border-border p-2 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => removeRow(rowIndex)}
                                                    className="text-muted-foreground hover:text-destructive"
                                                    title="Remove row"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {safeRows.length === 0 && (
                                    <tr>
                                        <td
                                            className="border border-border p-3 text-xs text-muted-foreground text-center"
                                            colSpan={safeHeaders.length + (isSelected ? 1 : 0)}
                                        >
                                            No rows yet. Add one to start.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        },
    }
);

export default TableBlock;
