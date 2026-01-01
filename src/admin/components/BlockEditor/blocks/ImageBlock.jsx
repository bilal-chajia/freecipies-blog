/**
 * Custom Block: Image
 * 
 * Enhanced image block with:
 * - Full ImageUploader dialog (crop, focal point, metadata)
 * - MediaDialog for library selection
 * - URL input
 * - Caption and credit metadata
 * - Full variants data for responsive images
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Upload,
    Link,
    FolderOpen,
    X
} from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import { parseVariantsJson, getVariantMap, getLargestVariant } from '@shared/types/images';
import ImageUploader from '../../ImageUploader';
import MediaDialog from '../../MediaDialog';

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
            // Store variants as JSON string for full responsive image support
            variantsJson: { default: '{}' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const [inputUrl, setInputUrl] = useState(props.block.props.url);
            const [activeTab, setActiveTab] = useState('upload');
            const [uploaderOpen, setUploaderOpen] = useState(false);
            const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

            // Parse and get variants using shared helpers

            // Handle upload complete from ImageUploader
            const handleUploadComplete = useCallback((data) => {
                // ImageUploader returns data.variants directly (already extracted)
                const variants = data.variants || {};
                const url = variants.md?.url || variants.sm?.url || variants.lg?.url || data.url;
                const bestVariant = variants.md || variants.lg || variants.original;

                props.editor.updateBlock(props.block, {
                    type: 'customImage',
                    props: {
                        ...props.block.props,
                        url,
                        mediaId: data.id?.toString() || '',
                        alt: data.altText || '',
                        credit: data.credit || '',
                        width: bestVariant?.width || data.width || 512,
                        height: bestVariant?.height || data.height || 0,
                        // Store variants directly (not wrapped in { variants: {...} })
                        variantsJson: JSON.stringify(variants),
                    },
                });
                setUploaderOpen(false);
            }, [props.block, props.editor]);

            // Handle media selection from MediaDialog
            const handleMediaSelect = useCallback((item) => {
                // MediaLibrary returns item with variantsJson as string
                const parsed = parseVariantsJson(item);
                const variants = getVariantMap(parsed);
                const url = variants.md?.url || variants.sm?.url || variants.lg?.url || item.url;
                const bestVariant = variants.md || variants.lg || variants.original;

                props.editor.updateBlock(props.block, {
                    type: 'customImage',
                    props: {
                        ...props.block.props,
                        url,
                        mediaId: item.id?.toString() || '',
                        alt: item.altText || item.alt_text || item.name || '',
                        credit: item.credit || item.credit_text || '',
                        width: bestVariant?.width || 512,
                        height: bestVariant?.height || 0,
                        // Store variants directly (not wrapped in { variants: {...} })
                        variantsJson: JSON.stringify(variants),
                    },
                });
            }, [props.block, props.editor]);

            // Handle URL submit (external images - no variants)
            const handleUrlSubmit = useCallback(() => {
                if (inputUrl) {
                    props.editor.updateBlock(props.block, {
                        type: 'customImage',
                        props: {
                            ...props.block.props,
                            url: inputUrl,
                            credit: props.block.props.credit || '',
                            variantsJson: JSON.stringify({ lg: { url: inputUrl } }),
                        },
                    });
                }
            }, [inputUrl, props.block, props.editor]);

            if (!props.block.props.url) {
                return (
                    <>
                        <motion.div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 my-2 bg-gray-50"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <Tabs value={activeTab} onValueChange={setActiveTab}>
                                <TabsList className="grid w-full grid-cols-3 h-9 mb-3">
                                    <TabsTrigger value="upload" className="text-xs gap-1.5">
                                        <Upload className="h-3.5 w-3.5" />
                                        Upload
                                    </TabsTrigger>
                                    <TabsTrigger value="library" className="text-xs gap-1.5">
                                        <FolderOpen className="h-3.5 w-3.5" />
                                        Library
                                    </TabsTrigger>
                                    <TabsTrigger value="url" className="text-xs gap-1.5">
                                        <Link className="h-3.5 w-3.5" />
                                        URL
                                    </TabsTrigger>
                                </TabsList>

                                {/* Upload Tab - Opens ImageUploader Dialog */}
                                <TabsContent value="upload" className="mt-0">
                                    <motion.div
                                        className="flex flex-col items-center gap-3 py-4"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setUploaderOpen(true)}
                                            className="gap-2"
                                        >
                                            <Upload className="h-4 w-4" />
                                            Upload New Image
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            Crop, resize, and add metadata
                                        </p>
                                    </motion.div>
                                </TabsContent>

                                {/* Media Library Tab - Opens MediaDialog */}
                                <TabsContent value="library" className="mt-0">
                                    <motion.div
                                        className="flex flex-col items-center gap-3 py-4"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setMediaDialogOpen(true)}
                                            className="gap-2"
                                        >
                                            <FolderOpen className="h-4 w-4" />
                                            Browse Media Library
                                        </Button>
                                        <p className="text-xs text-muted-foreground">
                                            Select from existing images
                                        </p>
                                    </motion.div>
                                </TabsContent>

                                {/* URL Tab */}
                                <TabsContent value="url" className="mt-0">
                                    <motion.div
                                        className="flex flex-col items-center gap-3 py-4"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                    >
                                        <div className="flex w-full max-w-sm gap-2">
                                            <Input
                                                type="text"
                                                value={inputUrl}
                                                onChange={(e) => setInputUrl(e.target.value)}
                                                placeholder="https://example.com/image.jpg"
                                                className="flex-1 h-9 text-sm"
                                                onClick={(e) => e.stopPropagation()}
                                                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                                            />
                                            <Button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUrlSubmit();
                                                }}
                                                size="sm"
                                                className="h-9"
                                            >
                                                Add
                                            </Button>
                                        </div>
                                    </motion.div>
                                </TabsContent>
                            </Tabs>
                        </motion.div>

                        {/* ImageUploader Dialog */}
                        <ImageUploader
                            open={uploaderOpen}
                            onOpenChange={setUploaderOpen}
                            onUploadComplete={handleUploadComplete}
                        />

                        {/* MediaDialog for Library Selection */}
                        <MediaDialog
                            open={mediaDialogOpen}
                            onOpenChange={setMediaDialogOpen}
                            onSelect={handleMediaSelect}
                        />
                    </>
                );
            }

            // Image display with controls
            return (
                <motion.div
                    className="my-4 group relative"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <div className="relative">
                        <img
                            src={props.block.props.url}
                            alt={props.block.props.alt}
                            className="w-full h-auto rounded-lg border border-gray-200"
                        />
                        {/* Overlay controls */}
                        <motion.div
                            className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 p-1.5 rounded-lg backdrop-blur-sm"
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                        >
                            <button
                                onClick={() => props.editor.updateBlock(props.block, {
                                    props: { ...props.block.props, url: '', variantsJson: '{}' }
                                })}
                                className="text-xs text-white hover:text-red-300 px-2 flex items-center gap-1"
                            >
                                <X className="h-3 w-3" />
                                Change
                            </button>
                        </motion.div>
                    </div>
                    <input
                        type="text"
                        value={props.block.props.caption}
                        onChange={(e) => props.editor.updateBlock(props.block, {
                            props: { ...props.block.props, caption: e.target.value }
                        })}
                        placeholder="Write a caption..."
                        className="w-full mt-2 text-center text-sm text-gray-500 bg-transparent border-none focus:ring-0 placeholder:text-gray-300"
                    />
                    <input
                        type="text"
                        value={props.block.props.credit}
                        onChange={(e) => props.editor.updateBlock(props.block, {
                            props: { ...props.block.props, credit: e.target.value }
                        })}
                        placeholder="Photo credit (optional)"
                        className="w-full mt-1 text-center text-xs text-gray-400 bg-transparent border-none focus:ring-0 placeholder:text-gray-300"
                    />
                </motion.div>
            );
        },
    }
);
