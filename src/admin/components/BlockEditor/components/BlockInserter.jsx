/**
 * Block Inserter Component
 * 
 * Left panel in the WordPress Block Editor layout.
 * Provides a searchable list of available blocks that can be inserted into the editor.
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    closestCenter,
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    Search,
    X,
    ChevronDown,
    Type,
    Image,
    Video,
    Table2,
    HelpCircle,
    LayoutGrid,
    Minus,
    Lightbulb,
    SplitSquareHorizontal,
    Hash,
    FileText,
    List,
    Quote,
    Code,
    Utensils,
    GripVertical,
    MoreVertical,
    Copy,
    Trash2,
    Plus,
    ListTree,
    BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/scroll-area';
import { Input } from '@/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { renderInlineMarkdownHtml } from '../utils/safeInlineHtml';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';

function SortableStructureItem({
    item,
    activeBlockId,
    onSelectBlock,
    onConvertBlock,
    onBlockAction,
    dropTarget,
    isSortableEnabled,
    indentDepth,
    showConvertOptions,
}) {
    const isActive = activeBlockId === item.id;
    const isDropTarget = dropTarget?.targetId === item.id;
    const dropPosition = isDropTarget ? dropTarget.position : null;
    const Icon = item.icon || FileText;

    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.id,
        disabled: !isSortableEnabled,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'structure-item group',
                isActive && 'is-active',
                isDragging && 'opacity-60',
                dropPosition === 'before' && 'border-t border-primary/60',
                dropPosition === 'after' && 'border-b border-primary/60'
            )}
            style={{
                paddingLeft: `${12 + indentDepth * 14}px`,
                transform: CSS.Transform.toString(transform),
                transition,
            }}
            onClick={() => onSelectBlock?.(item.id)}
        >
            <div className="structure-item-content flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <button
                    ref={setActivatorNodeRef}
                    type="button"
                    className="text-muted-foreground hover:text-foreground cursor-grab"
                    onClick={(event) => event.stopPropagation()}
                    title={isSortableEnabled ? 'Drag to reorder' : 'Reorder disabled'}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="w-3.5 h-3.5 shrink-0 structure-item-grip" />
                </button>
                <Icon className="structure-item-icon" />
                <span
                    className="structure-item-label"
                    title={item.label ? item.label.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') : ''}
                    dangerouslySetInnerHTML={{ __html: renderInlineMarkdownHtml(item.label, { allowStyles: true, preserveLineBreaks: false }) }}
                />
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                        onClick={(event) => event.stopPropagation()}
                        title="Block actions"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => onBlockAction?.('duplicate', item.id)}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                    </DropdownMenuItem>
                    {showConvertOptions && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onConvertBlock?.(item.id, { type: 'paragraph' })}
                            >
                                Paragraph
                            </DropdownMenuItem>
                            {[2, 3, 4, 5, 6].map((level) => (
                                <DropdownMenuItem
                                    key={`heading-${item.id}-${level}`}
                                    onClick={() => onConvertBlock?.(item.id, { type: 'heading', level })}
                                >
                                    Heading {level}
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => onBlockAction?.('add-before', item.id)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add before
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => onBlockAction?.('add-after', item.id)}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add after
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onBlockAction?.('delete', item.id)}
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

// Block categories with their blocks
const blockCategories = [
    {
        id: 'text',
        label: 'Text',
        blocks: [
            { type: 'paragraph', icon: Type, label: 'Paragraph', description: 'Start with basic text' },
            { type: 'heading', icon: Hash, label: 'Heading', description: 'Add a heading' },
            { type: 'list', icon: List, label: 'List', description: 'Create a bulleted or numbered list' },
            { type: 'quote', icon: Quote, label: 'Quote', description: 'Add a quote' },
            { type: 'code', icon: Code, label: 'Code', description: 'Display code snippets' },
        ],
    },
    {
        id: 'media',
        label: 'Media',
        blocks: [
            { type: 'customImage', icon: Image, label: 'Image', description: 'Insert an image' },
            { type: 'video', icon: Video, label: 'Video', description: 'Embed a video' },
            { type: 'beforeAfter', icon: SplitSquareHorizontal, label: 'Before/After', description: 'Compare two images' },
        ],
    },
    {
        id: 'content',
        label: 'Content',
        blocks: [
            { type: 'alert', icon: Lightbulb, label: 'Tip Box', description: 'Add a callout or tip' },
            { type: 'faqSection', icon: HelpCircle, label: 'FAQ', description: 'Add frequently asked questions' },
            { type: 'simpleTable', icon: Table2, label: 'Table', description: 'Insert a table' },
            { type: 'relatedContent', icon: LayoutGrid, label: 'Related Content', description: 'Show related items' },
            { type: 'divider', icon: Minus, label: 'Divider', description: 'Add a horizontal line' },
        ],
    },
    {
        id: 'recipe',
        label: 'Recipe',
        blocks: [
            { type: 'mainRecipe', icon: Utensils, label: 'Recipe Details', description: 'The main recipe editor for this post' },
        ],
    },
];

/**
 * Block Inserter Panel
 */
