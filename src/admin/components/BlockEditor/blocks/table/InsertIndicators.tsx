import { Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { InsertIndicator } from './TableBlock.types';
import { createTableControlTriggerGuard } from './table-control-events';

export interface CaptureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onTrigger: () => void;
}

export function CaptureButton({ onTrigger, children, ...props }: CaptureButtonProps) {
    const onTriggerRef = useRef(onTrigger);
    const triggerGuardRef = useRef(createTableControlTriggerGuard(() => onTriggerRef.current()));

    useEffect(() => {
        onTriggerRef.current = onTrigger;
    }, [onTrigger]);

    useEffect(() => () => triggerGuardRef.current.dispose(), []);

    const stopControlEvent = (event: React.SyntheticEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        event.nativeEvent.stopImmediatePropagation?.();
    };

    const triggerFromPress = (event: React.SyntheticEvent<HTMLButtonElement>) => {
        stopControlEvent(event);
        triggerGuardRef.current();
    };

    return (
        <button
            type="button"
            draggable={false}
            {...props}
            onPointerDownCapture={triggerFromPress}
            onMouseDownCapture={triggerFromPress}
            onClickCapture={stopControlEvent}
            onDragStartCapture={stopControlEvent}
            onKeyDownCapture={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    triggerFromPress(event);
                }
            }}
        >
            {children}
        </button>
    );
}

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
                    <CaptureButton
                        data-simple-table-control="true"
                        onTrigger={() => onInsertColumn(Math.min(colInsert.index, safeHeadersLength))}
                        className="absolute z-20 w-5 h-5 rounded-full border border-primary/60 bg-background text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
                        style={{ top: Math.max(0, colInsert.top - 14), left: Math.max(0, colInsert.left - 9) }}
                        title="Insert column"
                    >
                        <Plus className="w-3 h-3 mx-auto" />
                    </CaptureButton>
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
                    <CaptureButton
                        data-simple-table-control="true"
                        onTrigger={() => onInsertRow(Math.min(rowInsert.index, safeRowsLength))}
                        className="absolute z-20 w-5 h-5 rounded-full border border-primary/60 bg-background text-primary shadow-sm hover:bg-primary hover:text-primary-foreground"
                        style={{ left: Math.max(0, rowInsert.left - 14), top: Math.max(0, rowInsert.top - 9) }}
                        title="Insert row"
                    >
                        <Plus className="w-3 h-3 mx-auto" />
                    </CaptureButton>
                </>
            )}
        </>
    );
}

export default InsertIndicators;
