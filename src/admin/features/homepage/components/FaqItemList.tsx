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
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, HelpCircle, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import type { HomepageFaqItem } from '@modules/settings/types/settings.types';
import {
  addFaqItem,
  createFaqEditorState,
  reconcileFaqEditorState,
  removeFaqEditorRow,
  reorderFaqEditorRows,
  updateFaqEditorRow,
  type FaqEditorState,
} from '../utils/faq-items';

interface FaqItemRowProps {
  rowId: string;
  item: HomepageFaqItem;
  index: number;
  onUpdate: (rowId: string, patch: Partial<HomepageFaqItem>) => void;
  onRemove: (rowId: string) => void;
}

function FaqItemRow({ rowId, item, index, onUpdate, onRemove }: FaqItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rowId,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  const questionId = `${rowId}-question`;
  const answerId = `${rowId}-answer`;

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
            aria-label={`Reorder FAQ item ${index + 1}`}
            className="mt-6 grid size-7 touch-none place-items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Reorder question</TooltipContent>
      </Tooltip>

      <div className="min-w-0 space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={questionId} className="text-xs font-medium text-foreground/80">
            Question {index + 1}
          </Label>
          <Input
            id={questionId}
            value={item.question}
            onChange={(event) => onUpdate(rowId, { question: event.target.value })}
            placeholder="What would readers like to know?"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={answerId} className="text-xs font-medium text-foreground/80">
            Answer
          </Label>
          <Textarea
            id={answerId}
            value={item.answer}
            onChange={(event) => onUpdate(rowId, { answer: event.target.value })}
            placeholder="Write a concise answer"
            rows={3}
            className="min-h-20 resize-y text-sm"
          />
        </div>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Delete FAQ item ${index + 1}`}
            className="mt-5 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(rowId)}
          >
            <Trash2 className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Delete question</TooltipContent>
      </Tooltip>
    </div>
  );
}

interface FaqItemListProps {
  items: HomepageFaqItem[];
  onChange: (items: HomepageFaqItem[]) => void;
}

export default function FaqItemList({ items, onChange }: FaqItemListProps) {
  const listId = useId();
  const nextRowNumber = useRef(0);
  const createRowId = () => `${listId}-faq-row-${nextRowNumber.current++}`;
  const editorStateRef = useRef<FaqEditorState | null>(null);
  editorStateRef.current = editorStateRef.current
    ? reconcileFaqEditorState(editorStateRef.current, items, createRowId)
    : createFaqEditorState(items, createRowId);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const editorState = editorStateRef.current;
  const commitEditorState = (nextState: FaqEditorState) => {
    editorStateRef.current = nextState;
    onChange(nextState.items);
  };
  const handleAdd = () => commitEditorState({
    items: addFaqItem(editorState.items),
    rowIds: [...editorState.rowIds, createRowId()],
  });
  const handleUpdate = (rowId: string, patch: Partial<HomepageFaqItem>) => {
    commitEditorState(updateFaqEditorRow(editorState, rowId, patch));
  };
  const handleRemove = (rowId: string) => {
    commitEditorState(removeFaqEditorRow(editorState, rowId));
  };
  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    commitEditorState(reorderFaqEditorRows(
      editorState,
      String(active.id),
      String(over.id),
    ));
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center border border-dashed border-border px-4 py-8 text-center">
        <HelpCircle className="mb-2 size-7 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">No FAQ questions</p>
        <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={handleAdd}>
          <Plus className="size-4" />
          Add Question
        </Button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-border">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={editorState.rowIds} strategy={verticalListSortingStrategy}>
          <div className="divide-y divide-border">
            {items.map((item, index) => (
              <FaqItemRow
                key={editorState.rowIds[index]}
                rowId={editorState.rowIds[index]}
                item={item}
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
          Add Question
        </Button>
      </div>
    </div>
  );
}
