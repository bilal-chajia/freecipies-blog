/**
 * StructurePanel Component
 *
 * Displays the document outline/structure as a draggable, sortable list.
 * Based on WordPress Block Editor List View design.
 */

import { useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
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
    GripVertical,
    MoreVertical,
    Copy,
    Trash2,
    Plus,
    FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import type { StructureItem } from './useStructureTree';
import { canConvertBlock, getConversionOptions, getIndentDepth } from './useStructureTree';

interface SortableStructureItemProps {
    item: StructureItem;
    activeBlockId: string | null;
    onSelectBlock: (id: string) => void;
    onConvertBlock: (id: string, conversion: { type: string; level?: number }) => void;
    onBlockAction: (action: string, id: string) => void;
    dropTarget: { targetId: string; position: 'before' | 'after' } | null;
    isSortableEnabled: boolean;
    indentDepth: number;
}

function SortableStructureItem({
    item,
    activeBlockId,
    onSelectBlock,
    onConvertBlock,
    onBlockAction,
    dropTarget,
    isSortableEnabled,
    indentDepth,
}: SortableStructureItemProps) {
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

    const showConvertOptions = canConvertBlock(item.type);
    const conversionOptions = getConversionOptions(item.type);

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
                    dangerouslySetInnerHTML={{ __html: renderInlineLabel(item.label) }}
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
                            {conversionOptions.map((option) => (
                                <DropdownMenuItem
                                    key={`${option.type}-${option.level || 'default'}`}
                                    onClick={() =>
                                        onConvertBlock?.(item.id, {
                                            type: option.type,
                                            level: option.level,
                                        })
                                    }
                                >
                                    {option.label}
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

// Inline label rendering utilities
const escapeHtml = (value: string) =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const sanitizeHref = (href: string) => {
    if (!href) return '';
    if (href.startsWith('/') || href.startsWith('#')) return href;
    try {
        const url = new URL(href);
        if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
            return href;
        }
    } catch {
        return '';
    }
    return '';
};

const renderInlineStyles = (value: string) =>
    value
        .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+?)\*/g, '<em>$1</em>');

const renderInlineLabel = (text: string) => {
    const source = String(text || '');
    if (!source) return '';
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let result = '';
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(source)) !== null) {
        if (match.index > lastIndex) {
            const chunk = escapeHtml(source.slice(lastIndex, match.index));
            result += renderInlineStyles(chunk);
        }
        const label = escapeHtml(match[1]);
        const safeHref = sanitizeHref(match[2] || '');
        const styledLabel = renderInlineStyles(label);
        if (safeHref) {
            result += `<a href="${safeHref}">${styledLabel}</a>`;
        } else {
            result += styledLabel;
        }
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < source.length) {
        const tail = escapeHtml(source.slice(lastIndex));
        result += renderInlineStyles(tail);
    }

    return result;
};

interface StructurePanelProps {
    activeBlockId: string | null;
    onSelectBlock: (id: string) => void;
    onConvertBlock: (id: string, conversion: { type: string; level?: number }) => void;
    onBlockAction: (action: string, id: string) => void;
    onReorderBlock: (activeId: string, overId: string, position: 'before' | 'after') => void;
    panelTab: 'blocks' | 'list' | 'outline';
    structureItems: StructureItem[];
    outlineItems: StructureItem[];
    visibleItems: StructureItem[];
    className?: string;
}

/**
 * StructurePanel Component
 */
export function StructurePanel({
    activeBlockId,
    onSelectBlock,
    onConvertBlock,
    onBlockAction,
    onReorderBlock,
    panelTab,
    structureItems,
    outlineItems,
    visibleItems,
    className,
}: StructurePanelProps) {
    const [dropTarget, setDropTarget] = useState<{
        targetId: string;
        position: 'before' | 'after';
    } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
    );

    const isSortableEnabled = Boolean(onReorderBlock) && panelTab === 'list';

    const handleDragStart = useCallback(() => {
        if (!isSortableEnabled) return;
        setDropTarget(null);
    }, [isSortableEnabled]);

    const handleDragOver = useCallback(
        (event: any) => {
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
            const activeIndex = visibleItems.findIndex((item) => item.id === activeId);
            const overIndex = visibleItems.findIndex((item) => item.id === overId);
            const position = activeIndex < overIndex ? 'after' : 'before';
            setDropTarget({ targetId: overId, position });
        },
        [isSortableEnabled, structureItems, visibleItems]
    );

    const handleDragCancel = useCallback(() => {
        setDropTarget(null);
    }, []);

    const handleDragEnd = useCallback(
        (event: any) => {
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

            const activeIndex = visibleItems.findIndex((item) => item.id === activeId);
            const overIndex = visibleItems.findIndex((item) => item.id === overId);
            const position = activeIndex < overIndex ? 'after' : 'before';
            setDropTarget(null);
            onReorderBlock?.(activeId, overId, position);
        },
        [isSortableEnabled, onReorderBlock, structureItems, visibleItems]
    );

    return (
        <div className={cn('structure-panel-list', className)}>
            {visibleItems.length === 0 ? (
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
                        items={visibleItems.map((item) => item.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {visibleItems.map((item) => {
                            const isOutline = panelTab === 'outline';
                            const indentDepth = getIndentDepth(item, panelTab);
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
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
