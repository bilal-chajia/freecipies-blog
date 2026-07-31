import {
  useId,
  useRef,
  type CSSProperties,
} from 'react';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import type { HomepageQuickFilter } from '@modules/settings/types/settings.types';
import {
  addQuickFilter,
  removeQuickFilter,
  reorderQuickFilters,
  updateQuickFilter,
} from '../utils/quick-filters';

interface QuickFilterRowProps {
  rowId: string;
  filter: HomepageQuickFilter;
  index: number;
  onUpdate: (rowId: string, patch: Partial<HomepageQuickFilter>) => void;
  onRemove: (rowId: string) => void;
}

function QuickFilterRow({ rowId, filter, index, onUpdate, onRemove }: QuickFilterRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowId,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const labelId = `${rowId}-label`;
  const hrefId = `${rowId}-href`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 bg-background px-3 py-3"
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Reorder filter ${index + 1}`}
            className="mt-6 grid size-7 touch-none place-items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Reorder filter</TooltipContent>
      </Tooltip>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={labelId} className="text-xs font-medium text-foreground/80">
            Label {index + 1}
          </Label>
          <Input
            id={labelId}
            value={filter.label}
            onChange={(event) => onUpdate(rowId, { label: event.target.value })}
            placeholder="Quick dinners"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={hrefId} className="text-xs font-medium text-foreground/80">
            Recipe URL
          </Label>
          <Input
            id={hrefId}
            value={filter.href}
            onChange={(event) => onUpdate(rowId, { href: event.target.value })}
            placeholder="/recipes?tag=quick"
            className="h-8 text-sm"
          />
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete filter ${index + 1}`}
            className="mt-5 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(rowId)}
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Delete filter</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface QuickFilterListProps {
  filters: HomepageQuickFilter[];
  onChange: (filters: HomepageQuickFilter[]) => void;
}

export default function QuickFilterList({ filters, onChange }: QuickFilterListProps) {
  const listId = useId();
  const nextRowNumber = useRef(0);
  const rowIdsRef = useRef<string[]>([]);
  const createRowId = () => `${listId}-quick-filter-row-${nextRowNumber.current++}`;

  while (rowIdsRef.current.length < filters.length) {
    rowIdsRef.current.push(createRowId());
  }
  if (rowIdsRef.current.length > filters.length) {
    rowIdsRef.current = rowIdsRef.current.slice(0, filters.length);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const rowIds = rowIdsRef.current;
  const handleAdd = () => {
    rowIdsRef.current = [...rowIds, createRowId()];
    onChange(addQuickFilter(filters));
  };
  const handleUpdate = (rowId: string, patch: Partial<HomepageQuickFilter>) => {
    onChange(updateQuickFilter(filters, rowIds.indexOf(rowId), patch));
  };
  const handleRemove = (rowId: string) => {
    const index = rowIds.indexOf(rowId);
    const nextFilters = removeQuickFilter(filters, index);
    if (nextFilters === filters) return;

    rowIdsRef.current = rowIds.filter((id) => id !== rowId);
    onChange(nextFilters);
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;

    const fromIndex = rowIds.indexOf(String(active.id));
    const toIndex = rowIds.indexOf(String(over.id));
    const nextFilters = reorderQuickFilters(filters, fromIndex, toIndex);
    if (nextFilters === filters) return;

    rowIdsRef.current = arrayMove(rowIds, fromIndex, toIndex);
    onChange(nextFilters);
  };

  if (filters.length === 0) {
    return (
      <div className="flex flex-col items-center border border-dashed border-border px-4 py-8 text-center">
        <SlidersHorizontal className="mb-2 size-7 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">No recipe filters</p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handleAdd}>
          <Plus className="size-4" />
          Add Filter
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">
            {filters.map((filter, index) => (
              <QuickFilterRow
                key={rowIds[index]}
                rowId={rowIds[index]}
                filter={filter}
                index={index}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="border-t border-border bg-muted/30 p-2">
        <Button type="button" variant="ghost" size="sm" onClick={handleAdd}>
          <Plus className="size-4" />
          Add Filter
        </Button>
      </div>
    </div>
  );
}
