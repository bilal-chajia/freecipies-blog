/**
 * SortableLinkRow - Draggable link item within a column
 * 
 * Features:
 * - Drag handle for reordering
 * - Inline label editing
 * - LinkSelector for URL management
 * - Delete button on hover
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { cn } from '@/lib/utils';
import { LinkSelector } from '@/components/pickers';

const SortableLinkRow = ({ link, colIndex, linkIndex, onUpdateLink, onDeleteLink }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: link.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

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
                    <GripVertical className="w-3 h-3 text-muted-foreground" />
                </div>
                <Input
                    value={link.label}
                    onChange={(e) => onUpdateLink(colIndex, linkIndex, { label: e.target.value })}
                    className="h-[28px] text-xs flex-1 border-transparent hover:border-[#757575] focus:border-[#007cba] bg-transparent focus:bg-white rounded-[2px] px-1"
                    placeholder="Link label"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#757575] hover:text-red-600"
                    onClick={() => onDeleteLink(colIndex, linkIndex)}
                >
                    <X className="w-3 h-3" />
                </Button>
            </div>
            {/* Row 2: Link selector */}
            <div className="pl-5 pb-1">
                <LinkSelector
                    url={link.url}
                    onUrlChange={(url) => onUpdateLink(colIndex, linkIndex, { url })}
                    onLabelChange={(label) => {
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
