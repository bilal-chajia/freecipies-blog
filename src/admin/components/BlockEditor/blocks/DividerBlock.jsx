/**
 * Custom Block: Divider
 * 
 * Simple horizontal rule with style options.
 */

import { createReactBlockSpec } from '@blocknote/react';

export const DividerBlock = createReactBlockSpec(
    {
        type: 'divider',
        propSchema: {
            style: {
                default: 'solid',
                values: ['solid', 'dashed', 'dotted', 'double'],
            },
            color: {
                default: 'gray',
            },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const getStyleClass = () => {
                switch (props.block.props.style) {
                    case 'dashed': return 'border-dashed';
                    case 'dotted': return 'border-dotted';
                    case 'double': return 'border-double border-t-4';
                    default: return 'border-solid';
                }
            };

            return (
                <div className="py-4 cursor-pointer group relative"
                    title="Click to change style">
                    <hr
                        className={`border-t-2 border-gray-200 w-full ${getStyleClass()}`}
                    />
                    {/* Style switcher visible on hover/select */}
                    <div className={`absolute -top-6 left-1/2 -translate-x-1/2 bg-popover border border-border shadow-sm rounded-md px-1 py-0.5 flex gap-1 ${props.editor.getTextCursorPosition().block.id === props.block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity z-10`}>
                        <select
                            value={props.block.props.style}
                            onChange={(e) => props.editor.updateBlock(props.block, { props: { ...props.block.props, style: e.target.value } })}
                            className="text-xs border-none bg-transparent h-6 focus:ring-0"
                        >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="double">Double</option>
                        </select>
                    </div>
                </div>
            );
        },
    }
);
