import { useState, useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CaptureButton } from './InsertIndicators';
import { IsolatedInput, renderInlineMarkdown } from './TableCell';

export function TableHeaderCell({
    cellId,
    value,
    onChange,
    onBlur,
    isSelected,
    onRemove,
}: {
    cellId: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    isSelected: boolean;
    onRemove: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return (
        <th className="table-col border border-border p-2 bg-muted/50 text-left relative group/header min-w-[80px]">
            <div className="flex items-center justify-between w-full min-h-[26px]">
                {isEditing ? (
                    <IsolatedInput
                        id={cellId}
                        name={cellId}
                        type="text"
                        data-simple-table-control="true"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onBlur={() => {
                            // Defer blur handling to let click/pointerdown events on table controls complete first!
                            setTimeout(() => {
                                if (isMountedRef.current) {
                                    setIsEditing(false);
                                    onBlur();
                                }
                            }, 100);
                        }}
                        autoFocus
                        aria-label="Table header cell content"
                        className={cn(
                            'w-full px-2 py-1 text-xs font-medium',
                            'bg-background border border-input rounded-md',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                        )}
                    />
                ) : (
                    <div
                        className="w-full px-2 py-1 pr-6 text-xs font-medium min-h-[26px] flex items-center text-foreground font-sans cursor-text break-words select-text hover:bg-muted/40 rounded transition-colors duration-150"
                        onClick={() => setIsEditing(true)}
                        dangerouslySetInnerHTML={{
                            __html: renderInlineMarkdown(value) || '<span class="text-muted-foreground/40 italic">Empty header</span>'
                        }}
                    />
                )}
                {isSelected && (
                    <CaptureButton
                        data-simple-table-control="true"
                        onTrigger={onRemove}
                        className="absolute top-2 right-2 opacity-0 group-hover/header:opacity-100 hover:text-destructive text-muted-foreground bg-background/90 hover:bg-background border border-border/50 rounded p-1 shadow-sm transition-all duration-150 shrink-0 z-10 flex items-center justify-center cursor-pointer"
                        title="Remove column"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </CaptureButton>
                )}
            </div>
        </th>
    );
}
export default TableHeaderCell;
