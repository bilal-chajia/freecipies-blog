import { memo, useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CaptureButton } from './InsertIndicators';
import { IsolatedInput, renderInlineMarkdown, caretOffsetFromClick } from './TableCell';

function TableHeaderCellComponent({
    cellId,
    value,
    colIndex,
    onChange,
    onCommit,
    isSelected,
    onRemove,
}: {
    cellId: string;
    value: string;
    colIndex: number;
    onChange: (colIndex: number, value: string) => void;
    onCommit: () => void;
    isSelected: boolean;
    onRemove: (colIndex: number) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const isMountedRef = useRef(true);
    const caretRef = useRef<number | null>(null);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return (
        <th className={cn(
            "table-col border border-border text-left relative group/header min-w-[80px]",
            isEditing 
                ? "p-0 bg-background z-10" 
                : "p-2 bg-muted/50"
        )}>
            {isEditing ? (
                <>
                    <div className="absolute inset-[1px] pointer-events-none border-2 border-primary rounded-md z-20" />
                    <IsolatedInput
                        id={cellId}
                        name={cellId}
                        type="text"
                        data-simple-table-control="true"
                        value={value}
                        initialCaretOffset={caretRef.current ?? undefined}
                        onChange={(e) => onChange(colIndex, e.target.value)}
                        onBlur={() => {
                            // Defer blur handling to let click/pointerdown events on table controls complete first!
                            setTimeout(() => {
                                if (isMountedRef.current) {
                                    setIsEditing(false);
                                    onCommit();
                                }
                            }, 100);
                        }}
                        autoFocus
                        aria-label="Table header cell content"
                        className={cn(
                            'w-full px-4 py-3 text-xs font-medium text-foreground bg-transparent',
                            'border-none outline-none focus-visible:outline-none focus-visible:ring-0 block',
                        )}
                    />
                </>
            ) : (
                <div className="flex items-center justify-between w-full min-h-[26px]">
                    <div
                        className="w-full px-2 py-1 pr-6 text-xs font-medium min-h-[26px] flex items-center text-foreground font-sans cursor-text break-words select-text hover:bg-muted/40 rounded transition-colors duration-150"
                        onClick={(e) => {
                            caretRef.current = caretOffsetFromClick(e.currentTarget, e.clientX, e.clientY);
                            setIsEditing(true);
                        }}
                        dangerouslySetInnerHTML={{
                            __html: renderInlineMarkdown(value) || '<span class="text-muted-foreground/40 italic">Empty header</span>'
                        }}
                    />
                    {isSelected && (
                        <CaptureButton
                            data-simple-table-control="true"
                            onTrigger={() => onRemove(colIndex)}
                            className="absolute top-[-28px] left-1/2 -translate-x-1/2 opacity-0 group-hover/header:opacity-100 hover:text-destructive text-muted-foreground bg-background hover:bg-muted border border-border rounded p-1 shadow-sm transition-all duration-150 shrink-0 z-10 flex items-center justify-center cursor-pointer size-6 animate-in fade-in duration-150"
                            title="Remove column"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </CaptureButton>
                    )}
                </div>
            )}
        </th>
    );
}

export const TableHeaderCell = memo(TableHeaderCellComponent);
export default TableHeaderCell;
