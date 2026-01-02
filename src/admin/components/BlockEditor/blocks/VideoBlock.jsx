/**
 * Custom Block: Video Embed
 * 
 * Embed YouTube, Vimeo, or other video providers.
 * 
 * REFACTORED for WordPress Block Editor design:
 * - URL input in placeholder state with proper styling
 * - Aspect ratio controls in toolbar
 * - Proper selected/unselected states
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { createReactBlockSpec } from '@blocknote/react';
import { Video, X, RectangleHorizontal, Square, RectangleVertical } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { EmbedPlaceholder } from '../components/BlockPlaceholder';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

// Video provider extraction
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

// Aspect ratio options
const aspectRatios = [
    { value: '16:9', label: '16:9', icon: RectangleHorizontal, class: 'aspect-video' },
    { value: '4:3', label: '4:3', icon: RectangleHorizontal, class: 'aspect-[4/3]' },
    { value: '1:1', label: '1:1', icon: Square, class: 'aspect-square' },
    { value: '9:16', label: '9:16', icon: RectangleVertical, class: 'aspect-[9/16] max-w-sm mx-auto' },
];

/**
 * Aspect Ratio Toolbar
 */
function AspectRatioToolbar({ current, onChange }) {
    const currentRatio = aspectRatios.find(r => r.value === current) || aspectRatios[0];
    const Icon = currentRatio.icon;

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            aria-label={`Aspect ratio: ${currentRatio.label}`}
                            className={cn(
                                'flex items-center justify-center gap-1.5',
                                'h-[var(--wp-toolbar-button-size)] px-2',
                                'bg-transparent border-none rounded-sm cursor-pointer',
                                'hover:bg-[var(--wp-toolbar-button-hover-bg)]',
                                'transition-colors'
                            )}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="text-xs">{currentRatio.label}</span>
                        </button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                    Aspect ratio
                </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="w-28">
                {aspectRatios.map((ratio) => (
                    <DropdownMenuItem
                        key={ratio.value}
                        onClick={() => onChange(ratio.value)}
                        className={cn(
                            'gap-2',
                            current === ratio.value && 'bg-accent'
                        )}
                    >
                        <ratio.icon className="w-4 h-4" />
                        {ratio.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export const VideoBlock = createReactBlockSpec(
    {
        type: 'video',
        propSchema: {
            url: { default: '' },
            provider: { default: '' },
            videoId: { default: '' },
            aspectRatio: {
                default: '16:9',
                values: ['16:9', '4:3', '1:1', '9:16'],
            },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const [inputUrl, setInputUrl] = useState(block.props.url);
            const [isSelected, setIsSelected] = useState(false);
            const hasVideo = block.props.provider && block.props.videoId;

            const handleUrlChange = (url) => {
                setInputUrl(url);
            };

            const handleEmbed = () => {
                const extracted = extractVideoId(inputUrl);
                if (extracted) {
                    editor.updateBlock(block, {
                        type: 'video',
                        props: {
                            ...block.props,
                            url: inputUrl,
                            provider: extracted.provider,
                            videoId: extracted.videoId,
                        },
                    });
                }
            };

            const handleRemove = () => {
                editor.updateBlock(block, {
                    type: 'video',
                    props: { ...block.props, url: '', provider: '', videoId: '' },
                });
                setInputUrl('');
            };

            const handleAspectChange = (ratio) => {
                editor.updateBlock(block, {
                    type: 'video',
                    props: { ...block.props, aspectRatio: ratio },
                });
            };

            // Placeholder state - no video
            if (!hasVideo) {
                return (
                    <EmbedPlaceholder
                        icon={Video}
                        label="Video"
                        instructions="Paste a YouTube or Vimeo URL"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={inputUrl}
                        onChange={handleUrlChange}
                        onEmbed={handleEmbed}
                    />
                );
            }

            // Video preview state
            const embedUrl = getEmbedUrl(block.props.provider, block.props.videoId);
            const aspectConfig = aspectRatios.find(r => r.value === block.props.aspectRatio) || aspectRatios[0];

            return (
                <div
                    className={cn(
                        'wp-block',
                        isSelected && 'is-selected',
                        'relative my-2',
                        'transition-shadow duration-[var(--wp-transition-duration)]',
                        !isSelected && 'hover:shadow-[0_0_0_1px_var(--wp-block-border-hover)]',
                        isSelected && 'shadow-[0_0_0_2px_var(--wp-block-border-selected)]',
                        'rounded-lg'
                    )}
                    data-block-type="video"
                    tabIndex={0}
                    onFocus={() => setIsSelected(true)}
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            setIsSelected(false);
                        }
                    }}
                >
                    {/* Toolbar */}
                    {isSelected && (
                        <div
                            className={cn(
                                'absolute -top-[44px] left-0',
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
                                <Video className="w-4 h-4" />
                            </div>

                            <div className="w-px h-5 mx-1 bg-[var(--wp-toolbar-separator-color)]" />

                            {/* Aspect ratio */}
                            <AspectRatioToolbar
                                current={block.props.aspectRatio}
                                onChange={handleAspectChange}
                            />

                            <div className="w-px h-5 mx-1 bg-[var(--wp-toolbar-separator-color)]" />

                            {/* Remove button */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        onClick={handleRemove}
                                        className={cn(
                                            'flex items-center justify-center',
                                            'w-[var(--wp-toolbar-button-size)] h-[var(--wp-toolbar-button-size)]',
                                            'bg-transparent border-none rounded-sm cursor-pointer',
                                            'text-destructive hover:bg-destructive/10'
                                        )}
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    Remove video
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )}

                    {/* Video embed */}
                    <div className={cn(
                        'relative w-full rounded-lg overflow-hidden bg-black',
                        aspectConfig.class
                    )}>
                        <iframe
                            src={embedUrl}
                            className="absolute inset-0 w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Video embed"
                        />
                    </div>

                    {/* Provider badge */}
                    <div className="flex items-center gap-2 mt-2 px-1">
                        <span className="text-xs text-muted-foreground capitalize">
                            {block.props.provider}
                        </span>
                    </div>
                </div>
            );
        },
    }
);

export default VideoBlock;
