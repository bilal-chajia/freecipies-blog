import { useCallback, useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FileText, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BLOCK_TYPE_ICONS } from '../../utils/constants';
import { renderInlineMarkdownHtml } from '../../utils/safeInlineHtml';
import { getBlockColorClass, getHeadingBadgeColorClass } from '../../utils/blockColors';
import type { StructureItem } from '../../store/blockEditorStore';
import { StructureActionsMenu, type BlockAction, type ConvertBlockOptions } from './StructureActionsMenu';

export type DropTarget = {
    targetId: string;
    position: 'before' | 'after';
};

interface SortableStructureItemProps {
    item: StructureItem;
    activeBlockId?: string | null;
    onSelectBlock?: (blockId: string) => void;
    onConvertBlock?: (blockId: string, options: ConvertBlockOptions) => void;
    onBlockAction?: (action: BlockAction, blockId: string) => void;
    dropTarget?: DropTarget | null;
    isSortableEnabled: boolean;
    indentDepth: number;
    showConvertOptions: boolean;
    isOutlineView: boolean;
}

export function SortableStructureItem({
    item,
    activeBlockId,
    onSelectBlock,
    onConvertBlock,
    onBlockAction,
    dropTarget,
    isSortableEnabled,
    indentDepth,
    showConvertOptions,
    isOutlineView,
}: SortableStructureItemProps) {
    const is_active = activeBlockId === item.id;
    const isDropTarget = dropTarget?.targetId === item.id;
    const dropPosition = isDropTarget ? dropTarget.position : null;
    const Icon = item.icon || FileText;
    const colorClass = getBlockColorClass(item.type);

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

    // Keep the active row visible when selection comes from the canvas (a click
    // on a block off-screen in the list). `nearest` is a no-op when already visible.
    const itemRef = useRef<HTMLDivElement | null>(null);
    const setRefs = useCallback((node: HTMLDivElement | null) => {
        setNodeRef(node);
        itemRef.current = node;
    }, [setNodeRef]);

    useEffect(() => {
        if (is_active && !isDragging) {
            itemRef.current?.scrollIntoView({ block: 'nearest' });
        }
    }, [is_active, isDragging]);

    return (
        <div
            ref={setRefs}
            className={cn(
                'structure-item group relative select-none rounded-md mx-2 my-0.5 border border-transparent',
                is_active ? 'bg-primary/5 border-primary/20 shadow-sm' : 'hover:bg-muted/40',
                isDragging && 'opacity-60 shadow-lg scale-95 border-dashed border-primary',
                dropPosition && 'scale-[0.98]'
            )}
            style={{
                paddingLeft: `${8 + indentDepth * 14}px`,
                transform: CSS.Transform.toString(transform),
                transition: isDragging
                    ? 'none'
                    : transition
                        ? `${transition}, scale 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms cubic-bezier(0.2, 0, 0, 1)`
                        : 'transform 200ms cubic-bezier(0.2, 0, 0, 1), scale 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms cubic-bezier(0.2, 0, 0, 1), background-color 200ms ease, border-color 200ms ease',
            }}
            onClick={() => onSelectBlock?.(item.id)}
        >
            {dropPosition && (
                <div
                    className={cn(
                        "absolute left-0 right-0 h-0.5 bg-primary pointer-events-none z-10 rounded-full",
                        dropPosition === 'before' ? "top-0 -translate-y-0.5" : "bottom-0 translate-y-0.5"
                    )}
                />
            )}
            <div className="structure-item-content flex items-center gap-2 py-0.5 min-w-0 flex-1 overflow-hidden">
                {!isOutlineView && (
                    <span
                        ref={setActivatorNodeRef}
                        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing transition-colors flex items-center justify-center p-0.5"
                        title={isSortableEnabled ? 'Drag to reorder' : 'Reorder disabled'}
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="w-3 h-3 shrink-0 structure-item-grip opacity-40 group-hover:opacity-100 transition-opacity" />
                    </span>
                )}
                
                {isOutlineView && item.type === 'heading' ? (
                    (() => {
                        const HeadingIconFn = BLOCK_TYPE_ICONS.heading;
                        const HeadingIcon = typeof HeadingIconFn === 'function' ? HeadingIconFn(item.level || 2) : HeadingIconFn;
                        return (
                            <div className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-200",
                                getHeadingBadgeColorClass(item.level || 2)
                            )}>
                                <HeadingIcon className="w-3 h-3" />
                            </div>
                        );
                    })()
                ) : (
                    <div className={cn('size-5 rounded-md border shrink-0 flex items-center justify-center transition-all duration-200 group-hover:scale-105', colorClass)}>
                        <Icon className="w-3 h-3" />
                    </div>
                )}

                <span
                    className={cn(
                        'structure-item-label text-xs truncate flex-1 font-medium transition-colors duration-200',
                        is_active ? 'text-primary font-semibold' : 'text-foreground/80 group-hover:text-foreground'
                    )}
                    title={item.label ? item.label.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1') : ''}
                    dangerouslySetInnerHTML={{ __html: renderInlineMarkdownHtml(item.label, { allowStyles: true, preserveLineBreaks: false }) }}
                />
            </div>
            
            <StructureActionsMenu
                item={item}
                showConvertOptions={showConvertOptions}
                onConvertBlock={onConvertBlock}
                onBlockAction={onBlockAction}
            />
        </div>
    );
}
