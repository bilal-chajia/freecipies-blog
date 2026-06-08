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
import { useRef } from 'react';
import { Table2, Trash2, Columns, Rows } from 'lucide-react';
import BlockToolbar, { ToolbarButton, ToolbarSeparator } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useCustomBlock } from './useCustomBlock';

import { useTableDraft } from './table/useTableDraft';
import { useInsertIndicators } from './table/useInsertIndicators';
import TableCell from './table/TableCell';
import TableHeaderCell from './table/TableHeaderCell';
import InsertIndicators, { CaptureButton } from './table/InsertIndicators';

const stopTableSurfaceSelection = (event: React.SyntheticEvent, selectBlock: () => void) => {
    const target = event.target;
    if (target instanceof Element && target.closest('[data-simple-table-control="true"]')) {
        return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation?.();
    selectBlock();
};

const TableBlock = createReactBlockSpec(
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
            const wrapperRef = useRef<HTMLDivElement | null>(null);
            const tableRef = useRef<HTMLTableElement | null>(null);
            const {
                isSelected, selectBlock,
                moveUp: moveBlockUp,
                moveDown: moveBlockDown,
                remove: removeBlock,
                dragHandleProps,
                setDragNodeRef,
                dragStyle,
                isDragging,
            } = useCustomBlock(block.id, editor);

            const {
                safeHeaders,
                safeRows,
                colKeys,
                rowKeys,
                insertColumnAt,
                addColumn,
                addRow,
                insertRowAt,
                removeRow,
                onCellChange,
                onHeaderChange,
                onCommit,
                onRemoveColumn,
            } = useTableDraft(editor, block);

            const {
                rowInsert,
                colInsert,
                updateHoverIndicators,
                clearIndicators,
            } = useInsertIndicators(
                isSelected,
                safeHeaders.length,
                safeRows.length,
                wrapperRef,
                tableRef
            );

            const toolbar = (
                <BlockToolbar
                    blockIcon={Table2}
                    blockLabel="Table"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
                    onDelete={removeBlock}
                    showMoreMenu={false}
                >
                    <span className="px-2 text-xs text-muted-foreground">
                        {safeHeaders.length}x{safeRows.length}
                    </span>
                    <ToolbarSeparator />
                    <ToolbarButton
                        icon={Columns}
                        label="Add column"
                        onClick={addColumn}
                    />
                    <ToolbarButton
                        icon={Rows}
                        label="Add row"
                        onClick={addRow}
                    />
                </BlockToolbar>
            );

            return (
                <BlockWrapper
                    ref={setDragNodeRef}
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    blockType="table"
                    blockId={block.id}
                    className="my-2"
                    data-radius="lg"
                    style={{
                        ...dragStyle,
                        opacity: isDragging ? 0.5 : undefined,
                        pointerEvents: isDragging ? 'none' : undefined,
                    } as React.CSSProperties}
                >
                    <div
                        className="border rounded-lg p-4 bg-card shadow-sm"
                        contentEditable={false}
                        onPointerDownCapture={(event) => {
                            if (!isSelected) {
                                stopTableSurfaceSelection(event, selectBlock);
                            }
                        }}
                        onMouseDownCapture={(event) => {
                            if (!isSelected) {
                                stopTableSurfaceSelection(event, selectBlock);
                            }
                        }}
                    >
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
                            className="relative overflow-x-auto overflow-y-hidden pb-2"
                            onMouseMove={updateHoverIndicators}
                            onMouseLeave={clearIndicators}
                        >
                            {/* Column and Row insert indicators */}
                            <InsertIndicators
                                colInsert={colInsert}
                                rowInsert={rowInsert}
                                safeHeadersLength={safeHeaders.length}
                                safeRowsLength={safeRows.length}
                                onInsertColumn={insertColumnAt}
                                onInsertRow={insertRowAt}
                            />

                            <table ref={tableRef} className="w-full border-collapse text-sm">
                                <thead>
                                    <tr>
                                        {safeHeaders.map((header, index) => (
                                            <TableHeaderCell
                                                key={`h-${colKeys[index] || index}`}
                                                cellId={`table-${block.id}-header-${index}`}
                                                value={header}
                                                colIndex={index}
                                                onChange={onHeaderChange}
                                                onCommit={onCommit}
                                                isSelected={isSelected}
                                                onRemove={onRemoveColumn}
                                            />
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {safeRows.map((row, rowIndex) => (
                                        <tr key={`r-${rowKeys[rowIndex] || rowIndex}`}>
                                            {row.map((cell, cellIndex) => (
                                                <TableCell
                                                    key={`c-${rowKeys[rowIndex] || rowIndex}-${colKeys[cellIndex] || cellIndex}`}
                                                    cellId={`table-${block.id}-cell-${rowIndex}-${cellIndex}`}
                                                    value={cell || ''}
                                                    rowIndex={rowIndex}
                                                    cellIndex={cellIndex}
                                                    onChange={onCellChange}
                                                    onCommit={onCommit}
                                                    isFirstCol={cellIndex === 0}
                                                    isTableSelected={isSelected}
                                                    onRemoveRow={() => removeRow(rowIndex)}
                                                />
                                            ))}
                                        </tr>
                                    ))}
                                    {safeRows.length === 0 && (
                                        <tr>
                                            <td
                                                className="border border-border p-3 text-xs text-muted-foreground text-center"
                                                colSpan={safeHeaders.length}
                                            >
                                                No rows yet. Add one to start.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </BlockWrapper>
            );
        },
    }
);

export default TableBlock;
