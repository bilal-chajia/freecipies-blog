/**
 * Custom Block: Image
 * 
 * Image block with URL input, caption, and resize options.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { defaultProps } from '@blocknote/core';
import { Image as ImageIcon } from 'lucide-react';
import { useState } from 'react';

export const ImageBlock = createReactBlockSpec(
    {
        type: 'customImage',
        propSchema: {
            url: { default: '' },
            caption: { default: '' },
            alt: { default: '' },
            width: { default: 512 },
            mediaId: { default: '' },
            size: { default: 'full', values: ['small', 'medium', 'full'] },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const [inputUrl, setInputUrl] = useState(props.block.props.url);

            // Simple handler for external link pasting
            const handleUrlSubmit = () => {
                if (inputUrl) {
                    props.editor.updateBlock(props.block, {
                        type: 'customImage',
                        props: { ...props.block.props, url: inputUrl },
                    });
                }
            };

            if (!props.block.props.url) {
                return (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 my-2 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="flex flex-col items-center gap-3">
                            <ImageIcon className="w-8 h-8 text-gray-400" />
                            <p className="text-sm text-gray-500">Click to upload or paste image URL</p>
                            <div className="flex w-full max-w-sm gap-2">
                                <input
                                    type="text"
                                    value={inputUrl}
                                    onChange={(e) => setInputUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="flex-1 px-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleUrlSubmit();
                                    }}
                                    className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    </div>
                );
            }

            return (
                <div className="my-4 group relative">
                    <div className="relative">
                        <img
                            src={props.block.props.url}
                            alt={props.block.props.alt}
                            className="w-full h-auto rounded-lg border border-gray-200"
                            style={{ maxWidth: props.block.props.size === 'small' ? '300px' : props.block.props.size === 'medium' ? '500px' : '100%' }}
                        />
                        {/* Overlay controls - only visible on hover/select */}
                        <div className={`absolute top-2 right-2 flex gap-1 ${props.editor.getTextCursorPosition().block.id === props.block.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity bg-black/50 p-1 rounded backdrop-blur-sm`}>
                            <select
                                value={props.block.props.size}
                                onChange={(e) => props.editor.updateBlock(props.block, { props: { ...props.block.props, size: e.target.value } })}
                                className="text-xs bg-transparent text-white border-none focus:ring-0 cursor-pointer"
                            >
                                <option value="full" className="text-black">Full</option>
                                <option value="medium" className="text-black">Medium</option>
                                <option value="small" className="text-black">Small</option>
                            </select>
                            <button
                                onClick={() => props.editor.updateBlock(props.block, { props: { ...props.block.props, url: '' } })}
                                className="text-xs text-white hover:text-red-300 px-1"
                            >
                                Change
                            </button>
                        </div>
                    </div>
                    <input
                        type="text"
                        value={props.block.props.caption}
                        onChange={(e) => props.editor.updateBlock(props.block, { props: { ...props.block.props, caption: e.target.value } })}
                        placeholder="Write a caption..."
                        className="w-full mt-2 text-center text-sm text-gray-500 bg-transparent border-none focus:ring-0 placeholder:text-gray-300"
                    />
                </div>
            );
        },
    }
);
