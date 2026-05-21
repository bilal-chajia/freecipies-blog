/**
 * Custom Block: Before/After
 *
 * Compare two images with slider or side-by-side layout.
 * 
 * REFACTORED for WordPress Block Editor design:
 * - Proper selected/unselected visual states
 * - Block toolbar with layout toggle
 * - Clean visual styling with theme support
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
    Image as ImageIcon,
    Trash2,
    SplitSquareHorizontal,
    GalleryHorizontal
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parseVariantsJson, getVariantMap, getBestVariantUrl } from '@shared/types/images';
import { Button } from '@/ui/button';
import { MediaDialog } from '@admin/features/media/components';
import BlockToolbar, { ToolbarButton } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockSelection } from '../selection-context';
import { useBlockEditorSourceData } from '../source-data-context';

type ImageSlotKey = 'before' | 'after';

type BeforeAfterSlot = {
    media_id?: number | string;
    alt?: string;
    label?: string;
    variants?: unknown;
};

type MediaDialogItem = {
    id: number | string;
    altText?: string | null;
    alt_text?: string | null;
    name?: string | null;
};

type BeforeAfterUpdates = {
    layout?: 'slider' | 'side_by_side';
    beforeImageRef?: string;
    afterImageRef?: string;
    beforeJson?: string;
    afterJson?: string;
};

function parseImagesData(value: unknown): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value !== 'string') return {};
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed as Record<string, unknown>
            : {};
    } catch {
        return {};
    }
}

function upsertContentImageSlot(
    imagesData: unknown,
    imageRef: string,
    slot: Record<string, unknown>
): Record<string, unknown> {
    const images = parseImagesData(imagesData);
    const contentImages = parseImagesData(images.content_images);
    return {
        ...images,
        content_images: {
            ...contentImages,
            [imageRef]: slot,
        },
    };
}

const parseSlot = (value: string): BeforeAfterSlot | null => {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
};

const toJson = (value: BeforeAfterSlot | null) => JSON.stringify(value || null);

// Layout options
const layouts: Array<{ value: NonNullable<BeforeAfterUpdates['layout']>; icon: LucideIcon; label: string }> = [
    { value: 'slider', icon: SplitSquareHorizontal, label: 'Slider' },
    { value: 'side_by_side', icon: GalleryHorizontal, label: 'Side by side' },
];

export const BeforeAfterBlock = createReactBlockSpec(
    {
        type: 'beforeAfter',
        propSchema: {
            layout: { default: 'slider', values: ['slider', 'side_by_side'] },
            beforeImageRef: { default: '' },
            afterImageRef: { default: '' },
            beforeJson: { default: '' },
            afterJson: { default: '' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const { imagesData, onImagesChange } = useBlockEditorSourceData();
            const before = useMemo(() => parseSlot(block.props.beforeJson), [block.props.beforeJson]);
            const after = useMemo(() => parseSlot(block.props.afterJson), [block.props.afterJson]);
            const { isSelected, selectBlock } = useBlockSelection(block.id);
            const [activeSlot, setActiveSlot] = useState<ImageSlotKey | null>(null);
            const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

            const updateBlockProps = (updates: BeforeAfterUpdates) => {
                editor.updateBlock(block, {
                    type: 'beforeAfter',
                    props: { ...block.props, ...updates },
                });
            };

            const updateSlot = (slotKey: ImageSlotKey, nextSlot: BeforeAfterSlot | null) => {
                updateBlockProps({ [`${slotKey}Json`]: toJson(nextSlot) });
            };

            const resolvePreview = (slot: BeforeAfterSlot | null) => {
                if (!slot?.variants) return '';
                return getBestVariantUrl(slot as Parameters<typeof getBestVariantUrl>[0]) || '';
            };

            const handleSelect = (item: MediaDialogItem) => {
                if (!activeSlot) return;
                const parsed = parseVariantsJson(item as Parameters<typeof parseVariantsJson>[0]);
                const variants = getVariantMap(parsed);
                const existing = activeSlot === 'before' ? before : after;
                const refProp = activeSlot === 'before' ? block.props.beforeImageRef : block.props.afterImageRef;
                const imageRef = typeof refProp === 'string' && refProp
                    ? refProp
                    : `${activeSlot}-image-${item.id || block.id}`;
                const nextSlot = {
                    media_id: item.id,
                    alt: existing?.alt || item.altText || item.alt_text || item.name || '',
                    label: existing?.label || (activeSlot === 'before' ? 'Before' : 'After'),
                    variants,
                };
                onImagesChange?.(upsertContentImageSlot(imagesData, imageRef, nextSlot));
                updateBlockProps({
                    [`${activeSlot}ImageRef`]: imageRef,
                    [`${activeSlot}Json`]: toJson(nextSlot),
                } as BeforeAfterUpdates);
                setMediaDialogOpen(false);
                setActiveSlot(null);
            };

            const renderSlot = (slotKey: ImageSlotKey, slotData: BeforeAfterSlot | null) => {
                const preview = resolvePreview(slotData);
                const label = slotData?.label || (slotKey === 'before' ? 'Before' : 'After');

                return (
                    <div className="space-y-2">
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {label}
                        </div>
                        <div className={cn(
                            'border rounded-lg p-3 bg-muted/30 space-y-2',
                            'transition-colors',
                            isSelected && 'border-border'
                        )}>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{slotData?.media_id ? `Media #${slotData.media_id}` : 'No image selected'}</span>
                                {slotData?.media_id && isSelected && (
                                    <button
                                        type="button"
                                        onClick={() => updateSlot(slotKey, null)}
                                        className="inline-flex items-center gap-1 text-destructive hover:underline"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Remove
                                    </button>
                                )}
                            </div>
                            <div className={cn(
                                'w-full h-40 rounded-md overflow-hidden',
                                'bg-background border border-dashed border-border',
                                'flex items-center justify-center'
                            )}>
                                {preview ? (
                                    <img src={preview} alt={slotData?.alt || ''} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-xs text-muted-foreground">
                                        <ImageIcon className="w-5 h-5 mb-1" />
                                        Select image
                                    </div>
                                )}
                            </div>
                            {isSelected && (
                                <>
                                    <div className="flex items-center justify-center">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => {
                                                setActiveSlot(slotKey);
                                                setMediaDialogOpen(true);
                                            }}
                                            className="gap-1 text-xs"
                                        >
                                            <ImageIcon className="w-3 h-3" />
                                            Choose image
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        <input
                                            type="text"
                                            value={slotData?.alt || ''}
                                            onChange={(e) => updateSlot(slotKey, { ...slotData, alt: e.target.value })}
                                            placeholder="Alt text"
                                            className={cn(
                                                'w-full px-2 py-1 text-xs',
                                                'bg-background border border-input rounded-md',
                                                'focus:outline-none focus:ring-2 focus:ring-ring'
                                            )}
                                        />
                                        <input
                                            type="text"
                                            value={slotData?.label || ''}
                                            onChange={(e) => updateSlot(slotKey, { ...slotData, label: e.target.value })}
                                            placeholder="Label (optional)"
                                            className={cn(
                                                'w-full px-2 py-1 text-xs',
                                                'bg-background border border-input rounded-md',
                                                'focus:outline-none focus:ring-2 focus:ring-ring'
                                            )}
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                );
            };

            const currentLayout = layouts.find(l => l.value === block.props.layout) || layouts[0];

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
            } = useDraggable({ id: block.id, disabled: mediaDialogOpen });
            const dragHandleProps = { ...dragAttributes, ...dragListeners };
            const dragStyle = dragTransform ? { transform: CSS.Transform.toString(dragTransform) } : undefined;

            const toolbar = (
                <BlockToolbar
                    blockIcon={SplitSquareHorizontal}
                    blockLabel="Before / After"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
                    onDelete={() => editor.removeBlocks([block])}
                    showMoreMenu={false}
                >
                    {layouts.map((layout) => (
                        <ToolbarButton
                            key={layout.value}
                            icon={layout.icon}
                            label={layout.label}
                            isActive={block.props.layout === layout.value}
                            onClick={() => updateBlockProps({ layout: layout.value })}
                        />
                    ))}
                </BlockToolbar>
            );

            return (
                <>
                    <BlockWrapper
                        ref={setDragNodeRef}
                        isSelected={isSelected}
                        toolbar={toolbar}
                        onClick={selectBlock}
                        onFocus={selectBlock}
                        onPointerDownCapture={selectBlock}
                        blockType="before-after"
                        blockId={block.id}
                        className="my-2"
                        style={{
                            ...dragStyle,
                            opacity: isDragging ? 0.5 : undefined,
                            pointerEvents: isDragging ? 'none' : undefined,
                        }}
                    >
                        <div className="border rounded-lg p-4 bg-card shadow-sm space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <SplitSquareHorizontal className="w-4 h-4 text-muted-foreground" />
                                    <h4 className="text-sm font-medium">Before / After</h4>
                                </div>
                                {!isSelected && (
                                    <span className="text-xs text-muted-foreground capitalize">
                                        {currentLayout.label}
                                    </span>
                                )}
                            </div>

                            {/* Slots */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {renderSlot('before', before)}
                                {renderSlot('after', after)}
                            </div>
                        </div>
                    </BlockWrapper>

                    <MediaDialog
                        open={mediaDialogOpen}
                        onOpenChange={setMediaDialogOpen}
                        onSelect={handleSelect}
                    />
                </>
            );
        },
    }
);

export default BeforeAfterBlock;
