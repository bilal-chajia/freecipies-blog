import { Plus } from 'lucide-react';
import type { InsertIndicator } from './TableBlock.types';

const stopTableButtonEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
};

interface InsertIndicatorsProps {
    colInsert: InsertIndicator | null;
    rowInsert: InsertIndicator | null;
    safeHeadersLength: number;
    safeRowsLength: number;
    onInsertColumn: (index: number) => void;
    onInsertRow: (index: number) => void;
}

export function InsertIndicators({
    colInsert,
    rowInsert,
    safeHeadersLength,
    safeRowsLength,
    onInsertColumn,
    onInsertRow,
}: InsertIndicatorsProps) {
    return (
        <>
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
                        data-simple-table-control="true"
                        onPointerDownCapture={stopTableButtonEvent}
                        onMouseDownCapture={stopTableButtonEvent}
                        onPointerDown={stopTableButtonEvent}
                        onMouseDown={stopTableButtonEvent}
                        onClick={(event) => {
                            stopTableButtonEvent(event);
                            onInsertColumn(Math.min(colInsert.index, safeHeadersLength));
                        }}
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
                        data-simple-table-control="true"
                        onPointerDownCapture={stopTableButtonEvent}
                        onMouseDownCapture={stopTableButtonEvent}
                        onPointerDown={stopTableButtonEvent}
                        onMouseDown={stopTableButtonEvent}
                        onClick={(event) => {
                            stopTableButtonEvent(event);
                            onInsertRow(Math.min(rowInsert.index, safeRowsLength));
                        }}
                        className="absolute z-20 w-5 h-5 rounded-full border border-primary/60 bg-background text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
                        style={{ left: Math.max(0, rowInsert.left - 14), top: Math.max(0, rowInsert.top - 9) }}
                        title="Insert row"
                    >
                        <Plus className="w-3 h-3 mx-auto" />
                    </button>
                </>
            )}
        </>
    );
}

export default InsertIndicators;
