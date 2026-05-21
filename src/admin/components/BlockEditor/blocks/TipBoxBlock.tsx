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
import type { LucideIcon } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { FocusEvent, KeyboardEvent } from 'react';
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
type AlertType = 'tip' | 'warning' | 'info' | 'note';

type AlertConfig = {
    icon: LucideIcon;
    label: string;
    bg: string;
    borderColor: string;
    iconColor: string;
    iconBg: string;
    titleColor: string;
    subtitleColor: string;
    textColor: string;
};

type AlertContentElement = HTMLDivElement & {
    __pasteHandlerAttached?: boolean;
};

type MutableElementRef = {
    current: AlertContentElement | null;
};

const alertTypes: AlertType[] = ['tip', 'warning', 'info', 'note'];

const alertConfig: Record<AlertType, AlertConfig> = {
    tip: {
        icon: Lightbulb,
        label: 'Tip',
        bg: 'linear-gradient(180deg, #f2fcf5 0%, #ffffff 100%)',
        borderColor: '#e5e7eb',
        iconColor: '#10b981',
        iconBg: 'rgba(16, 185, 129, 0.12)',
        titleColor: '#111827',
        subtitleColor: '#6b7280',
        textColor: '#374151',
    },
    warning: {
        icon: AlertTriangle,
        label: 'Warning',
        bg: 'linear-gradient(180deg, #fffbeb 0%, #ffffff 100%)',
        borderColor: '#e5e7eb',
        iconColor: '#f59e0b',
        iconBg: 'rgba(245, 158, 11, 0.12)',
        titleColor: '#111827',
        subtitleColor: '#6b7280',
        textColor: '#374151',
    },
    info: {
        icon: Info,
        label: 'Info',
        bg: 'linear-gradient(180deg, #eff6ff 0%, #ffffff 100%)',
        borderColor: '#e5e7eb',
        iconColor: '#3b82f6',
        iconBg: 'rgba(59, 130, 246, 0.12)',
        titleColor: '#111827',
        subtitleColor: '#6b7280',
        textColor: '#374151',
    },
    note: {
        icon: AlertCircle,
        label: 'Note',
        bg: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        borderColor: '#e5e7eb',
        iconColor: '#64748b',
        iconBg: 'rgba(100, 116, 139, 0.12)',
        titleColor: '#111827',
        subtitleColor: '#6b7280',
        textColor: '#374151',
    },
};

/**
 * Alert Type Toolbar Button
 * Dropdown to select alert type in the toolbar
 */
function AlertTypeToolbar({ currentType, onChange }: {
    currentType: AlertType;
    onChange: (type: AlertType) => void;
}) {
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
            title: {
                default: '',
            },
        },
        content: 'inline',
    },
    {
        render: (props) => {
            const { block, editor, contentRef } = props;
            const alertType = (block.props.type || 'warning') as AlertType;
            const config = alertConfig[alertType] || alertConfig.warning;
            const Icon = config.icon;

            const { isSelected, selectBlock } = useBlockSelection(block.id);

            const handleTypeChange = (newType: AlertType) => {
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

            const {
                attributes: dragAttributes,
                listeners: dragListeners,
                setNodeRef: setDragNodeRef,
                transform: dragTransform,
                isDragging,
            } = useDraggable({ id: block.id });
            const dragHandleProps = { ...dragAttributes, ...dragListeners };
            const dragStyle = dragTransform ? { transform: CSS.Transform.toString(dragTransform) } : undefined;

            const toolbar = (
                <BlockToolbar
                    blockIcon={Icon}
                    blockLabel={`${config.label} alert`}
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
                    onDelete={() => editor.removeBlocks([block])}
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
                    ref={setDragNodeRef}
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    onFocus={selectBlock}
                    onPointerDownCapture={selectBlock}
                    blockType="alert"
                    blockId={block.id}
                    className="my-2"
                    style={{
                        ...dragStyle,
                        opacity: isDragging ? 0.5 : undefined,
                        pointerEvents: isDragging ? 'none' : undefined,
                    }}
                >
                    <div
                        style={{
                            background: config.bg,
                            border: `1px solid ${config.borderColor}`,
                            borderRadius: '16px',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                        data-alert-type={alertType}
                    >
                        {/* Header Area */}
                        <div style={{
                            padding: '24px 24px 20px 24px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '16px',
                            borderBottom: '1px solid var(--border)',
                        }}>
                            {/* Icon Badge */}
                            <div
                                style={{
                                    width: 44,
                                    height: 44,
                                    minWidth: 44,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: config.iconColor,
                                    borderRadius: '12px',
                                    color: 'white',
                                    boxShadow: `0 4px 12px ${config.iconColor}30`,
                                }}
                            >
                                <Icon className="w-[20px] h-[20px]" />
                            </div>

                            {/* Editable Title/Subtitle Area */}
                            <div className="flex-1 min-w-0 pt-[2px]">
                                {/* Editable Title */}
                                <input
                                    type="text"
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        fontSize: '18px',
                                        fontWeight: 700,
                                        marginBottom: '4px',
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        padding: 0,
                                        color: config.titleColor,
                                        letterSpacing: '-0.01em',
                                        lineHeight: 1.2,
                                    }}
                                    placeholder="Title | Subtitle (optional)"
                                    defaultValue={block.props.title || ''}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onPointerDownCapture={(e) => e.stopPropagation()}
                                    onClick={(e) => e.stopPropagation()}
                                    onFocus={(e) => e.stopPropagation()}
                                    onBlur={(e: FocusEvent<HTMLInputElement>) => {
                                        const newTitle = e.target.value.trim();
                                        if (newTitle !== (block.props.title || '')) {
                                            editor.updateBlock(block, {
                                                type: 'alert',
                                                props: { ...block.props, title: newTitle },
                                            });
                                        }
                                    }}
                                    onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                                        e.stopPropagation();
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                        }
                                    }}
                                />
                                <div style={{
                                    fontSize: '14px',
                                    color: config.subtitleColor,
                                    fontWeight: 400,
                                }}>
                                    {block.props.title?.includes('|') ? block.props.title.split('|')[1].trim() : config.label}
                                </div>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div style={{ padding: '24px' }}>
                            <div
                                ref={(node: AlertContentElement | null) => {
                                    // Attach BlockNote's contentRef
                                    if (typeof contentRef === 'function') {
                                        contentRef(node);
                                    } else if (contentRef && typeof contentRef === 'object') {
                                        (contentRef as MutableElementRef).current = node;
                                    }
                                    // Attach paste interceptor
                                    if (node && !node.__pasteHandlerAttached) {
                                        node.__pasteHandlerAttached = true;
                                        node.addEventListener('paste', (e) => {
                                            const text = e.clipboardData?.getData('text/plain');
                                            if (text && text.includes('\n')) {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                // Insert as plain text via the editor's underlying ProseMirror view
                                                let pmView = null;
                                                try {
                                                    pmView = editor._tiptapEditor?.view ?? null;
                                                } catch {
                                                    pmView = null;
                                                }
                                                if (pmView) {
                                                    const { state, dispatch } = pmView;
                                                    const tr = state.tr.insertText(text);
                                                    dispatch(tr);
                                                }
                                            }
                                        }, true);
                                    }
                                }}
                                className="prose prose-sm max-w-none focus:outline-none text-foreground"
                            />
                        </div>
                    </div>
                </BlockWrapper >
            );
        },
    }
);

export default Alert;

