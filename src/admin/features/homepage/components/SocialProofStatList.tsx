import { useId, useRef, type CSSProperties } from 'react';
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
import { GripVertical, Plus, Trash2, TrendingUp } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import type { HomepageSocialProofStat } from '@modules/settings/types/settings.types';
import {
  MAX_SOCIAL_PROOF_STATS,
  addSocialProofStat,
  removeSocialProofStat,
  reorderSocialProofStats,
  updateSocialProofStat,
} from '../utils/social-proof-items';

interface SocialProofStatRowProps {
  rowId: string;
  stat: HomepageSocialProofStat;
  index: number;
  onUpdate: (rowId: string, patch: Partial<HomepageSocialProofStat>) => void;
  onRemove: (rowId: string) => void;
}

function SocialProofStatRow({ rowId, stat, index, onUpdate, onRemove }: SocialProofStatRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowId,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const valueId = `${rowId}-value`;
  const labelId = `${rowId}-label`;

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
            aria-label={`Reorder statistic ${index + 1}`}
            className="mt-6 grid size-7 touch-none place-items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Reorder statistic</TooltipContent>
      </Tooltip>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={valueId} className="text-xs font-medium text-foreground/80">
            Value {index + 1}
          </Label>
          <Input
            id={valueId}
            value={stat.value}
            onChange={(event) => onUpdate(rowId, { value: event.target.value })}
            placeholder="10k"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={labelId} className="text-xs font-medium text-foreground/80">
            Label
          </Label>
          <Input
            id={labelId}
            value={stat.label}
            onChange={(event) => onUpdate(rowId, { label: event.target.value })}
            placeholder="Home cooks"
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
            aria-label={`Delete statistic ${index + 1}`}
            className="mt-5 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(rowId)}
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Delete statistic</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SocialProofStatListProps {
  stats: HomepageSocialProofStat[];
  onChange: (stats: HomepageSocialProofStat[]) => void;
}

export default function SocialProofStatList({ stats, onChange }: SocialProofStatListProps) {
  const listId = useId();
  const nextRowNumber = useRef(0);
  const rowIdsRef = useRef<string[]>([]);
  const createRowId = () => `${listId}-social-proof-stat-row-${nextRowNumber.current++}`;

  while (rowIdsRef.current.length < stats.length) rowIdsRef.current.push(createRowId());
  if (rowIdsRef.current.length > stats.length) rowIdsRef.current = rowIdsRef.current.slice(0, stats.length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const rowIds = rowIdsRef.current;
  const handleAdd = () => {
    const nextStats = addSocialProofStat(stats);
    if (nextStats === stats) return;
    rowIdsRef.current = [...rowIds, createRowId()];
    onChange(nextStats);
  };
  const handleUpdate = (rowId: string, patch: Partial<HomepageSocialProofStat>) => {
    onChange(updateSocialProofStat(stats, rowIds.indexOf(rowId), patch));
  };
  const handleRemove = (rowId: string) => {
    const nextStats = removeSocialProofStat(stats, rowIds.indexOf(rowId));
    if (nextStats === stats) return;
    rowIdsRef.current = rowIds.filter((id) => id !== rowId);
    onChange(nextStats);
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const fromIndex = rowIds.indexOf(String(active.id));
    const toIndex = rowIds.indexOf(String(over.id));
    const nextStats = reorderSocialProofStats(stats, fromIndex, toIndex);
    if (nextStats === stats) return;
    rowIdsRef.current = arrayMove(rowIds, fromIndex, toIndex);
    onChange(nextStats);
  };

  if (stats.length === 0) {
    return (
      <div className="flex flex-col items-center border border-dashed border-border px-4 py-8 text-center">
        <TrendingUp className="mb-2 size-7 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">No statistics</p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handleAdd}>
          <Plus className="size-4" />
          Add Statistic
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">
            {stats.map((stat, index) => (
              <SocialProofStatRow
                key={rowIds[index]}
                rowId={rowIds[index]}
                stat={stat}
                index={index}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <div className="border-t border-border bg-muted/30 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleAdd}
          disabled={stats.length >= MAX_SOCIAL_PROOF_STATS}
        >
          <Plus className="size-4" />
          Add Statistic
        </Button>
      </div>
    </div>
  );
}
