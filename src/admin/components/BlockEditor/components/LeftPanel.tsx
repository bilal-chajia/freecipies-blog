/**
 * Block Inserter Component
 * 
 * Left panel in the Block Editor layout.
 * Displays List View (draggable document tree) and Outline (clickable TOC).
 * Fully refactored to consume Zustand store state and sport a premium glassmorphic UI.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    closestCenter,
    DndContext,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    ListTree,
    BookOpen,
    PanelLeftClose,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/scroll-area';
import { useBlockEditorStore, type StructureItem } from '../store/blockEditorStore';
import { SortableStructureItem, type DropTarget } from './left-panel/SortableStructureItem';
import type { BlockAction, ConvertBlockOptions } from './left-panel/StructureActionsMenu';

type PanelTab = 'list' | 'outline';

type LeftPanelProps = {
    isOpen?: boolean;
    onClose?: () => void;
    onInsertBlock?: (blockType: string) => void;
    onConvertBlock?: (blockId: string, options: ConvertBlockOptions) => void;
    contentType?: 'article' | 'recipe' | 'roundup';
    structureItems?: StructureItem[];
    activeBlockId?: string | null;
    onSelectBlock?: (blockId: string) => void;
    onReorderBlock?: (activeId: string, overId: string, position: 'before' | 'after') => void;
    onBlockAction?: (action: BlockAction, blockId: string) => void;
    className?: string;
};

/**
 * Left Panel
 */
