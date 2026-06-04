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
import type { LucideIcon } from 'lucide-react';
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
import BlockToolbar, { ToolbarButton, ToolbarSeparator } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useCustomBlock } from './useCustomBlock';

type VideoProvider = 'youtube' | 'vimeo';
type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

// Video provider extraction
function extractVideoId(url: string): { provider: VideoProvider; videoId: string } | null {
    if (!url) return null;

    // YouTube
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytMatch) return { provider: 'youtube', videoId: ytMatch[1] };

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) return { provider: 'vimeo', videoId: vimeoMatch[1] };

    return null;
}

function getEmbedUrl(provider: string, videoId: string): string | undefined {
    switch (provider) {
        case 'youtube':
            return `https://www.youtube.com/embed/${videoId}`;
        case 'vimeo':
            return `https://player.vimeo.com/video/${videoId}`;
        default:
            return undefined;
    }
}

// Aspect ratio options
const aspectRatios: Array<{ value: AspectRatio; label: string; icon: LucideIcon; class: string }> = [
    { value: '16:9', label: '16:9', icon: RectangleHorizontal, class: 'aspect-video' },
    { value: '4:3', label: '4:3', icon: RectangleHorizontal, class: 'aspect-[4/3]' },
    { value: '1:1', label: '1:1', icon: Square, class: 'aspect-square' },
    { value: '9:16', label: '9:16', icon: RectangleVertical, class: 'aspect-[9/16] max-w-sm mx-auto' },
];

/**
 * Aspect Ratio Toolbar
 */
function AspectRatioToolbar({ current, onChange }: {
    current: AspectRatio;
    onChange: (ratio: AspectRatio) => void;
}) {
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

const VideoBlock = createReactBlockSpec(
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
            const [inputUrl, setInputUrl] = useState<string>(block.props.url);
            const hasVideo = block.props.provider && block.props.videoId;
            const {
                isSelected, selectBlock,
                moveUp: moveBlockUp,
                moveDown: moveBlockDown,
                remove: removeBlock,
                dragHandleProps,
                setDragNodeRef,
                dragStyle,
                isDragging,
            } = useCustomBlock(block.id, editor);

            const handleUrlChange = (url: string) => {
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

            const handleAspectChange = (ratio: AspectRatio) => {
                editor.updateBlock(block, {
                    type: 'video',
                    props: { ...block.props, aspectRatio: ratio },
                });
            };

            const toolbar = (
                <BlockToolbar
                    blockIcon={Video}
                    blockLabel="Video"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
                    onDelete={removeBlock}
                    showMoreMenu={false}
                >
                    <AspectRatioToolbar
                        current={block.props.aspectRatio as AspectRatio}
                        onChange={handleAspectChange}
                    />
                    <ToolbarSeparator />
                    <ToolbarButton
                        icon={X}
                        label="Remove video"
                        onClick={handleRemove}
                        className="text-destructive"
                    />
                </BlockToolbar>
            );

            // Placeholder state - no video
            if (!hasVideo) {
                return (
                    <BlockWrapper
                        ref={setDragNodeRef}
                        isSelected={isSelected}
                        toolbar={toolbar}
                        onClick={selectBlock}
                        blockType="video"
                        blockId={block.id}
                        className="my-2"
                        data-radius="lg"
                        style={{
                            ...dragStyle,
                            opacity: isDragging ? 0.5 : undefined,
                            pointerEvents: isDragging ? 'none' : undefined,
                        } as React.CSSProperties}
                    >
                        <EmbedPlaceholder
                            icon={Video}
                            label="Video"
                            instructions="Paste a YouTube or Vimeo URL"
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={inputUrl}
                            onChange={handleUrlChange}
                            onEmbed={handleEmbed}
                        />
                    </BlockWrapper>
                );
            }

            // Video preview state
            const embedUrl = getEmbedUrl(block.props.provider, block.props.videoId);
            const aspectConfig = aspectRatios.find(r => r.value === block.props.aspectRatio) || aspectRatios[0];

            return (
                <BlockWrapper
                    ref={setDragNodeRef}
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    blockType="video"
                    blockId={block.id}
                    className="my-2"
                    data-radius="lg"
                    style={{
                        ...dragStyle,
                        opacity: isDragging ? 0.5 : undefined,
                        pointerEvents: isDragging ? 'none' : undefined,
                    } as React.CSSProperties}
                >
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
                            loading="lazy"
                            title="Video embed"
                        />
                    </div>

                    {/* Provider badge and Inline Aspect Ratio Switcher */}
                    <div className="flex items-center justify-between mt-2 px-1 animate-in fade-in zoom-in-95 duration-200">
                        <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-0.5 rounded border border-border/40 font-medium">
                            {block.props.provider} embed
                        </span>

                        {isSelected && (
                            <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/40">
                                {aspectRatios.map((ratio) => {
                                    const is_active = block.props.aspectRatio === ratio.value;
                                    return (
                                        <button
                                            key={ratio.value}
                                            type="button"
                                            onClick={() => handleAspectChange(ratio.value)}
                                            className={cn(
                                                "px-2.5 py-0.5 text-[10px] font-semibold rounded-md transition-all duration-200 cursor-pointer",
                                                is_active
                                                    ? "bg-background text-foreground shadow-sm border border-border/10 font-bold scale-105"
                                                    : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                                            )}
                                        >
                                            {ratio.label}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </BlockWrapper>
            );
        },
    }
);

export default VideoBlock;


