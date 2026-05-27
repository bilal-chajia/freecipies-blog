import { cn } from '@/lib/utils';
import { useRef, useEffect } from 'react';

interface IsolatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export function IsolatedInput({ ...props }: IsolatedInputProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const node = inputRef.current;
        if (!node) return;

        const stopNative = (e: Event) => {
            e.stopPropagation();
        };

        node.addEventListener('mousedown', stopNative);
        node.addEventListener('pointerdown', stopNative);
        node.addEventListener('keydown', stopNative);
        node.addEventListener('keyup', stopNative);
        node.addEventListener('keypress', stopNative);

        return () => {
            node.removeEventListener('mousedown', stopNative);
            node.removeEventListener('pointerdown', stopNative);
            node.removeEventListener('keydown', stopNative);
            node.removeEventListener('keyup', stopNative);
            node.removeEventListener('keypress', stopNative);
        };
    }, []);

    return <input ref={inputRef} {...props} />;
}

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
            <IsolatedInput
                id={cellId}
                name={cellId}
                type="text"
                data-simple-table-control="true"
                value={value}
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
