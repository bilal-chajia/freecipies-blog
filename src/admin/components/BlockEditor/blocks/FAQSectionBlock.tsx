/**
 * Custom Block: FAQ Section
 * 
 * Expandable FAQ items with question/answer pairs.
 * Self-contained block — all data stored in block props.
 * No context dependency (Phase 3.2: FAQDataContext eliminated).
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { createReactBlockSpec } from '@blocknote/react';
import {
  HelpCircle,
  Plus,
} from 'lucide-react';
import { useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import BlockToolbar, { ToolbarButton, ToolbarSeparator } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockEditorSourceData } from '../source-data-context';
import { useCustomBlock } from './useCustomBlock';
import SortableFAQItem from './faq/SortableFAQItem';
import type { FAQItem, FAQItemField, IndexState } from './faq/FAQBlock.types';

function parseFaqDocument(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value !== 'string') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

const FAQSectionBlock = createReactBlockSpec(
  {
    type: 'faqSection',
    propSchema: {
      // FAQ title stored directly in block props
      title: { default: 'Frequently Asked Questions' },
      // FAQ items stored as JSON string in block props (self-contained, no context)
      itemsJson: { default: '[]' },
    },
    content: 'none',
  },
  {
    render: (props) => {
      const { block, editor } = props;
      const { faqsJson, onFaqsChange } = useBlockEditorSourceData();

      const sourceFaqs = parseFaqDocument(faqsJson);
      const sourceItems = Array.isArray(sourceFaqs.items)
        ? sourceFaqs.items.map((item) => {
          const record = item && typeof item === 'object' ? item as Record<string, unknown> : {};
          return {
            q: typeof record.question === 'string' ? record.question : typeof record.q === 'string' ? record.q : '',
            a: typeof record.answer === 'string' ? record.answer : typeof record.a === 'string' ? record.a : '',
          };
        })
        : [];
      // Source-data JSON (faqsJson) is the single source of truth (P6).
      // block.props.itemsJson/title are a transient hydration mirror only and
      // are never read back — falling back to them silently resurrects stale
      // items after an intentional empty (the old P6b bug).
      const items = sourceItems;
      const title = typeof sourceFaqs.heading === 'string' && sourceFaqs.heading
        ? sourceFaqs.heading
        : 'Frequently Asked Questions';

      const {
        isSelected, selectBlock,
        moveUp: moveBlockUp,
        moveDown: moveBlockDown,
        remove: removeBlock,
        dragHandleProps,
        setDragNodeRef,
        dragStyle,
        isDragging,
      } = useCustomBlock(block.id, editor);
      const [expanded, setExpanded] = useState<IndexState>({});
      const [editing, setEditing] = useState<IndexState>({});
      const answerRefs = useRef<Record<number, HTMLTextAreaElement>>({});

      // DnD kit sensors
      const sensors = useSensors(
        useSensor(PointerSensor, {
          activationConstraint: {
            distance: 5,
          },
        }),
        useSensor(KeyboardSensor, {
          coordinateGetter: sortableKeyboardCoordinates,
        })
      );

      const updateItems = (newItems: FAQItem[]) => {
        if (onFaqsChange) {
          const currentFaqs = parseFaqDocument(faqsJson);
          onFaqsChange(JSON.stringify({
            heading: currentFaqs.heading || block.props.title || 'Frequently Asked Questions',
            intro: currentFaqs.intro ?? null,
            items: newItems.map((item) => ({
              question: item.q,
              answer: item.a,
            })),
          }, null, 2));
        } else {
          editor.updateBlock(block, {
            type: 'faqSection',
            props: {
              ...block.props,
              itemsJson: JSON.stringify(newItems),
            },
          });
        }
      };

      const updateTitle = (newTitle: string) => {
        if (onFaqsChange) {
          const currentFaqs = parseFaqDocument(faqsJson);
          onFaqsChange(JSON.stringify({
            heading: newTitle,
            intro: currentFaqs.intro ?? null,
            items: items.map((item) => ({
              question: item.q,
              answer: item.a,
            })),
          }, null, 2));
        } else {
          editor.updateBlock(block, {
            type: 'faqSection',
            props: {
              ...block.props,
              title: newTitle,
            },
          });
        }
      };

      const addItem = () => {
        const newItems = [...items, { q: '', a: '' }];
        updateItems(newItems);
        const newIdx = newItems.length - 1;
        setExpanded({ ...expanded, [newIdx]: true });
        setEditing((prev) => ({ ...prev, [newIdx]: true }));
        requestAnimationFrame(() => {
          const textarea = answerRefs.current[newIdx];
          if (textarea) textarea.focus();
        });
      };

      const removeItem = (idx: number) => {
        updateItems(items.filter((_, i) => i !== idx));
        setEditing((prev) => {
          const next = { ...prev };
          delete next[idx];
          return next;
        });
      };

      const updateItem = (idx: number, field: FAQItemField, value: string) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [field]: value };
        updateItems(newItems);
      };

      const toggleExpand = (idx: number) => {
        setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
      };

      const startEditing = (idx: number) => {
        setEditing((prev) => ({ ...prev, [idx]: true }));
        requestAnimationFrame(() => {
          const textarea = answerRefs.current[idx];
          if (textarea) textarea.focus();
        });
      };

      const stopEditing = (idx: number) => {
        setEditing((prev) => ({ ...prev, [idx]: false }));
      };

      const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
          const oldIndex = parseInt(String(active.id).split('-').pop() || '0', 10);
          const newIndex = parseInt(String(over.id).split('-').pop() || '0', 10);
          const newItems = arrayMove(items, oldIndex, newIndex);
          updateItems(newItems);
        }
      };

      const toolbar = (
        <BlockToolbar
          blockIcon={HelpCircle}
          blockLabel="FAQ Section"
          onMoveUp={moveBlockUp}
          onMoveDown={moveBlockDown}
          dragHandleProps={dragHandleProps}
          onDelete={removeBlock}
          showMoreMenu={false}
        >
          <span className="px-2 text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'question' : 'questions'}
          </span>
          <ToolbarSeparator />
          <ToolbarButton
            icon={Plus}
            label="Add question"
            onClick={addItem}
          />
        </BlockToolbar>
      );

      return (
        <BlockWrapper
          ref={setDragNodeRef}
          isSelected={isSelected}
          toolbar={toolbar}
          onClick={selectBlock}
          blockType="faq"
          blockId={block.id}
          className="my-6"
          style={{
            ...dragStyle,
            opacity: isDragging ? 0.5 : undefined,
            pointerEvents: isDragging ? 'none' : undefined,
          }}
        >
          <div className="border rounded-lg overflow-hidden bg-card">
            {/* Header */}
            <div className="bg-muted/50 p-4 border-b flex items-center justify-between">
              <input
                id={`faq-title-${block.id}`}
                name={`faq-title-${block.id}`}
                type="text"
                value={title}
                onChange={(e) => updateTitle(e.target.value)}
                className={cn(
                  'text-lg font-semibold flex-1',
                  'bg-transparent border-none p-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  'placeholder:text-muted-foreground/50'
                )}
                placeholder="FAQ Section Title"
                aria-label="FAQ Section Title"
              />
              <Badge variant="outline" className="ml-2 font-mono whitespace-nowrap opacity-70 group-hover:opacity-100 transition-opacity">
                {items.length} Q
              </Badge>
            </div>

            {/* FAQ Items */}
            <div className="divide-y relative">
              {items.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No questions yet</p>
                  {isSelected && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={addItem}
                      className="mt-3 gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add first question
                    </Button>
                  )}
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={items.map((_, i) => `faq-item-${block.id}-${i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {items.map((item, idx) => (
                      <SortableFAQItem
                        key={`faq-item-${idx}`}
                        blockId={block.id}
                        idx={idx}
                        item={item}
                        isSelected={isSelected}
                        expanded={expanded}
                        editing={editing}
                        onToggleExpand={toggleExpand}
                        onUpdateItem={updateItem}
                        onRemoveItem={removeItem}
                        onStartEditing={startEditing}
                        onStopEditing={stopEditing}
                        answerRef={(node) => {
                          if (node) {
                            answerRefs.current[idx] = node;
                          } else {
                            delete answerRefs.current[idx];
                          }
                        }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>

            {/* Add button footer - only when selected and has items */}
            {isSelected && items.length > 0 && (
              <button
                onClick={addItem}
                className={cn(
                  'w-full p-3 text-sm text-center',
                  'text-primary hover:bg-primary/5',
                  'transition-colors flex items-center justify-center gap-2',
                  'border-t'
                )}
              >
                <Plus className="w-4 h-4" /> Add Question
              </button>
            )}
          </div>
        </BlockWrapper>
      );
    },
  }
);

export default FAQSectionBlock;
