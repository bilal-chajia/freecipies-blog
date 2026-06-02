import { Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { InsertIndicator } from './TableBlock.types';
import { createTableControlTriggerGuard } from './table-control-events';

export interface CaptureButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    onTrigger: () => void;
}

export function CaptureButton({ onTrigger, children, ...props }: CaptureButtonProps) {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const onTriggerRef = useRef(onTrigger);

    useEffect(() => {
        onTriggerRef.current = onTrigger;
    }, [onTrigger]);

    useEffect(() => {
        const node = buttonRef.current;
        if (!node) return;

        let lastTriggerTime = 0;

        const handlePress = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            const now = Date.now();
            if (now - lastTriggerTime < 120) return;
            lastTriggerTime = now;

            onTriggerRef.current();
        };

        const stopOnly = (e: Event) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                handlePress(e);
            }
        };

        node.addEventListener('pointerdown', handlePress);
        node.addEventListener('mousedown', handlePress);
        node.addEventListener('click', stopOnly);
        node.addEventListener('dragstart', stopOnly);
        node.addEventListener('keydown', handleKeyDown);

        return () => {
            node.removeEventListener('pointerdown', handlePress);
            node.removeEventListener('mousedown', handlePress);
            node.removeEventListener('click', stopOnly);
            node.removeEventListener('dragstart', stopOnly);
            node.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    return (
        <button
            ref={buttonRef}
            type="button"
            draggable={false}
            {...props}
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
                        className="absolute z-10 bg-primary/80 shadow-[0_0_6px_rgba(var(--primary),0.4)] animate-in fade-in duration-150"
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
                        className="absolute z-20 w-5 h-5 rounded-full border border-primary/40 bg-background/90 backdrop-blur-[2px] text-primary shadow-md hover:bg-primary hover:text-primary-foreground transition-all duration-200 ease-out hover:scale-115 active:scale-95 flex items-center justify-center cursor-pointer"
                        style={{ top: Math.max(0, colInsert.top - 14), left: Math.max(0, colInsert.left - 9) }}
                        title="Insert column"
                    >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                    </CaptureButton>
                </>
            )}

            {/* Row insert indicator */}
            {rowInsert && (
                <>
                    <div
                        className="absolute z-10 bg-primary/80 shadow-[0_0_6px_rgba(var(--primary),0.4)] animate-in fade-in duration-150"
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
                        className="absolute z-20 w-5 h-5 rounded-full border border-primary/40 bg-background/90 backdrop-blur-[2px] text-primary shadow-md hover:bg-primary hover:text-primary-foreground transition-all duration-200 ease-out hover:scale-115 active:scale-95 flex items-center justify-center cursor-pointer"
                        style={{ left: Math.max(0, rowInsert.left - 14), top: Math.max(0, rowInsert.top - 9) }}
                        title="Insert row"
                    >
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                    </CaptureButton>
                </>
            )}
        </>
    );
}

export default InsertIndicators;
