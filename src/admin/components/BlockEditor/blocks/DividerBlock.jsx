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
            const style = props.block.props.style;
            const isActive = props.editor.getTextCursorPosition().block.id === props.block.id;

            return (
                <div
                    className="py-4 cursor-pointer group relative"
                    title="Click to change style"
                >
                    {/* Style switcher visible on hover/select */}
                    <div
                        className={`absolute -top-1 left-0 bg-popover border border-border shadow-sm rounded-md px-1 py-0.5 flex gap-1 transition-opacity z-10 ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto'}`}
                    >
                        <select
                            value={style}
                            onChange={(e) => props.editor.updateBlock(props.block, { props: { ...props.block.props, style: e.target.value } })}
                            value={style}
                            className="text-xs border-none bg-transparent h-6 focus:ring-0 cursor-pointer"
                        >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                            <option value="double">Double</option>
                        </select>
                    </div>

                    <div className="flex items-center w-full h-4">
                        <hr
                            className="w-full border-0 m-0"
                            style={{
                                borderTopWidth: style === 'double' ? '4px' : '2px',
                                borderTopStyle: style,
                                borderTopColor: '#9ca3af' // gray-400 for better visibility
                            }}
                        />
                    </div>
                </div>
            );
        },
    }
);
