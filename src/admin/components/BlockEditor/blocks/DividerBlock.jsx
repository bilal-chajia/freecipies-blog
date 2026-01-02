/**
 * Custom Block: Divider
 * 
 * Simple horizontal rule with style options.
 * 
 * REFACTORED for WordPress Block Editor design:
 * - Style selector moved from inline <select> to BlockToolbar
 * - Proper selected/unselected states
 * - Clean minimal design
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { useState } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

// Divider style definitions
const dividerStyles = [
    { value: 'solid', label: 'Solid', borderStyle: 'solid' },
    { value: 'dashed', label: 'Dashed', borderStyle: 'dashed' },
    { value: 'dotted', label: 'Dotted', borderStyle: 'dotted' },
    { value: 'double', label: 'Double', borderStyle: 'double' },
];

/**
 * Style Selector Toolbar
 */
function DividerStyleToolbar({ currentStyle, onChange }) {
    const styleConfig = dividerStyles.find(s => s.value === currentStyle) || dividerStyles[0];

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`Divider style: ${styleConfig.label}. Click to change.`}
                            className={cn(
                                'flex items-center justify-center gap-1.5',
                                'h-[var(--wp-toolbar-button-size)] px-2',
                                'bg-transparent border-none rounded-sm cursor-pointer',
                                'hover:bg-[var(--wp-toolbar-button-hover-bg)]',
                                'transition-colors duration-[var(--wp-transition-duration)]'
                            )}
                        >
                            {/* Mini preview of current style */}
                            <div
                                className="w-6 border-t-2"
                                style={{ borderStyle: styleConfig.borderStyle }}
                            />
                            <span className="text-xs font-medium">{styleConfig.label}</span>
                        </button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    Change divider style
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-32">
                {dividerStyles.map((style) => (
                    <DropdownMenuItem
                        key={style.value}
                        onClick={() => onChange(style.value)}
                        className={cn(
                            'gap-2',
                            currentStyle === style.value && 'bg-accent'
                        )}
                    >
                        <div
                            className="w-6 border-t-2 border-foreground"
                            style={{ borderStyle: style.borderStyle }}
                        />
                        {style.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export const DividerBlock = createReactBlockSpec(
    {
        type: 'divider',
        propSchema: {
            style: {
                default: 'solid',
                values: ['solid', 'dashed', 'dotted', 'double'],
            },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const style = block.props.style || 'solid';
            const [isSelected, setIsSelected] = useState(false);

            const handleStyleChange = (newStyle) => {
                editor.updateBlock(block, {
                    type: 'divider',
                    props: { ...block.props, style: newStyle },
                });
            };

            return (
                <div
                    className={cn(
                        // WordPress block classes
                        'wp-block',
                        isSelected && 'is-selected',

                        // Divider wrapper
                        'relative py-4 cursor-pointer',

                        // Selection states
                        'transition-shadow duration-[var(--wp-transition-duration)]',
                        'rounded-sm',
                        !isSelected && 'hover:shadow-[0_0_0_1px_var(--wp-block-border-hover)]',
                        isSelected && 'shadow-[0_0_0_2px_var(--wp-block-border-selected)]'
                    )}
                    data-block-type="divider"
                    data-divider-style={style}
                    tabIndex={0}
                    onFocus={() => setIsSelected(true)}
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            setIsSelected(false);
                        }
                    }}
                    onClick={() => setIsSelected(true)}
                >
                    {/* Toolbar - shown when selected */}
                    {isSelected && (
                        <div
                            className={cn(
                                'absolute -top-[44px] left-1/2 -translate-x-1/2',
                                'flex items-center h-10 px-1',
                                'bg-[var(--wp-toolbar-bg)] border border-[var(--wp-toolbar-border)]',
                                'rounded-[var(--wp-toolbar-border-radius)]',
                                'shadow-[var(--wp-toolbar-shadow)]',
                                'z-[var(--wp-z-block-toolbar)]'
                            )}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Block type icon */}
                            <div className="flex items-center px-1.5 text-muted-foreground">
                                <Minus className="w-4 h-4" />
                            </div>

                            {/* Separator */}
                            <div className="w-px h-5 mx-1 bg-[var(--wp-toolbar-separator-color)]" />

                            {/* Style selector */}
                            <DividerStyleToolbar
                                currentStyle={style}
                                onChange={handleStyleChange}
                            />
                        </div>
                    )}

                    {/* Divider line */}
                    <div className="flex items-center w-full h-4">
                        <hr
                            className="w-full border-0 m-0"
                            style={{
                                borderTopWidth: style === 'double' ? '4px' : '2px',
                                borderTopStyle: style,
                                borderTopColor: 'var(--wp-toolbar-separator-color)',
                            }}
                        />
                    </div>
                </div>
            );
        },
    }
);

export default DividerBlock;
