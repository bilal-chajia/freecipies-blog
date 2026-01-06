/**
 * SortableColumnCard - Draggable column within mega menu structure
 * 
 * Features:
 * - Drag handle for column reordering
 * - Editable column title
 * - Nested DnD context for link reordering
 * - Add/delete link functionality
 */

import React, { useMemo } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { cn } from '@/lib/utils';
import SortableLinkRow from './SortableLinkRow';

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
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: column.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const linkIds = useMemo(() => (column.links || []).map(link => link.id), [column.links]);

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "p-3 rounded-[2px] border border-[#e0e0e0] bg-[#f8f9fa] space-y-2",
                isDragging && "ring-1 ring-[#007cba] shadow-sm bg-white"
            )}
        >
            {/* Column Header */}
            <div className="flex items-center gap-1.5">
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-muted touch-none"
                >
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <Input
                    value={column.title}
                    onChange={(e) => onUpdateColumn(colIndex, { title: e.target.value })}
                    className="h-[30px] text-sm font-medium border-transparent hover:border-[#757575] focus:border-[#007cba] bg-transparent focus:bg-white rounded-[2px]"
                    placeholder="Column Title"
                />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive/80 hover:text-destructive"
                    onClick={() => onDeleteColumn(colIndex)}
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Links List */}
            <div className="space-y-1.5 pl-5">
                {column.links?.length > 0 ? (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={(event) => onReorderLinks(colIndex, event)}
                    >
                        <SortableContext
                            items={linkIds}
                            strategy={verticalListSortingStrategy}
                        >
                            {column.links?.map((link, linkIndex) => (
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
                    <Plus className="w-3 h-3 mr-1" />
                    Add Link
                </Button>
            </div>
        </div>
    );
};

export default SortableColumnCard;
