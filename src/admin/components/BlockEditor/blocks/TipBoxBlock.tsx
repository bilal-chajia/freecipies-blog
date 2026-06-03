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
import type { FocusEvent, KeyboardEvent } from 'react';
import { useCallback, useRef } from 'react';
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
import { useCustomBlock } from './useCustomBlock';

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
        bg: 'var(--alert-tip-bg)',
        borderColor: 'var(--alert-tip-border)',
        iconColor: 'var(--alert-tip-icon-color)',
        iconBg: 'var(--alert-tip-icon-bg)',
        titleColor: 'var(--alert-tip-title)',
        subtitleColor: 'var(--alert-tip-subtitle)',
        textColor: 'var(--foreground)',
    },
    warning: {
        icon: AlertTriangle,
        label: 'Warning',
        bg: 'var(--alert-warning-bg)',
        borderColor: 'var(--alert-warning-border)',
        iconColor: 'var(--alert-warning-icon-color)',
        iconBg: 'var(--alert-warning-icon-bg)',
        titleColor: 'var(--alert-warning-title)',
        subtitleColor: 'var(--alert-warning-subtitle)',
        textColor: 'var(--foreground)',
    },
    info: {
        icon: Info,
        label: 'Info',
        bg: 'var(--alert-info-bg)',
        borderColor: 'var(--alert-info-border)',
        iconColor: 'var(--alert-info-icon-color)',
        iconBg: 'var(--alert-info-icon-bg)',
        titleColor: 'var(--alert-info-title)',
        subtitleColor: 'var(--alert-info-subtitle)',
        textColor: 'var(--foreground)',
    },
    note: {
        icon: AlertCircle,
        label: 'Note',
        bg: 'var(--alert-note-bg)',
        borderColor: 'var(--alert-note-border)',
        iconColor: 'var(--alert-note-icon-color)',
        iconBg: 'var(--alert-note-icon-bg)',
        titleColor: 'var(--alert-note-title)',
        subtitleColor: 'var(--alert-note-subtitle)',
        textColor: 'var(--foreground)',
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
                            <Icon className="w-4 h-4" style={{ color: config.iconColor }} />
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
                            <TypeIcon className="w-4 h-4" style={{ color: typeConfig.iconColor }} />
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
const Alert = createReactBlockSpec(
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

            const {
                isSelected, selectBlock,
                moveUp, moveDown, remove,
                dragHandleProps, setDragNodeRef, dragStyle, isDragging,
            } = useCustomBlock(block.id, editor, { onSelectRaf: true });
            const contentRefRef = useRef(contentRef);
            const editorRef = useRef(editor);

            contentRefRef.current = contentRef;
            editorRef.current = editor;

            const handleTypeChange = (newType: AlertType) => {
                editor.updateBlock(block, {
                    type: 'alert',
                    props: { ...block.props, type: newType },
                });
            };

            const setElementRef = useCallback((node: AlertContentElement | null) => {
                const latestContentRef = contentRefRef.current;
                if (typeof latestContentRef === 'function') {
                    latestContentRef(node);
                } else if (latestContentRef && typeof latestContentRef === 'object') {
                    (latestContentRef as MutableElementRef).current = node;
                }

                if (node && !node.__pasteHandlerAttached) {
                    node.__pasteHandlerAttached = true;
                    node.addEventListener('paste', (e) => {
                        const text = e.clipboardData?.getData('text/plain');
                        if (text && text.includes('\n')) {
                            e.preventDefault();
                            e.stopPropagation();
                            let pmView = null;
                            try {
                                pmView = editorRef.current._tiptapEditor?.view ?? null;
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
            }, []);

            const toolbar = (
                <BlockToolbar
                    blockIcon={Icon}
                    blockLabel={`${config.label} alert`}
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                    dragHandleProps={dragHandleProps}
                    onDelete={remove}
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
                    blockType="alert"
                    blockId={block.id}
                    className="my-2"
                    data-radius="lg"
                    style={{
                        ...dragStyle,
                        opacity: isDragging ? 0.5 : undefined,
                        pointerEvents: isDragging ? 'none' : undefined,
                    } as React.CSSProperties}
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
                                    id={`alert-title-${block.id}`}
                                    name={`alert-title-${block.id}`}
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
                                    aria-label="Alert box title"
                                    defaultValue={block.props.title || ''}
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

                            {/* Inline Variant Tab-Bar (Only when selected) */}
                            {isSelected && (
                                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/40 ml-4 animate-in fade-in zoom-in-95 duration-200">
                                    {alertTypes.map((type) => {
                                        const typeConfig = alertConfig[type];
                                        const isActive = alertType === type;
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => handleTypeChange(type)}
                                                className={cn(
                                                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap",
                                                    isActive 
                                                        ? "bg-background text-foreground shadow-sm scale-105 border border-border/10 font-bold" 
                                                        : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                                                )}
                                            >
                                                {typeConfig.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Content Area */}
                        <div style={{ padding: '24px' }}>
                            <div
                                ref={setElementRef}
                                className="prose prose-sm max-w-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 text-foreground"
                            />
                        </div>
                    </div>
                </BlockWrapper >
            );
        },
    }
);

export default Alert;
