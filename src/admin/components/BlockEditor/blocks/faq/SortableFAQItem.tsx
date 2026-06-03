import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Trash2,
} from 'lucide-react';
import { useReducedMotion, motion, AnimatePresence } from 'motion/react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, Ref } from 'react';
import { cn } from '@/lib/utils';
import { toInlineMarkdownHtml } from '../../utils/safeInlineHtml';
import type { FAQItem, FAQItemField, IndexState } from './FAQBlock.types';

export interface SortableFAQItemProps {
  blockId: string;
  idx: number;
  item: FAQItem;
  isSelected: boolean;
  expanded: IndexState;
  editing: IndexState;
  onToggleExpand: (idx: number) => void;
  onUpdateItem: (idx: number, field: FAQItemField, value: string) => void;
  onRemoveItem: (idx: number) => void;
  onStartEditing: (idx: number) => void;
  onStopEditing: (idx: number) => void;
  answerRef: Ref<HTMLTextAreaElement>;
}

export default function SortableFAQItem({
  blockId,
  idx,
  item,
  isSelected,
  expanded,
  editing,
  onToggleExpand,
  onUpdateItem,
  onRemoveItem,
  onStartEditing,
  onStopEditing,
  answerRef,
}: SortableFAQItemProps) {
  const shouldReduceMotion = useReducedMotion();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: `faq-item-${blockId}-${idx}` });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "p-4 group bg-card",
        isDragging && "shadow-lg border-primary/20",
        !isDragging && "hover:bg-muted/30"
      )}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle - only when selected */}
        {isSelected && (
          <div
            className="mt-1 text-muted-foreground/50 cursor-grab active:cursor-grabbing hover:text-primary transition-colors p-1 -m-1"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => onToggleExpand(idx)}
          className="mt-1 text-muted-foreground hover:text-foreground"
        >
          {expanded[idx]
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />
          }
        </button>

        {/* Question/Answer */}
        <div className="flex-1 space-y-2 min-w-0">
          <input
            id={`faq-${blockId}-q-${idx}`}
            name={`faq-${blockId}-q-${idx}`}
            type="text"
            value={item.q}
            onChange={(e) => onUpdateItem(idx, 'q', e.target.value)}
            placeholder="Question"
            aria-label={`Question ${idx + 1}`}
            className={cn(
              'w-full font-medium text-sm',
              'bg-transparent border-none p-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
              'placeholder:text-muted-foreground/50'
            )}
          />

          <AnimatePresence>
            {expanded[idx] && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
              >
                {editing[idx] ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => onStopEditing(idx)}
                        className="text-xs text-primary hover:underline"
                      >
                        Done
                      </button>
                    </div>
                    <textarea
                      id={`faq-${blockId}-a-${idx}`}
                      name={`faq-${blockId}-a-${idx}`}
                      ref={answerRef}
                      value={item.a}
                      onChange={(e) => onUpdateItem(idx, 'a', e.target.value)}
                      placeholder="Answer (supports [text](url) for links)"
                      aria-label={`Answer ${idx + 1}`}
                      className={cn(
                        'w-full text-sm text-muted-foreground',
                        'bg-muted/50 border border-input rounded-md',
                        'p-2 resize-y min-h-[80px]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                      )}
                    />
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onStartEditing(idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onStartEditing(idx);
                      }
                    }}
                    className={cn(
                      'text-sm text-muted-foreground',
                      'cursor-pointer hover:bg-muted/50 rounded p-1 -m-1',
                      '[&_a]:text-primary [&_a]:underline'
                    )}
                    dangerouslySetInnerHTML={
                      toInlineMarkdownHtml(item.a || 'Click to add an answer...')
                    }
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Delete button */}
        {isSelected && (
          <button
            onClick={() => onRemoveItem(idx)}
            className={cn(
              'text-muted-foreground/50',
              'hover:text-destructive',
              'opacity-0 group-hover:opacity-100',
              'transition-opacity p-1 -m-1'
            )}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
