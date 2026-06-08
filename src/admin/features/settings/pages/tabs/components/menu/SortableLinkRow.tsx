/**
 * SortableLinkRow - Draggable link item within a column
 * 
 * Features:
 * - Drag handle for reordering
 * - Inline label editing
 * - LinkSelector for URL management
 * - Delete button on hover
 */

import type { CSSProperties, ChangeEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { cn } from '@/lib/utils';
import { LinkSelector } from '@/components/pickers';
import type { MenuTarget, SortableLinkRowProps } from '../../types/menu-editor.types';

const SortableLinkRow = ({ link, colIndex, linkIndex, onUpdateLink, onDeleteLink }: SortableLinkRowProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: link.id });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    const href = link.target?.href || '#';

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group",
                isDragging && "bg-muted/50 rounded"
            )}
        >
            {/* Row 1: Label and drag handle */}
            <div className="flex items-center gap-1.5 mb-1">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted touch-none flex-shrink-0"
                >
                    <GripVertical className="size-3 text-muted-foreground" />
                </div>
                <Input
                    value={link.label}
                    type="text"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateLink(colIndex, linkIndex, { label: e.target.value })}
                    className="h-7 text-xs flex-1 border-transparent hover:border-input focus:border-ring bg-transparent focus:bg-background rounded-sm px-1"
                    placeholder="Link label"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteLink(colIndex, linkIndex)}
                >
                    <X className="size-3" />
                </Button>
            </div>
            {/* Row 2: Link selector */}
            <div className="pl-5 pb-1">
                <LinkSelector
                    url={href}
                    onUrlChange={(url: string) => onUpdateLink(colIndex, linkIndex, {
                        target: {
                            ...(link.target || {}),
                            type: url?.startsWith('http') ? 'external_url' : 'internal_route',
                            href: url,
                        } satisfies MenuTarget,
                    })}
                    onLabelChange={(label: string) => {
                        if (!link.label || link.label === 'New Link') {
                            onUpdateLink(colIndex, linkIndex, { label });
                        }
                    }}
                    currentLabel={link.label}
                />
            </div>
        </div>
    );
};

export default SortableLinkRow;
