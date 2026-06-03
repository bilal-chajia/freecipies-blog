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
import { useMemo, useState, useEffect } from 'react';
import {
    SplitSquareHorizontal,
    GalleryHorizontal
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { parseVariantsJson, getVariantMap } from '@shared/types/images';
import { MediaDialog } from '@admin/features/media/components';
import BlockToolbar, { ToolbarButton } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockEditorSourceData } from '../source-data-context';
import { useCustomBlock } from './useCustomBlock';
import { upsertContentImageSlot, patchContentImageSlot, removeContentImageSlot } from './shared/content-image-slots';
import ImageSlotEditor from './before-after/ImageSlotEditor';
import type { ImageSlotKey, BeforeAfterSlot, MediaDialogItem, BeforeAfterUpdates } from './before-after/BeforeAfterBlock.types';
import { BEFORE_AFTER_OPEN_MEDIA_EVENT } from './shared/before-after-events';
import type { BeforeAfterOpenEvent } from './shared/before-after-events';

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
            beforeLabel: { default: '' },
            afterLabel: { default: '' },
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
            const [activeSlot, setActiveSlot] = useState<ImageSlotKey | null>(null);
            const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
            const {
                isSelected, selectBlock,
                moveUp, moveDown, remove,
                dragHandleProps, setDragNodeRef, dragStyle, isDragging,
            } = useCustomBlock(block.id, editor, { onSelectRaf: true, dragDisabled: mediaDialogOpen });

            const updateBlockProps = (updates: BeforeAfterUpdates) => {
                editor.updateBlock(block, {
                    type: 'beforeAfter',
                    props: { ...block.props, ...updates },
                });
            };

            const updateSlot = (slotKey: ImageSlotKey, nextSlot: BeforeAfterSlot | null) => {
                const refProp = slotKey === 'before' ? block.props.beforeImageRef : block.props.afterImageRef;
                const ref = typeof refProp === 'string' ? refProp : '';

                if (!nextSlot) {
                    // Removal: clear the render mirror + canonical slot, but KEEP the image
                    // ref so fromEditor still serializes the block (it requires both refs).
                    // The slot resolves empty -> "Select image" placeholder, no resurrection.
                    updateBlockProps({ [`${slotKey}Json`]: '' } as BeforeAfterUpdates);
                    if (ref && onImagesChange) onImagesChange(removeContentImageSlot(imagesData, ref));
                    return;
                }

                // Render mirror (beforeJson/afterJson) + canonical label (-> content_json via fromEditor).
                updateBlockProps({
                    [`${slotKey}Json`]: toJson(nextSlot),
                    [`${slotKey}Label`]: nextSlot.label ?? '',
                } as BeforeAfterUpdates);

                // Canonical alt/label live in images_json.content_images[ref] (single source of truth, P6).
                if (ref && onImagesChange) {
                    const patched = patchContentImageSlot(imagesData, ref, {
                        alt: nextSlot.alt ?? '',
                        label: nextSlot.label ?? '',
                    });
                    if (patched) onImagesChange(patched);
                }
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
                    [`${activeSlot}Label`]: nextSlot.label,
                    [`${activeSlot}Json`]: toJson(nextSlot),
                } as BeforeAfterUpdates);
                setMediaDialogOpen(false);
                setActiveSlot(null);
            };

            const handleChooseImage = (slotKey: ImageSlotKey) => {
                setActiveSlot(slotKey);
                setMediaDialogOpen(true);
            };

            useEffect(() => {
                const onOpenMedia = (e: Event) => {
                    const event = e as BeforeAfterOpenEvent;
                    if (event.detail?.blockId === block.id && event.detail.slotKey) {
                        handleChooseImage(event.detail.slotKey);
                    }
                };
                document.addEventListener(BEFORE_AFTER_OPEN_MEDIA_EVENT, onOpenMedia);
                return () => {
                    document.removeEventListener(BEFORE_AFTER_OPEN_MEDIA_EVENT, onOpenMedia);
                };
            }, [block.id]);

            const currentLayout = layouts.find(l => l.value === block.props.layout) || layouts[0];

            const toolbar = (
                <BlockToolbar
                    blockIcon={SplitSquareHorizontal}
                    blockLabel="Before / After"
                    onMoveUp={moveUp}
                    onMoveDown={moveDown}
                    dragHandleProps={dragHandleProps}
                    onDelete={remove}
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
                        blockType="before-after"
                        blockId={block.id}
                        className="my-2"
                        data-radius="lg"
                        style={{
                            ...dragStyle,
                            opacity: isDragging ? 0.5 : undefined,
                            pointerEvents: isDragging ? 'none' : undefined,
                        } as React.CSSProperties}
                    >
                        {isSelected ? (
                            <div className="border rounded-lg p-4 bg-card shadow-sm space-y-4">
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <SplitSquareHorizontal className="w-4 h-4 text-muted-foreground" />
                                        <h4 className="text-sm font-medium">Before / After</h4>
                                    </div>
                                </div>

                                {/* Slots */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ImageSlotEditor
                                        blockId={block.id}
                                        slotKey="before"
                                        slotData={before}
                                        isSelected={isSelected}
                                        onUpdateSlot={updateSlot}
                                        onChooseImage={handleChooseImage}
                                    />
                                    <ImageSlotEditor
                                        blockId={block.id}
                                        slotKey="after"
                                        slotData={after}
                                        isSelected={isSelected}
                                        onUpdateSlot={updateSlot}
                                        onChooseImage={handleChooseImage}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <ImageSlotEditor
                                    blockId={block.id}
                                    slotKey="before"
                                    slotData={before}
                                    isSelected={isSelected}
                                    onUpdateSlot={updateSlot}
                                    onChooseImage={handleChooseImage}
                                />
                                <ImageSlotEditor
                                    blockId={block.id}
                                    slotKey="after"
                                    slotData={after}
                                    isSelected={isSelected}
                                    onUpdateSlot={updateSlot}
                                    onChooseImage={handleChooseImage}
                                />
                            </div>
                        )}
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
