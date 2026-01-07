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
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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
import { Input } from '@/ui/input.jsx';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/ui/dialog.jsx';
import { parseVariantsJson, getVariantMap } from '@shared/types/images';
import ImageUploader from '../../ImageUploader';
import MediaDialog from '../../MediaDialog';
import BlockToolbar, { ToolbarButton, ToolbarSeparator } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockSelection } from '../selection-context';

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
            const [inputUrl, setInputUrl] = useState(block.props.url);
            const [uploaderOpen, setUploaderOpen] = useState(false);
            const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
            const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);
            const { isSelected, selectBlock } = useBlockSelection(block.id);
            const captionRef = useRef(null);
            const autoOpenedRef = useRef(false);
            const isOverlayOpen = mediaDialogOpen || uploaderOpen || choiceDialogOpen;
            const {
                attributes: dragAttributes,
                listeners: dragListeners,
                setNodeRef: setDragNodeRef,
                transform: dragTransform,
                isDragging,
            } = useDraggable({ id: block.id, disabled: isOverlayOpen });
            const dragHandleProps = { ...dragAttributes, ...dragListeners };
            const dragStyle = dragTransform ? { transform: CSS.Transform.toString(dragTransform) } : undefined;
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
                if (mediaDialogOpen || uploaderOpen || choiceDialogOpen) return;
                if (autoOpenedRef.current) return;
                let cursorBlockId = null;
                try {
                    cursorBlockId = editor.getTextCursorPosition().block?.id || null;
                } catch {
                    cursorBlockId = null;
                }
                if (cursorBlockId !== block.id) return;
                autoOpenedRef.current = true;
                setChoiceDialogOpen(true);
            }, [block.id, block.props.url, choiceDialogOpen, editor, isSelected, mediaDialogOpen, uploaderOpen]);

            // Handle upload complete from ImageUploader
            const handleUploadComplete = useCallback((data) => {
                const variants = data.variants || {};
                const url = variants.md?.url || variants.sm?.url || variants.lg?.url || data.url;
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
                        height: bestVariant?.height || data.height || 0,
                        variantsJson: JSON.stringify(variants),
                    },
                });
                setInputUrl(url || '');
                setUploaderOpen(false);
                scheduleBlockSelection(currentBlock.id);
                selectBlock();
            }, [block, editor, scheduleBlockSelection, selectBlock]);

            // Handle media selection from MediaDialog
            const handleMediaSelect = useCallback((item) => {
                const parsed = parseVariantsJson(item);
                const variants = getVariantMap(parsed);
                const url = variants.md?.url || variants.sm?.url || variants.lg?.url || item.url;
                const bestVariant = variants.md || variants.lg || variants.original;
                const currentBlock = editor.getBlock(block.id) || block;

                editor.updateBlock(currentBlock, {
                    type: 'customImage',
                    props: {
                        ...currentBlock.props,
                        url,
                        mediaId: item.id?.toString() || '',
                        alt: item.altText || item.alt_text || item.name || '',
                        credit: item.credit || item.credit_text || '',
                        width: bestVariant?.width || 512,
                        height: bestVariant?.height || 0,
                        variantsJson: JSON.stringify(variants),
                    },
                });
                setInputUrl(url || '');
                setMediaDialogOpen(false);
                scheduleBlockSelection(currentBlock.id);
                selectBlock();
            }, [block, editor, scheduleBlockSelection, selectBlock]);

            // Handle URL submit
            const handleUrlSubmit = useCallback(() => {
                if (!inputUrl) return;
                const currentBlock = editor.getBlock(block.id) || block;
                editor.updateBlock(currentBlock, {
                    type: 'customImage',
                    props: {
                        ...currentBlock.props,
                        url: inputUrl,
                        mediaId: '',
                        variantsJson: JSON.stringify({ lg: { url: inputUrl } }),
                    },
                });
            }, [inputUrl, block, editor]);

            const handleRemove = () => {
                editor.removeBlocks([block.id]);
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
                                        onClick={() => setChoiceDialogOpen(true)}
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

                        <Dialog open={choiceDialogOpen} onOpenChange={setChoiceDialogOpen}>
                            <DialogContent className="sm:max-w-md">
                                <DialogTitle>Add image</DialogTitle>
                                <DialogDescription>
                                    Choose an upload or select from your media library.
                                </DialogDescription>
                                <div className="mt-4 grid grid-cols-1 gap-2">
                                    <Button
                                        type="button"
                                        className="justify-start gap-2"
                                        onClick={() => {
                                            setChoiceDialogOpen(false);
                                            setUploaderOpen(true);
                                        }}
                                    >
                                        <Upload className="h-4 w-4" />
                                        Upload image
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="justify-start gap-2"
                                        onClick={() => {
                                            setChoiceDialogOpen(false);
                                            setMediaDialogOpen(true);
                                        }}
                                    >
                                        <FolderOpen className="h-4 w-4" />
                                        Media library
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
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

            const toolbar = isOverlayOpen ? null : (
                <BlockToolbar
                    blockIcon={Image}
                    blockLabel="Image"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    dragHandleProps={dragHandleProps}
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
                        onClick={() => captionRef.current?.focus()}
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
                    {/* Image */}
                    <div className="relative">
                        <img
                            src={block.props.url}
                            alt={block.props.alt}
                            className={cn(
                                'max-w-full h-auto rounded-lg',
                                alignmentClass
                            )}
                            style={{ display: 'block' }}
                        />
                    </div>

                    {/* Caption */}
                    <input
                        type="text"
                        value={block.props.caption}
                        onChange={(e) => editor.updateBlock(block, {
                            type: 'customImage',
                            props: { ...block.props, caption: e.target.value }
                        })}
                        placeholder="Write a caption..."
                        className={cn(
                            'w-full mt-2 text-center text-sm',
                            'bg-transparent border-none',
                            'text-muted-foreground placeholder:text-muted-foreground/50',
                            'focus:outline-none focus:ring-0'
                        )}
                        ref={captionRef}
                    />

                    {/* Credit */}
                    <input
                        type="text"
                        value={block.props.credit}
                        onChange={(e) => editor.updateBlock(block, {
                            type: 'customImage',
                            props: { ...block.props, credit: e.target.value }
                        })}
                        placeholder="Photo credit (optional)"
                        className={cn(
                            'w-full mt-1 text-center text-xs',
                            'bg-transparent border-none',
                            'text-muted-foreground/70 placeholder:text-muted-foreground/40',
                            'focus:outline-none focus:ring-0'
                        )}
                    />

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




