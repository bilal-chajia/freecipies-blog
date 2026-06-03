import { cn } from '@/lib/utils';
import { memo, useRef, useEffect, useState } from 'react';

export function renderInlineMarkdown(text?: string): string {
    const source = String(text || '').trim();
    if (!source) return '';
    return source
        .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
        .replace(/_([^_]+?)_/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline font-medium hover:text-primary/80">$1</a>');
}

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

interface IsolatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function IsolatedTextarea({ ...props }: IsolatedTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        const node = textareaRef.current;
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

    // Auto-adjust height to fit text content
    useEffect(() => {
        const node = textareaRef.current;
        if (!node) return;

        const adjustHeight = () => {
            node.style.height = 'auto';
            node.style.height = `${node.scrollHeight}px`;
        };

        adjustHeight();

        // Adjust on element resize
        const observer = new ResizeObserver(adjustHeight);
        observer.observe(node);
        return () => observer.disconnect();
    }, [props.value]);

    return (
        <textarea
            ref={textareaRef}
            rows={1}
            {...props}
            style={{
                resize: 'none',
                overflowY: 'hidden',
                ...props.style,
            }}
        />
    );
}

function TableCellComponent({
    cellId,
    value,
    rowIndex,
    cellIndex,
    onChange,
    onCommit,
}: {
    cellId: string;
    value: string;
    rowIndex: number;
    cellIndex: number;
    onChange: (rowIndex: number, cellIndex: number, value: string) => void;
    onCommit: () => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    if (isEditing) {
        return (
            <td className="table-col border border-border p-2">
                <IsolatedTextarea
                    id={cellId}
                    name={cellId}
                    data-simple-table-control="true"
                    value={value}
                    onChange={(e) => {
                        onChange(rowIndex, cellIndex, e.target.value);
                    }}
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
                    aria-label="Table cell content"
                    className={cn(
                        'w-full px-2 py-1.5 text-xs font-sans text-foreground bg-background',
                        'border border-input rounded-md min-h-[30px] block',
                        'transition-colors duration-150 ease-in-out',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring',
                    )}
                />
            </td>
        );
    }

    return (
        <td
            className="table-col border border-border p-2 cursor-text transition-colors duration-150 hover:bg-muted/30"
            onClick={() => setIsEditing(true)}
        >
            <div
                className="w-full px-2 py-1.5 text-xs min-h-[30px] flex items-center text-foreground font-sans break-words whitespace-pre-wrap select-text"
                dangerouslySetInnerHTML={{
                    __html: renderInlineMarkdown(value) || '<span class="text-muted-foreground/40 italic">Empty cell</span>'
                }}
            />
        </td>
    );
}

export const TableCell = memo(TableCellComponent);
export default TableCell;
