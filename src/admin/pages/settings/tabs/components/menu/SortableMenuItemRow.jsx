/**
 * SortableMenuItemRow - Draggable menu item row in the canvas
 * 
 * Features:
 * - Drag handle for reordering
 * - Visual type indicator (mega menu vs simple link)
 * - Selection state with highlight
 * - Featured badge display
 * - Delete button on hover
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Link2, LayoutGrid, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Badge } from '@/ui/badge.jsx';
import { cn } from '@/lib/utils';

function SortableMenuItemRow({ item, isSelected, onClick, onDelete }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onClick}
            className={cn(
                "group relative flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm transition-all cursor-pointer will-change-transform",
                "hover:border-primary/30 hover:shadow-md",
                isSelected ? "border-primary ring-1 ring-primary shadow-md bg-primary/5" : "border-border",
                isDragging && "shadow-lg scale-[1.02]"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted touch-none"
            >
                <GripVertical className="size-5" />
            </div>

            <div className={cn(
                "size-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                item.type === 'mega' ? "bg-primary/10 text-primary" : "bg-secondary/30 text-secondary-foreground"
            )}>
                {item.type === 'mega' ? <LayoutGrid className="size-5" /> : <Link2 className="size-5" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-foreground truncate">{item.label}</span>
                    {item.featured?.enabled && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">Featured</Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="truncate max-w-[200px]">{item.url || '#'}</span>
                    {item.type === 'mega' && (
                        <>
                            <span className="size-1 rounded-full bg-muted-foreground/30" />
                            <span>{(item.columns?.length || 0)} cols</span>
                        </>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
                    <Trash2 className="size-4" />
                </Button>
                <ChevronRight className={cn("size-5 text-muted-foreground/30 transition-transform", isSelected && "text-primary translate-x-1")} />
            </div>
        </div>
    );
}

export default SortableMenuItemRow;
