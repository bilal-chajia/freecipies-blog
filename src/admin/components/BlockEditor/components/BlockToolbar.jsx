/**
 * BlockToolbar Component
 * 
 * Floating toolbar that appears above selected blocks.
 * Implements WordPress Block Editor toolbar design patterns:
 * https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/block-design/#block-toolbar
 * 
 * Features:
 * - Block type icon + dropdown switcher (segment 1)
 * - Drag handle + mover arrows (segment 2)
 * - Block-specific controls (segment 3)
 * - "More" dropdown menu (segment 4)
 */

import { forwardRef } from 'react';
import {
    GripVertical,
    ChevronUp,
    ChevronDown,
    MoreHorizontal,
    Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/ui/tooltip';

/**
 * Toolbar button with optional tooltip
 */
export const ToolbarButton = forwardRef(({
    icon: Icon,
    label,
    isActive = false,
    disabled = false,
    onClick,
    className,
    ...props
}, ref) => {
    const button = (
        <button
            ref={ref}
            type="button"
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
            aria-pressed={isActive}
            className={cn(
                'wp-block-toolbar__button',
                'flex items-center justify-center',
                'w-[var(--wp-toolbar-button-size)] h-[var(--wp-toolbar-button-size)]',
                'p-0 bg-transparent border-none rounded-sm',
                'cursor-pointer',
                'transition-colors duration-[var(--wp-transition-duration)]',
                'hover:bg-[var(--wp-toolbar-button-hover-bg)]',
                isActive && 'bg-[var(--wp-toolbar-button-active-bg)] text-[var(--wp-toolbar-button-active-color)]',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            {...props}
        >
            <Icon className="w-5 h-5" />
        </button>
    );

    if (label) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {button}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    {label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return button;
});

ToolbarButton.displayName = 'ToolbarButton';

/**
 * Toolbar separator between groups
 */
export function ToolbarSeparator() {
    return (
        <div className={cn(
            'wp-block-toolbar__separator',
            'w-px h-6 mx-1',
            'bg-[var(--wp-toolbar-separator-color)]'
        )} />
    );
}

/**
 * Toolbar group container
 */
export function ToolbarGroup({ children, className }) {
    return (
        <div className={cn(
            'wp-block-toolbar__group',
            'flex items-center gap-0.5',
            className
        )}>
            {children}
        </div>
    );
}

/**
 * Block type indicator with optional switcher
 */
export function BlockTypeIndicator({
    icon: Icon,
    label,
    onSwitchType,
    switchOptions = [],
}) {
    if (switchOptions.length === 0) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn(
                        'flex items-center justify-center',
                        'w-[var(--wp-toolbar-button-size)] h-[var(--wp-toolbar-button-size)]',
                        'text-muted-foreground'
                    )}>
                        <Icon className="w-5 h-5" />
                    </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    {label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label={`${label} - Click to change block type`}
                    className={cn(
                        'flex items-center justify-center',
                        'w-[var(--wp-toolbar-button-size)] h-[var(--wp-toolbar-button-size)]',
                        'p-0 bg-transparent border-none rounded-sm cursor-pointer',
                        'hover:bg-[var(--wp-toolbar-button-hover-bg)]'
                    )}
                >
                    <Icon className="w-5 h-5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {switchOptions.map((option) => (
                    <DropdownMenuItem
                        key={option.value}
                        onClick={() => onSwitchType?.(option.value)}
                    >
                        <option.icon className="w-4 h-4 mr-2" />
                        {option.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Block mover controls (up/down arrows + drag handle)
 */
export function BlockMover({
    onMoveUp,
    onMoveDown,
    canMoveUp = true,
    canMoveDown = true,
    showDragHandle = true,
    dragHandleProps,
}) {
    return (
        <ToolbarGroup>
            {showDragHandle && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            aria-label="Drag to move"
                            {...(dragHandleProps || {})}
                            className={cn(
                                'flex items-center justify-center',
                                'w-[var(--wp-mover-button-size)] h-[var(--wp-toolbar-button-size)]',
                                'p-0 bg-transparent border-none cursor-grab',
                                'text-[var(--wp-mover-color)]',
                                'hover:text-[var(--wp-mover-hover-color)]'
                            )}
                        >
                            <GripVertical className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Drag to move
                    </TooltipContent>
                </Tooltip>
            )}

            <div className="flex flex-col -my-1">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={onMoveUp}
                            disabled={!canMoveUp}
                            aria-label="Move up"
                            className={cn(
                                'flex items-center justify-center',
                                'w-[var(--wp-mover-button-size)] h-[calc(var(--wp-toolbar-button-size)/2)]',
                                'p-0 bg-transparent border-none rounded-sm',
                                'text-[var(--wp-mover-color)]',
                                canMoveUp ? 'cursor-pointer hover:text-[var(--wp-mover-hover-color)]' : 'opacity-30 cursor-not-allowed'
                            )}
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                        Move up
                    </TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            type="button"
                            onClick={onMoveDown}
                            disabled={!canMoveDown}
                            aria-label="Move down"
                            className={cn(
                                'flex items-center justify-center',
                                'w-[var(--wp-mover-button-size)] h-[calc(var(--wp-toolbar-button-size)/2)]',
                                'p-0 bg-transparent border-none rounded-sm',
                                'text-[var(--wp-mover-color)]',
                                canMoveDown ? 'cursor-pointer hover:text-[var(--wp-mover-hover-color)]' : 'opacity-30 cursor-not-allowed'
                            )}
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                        Move down
                    </TooltipContent>
                </Tooltip>
            </div>
        </ToolbarGroup>
    );
}

/**
 * More options dropdown menu
 */
export function BlockMoreMenu({
    onDuplicate,
    onDelete,
    onCopy,
    children,
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    aria-label="More options"
                    className={cn(
                        'wp-block-toolbar__button',
                        'flex items-center justify-center',
                        'w-[var(--wp-toolbar-button-size)] h-[var(--wp-toolbar-button-size)]',
                        'p-0 bg-transparent border-none rounded-sm cursor-pointer',
                        'hover:bg-[var(--wp-toolbar-button-hover-bg)]'
                    )}
                >
                    <MoreHorizontal className="w-5 h-5" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                {onCopy && (
                    <DropdownMenuItem onClick={onCopy}>
                        Copy
                    </DropdownMenuItem>
                )}
                {onDuplicate && (
                    <DropdownMenuItem onClick={onDuplicate}>
                        Duplicate
                    </DropdownMenuItem>
                )}
                {children}
                {onDelete && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={onDelete}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete block
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Complete BlockToolbar component
 * Assembles all toolbar elements following WordPress patterns
 */
const BlockToolbar = forwardRef(({
    // Block type indicator
    blockIcon,
    blockLabel,
    onSwitchType,
    switchOptions,

    // Mover controls
    showMover = true,
    onMoveUp,
    onMoveDown,
    canMoveUp = true,
    canMoveDown = true,
    showDragHandle = true,
    dragHandleProps,

    // Custom controls (block-specific)
    children,

    // More menu
    showMoreMenu = true,
    onDuplicate,
    onDelete,
    onCopy,
    moreMenuContent,

    className,
    ...props
}, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                'flex items-center gap-0.5',
                className
            )}
            {...props}
        >
            {/* Segment 1: Block type indicator */}
            {blockIcon && (
                <>
                    <BlockTypeIndicator
                        icon={blockIcon}
                        label={blockLabel}
                        onSwitchType={onSwitchType}
                        switchOptions={switchOptions}
                    />
                    <ToolbarSeparator />
                </>
            )}

            {/* Segment 2: Mover controls */}
            {showMover && (
                <>
                    <BlockMover
                        onMoveUp={onMoveUp}
                        onMoveDown={onMoveDown}
                        canMoveUp={canMoveUp}
                        canMoveDown={canMoveDown}
                        showDragHandle={showDragHandle}
                        dragHandleProps={dragHandleProps}
                    />
                    <ToolbarSeparator />
                </>
            )}

            {/* Segment 3: Block-specific controls */}
            {children && (
                <ToolbarGroup>
                    {children}
                </ToolbarGroup>
            )}

            {/* Segment 4: More menu */}
            {showMoreMenu && (
                <>
                    {children && <ToolbarSeparator />}
                    <BlockMoreMenu
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        onCopy={onCopy}
                    >
                        {moreMenuContent}
                    </BlockMoreMenu>
                </>
            )}
        </div>
    );
});

BlockToolbar.displayName = 'BlockToolbar';

export default BlockToolbar;
