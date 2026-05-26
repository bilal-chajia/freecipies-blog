import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const stopTableInputEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation();
};

const stopTableButtonEvent = (event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
};

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
    return (
        <th className="table-col border border-border p-2 bg-muted/50 text-left">
            <div className="flex items-center gap-2">
                <input
                    id={cellId}
                    name={cellId}
                    type="text"
                    data-simple-table-control="true"
                    value={value}
                    onPointerDown={stopTableInputEvent}
                    onMouseDown={stopTableInputEvent}
                    onKeyDown={stopTableInputEvent}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    aria-label="Table header cell content"
                    className={cn(
                        'w-full px-2 py-1 text-xs font-medium',
                        'bg-background border border-input rounded-md',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                    )}
                />
                {isSelected && (
                    <button
                        type="button"
                        data-simple-table-control="true"
                        onPointerDownCapture={stopTableButtonEvent}
                        onMouseDownCapture={stopTableButtonEvent}
                        onPointerDown={stopTableButtonEvent}
                        onMouseDown={stopTableButtonEvent}
                        onClick={(event) => {
                            stopTableButtonEvent(event);
                            onRemove();
                        }}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        title="Remove column"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                )}
            </div>
        </th>
    );
}
export default TableHeaderCell;
