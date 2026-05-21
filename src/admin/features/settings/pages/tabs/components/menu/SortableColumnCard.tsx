/**
 * SortableColumnCard - Draggable column within mega menu structure
 * 
 * Features:
 * - Drag handle for column reordering
 * - Editable column title
 * - Nested DnD context for link reordering
 * - Add/delete link functionality
 */

import { useMemo, type CSSProperties, type ChangeEvent } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { cn } from '@/lib/utils';
import SortableLinkRow from './SortableLinkRow';
import type { SortableColumnCardProps } from '../../types/menu-editor.types';

const SortableColumnCard = ({
    column,
    colIndex,
    onUpdateColumn,
    onDeleteColumn,
    onAddLink,
    onUpdateLink,
    onDeleteLink,
    onReorderLinks,
    sensors,
}: SortableColumnCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: column.id });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const links = column.items || [];
    const linkIds = useMemo(() => links.map(link => link.id), [links]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "p-3 rounded-sm border border-border bg-muted/50 space-y-2",
                isDragging && "ring-1 ring-primary shadow-sm bg-background"
            )}
        >
            {/* Column Header */}
            <div className="flex items-center gap-1.5">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted touch-none"
                >
                    <GripVertical className="size-3.5 text-muted-foreground" />
                </div>
                <Input
                    type="text"
                    value={column.title}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdateColumn(colIndex, { title: e.target.value })}
                    className="h-8 text-sm font-medium border-transparent hover:border-input focus:border-ring bg-transparent focus:bg-background rounded-sm"
                    placeholder="Column Title"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-destructive/80 hover:text-destructive"
                    onClick={() => onDeleteColumn(colIndex)}
                >
                    <Trash2 className="size-3.5" />
                </Button>
            </div>

            {/* Links List */}
            <div className="space-y-1.5 pl-5">
                {links.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => onReorderLinks(colIndex, event)}
                    >
                        <SortableContext
                            items={linkIds}
                            strategy={verticalListSortingStrategy}
                        >
                            {links.map((link, linkIndex) => (
                                <SortableLinkRow
                                    key={link.id}
                                    link={link}
                                    colIndex={colIndex}
                                    linkIndex={linkIndex}
                                    onUpdateLink={onUpdateLink}
                                    onDeleteLink={onDeleteLink}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                ) : (
                    <p className="text-[11px] text-muted-foreground/60 py-1">No links in this column</p>
                )}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={() => onAddLink(colIndex)}
                >
                    <Plus className="size-3 mr-1" />
                    Add Link
                </Button>
            </div>
        </div>
    );
};

export default SortableColumnCard;
