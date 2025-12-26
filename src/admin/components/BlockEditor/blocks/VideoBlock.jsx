/**
 * Custom Block: Video Embed
 * 
 * Embed YouTube, Vimeo, or other video providers.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { Video } from 'lucide-react';
import { useState } from 'react';

function extractVideoId(url) {
    if (!url) return null;

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return { provider: 'youtube', videoId: ytMatch[1] };

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return { provider: 'vimeo', videoId: vimeoMatch[1] };

    return null;
}

function getEmbedUrl(provider, videoId) {
    switch (provider) {
        case 'youtube':
            return `https://www.youtube.com/embed/${videoId}`;
        case 'vimeo':
            return `https://player.vimeo.com/video/${videoId}`;
        default:
            return null;
    }
}

export const VideoBlock = createReactBlockSpec(
    {
        type: 'video',
        propSchema: {
            url: {
                default: '',
            },
            provider: {
                default: '',
            },
            videoId: {
                default: '',
            },
            aspectRatio: {
                default: '16:9',
                values: ['16:9', '4:3', '1:1'],
            },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const [inputUrl, setInputUrl] = useState(props.block.props.url);
            const hasVideo = props.block.props.provider && props.block.props.videoId;

            const handleUrlChange = (url) => {
                setInputUrl(url);
                const extracted = extractVideoId(url);
                if (extracted) {
                    props.editor.updateBlock(props.block, {
                        type: 'video',
                        props: {
                            ...props.block.props,
                            url,
                            provider: extracted.provider,
                            videoId: extracted.videoId,
                        },
                    });
                }
            };

            if (!hasVideo) {
                return (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 my-2">
                        <div className="flex flex-col items-center gap-3">
                            <Video className="w-8 h-8 text-gray-400" />
                            <p className="text-sm text-gray-500">Paste a YouTube or Vimeo URL</p>
                            <input
                                type="text"
                                value={inputUrl}
                                onChange={(e) => handleUrlChange(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full max-w-md px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>
                );
            }

            const embedUrl = getEmbedUrl(props.block.props.provider, props.block.props.videoId);
            const aspectClass = props.block.props.aspectRatio === '16:9' ? 'aspect-video' :
                props.block.props.aspectRatio === '4:3' ? 'aspect-[4/3]' : 'aspect-square';

            return (
                <div className="my-2">
                    <div className={`relative w-full ${aspectClass} rounded-lg overflow-hidden bg-black`}>
                        <iframe
                            src={embedUrl}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Video embed"
                        />
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500 capitalize">{props.block.props.provider}</span>
                        <button
                            onClick={() => {
                                props.editor.updateBlock(props.block, {
                                    type: 'video',
                                    props: { ...props.block.props, url: '', provider: '', videoId: '' },
                                });
                                setInputUrl('');
                            }}
                            className="text-xs text-red-500 hover:underline"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            );
        },
    }
);
