/**
 * Custom Block: Image
 * 
 * Enhanced image block with:
 * - Full ImageUploader dialog (crop, focal point, metadata)
 * - MediaDialog for library selection
 * - URL input
 * - Caption and credit metadata
 * - Full variants data for responsive images
 * 
 * REFACTORED for WordPress Block Editor design:
 * - Clean placeholder state using BlockPlaceholder
 * - Toolbar controls for edit/replace/remove
 * - Proper selected/unselected states
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useState, useCallback, useEffect, useRef } from 'react';
import type { FocusEvent, MouseEvent, PointerEvent, SyntheticEvent } from 'react';
import {
    Image,
    Upload,
    FolderOpen,
    X,
    Edit3,
    Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { ImageUploader, MediaDialog } from '@admin/features/media/components';
import BlockToolbar, { ToolbarButton, ToolbarSeparator } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockSelection } from '../selection-context';
import { useBlockEditorSourceData } from '../source-data-context';
import { buildContentImageSelection } from '../utils/image-selection';
import { useBlockActionPrimitives, useBlockDragHandle } from './primitives';
import {
    IMAGE_BLOCK_OPEN_MEDIA_EVENT,
    IMAGE_BLOCK_OPEN_UPLOADER_EVENT,
} from './shared/image-block-events';

type ImageUploadData = {
    id?: string | number | null;
    url?: string;
    name?: string | null;
    altText?: string | null;
    alt_text?: string | null;
    alt?: string | null;
    caption?: string | null;
    credit?: unknown;
    placeholder?: string | null;
    aspectRatio?: string | null;
    aspect_ratio?: string | null;
    focalPoint?: { x?: number; y?: number } | null;
    focal_point?: { x?: number; y?: number } | null;
    width?: number;
    height?: number;
    variants?: unknown;
    variantsJson?: unknown;
    variants_json?: unknown;
};

type MediaSelectItem = {
    id?: string | number | null;
    url?: string;
    altText?: string | null;
    alt_text?: string | null;
    alt?: string | null;
    name?: string | null;
    caption?: string | null;
    credit?: unknown;
    placeholder?: string | null;
    aspectRatio?: string | null;
    aspect_ratio?: string | null;
    focalPoint?: { x?: number; y?: number } | null;
    focal_point?: { x?: number; y?: number } | null;
    width?: number;
    height?: number;
    variantsJson?: unknown;
    variants_json?: unknown;
    variants?: unknown;
};

type ImageBlockOpenEvent = globalThis.CustomEvent<{ blockId?: string }>;

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

export const ImageBlock = createReactBlockSpec(
    {
        type: 'customImage',
        propSchema: {
            url: { default: '' },
            caption: { default: '' },
            alt: { default: '' },
            credit: { default: '' },
            creditJson: { default: '{}' },
            width: { default: 512 },
            height: { default: 0 },
            mediaId: { default: '' },
            variantsJson: { default: '{}' },
            imageRef: { default: '' },
            alignment: { default: 'center' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const { imagesData, onImagesChange } = useBlockEditorSourceData();

            const [uploaderOpen, setUploaderOpen] = useState(false);
            const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
            const [inputUrl, setInputUrl] = useState(block.props.url || '');

            const { isSelected, selectBlock } = useBlockSelection(block.id);
            const captionRef = useRef<HTMLInputElement | null>(null);
            const autoOpenedRef = useRef(false);
            const isOverlayOpen = mediaDialogOpen || uploaderOpen;
            const {
                moveUp: moveBlockUp,
                moveDown: moveBlockDown,
                remove: removeBlock,
            } = useBlockActionPrimitives({
                editor,
                blockId: block.id,
                onSelect: selectBlock,
            });
            const {
                dragHandleProps,
                setDragNodeRef,
                dragStyle,
                isDragging,
            } = useBlockDragHandle(block.id, { disabled: isOverlayOpen });
            const handleSelect = useCallback((event: SyntheticEvent) => {
                if (event?.target instanceof HTMLElement) {
                    if (event.target.closest('.wp-block-toolbar') || event.target.closest('.wp-block-toolbar-wrap')) {
                        return;
                    }
                }
                selectBlock();
            }, [selectBlock]);

            const openMediaDialog = useCallback(() => {
                autoOpenedRef.current = true;
                selectBlock();
                window.setTimeout(() => setMediaDialogOpen(true), 0);
            }, [selectBlock]);

            const openUploaderDialog = useCallback(() => {
                selectBlock();
                window.setTimeout(() => setUploaderOpen(true), 0);
            }, [selectBlock]);

            useEffect(() => {
                if (block.props.url) return;
                if (!isSelected) return;
                if (autoOpenedRef.current) return;
                if (mediaDialogOpen || uploaderOpen) return;
                
                // NOTE: Do NOT check editor.getTextCursorPosition() here.
                // customImage has content: 'none', so the text cursor will never
                // be on this block. We rely solely on the custom selection context
                // (isSelected) to determine when to auto-open the picker.
                autoOpenedRef.current = true;
                setMediaDialogOpen(true);
            }, [block.id, block.props.url, isSelected, mediaDialogOpen, uploaderOpen]);

            // Restore block selection when dialogs open (fixes focus loss bug)
            useEffect(() => {
                if (mediaDialogOpen || uploaderOpen) {
                    if (!isSelected) {
                        // Only use the custom selection context — do NOT call
                        // editor.setTextCursorPosition() here because this block has
                        // content: 'none' and ProseMirror will move the cursor to the
                        // next text block, which steals focus and closes the modal dialog.
                        selectBlock();
                    }
                }
            }, [mediaDialogOpen, uploaderOpen, isSelected, block.id, selectBlock]);

            // Listen for sidebar-dispatched events so BlockSettings can open our
            // dialogs without mounting a second MediaLibrary (which would double /api/media).
            useEffect(() => {
                const onOpenMedia = (e: Event) => {
                    const event = e as ImageBlockOpenEvent;
                    if (event.detail?.blockId === block.id) {
                        openMediaDialog();
                    }
                };
                const onOpenUploader = (e: Event) => {
                    const event = e as ImageBlockOpenEvent;
                    if (event.detail?.blockId === block.id) {
                        openUploaderDialog();
                    }
                };
                document.addEventListener(IMAGE_BLOCK_OPEN_MEDIA_EVENT, onOpenMedia);
                document.addEventListener(IMAGE_BLOCK_OPEN_UPLOADER_EVENT, onOpenUploader);
                return () => {
                    document.removeEventListener(IMAGE_BLOCK_OPEN_MEDIA_EVENT, onOpenMedia);
                    document.removeEventListener(IMAGE_BLOCK_OPEN_UPLOADER_EVENT, onOpenUploader);
                };
            }, [block.id, openMediaDialog, openUploaderDialog]);

            // Handle upload complete from ImageUploader
            const handleUploadComplete = useCallback((data: ImageUploadData) => {
                const currentBlock = editor.getBlock(block.id) || block;
                const selection = buildContentImageSelection({
                    item: data,
                    currentProps: currentBlock.props,
                    fallbackBlockId: block.id,
                });
                onImagesChange?.(upsertContentImageSlot(imagesData, selection.imageRef, selection.slot));

                editor.updateBlock(currentBlock, {
                    type: 'customImage',
                    props: selection.props,
                });
                setInputUrl(typeof selection.props.url === 'string' ? selection.props.url : '');
                setUploaderOpen(false);
                
                // Ensure the block is visually selected after upload
                setTimeout(() => {
                    selectBlock();
                }, 50);
            }, [block, editor, imagesData, onImagesChange, selectBlock]);

            // Handle media selection from MediaDialog
            const handleMediaSelect = useCallback((item: MediaSelectItem) => {
                const currentBlock = editor.getBlock(block.id) || block;
                const selection = buildContentImageSelection({
                    item,
                    currentProps: currentBlock.props,
                    fallbackBlockId: block.id,
                });
                onImagesChange?.(upsertContentImageSlot(imagesData, selection.imageRef, selection.slot));

                editor.updateBlock(currentBlock, {
                    type: 'customImage',
                    props: selection.props,
                });
                setInputUrl(typeof selection.props.url === 'string' ? selection.props.url : '');
                setMediaDialogOpen(false);
                
                // Ensure the block is visually selected after selection
                setTimeout(() => {
                    selectBlock();
                }, 50);
            }, [block, editor, imagesData, onImagesChange, selectBlock]);



            const handleRemove = () => {
                removeBlock();
                setMediaDialogOpen(false);
                setUploaderOpen(false);
            };

            // Placeholder state - no image
            if (!block.props.url) {
                return (
                    <>
                        <BlockWrapper
                            ref={setDragNodeRef}
                            isSelected={isSelected}
                            onClick={handleSelect}
                            onFocus={handleSelect}
                            onPointerDownCapture={handleSelect}
                            blockType="image"
                            blockId={block.id}
                            className="my-2"
                            style={{
                                ...dragStyle,
                                opacity: isDragging ? 0.5 : undefined,
                                pointerEvents: isDragging ? 'none' : undefined,
                            }}
                        >
                            <div className={cn(
                                'wp-block-placeholder',
                                'border border-dashed border-[var(--wp-placeholder-border)]',
                                'rounded-lg p-4 bg-[var(--wp-placeholder-bg)]'
                            )}>
                                <div className="flex flex-col items-center gap-3 py-6">
                                    <div className="p-3 rounded-full bg-muted">
                                        <Image className="w-6 h-6 text-muted-foreground" />
                                    </div>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onMouseDown={(e) => { e.stopPropagation(); }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openMediaDialog();
                                        }}
                                        className="gap-2"
                                    >
                                        <FolderOpen className="h-4 w-4" />
                                        Add image
                                    </Button>
                                    <p className="text-xs text-muted-foreground">
                                        Upload a new image or select from your library.
                                    </p>
                                </div>
                            </div>
                        </BlockWrapper>

                        {uploaderOpen && (
                            <ImageUploader
                                open={uploaderOpen}
                                onOpenChange={setUploaderOpen}
                                onUploadComplete={(data) => handleUploadComplete(data as ImageUploadData)}
                            />
                        )}

                        <MediaDialog
                            open={mediaDialogOpen}
                            onOpenChange={setMediaDialogOpen}
                            onSelect={handleMediaSelect}
                        />


                    </>
                );
            }

            // Image display with toolbar
            const alignment = block.props.alignment || 'center';
            const alignmentClass = {
                left: 'mr-auto',
                center: 'mx-auto',
                right: 'ml-auto',
            }[alignment];

            const widthProp = block.props.width;
            let parsedWidth: string | undefined = undefined;
            if (widthProp !== undefined && widthProp !== null) {
                const widthStr = String(widthProp).trim();
                if (widthStr !== '') {
                    if (/^\d+$/.test(widthStr)) {
                        parsedWidth = `${widthStr}px`;
                    } else {
                        parsedWidth = widthStr;
                    }
                }
            }

            const numericWidth = typeof block.props.width === 'number'
                ? block.props.width
                : /^\d+$/.test(String(block.props.width))
                    ? parseInt(String(block.props.width), 10)
                    : undefined;

            const numericHeight = typeof block.props.height === 'number'
                ? block.props.height
                : /^\d+$/.test(String(block.props.height))
                    ? parseInt(String(block.props.height), 10)
                    : undefined;

            const toolbar = isOverlayOpen ? null : (
                <BlockToolbar
                    blockIcon={Image}
                    blockLabel="Image"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
                    onDelete={removeBlock}
                    showMoreMenu={false}
                >
                    <ToolbarButton
                        icon={Edit3}
                        label="Replace image"
                        onClick={(event) => {
                            event.stopPropagation();
                            openMediaDialog();
                        }}
                    />
                    <ToolbarButton
                        icon={Type}
                        label="Edit caption"
                        onClick={() => { try { captionRef.current?.focus(); } catch {} }}
                    />
                    <ToolbarSeparator />
                    <ToolbarButton
                        icon={X}
                        label="Remove image"
                        onClick={handleRemove}
                        className="text-destructive"
                    />
                </BlockToolbar>
            );

            return (
                <>
                    <BlockWrapper
                        ref={setDragNodeRef}
                        isSelected={isSelected}
                        toolbar={toolbar}
                        onClick={handleSelect}
                        onFocus={handleSelect}
                        onPointerDownCapture={handleSelect}
                        blockType="image"
                        blockId={block.id}
                        className="my-4"
                        style={{
                            ...dragStyle,
                            opacity: isDragging ? 0.5 : undefined,
                            pointerEvents: isDragging ? 'none' : undefined,
                        }}
                    >
                        <div
                            className={cn(
                                'border rounded-lg overflow-hidden bg-card transition-all duration-200',
                                alignmentClass
                            )}
                            style={{
                                width: parsedWidth,
                                maxWidth: '100%',
                            }}
                        >
                            {/* Image */}
                            <div className="relative">
                                <img
                                    src={block.props.url}
                                    alt={block.props.alt}
                                    width={numericWidth || undefined}
                                    height={numericHeight || undefined}
                                    className="w-full h-auto block"
                                    loading="lazy"
                                />
                            </div>

                            {/* Caption & Credit */}
                            <div className="p-2 space-y-1 bg-muted/20">
                                <input
                                    type="text"
                                    value={block.props.caption || ''}
                                    onChange={(e) => editor.updateBlock(block, {
                                        type: 'customImage',
                                        props: { ...block.props, caption: e.target.value }
                                    })}
                                    placeholder="Write a caption..."
                                    className={cn(
                                        'w-full text-center text-sm',
                                        'bg-transparent border-none',
                                        'text-muted-foreground placeholder:text-muted-foreground/50',
                                        'focus:outline-none focus:ring-0'
                                    )}
                                    ref={captionRef}
                                />

                                {block.props.credit && (
                                    <div className="w-full text-center text-xs text-muted-foreground/70">
                                        {block.props.credit}
                                    </div>
                                )}
                            </div>
                        </div>
                    </BlockWrapper>

                    <MediaDialog
                        open={mediaDialogOpen}
                        onOpenChange={setMediaDialogOpen}
                        onSelect={handleMediaSelect}
                    />
                    {uploaderOpen && (
                        <ImageUploader
                            open={uploaderOpen}
                            onOpenChange={setUploaderOpen}
                            onUploadComplete={(data) => handleUploadComplete(data as ImageUploadData)}
                        />
                    )}
                </>
            );
        },
    }
);

export default ImageBlock;
