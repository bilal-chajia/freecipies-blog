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
import {
    Image,
    Upload,
    FolderOpen,
    X,
    Edit3,
    Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button.jsx';
import { parseVariantsJson, getVariantMap, resolveVariantUrl, stripStorageKeys } from '@shared/types/images';
import { ImageUploader, MediaDialog } from '@admin/features/media/components';
import BlockToolbar, { ToolbarButton, ToolbarSeparator } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockSelection } from '../selection-context';
import { useBlockActionPrimitives, useBlockDragHandle } from './primitives';

// Extract r2_key from image URLs (internal proxy URLs or R2 public URLs)
const extractR2KeyFromUrl = (url) => {
    if (!url) return null;
    const proxyMatch = url.match(/^\/api\/images\/(.+)$/);
    if (proxyMatch) return proxyMatch[1];
    const r2Match = url.match(/^https:\/\/pub-[a-f0-9]+\.r2\.dev\/(.+)$/i);
    if (r2Match) return r2Match[1];
    const localMatch = url.match(/^https?:\/\/[^\/]+\/api\/images\/(.+)$/);
    if (localMatch) return localMatch[1];
    return null;
};

export const ImageBlock = createReactBlockSpec(
    {
        type: 'customImage',
        propSchema: {
            url: { default: '' },
            caption: { default: '' },
            alt: { default: '' },
            credit: { default: '' },
            width: { default: 512 },
            height: { default: 0 },
            mediaId: { default: '' },
            variantsJson: { default: '{}' },
            alignment: { default: 'center' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;

            const [uploaderOpen, setUploaderOpen] = useState(false);
            const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
            const [inputUrl, setInputUrl] = useState(block.props.url || '');

            const { isSelected, selectBlock } = useBlockSelection(block.id);
            const captionRef = useRef(null);
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
            const handleSelect = useCallback((event) => {
                if (event?.target instanceof HTMLElement) {
                    if (event.target.closest('.wp-block-toolbar') || event.target.closest('.wp-block-toolbar-wrap')) {
                        return;
                    }
                }
                selectBlock();
            }, [selectBlock]);

            const scheduleBlockSelection = useCallback((blockId) => {
                if (!blockId) return;
                requestAnimationFrame(() => {
                    try {
                        editor.setTextCursorPosition(blockId, 'start');
                    } catch {
                        // Ignore if selection fails while dialog is closing.
                    }
                });
            }, [editor]);

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
                const onOpenMedia = (e) => {
                    if (e.detail?.blockId === block.id) {
                        autoOpenedRef.current = true;
                        selectBlock();
                        setMediaDialogOpen(true);
                    }
                };
                const onOpenUploader = (e) => {
                    if (e.detail?.blockId === block.id) {
                        selectBlock();
                        setUploaderOpen(true);
                    }
                };
                document.addEventListener('imageblock:open-media', onOpenMedia);
                document.addEventListener('imageblock:open-uploader', onOpenUploader);
                return () => {
                    document.removeEventListener('imageblock:open-media', onOpenMedia);
                    document.removeEventListener('imageblock:open-uploader', onOpenUploader);
                };
            }, [block.id, selectBlock]);


            // Handle upload complete from ImageUploader
            const handleUploadComplete = useCallback((data) => {
                const variants = data.variants || {};
                const url = resolveVariantUrl(variants.md) || resolveVariantUrl(variants.sm) || resolveVariantUrl(variants.lg) || data.url;
                const bestVariant = variants.md || variants.lg || variants.original;
                const currentBlock = editor.getBlock(block.id) || block;

                editor.updateBlock(currentBlock, {
                    type: 'customImage',
                    props: {
                        ...currentBlock.props,
                        url,
                        mediaId: data.id?.toString() || '',
                        alt: data.altText || '',
                        credit: data.credit || '',
                        width: bestVariant?.width || data.width || 512,
                        height: bestVariant?.height || data.height || 300,
                        variantsJson: JSON.stringify(variants),
                    },
                });
                setInputUrl(url || '');
                setUploaderOpen(false);
                
                // Ensure the block is visually selected after upload
                setTimeout(() => {
                    selectBlock();
                    scheduleBlockSelection(currentBlock.id);
                }, 50);
            }, [block, editor, scheduleBlockSelection, selectBlock]);

            // Handle media selection from MediaDialog
            const handleMediaSelect = useCallback((item) => {
                const parsed = parseVariantsJson(item);
                const rawVariants = getVariantMap(parsed);
                const variants = stripStorageKeys(rawVariants);
                const url = variants.md?.url || variants.sm?.url || variants.lg?.url || variants.xs?.url || item.url;
                const bestVariant = variants.md || variants.lg || variants.sm || variants.xs || variants.original;
                const currentBlock = editor.getBlock(block.id) || block;

                editor.updateBlock(currentBlock, {
                    type: 'customImage',
                    props: {
                        ...currentBlock.props,
                        url,
                        mediaId: item.id?.toString() || '',
                        alt: item.altText || item.alt_text || item.name || '',
                        credit: item.credit || item.credit_text || '',
                        width: bestVariant?.width || item.width || 512,
                        height: bestVariant?.height || item.height || 0,
                        variantsJson: JSON.stringify(variants),
                    },
                });
                setInputUrl(url || '');
                setMediaDialogOpen(false);
                
                // Ensure the block is visually selected after selection
                setTimeout(() => {
                    selectBlock();
                    scheduleBlockSelection(currentBlock.id);
                }, 50);
            }, [block, editor, scheduleBlockSelection, selectBlock]);



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
                                            autoOpenedRef.current = true;
                                            selectBlock();
                                            setMediaDialogOpen(true);
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

                        <ImageUploader
                            open={uploaderOpen}
                            onOpenChange={setUploaderOpen}
                            onUploadComplete={handleUploadComplete}
                        />

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
                            setMediaDialogOpen(true);
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
                    <div className="border rounded-lg overflow-hidden bg-card">
                        {/* Image */}
                        <div className="relative">
                            <img
                                src={block.props.url}
                                alt={block.props.alt}
                                width={block.props.width || undefined}
                                height={block.props.height || undefined}
                                className={cn(
                                    'max-w-full h-auto',
                                    alignmentClass
                                )}
                                style={{ display: 'block' }}
                            />
                        </div>

                        {/* Caption & Credit */}
                        <div className="p-2 space-y-1 bg-muted/20">
                            <input
                                type="text"
                                value={block.props.caption}
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

                            <input
                                type="text"
                                value={block.props.credit}
                                onChange={(e) => editor.updateBlock(block, {
                                    type: 'customImage',
                                    props: { ...block.props, credit: e.target.value }
                                })}
                                placeholder="Photo credit (optional)"
                                className={cn(
                                    'w-full text-center text-xs',
                                    'bg-transparent border-none',
                                    'text-muted-foreground/70 placeholder:text-muted-foreground/40',
                                    'focus:outline-none focus:ring-0'
                                )}
                            />
                        </div>
                    </div>

                    {/* Media dialogs */}
                    <MediaDialog
                        open={mediaDialogOpen}
                        onOpenChange={setMediaDialogOpen}
                        onSelect={handleMediaSelect}
                    />
                </BlockWrapper>
            );
        },
    }
);

export default ImageBlock;



