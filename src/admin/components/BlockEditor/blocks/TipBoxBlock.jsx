/**
 * Custom Block: Tip Box (Alert)
 * 
 * A callout box for tips, warnings, notes, and info.
 * 
 * REFACTORED for WordPress Block Editor design:
 * - Type selector moved from inline <select> to BlockToolbar dropdown
 * - Proper selected/unselected states via BlockWrapper
 * - Clean content-first design following WordPress patterns
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/block-design/
 */

import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import { AlertTriangle, Info, Lightbulb, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import BlockToolbar from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockSelection } from '../selection-context';

// Alert type definitions
const alertTypes = ['tip', 'warning', 'info', 'note'];

const alertConfig = {
    tip: {
        icon: Lightbulb,
        label: 'Tip',
        colors: 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    warning: {
        icon: AlertTriangle,
        label: 'Warning',
        colors: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-200',
        iconColor: 'text-amber-600 dark:text-amber-400',
    },
    info: {
        icon: Info,
        label: 'Info',
        colors: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/30 dark:border-blue-800 dark:text-blue-200',
        iconColor: 'text-blue-600 dark:text-blue-400',
    },
    note: {
        icon: AlertCircle,
        label: 'Note',
        colors: 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-800/50 dark:border-slate-700 dark:text-slate-200',
        iconColor: 'text-slate-600 dark:text-slate-400',
    },
};

/**
 * Alert Type Toolbar Button
 * Dropdown to select alert type in the toolbar
 */
function AlertTypeToolbar({ currentType, onChange }) {
    const config = alertConfig[currentType] || alertConfig.warning;
    const Icon = config.icon;

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`Alert type: ${config.label}. Click to change.`}
                            className={cn(
                                'flex items-center justify-center gap-1.5',
                                'h-[var(--wp-toolbar-button-size)] px-2',
                                'bg-transparent border-none rounded-sm cursor-pointer',
                                'hover:bg-[var(--wp-toolbar-button-hover-bg)]',
                                'transition-colors duration-[var(--wp-transition-duration)]'
                            )}
                        >
                            <Icon className={cn('w-4 h-4', config.iconColor)} />
                            <span className="text-xs font-medium">{config.label}</span>
                        </button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    Change alert type
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-36">
                {alertTypes.map((type) => {
                    const typeConfig = alertConfig[type];
                    const TypeIcon = typeConfig.icon;
                    return (
                        <DropdownMenuItem
                            key={type}
                            onClick={() => onChange(type)}
                            className={cn(
                                'gap-2',
                                currentType === type && 'bg-accent'
                            )}
                        >
                            <TypeIcon className={cn('w-4 h-4', typeConfig.iconColor)} />
                            {typeConfig.label}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

/**
 * Alert Block Component
 * WordPress-style refactored with toolbar controls
 */
export const Alert = createReactBlockSpec(
    {
        type: 'alert',
        propSchema: {
            textAlignment: defaultProps.textAlignment,
            textColor: defaultProps.textColor,
            type: {
                default: 'warning',
                values: alertTypes,
            },
        },
        content: 'inline',
    },
    {
        render: (props) => {
            const { block, editor, contentRef } = props;
            const alertType = block.props.type || 'warning';
            const config = alertConfig[alertType] || alertConfig.warning;
            const Icon = config.icon;

            const { isSelected, selectBlock } = useBlockSelection(block.id);

            const handleTypeChange = (newType) => {
                editor.updateBlock(block, {
                    type: 'alert',
                    props: { ...block.props, type: newType },
                });
            };

            const moveBlockUp = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksUp();
                requestAnimationFrame(() => selectBlock());
            };

            const moveBlockDown = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksDown();
                requestAnimationFrame(() => selectBlock());
            };

            const sideMenu = editor.extensions?.sideMenu;
            const handleDragStart = (event) => {
                sideMenu?.blockDragStart?.(event, block);
            };
            const handleDragEnd = () => {
                sideMenu?.blockDragEnd?.();
            };

            const toolbar = (
                <BlockToolbar
                    blockIcon={Icon}
                    blockLabel={`${config.label} alert`}
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    showMoreMenu={false}
                >
                    <AlertTypeToolbar
                        currentType={alertType}
                        onChange={handleTypeChange}
                    />
                </BlockToolbar>
            );

            return (
                <BlockWrapper
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    onFocus={selectBlock}
                    onPointerDownCapture={selectBlock}
                    blockType="alert"
                    blockId={block.id}
                    className="my-2"
                >
                    <div
                        className={cn(
                            'relative flex gap-3 p-4 rounded-lg border',
                            config.colors
                        )}
                        data-alert-type={alertType}
                    >
                        {/* Icon */}
                        <div className={cn('flex-shrink-0 mt-0.5', config.iconColor)}>
                            <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                            <div
                                ref={contentRef}
                                className="prose prose-sm max-w-none focus:outline-none"
                            />
                        </div>
                    </div>
                </BlockWrapper>
            );
        },
    }
);

export default Alert;




