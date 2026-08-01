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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import type {
  HomepageResolvedSocialFeedItem,
  HomepageSocialNetwork,
} from '@modules/settings/types/settings.types';
import {
  MAX_SOCIAL_FEED_ITEMS,
  addSocialFeedItem,
  removeSocialFeedItem,
  reorderSocialFeedItems,
  updateSocialFeedItem,
} from '../utils/social-feed-items';

interface SocialFeedItemRowProps {
  rowId: string;
  item: HomepageResolvedSocialFeedItem;
  index: number;
  onUpdate: (rowId: string, patch: Partial<HomepageResolvedSocialFeedItem>) => void;
  onRemove: (rowId: string) => void;
  onRequestMedia: (rowId: string) => void;
}

function SocialFeedItemRow({
  rowId,
  item,
  index,
  onUpdate,
  onRemove,
  onRequestMedia,
}: SocialFeedItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowId,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const networkId = `${rowId}-network`;
  const captionId = `${rowId}-caption`;
  const hrefId = `${rowId}-href`;
  const preview = item.image?.variants.md ?? item.image?.variants.sm ?? item.image?.variants.lg;

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
            aria-label={`Reorder social feed card ${index + 1}`}
            className="mt-6 grid size-7 touch-none place-items-center cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Reorder card</TooltipContent>
      </Tooltip>

      <div className="grid min-w-0 gap-3 lg:grid-cols-[8rem_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <Label htmlFor={networkId} className="text-xs font-medium text-foreground/80">
            Network
          </Label>
          <Select
            value={item.network}
            onValueChange={(network: HomepageSocialNetwork) => onUpdate(rowId, { network })}
          >
            <SelectTrigger id={networkId} className="h-8 w-full text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="pinterest">Pinterest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={captionId} className="text-xs font-medium text-foreground/80">
              Caption
            </Label>
            <Input
              id={captionId}
              value={item.caption}
              onChange={(event) => onUpdate(rowId, { caption: event.target.value })}
              placeholder="A short social post caption."
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={hrefId} className="text-xs font-medium text-foreground/80">
              Public HTTPS URL
            </Label>
            <Input
              id={hrefId}
              type="url"
              value={item.href}
              onChange={(event) => onUpdate(rowId, { href: event.target.value })}
              placeholder="https://instagram.com/p/example"
              className="h-8 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 lg:col-span-2">
          {preview && item.image ? (
            <img
              src={preview.url}
              alt={item.image.alt}
              width={preview.width}
              height={preview.height}
              loading="lazy"
              className="h-12 w-16 border border-border object-cover"
            />
          ) : (
            <div className="grid h-12 w-16 place-items-center border border-dashed border-border text-muted-foreground">
              <Images className="size-4" aria-hidden="true" />
            </div>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={() => onRequestMedia(rowId)}>
            <ImagePlus className="size-4" />
            {item.image ? 'Replace' : 'Select'} image
          </Button>
          {item.image && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove image from social feed card ${index + 1}`}
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
            aria-label={`Delete social feed card ${index + 1}`}
            className="mt-5 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(rowId)}
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Delete card</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface SocialFeedItemListProps {
  items: HomepageResolvedSocialFeedItem[];
  onChange: (items: HomepageResolvedSocialFeedItem[]) => void;
  onRequestMedia: (index: number) => void;
}

export default function SocialFeedItemList({
  items,
  onChange,
  onRequestMedia,
}: SocialFeedItemListProps) {
  const listId = useId();
  const nextRowNumber = useRef(0);
  const rowIdsRef = useRef<string[]>([]);
  const createRowId = () => `${listId}-social-feed-item-row-${nextRowNumber.current++}`;

  while (rowIdsRef.current.length < items.length) rowIdsRef.current.push(createRowId());
  if (rowIdsRef.current.length > items.length) rowIdsRef.current = rowIdsRef.current.slice(0, items.length);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const rowIds = rowIdsRef.current;
  const handleAdd = () => {
    const nextItems = addSocialFeedItem(items);
    if (nextItems === items) return;
    rowIdsRef.current = [...rowIds, createRowId()];
    onChange(nextItems);
  };
  const handleUpdate = (rowId: string, patch: Partial<HomepageResolvedSocialFeedItem>) => {
    onChange(updateSocialFeedItem(items, rowIds.indexOf(rowId), patch));
  };
  const handleRemove = (rowId: string) => {
    const nextItems = removeSocialFeedItem(items, rowIds.indexOf(rowId));
    if (nextItems === items) return;
    rowIdsRef.current = rowIds.filter((id) => id !== rowId);
    onChange(nextItems);
  };
  const handleRequestMedia = (rowId: string) => {
    const index = rowIds.indexOf(rowId);
    if (index !== -1) onRequestMedia(index);
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const fromIndex = rowIds.indexOf(String(active.id));
    const toIndex = rowIds.indexOf(String(over.id));
    const nextItems = reorderSocialFeedItems(items, fromIndex, toIndex);
    if (nextItems === items) return;
    rowIdsRef.current = arrayMove(rowIds, fromIndex, toIndex);
    onChange(nextItems);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center border border-dashed border-border px-4 py-8 text-center">
        <Images className="mb-2 size-7 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">No social feed cards</p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handleAdd}>
          <Plus className="size-4" />
          Add Card
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">
            {items.map((item, index) => (
              <SocialFeedItemRow
                key={rowIds[index]}
                rowId={rowIds[index]}
                item={item}
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
          disabled={items.length >= MAX_SOCIAL_FEED_ITEMS}
        >
          <Plus className="size-4" />
          Add Card
        </Button>
      </div>
    </div>
  );
}
