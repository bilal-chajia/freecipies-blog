/**
 * FeaturedImageBlock Component
 * 
 * Featured image block with click-to-add placeholder.
 * Features:
 * - Placeholder state: "Click to set featured image"
 * - Opens media dialog on click
 * - Shows image with edit/remove controls
 * - Focal point selection (via Settings Sidebar)
 * 
 * Based on WordPress Block Editor design patterns:
 * https://developer.wordpress.org/block-editor/
 */

import { useState, useCallback } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { Image, X, Edit3, Focus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { MediaPlaceholder } from '../components/BlockPlaceholder';
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar, { ToolbarButton, ToolbarSeparator } from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';

/**
 * FeaturedImage - Standalone component for use outside BlockNote
 */
export function FeaturedImage({
    imageUrl,
    imageAlt = '',
    imageWidth,
    imageHeight,
    focalPoint = { x: 50, y: 50 },
    onImageSelect,
    onImageRemove,
    onMediaLibrary,
    onFocalPointChange,
    placeholder = 'Set featured image',
    className,
    isSelected = false,
    onSelect,
    onPointerDownCapture,
}) {
    const [isHovered, setIsHovered] = useState(false);

    const handleUpload = useCallback((file) => {
        // In a real implementation, upload the file and call onImageSelect with URL
        // For now, create a local URL for preview
        const url = URL.createObjectURL(file);
        onImageSelect?.({ url, alt: file.name, width: 0, height: 0 });
    }, [onImageSelect]);

    // Placeholder state - no image set
    if (!imageUrl) {
        return (
            <MediaPlaceholder
                icon={Image}
                label={placeholder}
                instructions="Upload an image file, pick from media library, or enter a URL."
                onUpload={handleUpload}
                onMediaLibrary={onMediaLibrary}
                accept="image/*"
                className={className}
            />
        );
    }

    // Image preview state
    const toolbar = (
        <BlockToolbar
            blockIcon={Image}
            blockLabel="Featured Image"
            showMover={false}
            showMoreMenu={false}
        >
            <ToolbarButton
                icon={Edit3}
                label="Replace image"
                onClick={onMediaLibrary}
            />
            <ToolbarButton
                icon={Focus}
                label="Edit focal point"
                onClick={() => onFocalPointChange?.({ x: 50, y: 50 })}
            />
            <ToolbarSeparator />
            <ToolbarButton
                icon={X}
                label="Remove image"
                onClick={onImageRemove}
            />
        </BlockToolbar>
    );

    return (
        <BlockWrapper
            isSelected={isSelected}
            toolbar={toolbar}
            onClick={onSelect}
            onPointerDownCapture={onPointerDownCapture}
            blockType="featured-image"
            className={cn('rounded-lg', className)}
        >
            <div
                className="relative group rounded-lg overflow-hidden"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                <img
                    src={imageUrl}
                    alt={imageAlt}
                    width={imageWidth}
                    height={imageHeight}
                    className="w-full h-auto object-cover"
                    style={{
                        objectPosition: `${focalPoint.x}% ${focalPoint.y}%`,
                    }}
                />

                {/* Overlay controls on hover */}
                <AnimatePresence>
                    {isHovered && !isSelected && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className={cn(
                                'absolute inset-0 bg-black/40',
                                'flex items-center justify-center gap-2'
                            )}
                        >
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onMediaLibrary?.();
                                }}
                            >
                                <Edit3 className="w-4 h-4 mr-1" />
                                Replace
                            </Button>
                            <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onImageRemove?.();
                                }}
                            >
                                <X className="w-4 h-4 mr-1" />
                                Remove
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Focal point indicator */}
                {isSelected && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={cn(
                            'absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2',
                            'border-2 border-white rounded-full',
                            'shadow-lg cursor-move'
                        )}
                        style={{
                            left: `${focalPoint.x}%`,
                            top: `${focalPoint.y}%`,
                        }}
                    />
                )}
            </div>
        </BlockWrapper>
    );
}

/**
 * FeaturedImageBlock for BlockNote integration
 */
export const FeaturedImageBlock = createReactBlockSpec(
    {
        type: 'featuredImage',
        propSchema: {
            imageUrl: { default: '' },
            imageAlt: { default: '' },
            imageWidth: { default: 0 },
            imageHeight: { default: 0 },
            focalX: { default: 50 },
            focalY: { default: 50 },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const {
                imageUrl,
                imageAlt,
                imageWidth,
                imageHeight,
                focalX,
                focalY,
            } = block.props;
            const { isSelected, selectBlock } = useBlockSelection(block.id);

            const updateProps = (updates) => {
                editor.updateBlock(block, {
                    type: 'featuredImage',
                    props: { ...block.props, ...updates },
                });
            };

            return (
                <FeaturedImage
                    imageUrl={imageUrl}
                    imageAlt={imageAlt}
                    imageWidth={imageWidth}
                    imageHeight={imageHeight}
                    focalPoint={{ x: focalX, y: focalY }}
                    isSelected={isSelected}
                    onSelect={selectBlock}
                    onPointerDownCapture={selectBlock}
                    onImageSelect={(img) => updateProps({
                        imageUrl: img.url,
                        imageAlt: img.alt || '',
                        imageWidth: img.width,
                        imageHeight: img.height,
                    })}
                    onImageRemove={() => updateProps({
                        imageUrl: '',
                        imageAlt: '',
                        imageWidth: 0,
                        imageHeight: 0,
                    })}
                    onFocalPointChange={(point) => updateProps({
                        focalX: point.x,
                        focalY: point.y,
                    })}
                    placeholder="Set featured image"
                />
            );
        },
    }
);

export default FeaturedImage;
