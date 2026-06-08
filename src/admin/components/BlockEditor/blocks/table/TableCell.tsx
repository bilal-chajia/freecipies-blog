import { cn } from '@/lib/utils';
import { memo, useRef, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { CaptureButton } from './InsertIndicators';

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

interface CaretPosition { offsetNode: Node; offset: number; }
type CaretFromPoint = {
    caretPositionFromPoint?(x: number, y: number): CaretPosition | null;
    caretRangeFromPoint?(x: number, y: number): Range | null;
};

/**
 * Character offset (within the rendered text) at a click point inside `container`.
 * Lets a single click on the rendered cell place the caret where you clicked,
 * instead of jumping to the end. Exact for plain text; may be slightly off when
 * the cell renders markdown (the syntax chars aren't in the rendered text).
 */
export function caretOffsetFromClick(container: HTMLElement, clientX: number, clientY: number): number | null {
    const doc = container.ownerDocument;
    const caretDoc = doc as unknown as CaretFromPoint;
    let node: Node | null = null;
    let nodeOffset = 0;
    if (caretDoc.caretPositionFromPoint) {
        const pos = caretDoc.caretPositionFromPoint(clientX, clientY);
        if (pos) { node = pos.offsetNode; nodeOffset = pos.offset; }
    } else if (caretDoc.caretRangeFromPoint) {
        const range = caretDoc.caretRangeFromPoint(clientX, clientY);
        if (range) { node = range.startContainer; nodeOffset = range.startOffset; }
    }
    if (!node || !container.contains(node)) return null;
    let offset = 0;
    const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let current = walker.nextNode();
    while (current) {
        if (current === node) return offset + nodeOffset;
        offset += (current.textContent || '').length;
        current = walker.nextNode();
    }
    return offset;
}

function applyInitialCaret(node: HTMLInputElement | HTMLTextAreaElement | null, offset: number | undefined) {
    if (!node || offset == null) return;
    const pos = Math.max(0, Math.min(offset, node.value.length));
    node.setSelectionRange(pos, pos);
}

interface IsolatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    initialCaretOffset?: number;
}

export function IsolatedInput({ initialCaretOffset, ...props }: IsolatedInputProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const node = inputRef.current;
        if (!node) return;

        applyInitialCaret(node, initialCaretOffset);

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

interface IsolatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    initialCaretOffset?: number;
}

export function IsolatedTextarea({ initialCaretOffset, ...props }: IsolatedTextareaProps) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);

    useEffect(() => {
        const node = textareaRef.current;
        if (!node) return;

        applyInitialCaret(node, initialCaretOffset);

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
    isFirstCol,
    isTableSelected,
    onRemoveRow,
}: {
    cellId: string;
    value: string;
    rowIndex: number;
    cellIndex: number;
    onChange: (rowIndex: number, cellIndex: number, value: string) => void;
    onCommit: () => void;
    isFirstCol?: boolean;
    isTableSelected?: boolean;
    onRemoveRow?: () => void;
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

    if (isEditing) {
        return (
            <td className="table-col border border-border p-0 bg-background relative z-10">
                {/* Focus ring overlay with rounded corners */}
                <div className="absolute inset-[1px] pointer-events-none border-2 border-primary rounded-md z-20" />
                <IsolatedTextarea
                    id={cellId}
                    name={cellId}
                    data-simple-table-control="true"
                    value={value}
                    initialCaretOffset={caretRef.current ?? undefined}
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
                        'w-full px-4 py-[14px] text-xs font-sans text-foreground bg-transparent',
                        'border-none outline-none focus-visible:outline-none focus-visible:ring-0 resize-none min-h-[46px] block',
                    )}
                />
            </td>
        );
    }

    return (
        <td
            className="table-col border border-border p-2 cursor-text transition-colors duration-150 hover:bg-muted/30 relative group/cell"
            onClick={(e) => {
                caretRef.current = caretOffsetFromClick(e.currentTarget, e.clientX, e.clientY);
                setIsEditing(true);
            }}
        >
            <div
                className="w-full px-2 py-1.5 text-xs min-h-[30px] flex items-center text-foreground font-sans break-words whitespace-pre-wrap select-text"
                dangerouslySetInnerHTML={{
                    __html: renderInlineMarkdown(value) || '<span class="text-muted-foreground/40 italic">Empty cell</span>'
                }}
            />
            {isTableSelected && isFirstCol && onRemoveRow && (
                <CaptureButton
                    data-simple-table-control="true"
                    onTrigger={onRemoveRow}
                    className="absolute left-[-28px] top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 hover:text-destructive text-muted-foreground bg-background hover:bg-muted border border-border rounded p-1 shadow-sm transition-all duration-150 shrink-0 z-10 flex items-center justify-center cursor-pointer size-6 animate-in fade-in duration-150"
                    title="Remove row"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </CaptureButton>
            )}
        </td>
    );
}

export const TableCell = memo(TableCellComponent);
export default TableCell;
