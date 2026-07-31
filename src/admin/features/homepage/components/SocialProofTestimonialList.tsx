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
import { GripVertical, MessageSquareQuote, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import type { HomepageSocialProofTestimonial } from '@modules/settings/types/settings.types';
import {
  MAX_SOCIAL_PROOF_TESTIMONIALS,
  addSocialProofTestimonial,
  removeSocialProofTestimonial,
  reorderSocialProofTestimonials,
  updateSocialProofTestimonial,
} from '../utils/social-proof-items';

interface SocialProofTestimonialRowProps {
  rowId: string;
  testimonial: HomepageSocialProofTestimonial;
  index: number;
  onUpdate: (rowId: string, patch: Partial<HomepageSocialProofTestimonial>) => void;
  onRemove: (rowId: string) => void;
}

function SocialProofTestimonialRow({
  rowId,
  testimonial,
  index,
  onUpdate,
  onRemove,
}: SocialProofTestimonialRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowId,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const quoteId = `${rowId}-quote`;
  const nameId = `${rowId}-name`;
  const roleId = `${rowId}-role`;

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
            aria-label={`Reorder testimonial ${index + 1}`}
            className="mt-6 grid size-7 touch-none place-items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Reorder testimonial</TooltipContent>
      </Tooltip>

      <div className="min-w-0 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={quoteId} className="text-xs font-medium text-foreground/80">
            Quote {index + 1}
          </Label>
          <Textarea
            id={quoteId}
            value={testimonial.quote}
            onChange={(event) => onUpdate(rowId, { quote: event.target.value })}
            placeholder="A short reader endorsement."
            rows={3}
            className="min-h-20 resize-y text-sm"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={nameId} className="text-xs font-medium text-foreground/80">
              Name
            </Label>
            <Input
              id={nameId}
              value={testimonial.name}
              onChange={(event) => onUpdate(rowId, { name: event.target.value })}
              placeholder="Alex Johnson"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={roleId} className="text-xs font-medium text-foreground/80">
              Role
            </Label>
            <Input
              id={roleId}
              value={testimonial.role ?? ''}
              onChange={(event) => onUpdate(rowId, { role: event.target.value })}
              placeholder="Home cook"
              className="h-8 text-sm"
            />
          </div>
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete testimonial ${index + 1}`}
            className="mt-5 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(rowId)}
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Delete testimonial</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SocialProofTestimonialListProps {
  testimonials: HomepageSocialProofTestimonial[];
  onChange: (testimonials: HomepageSocialProofTestimonial[]) => void;
}

export default function SocialProofTestimonialList({
  testimonials,
  onChange,
}: SocialProofTestimonialListProps) {
  const listId = useId();
  const nextRowNumber = useRef(0);
  const rowIdsRef = useRef<string[]>([]);
  const createRowId = () => `${listId}-social-proof-testimonial-row-${nextRowNumber.current++}`;

  while (rowIdsRef.current.length < testimonials.length) rowIdsRef.current.push(createRowId());
  if (rowIdsRef.current.length > testimonials.length) {
    rowIdsRef.current = rowIdsRef.current.slice(0, testimonials.length);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const rowIds = rowIdsRef.current;
  const handleAdd = () => {
    const nextTestimonials = addSocialProofTestimonial(testimonials);
    if (nextTestimonials === testimonials) return;
    rowIdsRef.current = [...rowIds, createRowId()];
    onChange(nextTestimonials);
  };
  const handleUpdate = (rowId: string, patch: Partial<HomepageSocialProofTestimonial>) => {
    onChange(updateSocialProofTestimonial(testimonials, rowIds.indexOf(rowId), patch));
  };
  const handleRemove = (rowId: string) => {
    const nextTestimonials = removeSocialProofTestimonial(testimonials, rowIds.indexOf(rowId));
    if (nextTestimonials === testimonials) return;
    rowIdsRef.current = rowIds.filter((id) => id !== rowId);
    onChange(nextTestimonials);
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const fromIndex = rowIds.indexOf(String(active.id));
    const toIndex = rowIds.indexOf(String(over.id));
    const nextTestimonials = reorderSocialProofTestimonials(testimonials, fromIndex, toIndex);
    if (nextTestimonials === testimonials) return;
    rowIdsRef.current = arrayMove(rowIds, fromIndex, toIndex);
    onChange(nextTestimonials);
  };

  if (testimonials.length === 0) {
    return (
      <div className="flex flex-col items-center border border-dashed border-border px-4 py-8 text-center">
        <MessageSquareQuote className="mb-2 size-7 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">No testimonials</p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handleAdd}>
          <Plus className="size-4" />
          Add Testimonial
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">
            {testimonials.map((testimonial, index) => (
              <SocialProofTestimonialRow
                key={rowIds[index]}
                rowId={rowIds[index]}
                testimonial={testimonial}
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
          disabled={testimonials.length >= MAX_SOCIAL_PROOF_TESTIMONIALS}
        >
          <Plus className="size-4" />
          Add Testimonial
        </Button>
      </div>
    </div>
  );
}