export default function BlockInserter({
    isOpen = true,
    onClose,
    onInsertBlock,
    onConvertBlock,
    contentType = 'article', // article, recipe, roundup
    structureItems = [],
    activeBlockId = null,
    onSelectBlock,
    onReorderBlock,
    onBlockAction,
    className,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [panelTab, setPanelTab] = useState('list');
    const [dropTarget, setDropTarget] = useState(null);
    const [expandedCategories, setExpandedCategories] = useState(
        blockCategories.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
    );

    // Filter blocks based on content type
    const filteredCategories = useMemo(() => {
        return blockCategories
            .filter(cat => {
                // Hide recipe category for non-recipe content
                if (cat.id === 'recipe' && contentType !== 'recipe') return false;
                return true;
            })
            .map(cat => ({
                ...cat,
                blocks: cat.blocks.filter(block => {
                    // Filter by search query
                    if (searchQuery) {
                        const query = searchQuery.toLowerCase();
                        return (
                            block.label.toLowerCase().includes(query) ||
                            block.description.toLowerCase().includes(query)
                        );
                    }
                    return true;
                }),
            }))
            .filter(cat => cat.blocks.length > 0);
    }, [searchQuery, contentType]);

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId],
        }));
    };

    const handleBlockClick = (blockType) => {
        onInsertBlock?.(blockType);
    };

    const outlineItems = useMemo(
        () => structureItems.filter((item) => item.type === 'heading'),
        [structureItems]
    );

    const visibleStructureItems = useMemo(() => {
        let items = panelTab === 'outline' ? outlineItems : structureItems;

        // Filter out trailing empty paragraph if it exists (common system-added block)
        if (panelTab === 'list' && items.length > 1) {
            const last = items[items.length - 1];
            if (last.type === 'paragraph' && (!last.label || last.label.trim() === '')) {
                return items.slice(0, -1);
            }
        }
        return items;
    }, [panelTab, outlineItems, structureItems]);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const isSortableEnabled = Boolean(onReorderBlock) && panelTab === 'list';

    const handleDragStart = useCallback((event) => {
        if (!isSortableEnabled) return;
        setDropTarget(null);
    }, [isSortableEnabled]);

    const handleDragOver = useCallback((event) => {
        if (!isSortableEnabled) return;
        const activeId = event.active?.id;
        const overId = event.over?.id;
        if (!activeId || !overId || activeId === overId) {
            setDropTarget(null);
            return;
        }
        const activeItem = structureItems.find((item) => item.id === activeId);
        const overItem = structureItems.find((item) => item.id === overId);
        if (!activeItem || !overItem || activeItem.parentId !== overItem.parentId) {
            setDropTarget(null);
            return;
        }
        const activeIndex = visibleStructureItems.findIndex((item) => item.id === activeId);
        const overIndex = visibleStructureItems.findIndex((item) => item.id === overId);
        const position = activeIndex < overIndex ? 'after' : 'before';
        setDropTarget({ targetId: overId, position });
    }, [isSortableEnabled, structureItems, visibleStructureItems]);

    const handleDragCancel = useCallback(() => {
        setDropTarget(null);
    }, []);

    const handleDragEnd = useCallback((event) => {
        if (!isSortableEnabled) return;
        const activeId = event.active?.id;
        const overId = event.over?.id;

        if (!activeId || !overId || activeId === overId) {
            setDropTarget(null);
            return;
        }

        const activeItem = structureItems.find((item) => item.id === activeId);
        const overItem = structureItems.find((item) => item.id === overId);
        if (!activeItem || !overItem || activeItem.parentId !== overItem.parentId) {
            setDropTarget(null);
            return;
        }

        const activeIndex = visibleStructureItems.findIndex((item) => item.id === activeId);
        const overIndex = visibleStructureItems.findIndex((item) => item.id === overId);
        const position = activeIndex < overIndex ? 'after' : 'before';
        setDropTarget(null);
        onReorderBlock?.(activeId, overId, position);
    }, [isSortableEnabled, onReorderBlock, structureItems, visibleStructureItems]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ width: '270px' }}
            className={cn(
                'wp-block-inserter',
                'h-full min-h-0 overflow-hidden',
                'bg-[var(--wp-inserter-bg)] border-r border-[var(--wp-inserter-border)]',
                'flex flex-col',
                className
            )}
        >
            <div className="px-3 py-2 border-b border-border">
                <div className="structure-tabs justify-between w-full">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            className={cn('structure-tab', panelTab === 'list' && 'is-active')}
                            onClick={() => setPanelTab('list')}
                        >
                            <ListTree className="w-3.5 h-3.5" />
                            List View
                        </button>
                        <button
                            type="button"
                            className={cn('structure-tab', panelTab === 'outline' && 'is-active')}
                            onClick={() => setPanelTab('outline')}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            Outline
                        </button>
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className={cn(
                                'flex items-center justify-center',
                                'w-7 h-7 rounded-sm',
                                'text-muted-foreground hover:text-foreground',
                                'hover:bg-muted'
                            )}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>



            <ScrollArea className="flex-1 min-h-0">
                {(
                    <div className="structure-panel-list">
                        {visibleStructureItems.length === 0 ? (
                            <div className="structure-empty">No blocks yet.</div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleDragStart}
                                onDragOver={handleDragOver}
                                onDragEnd={handleDragEnd}
                                onDragCancel={handleDragCancel}
                            >
                                <SortableContext
                                    items={visibleStructureItems.map((item) => item.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {visibleStructureItems.map((item) => {
                                        const isOutline = panelTab === 'outline';
                                        const headingDepth = Math.max(0, (item.level || 2) - 2);
                                        const indentDepth = isOutline ? headingDepth : (item.depth || 0);
                                        const showConvertOptions = item.type === 'heading' || item.type === 'paragraph';
                                        return (
                                            <SortableStructureItem
                                                key={item.id}
                                                item={item}
                                                activeBlockId={activeBlockId}
                                                onSelectBlock={onSelectBlock}
                                                onConvertBlock={onConvertBlock}
                                                onBlockAction={onBlockAction}
                                                dropTarget={dropTarget}
                                                isSortableEnabled={isSortableEnabled}
                                                indentDepth={indentDepth}
                                                showConvertOptions={showConvertOptions}
                                            />
                                        );
                                    })}
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                )}
            </ScrollArea>
        </motion.div>
    );
}
