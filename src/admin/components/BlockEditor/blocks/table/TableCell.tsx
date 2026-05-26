import { cn } from '@/lib/utils';

const stopTableInputEvent = (event: React.SyntheticEvent) => {
    event.stopPropagation();
};

export function TableCell({
    cellId,
    value,
    onChange,
    onBlur,
}: {
    cellId: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
}) {
    return (
        <td className="table-col border border-border p-2">
            <input
                id={cellId}
                name={cellId}
                type="text"
                data-simple-table-control="true"
                value={value}
                onPointerDown={stopTableInputEvent}
                onMouseDown={stopTableInputEvent}
                onKeyDown={stopTableInputEvent}
                onChange={(e) => {
                    onChange(e.target.value);
                }}
                onBlur={() => {
                    onBlur();
                }}
                aria-label="Table cell content"
                className={cn(
                    'w-full px-2 py-1 text-xs',
                    'bg-background border border-input rounded-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                )}
            />
        </td>
    );
}
export default TableCell;
