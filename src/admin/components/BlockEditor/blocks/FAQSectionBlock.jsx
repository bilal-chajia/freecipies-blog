/**
 * Custom Block: FAQ Section
 * 
 * Expandable FAQ items with question/answer pairs.
 * 
 * REFACTORED for WordPress Block Editor design:
 * - Collapsed preview showing FAQ count when unselected
 * - Expanded editing mode when selected
 * - Proper block toolbar
/**
 * Custom Block: FAQ Section
 * 
 * Expandable FAQ items with question/answer pairs.
 * 
 * REFACTORED for WordPress Block Editor design:
 * - Collapsed preview showing FAQ count when unselected
 * - Expanded editing mode when selected
 * - Proper block toolbar
 * - Clean visual states
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { createReactBlockSpec } from '@blocknote/react';
import {
    HelpCircle,
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    GripVertical
} from 'lucide-react';
import { useRef, useState, createContext, useContext, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import BlockToolbar, { ToolbarButton, ToolbarSeparator } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockSelection } from '../selection-context';
import { toInlineMarkdownHtml } from '../utils/safeInlineHtml';
import { useBlockActionPrimitives, useBlockDragHandle } from './primitives';

/**
 * Context to share FAQ data between the BlockEditor and FAQSectionBlock
 * This mirrors the RecipeDataContext pattern for consistent architecture.
 */
const DEFAULT_FAQ_CONTEXT = {
    faqs: [],
    setFaqs: () => { },
    faqTitle: 'Frequently Asked Questions',
    setFaqTitle: () => { },
    hasExternalFaqState: false,
};

export const FAQDataContext = createContext(DEFAULT_FAQ_CONTEXT);

export const useFAQData = () => useContext(FAQDataContext);

/**
 * Sortable FAQ Item Component
 */
function SortableFAQItem({
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
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: `faq-item-${idx}` });

    const style = {
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
                        type="text"
                        value={item.q}
                        onChange={(e) => onUpdateItem(idx, 'q', e.target.value)}
                        placeholder="Question"
                        className={cn(
                            'w-full font-medium text-sm',
                            'bg-transparent border-none p-0',
                            'focus:outline-none focus:ring-0',
                            'placeholder:text-muted-foreground/50'
                        )}
                    />

                    <AnimatePresence>
                        {expanded[idx] && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
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
                                            ref={answerRef}
                                            value={item.a}
                                            onChange={(e) => onUpdateItem(idx, 'a', e.target.value)}
                                            placeholder="Answer (supports [text](url) for links)"
                                            className={cn(
                                                'w-full text-sm text-muted-foreground',
                                                'bg-muted/50 border border-input rounded-md',
                                                'p-2 resize-y min-h-[80px]',
                                                'focus:outline-none focus:ring-2 focus:ring-ring'
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

export const FAQSectionBlock = createReactBlockSpec(
    {
        type: 'faqSection',
        propSchema: {
            // Title kept in props for backward compatibility during migration
            // After migration, title will also move to context
            title: { default: 'Frequently Asked Questions' },
            // items removed - now stored in faqs_json via FAQDataContext
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;

            // Use context for FAQ data (mirrors RecipeDataContext pattern)
            const { faqs, setFaqs, faqTitle, setFaqTitle, hasExternalFaqState } = useFAQData();
            const hasFaqContext = Boolean(hasExternalFaqState);

            // For now, always use local state until parent editors provide context
            // This ensures backward compatibility
            const [localItems, setLocalItems] = useState(() => {
                try {
                    return JSON.parse(block.props.items || '[]');
                } catch {
                    return [];
                }
            });
            const [localTitle, setLocalTitle] = useState(
                block.props.title || 'Frequently Asked Questions'
            );

            // Use context when available, even for empty arrays, so deletes sync correctly.
            const items = hasFaqContext
                ? (Array.isArray(faqs) ? faqs : [])
                : localItems;
            const title = hasFaqContext
                ? (faqTitle || 'Frequently Asked Questions')
                : localTitle;

            const { isSelected, selectBlock } = useBlockSelection(block.id);
            const {
                moveUp: moveBlockUp,
                moveDown: moveBlockDown,
                remove: removeBlock,
            } = useBlockActionPrimitives({
                editor,
                blockId: block.id,
                onSelect: selectBlock,
            });
            const {
                dragHandleProps,
                setDragNodeRef,
                dragStyle,
                isDragging,
            } = useBlockDragHandle(block.id);
            const [expanded, setExpanded] = useState({});
            const [editing, setEditing] = useState({});
            const answerRefs = useRef({});

            // DNd kit sensors
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

            const updateItems = (newItems) => {
                // Always update local state
                setLocalItems(newItems);
                // Also persist to block props for serialization
                editor.updateBlock(block, {
                    type: 'faqSection',
                    props: { ...block.props, items: JSON.stringify(newItems) },
                });
                // If context is provided, also update context
                if (setFaqs && typeof setFaqs === 'function') {
                    setFaqs(newItems);
                }
            };

            const updateTitle = (newTitle) => {
                // Always update local state
                setLocalTitle(newTitle);
                // Also persist to block props
                editor.updateBlock(block, {
                    type: 'faqSection',
                    props: { ...block.props, title: newTitle }
                });
                // If context is provided, also update context
                if (setFaqTitle && typeof setFaqTitle === 'function') {
                    setFaqTitle(newTitle);
                }
            };

            const addItem = () => {
                updateItems([...items, { q: '', a: '' }]);
                const newIdx = items.length;
                setExpanded({ ...expanded, [newIdx]: true });
                setEditing((prev) => ({ ...prev, [newIdx]: true }));
                requestAnimationFrame(() => {
                    const textarea = answerRefs.current[newIdx];
                    if (textarea) textarea.focus();
                });
            };

            const removeItem = (idx) => {
                updateItems(items.filter((_, i) => i !== idx));
                setEditing((prev) => {
                    const next = { ...prev };
                    delete next[idx];
                    return next;
                });
            };

            const updateItem = (idx, field, value) => {
                const newItems = [...items];
                newItems[idx] = { ...newItems[idx], [field]: value };
                updateItems(newItems);
            };

            const toggleExpand = (idx) => {
                setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
            };

            const startEditing = (idx) => {
                setEditing((prev) => ({ ...prev, [idx]: true }));
                requestAnimationFrame(() => {
                    const textarea = answerRefs.current[idx];
                    if (textarea) textarea.focus();
                });
            };

            const stopEditing = (idx) => {
                setEditing((prev) => ({ ...prev, [idx]: false }));
            };

            const handleDragEnd = (event) => {
                const { active, over } = event;
                if (active.id !== over?.id) {
                    const oldIndex = parseInt(active.id.split('-').pop());
                    const newIndex = parseInt(over.id.split('-').pop());
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
                    onFocus={selectBlock}
                    onPointerDownCapture={selectBlock}
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
                                type="text"
                                value={title}
                                onChange={(e) => updateTitle(e.target.value)}
                                className={cn(
                                    'text-lg font-semibold flex-1',
                                    'bg-transparent border-none p-0',
                                    'focus:outline-none focus:ring-0',
                                    'placeholder:text-muted-foreground/50'
                                )}
                                placeholder="FAQ Section Title"
                            />
                            {/* Question Count Badge (User Request) */}
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
                                        items={items.map((_, i) => `faq-item-${i}`)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {items.map((item, idx) => (
                                            <SortableFAQItem
                                                key={`faq-item-${idx}`}
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
                </BlockWrapper >
            );
        },
    }
);

export default FAQSectionBlock;