export default function LeftPanel({
    isOpen: _isOpen,
    onClose,
    onConvertBlock,
    structureItems: _propStructureItems,
    activeBlockId: _propActiveBlockId,
    onSelectBlock,
    onReorderBlock,
    onBlockAction,
    className,
}: LeftPanelProps) {
    const [panelTab, setPanelTab] = useState<PanelTab>('outline');
    const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
    const [draggedItems, setDraggedItems] = useState<StructureItem[] | null>(null);

    // Consume Zustand Store values with granular selectors for optimized performance
    const isOpen = useBlockEditorStore(s => _isOpen ?? s.inserterOpen);
    const storeStructureItems = useBlockEditorStore(s => s.structureItems);
    const structureItems = _propStructureItems ?? storeStructureItems;
    const activeBlockId = useBlockEditorStore(s => _propActiveBlockId ?? s.activeBlockId);
    const storeSetActiveBlock = useBlockEditorStore(s => s.setActiveBlock);
    const setInserterOpen = useBlockEditorStore(s => s.setInserterOpen);
    const editor = useBlockEditorStore(s => s.editor);

    const handleClose = useCallback(() => {
        if (onClose) {
            onClose();
        } else {
            setInserterOpen(false);
        }
    }, [onClose, setInserterOpen]);

    const handleSelectBlock = useCallback((blockId: string) => {
        if (onSelectBlock) {
            onSelectBlock(blockId);
        } else {
            storeSetActiveBlock(blockId);
            // Smoothly scroll and focus block on outline click
            if (editor) {
                try {
                    editor.setTextCursorPosition(blockId, 'start');
                    editor.focus();
                    const el = document.querySelector(`[data-block="${blockId}"]`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                } catch {}
            }
        }
    }, [onSelectBlock, storeSetActiveBlock, editor]);

    const outlineItems = useMemo(
        () => structureItems.filter((item) => item.type === 'heading'),
        [structureItems]
    );

    const visibleStructureItems = useMemo(() => {
        let items = panelTab === 'outline' ? outlineItems : structureItems;

        // Filter out trailing empty paragraph if it exists
        if (panelTab === 'list' && items.length > 1) {
            const last = items[items.length - 1];
            if (last.type === 'paragraph' && (!last.label || last.label.trim() === '')) {
                return items.slice(0, -1);
            }
        }
        return items;
    }, [panelTab, outlineItems, structureItems]);

    const displayItems = useMemo(() => {
        if (draggedItems) return draggedItems;
        return visibleStructureItems;
    }, [draggedItems, visibleStructureItems]);

    useEffect(() => {
        setDraggedItems(null);
    }, [visibleStructureItems]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const isSortableEnabled = Boolean(onReorderBlock) && panelTab === 'list';

    const handleDragStart = useCallback((_event: DragStartEvent) => {
        if (!isSortableEnabled) return;
        setDropTarget(null);
        setDraggedItems([...visibleStructureItems]);
    }, [isSortableEnabled, visibleStructureItems]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        if (!isSortableEnabled) return;
        const activeId = event.active?.id;
        const overId = event.over?.id;
        if (!activeId || !overId || activeId === overId) {
            return;
        }
        const activeItem = structureItems.find((item) => item.id === String(activeId));
        const overItem = structureItems.find((item) => item.id === String(overId));
        if (!activeItem || !overItem || activeItem.parentId !== overItem.parentId) {
            setDropTarget(null);
            setDraggedItems([...visibleStructureItems]);
            return;
        }
        const activeIndex = visibleStructureItems.findIndex((item) => item.id === String(activeId));
        const overIndex = visibleStructureItems.findIndex((item) => item.id === String(overId));
        const position = activeIndex < overIndex ? 'after' : 'before';
        setDropTarget({ targetId: String(overId), position });

        setDraggedItems((prev) => {
            if (!prev) return prev;
            const oldIdx = prev.findIndex((item) => item.id === String(activeId));
            const newIdx = prev.findIndex((item) => item.id === String(overId));
            if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
            
            const next = [...prev];
            const [removed] = next.splice(oldIdx, 1);
            next.splice(newIdx, 0, removed);
            return next;
        });
    }, [isSortableEnabled, structureItems, visibleStructureItems]);

    const handleDragCancel = useCallback(() => {
        setDropTarget(null);
        setDraggedItems(null);
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        if (!isSortableEnabled) return;
        const activeId = event.active?.id;
        const finalTarget = dropTarget;

        setDropTarget(null);

        if (!activeId || !finalTarget) {
            setDraggedItems(null);
            return;
        }

        // We do NOT clear draggedItems here to let the settling animation run smoothly
        onReorderBlock?.(String(activeId), finalTarget.targetId, finalTarget.position);
    }, [isSortableEnabled, onReorderBlock, dropTarget]);

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ width: '280px' }}
            className={cn(
                'wp-block-inserter relative h-full min-h-0 overflow-hidden flex flex-col',
                'bg-background/80 backdrop-blur-md border-r border-border/80 shadow-2xl',
                className
            )}
        >
            <div className="h-11 border-b border-border/50 bg-background/60">
                <div className="relative flex h-full items-center w-full px-2">
                    {/* Tabs — centered */}
                    <div className="flex h-full items-center justify-center flex-1 gap-1">
                        <button
                            type="button"
                            className={cn(
                                'relative flex h-11 items-center gap-1.5 px-3 text-xs font-semibold transition-all duration-200',
                                panelTab === 'list' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => setPanelTab('list')}
                        >
                            <ListTree className="w-3.5 h-3.5 shrink-0" />
                            List View
                            {panelTab === 'list' && (
                                <motion.span
                                    layoutId="left-panel-tab-indicator"
                                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                        </button>
                        <button
                            type="button"
                            className={cn(
                                'relative flex h-11 items-center gap-1.5 px-3 text-xs font-semibold transition-all duration-200',
                                panelTab === 'outline' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => setPanelTab('outline')}
                        >
                            <BookOpen className="w-3.5 h-3.5 shrink-0" />
                            Outline
                            {panelTab === 'outline' && (
                                <motion.span
                                    layoutId="left-panel-tab-indicator"
                                    className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full"
                                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                />
                            )}
                        </button>
                    </div>

                    {/* Close button — absolute right */}
                    <button
                        type="button"
                        onClick={handleClose}
                        className="absolute right-2 group flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 cursor-pointer shrink-0"
                        aria-label="Close panel"
                    >
                        <PanelLeftClose className="w-4 h-4 transition-all duration-200 group-hover:text-primary group-hover:scale-110" />
                    </button>
                </div>
            </div>

            <ScrollArea className="flex-1 min-h-0 py-2">
                <div className="structure-panel-list">
                    {visibleStructureItems.length === 0 ? (
                        <div className="structure-empty text-center py-8 text-xs text-muted-foreground font-medium animate-pulse">
                            No headings or blocks yet.
                        </div>
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
                                items={displayItems.map((item) => item.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {displayItems.map((item) => {
                                    const isOutline = panelTab === 'outline';
                                    const headingDepth = Math.max(0, (item.level || 2) - 2);
                                    const indentDepth = isOutline ? headingDepth : (item.depth || 0);
                                    const showConvertOptions = item.type === 'heading' || item.type === 'paragraph';
                                    return (
                                        <SortableStructureItem
                                            key={item.id}
                                            item={item}
                                            activeBlockId={activeBlockId}
                                            onSelectBlock={handleSelectBlock}
                                            onConvertBlock={onConvertBlock}
                                            onBlockAction={onBlockAction}
                                            dropTarget={dropTarget}
                                            isSortableEnabled={isSortableEnabled}
                                            indentDepth={indentDepth}
                                            showConvertOptions={showConvertOptions}
                                            isOutlineView={isOutline}
                                        />
                                    );
                                })}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </ScrollArea>
        </motion.div>
    );
}
