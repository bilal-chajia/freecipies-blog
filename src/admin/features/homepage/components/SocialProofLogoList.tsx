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
import { GripVertical, ImagePlus, Images, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import type { HomepageResolvedSocialProofLogo } from '@modules/settings/types/settings.types';
import {
  MAX_SOCIAL_PROOF_LOGOS,
  addSocialProofLogo,
  removeSocialProofLogo,
  reorderSocialProofLogos,
  updateSocialProofLogo,
} from '../utils/social-proof-items';

interface SocialProofLogoRowProps {
  rowId: string;
  logo: HomepageResolvedSocialProofLogo;
  index: number;
  onUpdate: (rowId: string, patch: Partial<HomepageResolvedSocialProofLogo>) => void;
  onRemove: (rowId: string) => void;
  onRequestMedia: (rowId: string) => void;
}

function SocialProofLogoRow({
  rowId,
  logo,
  index,
  onUpdate,
  onRemove,
  onRequestMedia,
}: SocialProofLogoRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowId,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const nameId = `${rowId}-name`;
  const preview = logo.image?.variants.md ?? logo.image?.variants.sm ?? logo.image?.variants.lg;

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
            aria-label={`Reorder logo ${index + 1}`}
            className="mt-6 grid size-7 touch-none place-items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Reorder logo</TooltipContent>
      </Tooltip>

      <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor={nameId} className="text-xs font-medium text-foreground/80">
            Publication {index + 1}
          </Label>
          <Input
            id={nameId}
            value={logo.name}
            onChange={(event) => onUpdate(rowId, { name: event.target.value })}
            placeholder="Food Weekly"
            className="h-8 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          {preview && logo.image ? (
            <img
              src={preview.url}
              alt={logo.image.alt}
              width={preview.width}
              height={preview.height}
              loading="lazy"
              className="h-8 w-12 border border-border object-contain"
            />
          ) : (
            <div className="grid h-8 w-12 place-items-center border border-dashed border-border text-muted-foreground">
              <Images className="size-3.5" aria-hidden="true" />
            </div>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={() => onRequestMedia(rowId)}>
            <ImagePlus className="size-4" />
            {logo.image ? 'Replace' : 'Select'}
          </Button>
          {logo.image && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove logo image ${index + 1}`}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => onUpdate(rowId, { image: null })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Remove image</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete logo ${index + 1}`}
            className="mt-5 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(rowId)}
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Delete logo</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SocialProofLogoListProps {
  logos: HomepageResolvedSocialProofLogo[];
  onChange: (logos: HomepageResolvedSocialProofLogo[]) => void;
  onRequestMedia: (index: number) => void;
}

export default function SocialProofLogoList({
  logos,
  onChange,
  onRequestMedia,
}: SocialProofLogoListProps) {
  const listId = useId();
  const nextRowNumber = useRef(0);
  const rowIdsRef = useRef<string[]>([]);
  const createRowId = () => `${listId}-social-proof-logo-row-${nextRowNumber.current++}`;

  while (rowIdsRef.current.length < logos.length) rowIdsRef.current.push(createRowId());
  if (rowIdsRef.current.length > logos.length) rowIdsRef.current = rowIdsRef.current.slice(0, logos.length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const rowIds = rowIdsRef.current;
  const handleAdd = () => {
    const nextLogos = addSocialProofLogo(logos);
    if (nextLogos === logos) return;
    rowIdsRef.current = [...rowIds, createRowId()];
    onChange(nextLogos);
  };
  const handleUpdate = (rowId: string, patch: Partial<HomepageResolvedSocialProofLogo>) => {
    onChange(updateSocialProofLogo(logos, rowIds.indexOf(rowId), patch));
  };
  const handleRemove = (rowId: string) => {
    const nextLogos = removeSocialProofLogo(logos, rowIds.indexOf(rowId));
    if (nextLogos === logos) return;
    rowIdsRef.current = rowIds.filter((id) => id !== rowId);
    onChange(nextLogos);
  };
  const handleRequestMedia = (rowId: string) => {
    const index = rowIds.indexOf(rowId);
    if (index !== -1) onRequestMedia(index);
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const fromIndex = rowIds.indexOf(String(active.id));
    const toIndex = rowIds.indexOf(String(over.id));
    const nextLogos = reorderSocialProofLogos(logos, fromIndex, toIndex);
    if (nextLogos === logos) return;
    rowIdsRef.current = arrayMove(rowIds, fromIndex, toIndex);
    onChange(nextLogos);
  };

  if (logos.length === 0) {
    return (
      <div className="flex flex-col items-center border border-dashed border-border px-4 py-8 text-center">
        <Images className="mb-2 size-7 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">No publication logos</p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handleAdd}>
          <Plus className="size-4" />
          Add Logo
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">
            {logos.map((logo, index) => (
              <SocialProofLogoRow
                key={rowIds[index]}
                rowId={rowIds[index]}
                logo={logo}
                index={index}
                onUpdate={handleUpdate}
                onRemove={handleRemove}
                onRequestMedia={handleRequestMedia}
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
          disabled={logos.length >= MAX_SOCIAL_PROOF_LOGOS}
        >
          <Plus className="size-4" />
          Add Logo
        </Button>
      </div>
    </div>
  );
}
