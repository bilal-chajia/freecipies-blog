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
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import BlockToolbar from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockSelection } from '../selection-context';

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
            const { isSelected, selectBlock } = useBlockSelection(block.id);

            const handleStyleChange = (newStyle) => {
                editor.updateBlock(block, {
                    type: 'divider',
                    props: { ...block.props, style: newStyle },
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
                    blockIcon={Minus}
                    blockLabel="Divider"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
                    showMoreMenu={false}
                >
                    <DividerStyleToolbar
                        currentStyle={style}
                        onChange={handleStyleChange}
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
                    blockType="divider"
                    blockId={block.id}
                    className="py-4"
                    style={{
                        ...dragStyle,
                        opacity: isDragging ? 0.5 : undefined,
                        pointerEvents: isDragging ? 'none' : undefined,
                    }}
                >
                    {/* Divider line */}
                    <div className="flex items-center w-full h-4" data-divider-style={style}>
                        <hr
                            className="w-full border-0 m-0"
                            style={{
                                borderTopWidth: style === 'double' ? '4px' : '2px',
                                borderTopStyle: style,
                                borderTopColor: 'var(--wp-toolbar-separator-color)',
                            }}
                        />
                    </div>
                </BlockWrapper>
            );
        },
    }
);

export default DividerBlock;




