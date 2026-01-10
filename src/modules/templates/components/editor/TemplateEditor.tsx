// @ts-nocheck
// NOTE: Types available - @ts-nocheck can be removed when all errors resolved
import React, { useEffect, useMemo, useRef } from 'react';
import api from '@admin/services/api';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/ui/button';

import {
    Loader2,
    Download,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/ui/dialog';
import { toast } from 'sonner';
import PinCanvas from '../canvas/PinCanvas';
import { FONTS } from '../canvas/ElementPanel';
// import CanvasToolbar from '../canvas/CanvasToolbar'; // Deprecated
// import DraggableLayersList from '../canvas/DraggableLayersList'; // Deprecated
import EditorLayout from '../canvas/modern/EditorLayout';
import { templatesAPI, mediaAPI } from '@admin/services/api';
import { useFontLoader } from '../../utils/fontLoader';
import { useEditorStore, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../store';
import type { TemplateElement } from '../../types';
import { nanoid } from 'nanoid';
import ThumbnailWorker from '../../workers/thumbnail.worker.js?worker';




const MOCK_ARTICLE_DATA = {
    title: "Delicious Chocolate Cake with Berries",
    categoryLabel: "Desserts",
    authorName: "Chef Anna",
    prepTime: "20 min",
    cookTime: "45 min",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80"
};

/**
 * TemplateEditor - Professional Canva-like template designer
 */
const TemplateEditor = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isNewTemplate = !slug || slug === 'new';

    // Load fonts used in editor
    // Extract unique font families from elements + default fonts
    const defaultFonts = useMemo(() => FONTS.map(f => f.name), []);
    useFontLoader(defaultFonts);

    // === ZUSTAND STORE HOOKS ===
    const template = useEditorStore(state => state.template);
    const elements = useEditorStore(state => state.elements);
    const selectedIds = useEditorStore(state => state.selectedIds);
    const zoom = useEditorStore(state => state.zoom);
    const showGrid = useEditorStore(state => state.showGrid);
    const hasUnsavedChanges = useEditorStore(state => state.hasUnsavedChanges);
    const isLoading = useEditorStore(state => state.isLoading);
    const isSaving = useEditorStore(state => state.isSaving);
    const canvasBaseWidth = useEditorStore(state => state.canvasBaseWidth);
    const canvasBaseHeight = useEditorStore(state => state.canvasBaseHeight);

    // Store actions
    const setTemplate = useEditorStore(state => state.setTemplate);
    const loadTemplateToStore = useEditorStore(state => state.loadTemplateToStore);
    const setElements = useEditorStore(state => state.setElements);
    const addElement = useEditorStore(state => state.addElement);
    const updateElement = useEditorStore(state => state.updateElement);
    const deleteSelected = useEditorStore(state => state.deleteSelected);
    const duplicateSelected = useEditorStore(state => state.duplicateSelected);
    const selectElement = useEditorStore(state => state.selectElement);
    const getFirstSelectedElement = useEditorStore(state => state.getFirstSelectedElement);
    const moveElementUp = useEditorStore(state => state.moveElementUp);
    const moveElementDown = useEditorStore(state => state.moveElementDown);
    const reorderElements = useEditorStore(state => state.reorderElements);
    const setZoom = useEditorStore(state => state.setZoom);
    const toggleGrid = useEditorStore(state => state.toggleGrid);
    const setLoading = useEditorStore(state => state.setLoading);
    const setSaving = useEditorStore(state => state.setSaving);
    const markSaved = useEditorStore(state => state.markSaved);
    const resetTemplate = useEditorStore(state => state.resetTemplate);

    // Derived: get selected element (first selected for panel)
    const selectedElement = getFirstSelectedElement();

    // Preview state (local, not in store as it's modal-only)
    const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
    const [previewScale, setPreviewScale] = React.useState(0.35);
    const [previewImage, setPreviewImage] = React.useState<string | null>(null);
    const previewContainerRef = useRef(null);

    // Worker for thumbnail generation
    const workerRef = useRef<Worker>();

    useEffect(() => {
        workerRef.current = new ThumbnailWorker();
        return () => workerRef.current?.terminate();
    }, []);

    const resizeImage = (blob: Blob, maxWidth: number): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!workerRef.current) return resolve(null);

            const id = nanoid();
            const handler = (e: MessageEvent) => {
                if (e.data.id === id) {
                    workerRef.current?.removeEventListener('message', handler);
                    if (e.data.success) resolve(e.data.blob);
                    else resolve(null); // Fail gracefully
                }
            };

            workerRef.current.addEventListener('message', handler);
            workerRef.current.postMessage({ id, file: blob, maxWidth, type: 'resize' });
        });
    };

    // Dynamic padding for preview panel so grey area scales with canvas size
    const previewPadding = useMemo(() => {
        const baseW = canvasBaseWidth || CANVAS_WIDTH;
        const baseH = canvasBaseHeight || CANVAS_HEIGHT;
        const shortestSide = Math.min(baseW, baseH);
        return Math.max(12, Math.min(64, Math.round(shortestSide * 0.02)));
    }, [canvasBaseWidth, canvasBaseHeight]);

    // Export function ref
    const exportFnRef = useRef(null);
    const previewExportRef = useRef(null);

    // Load existing template or reset for new
    useEffect(() => {
        if (slug === 'new') {
            // User explicitly wants a new blank template
            resetTemplate();
        } else if (!slug) {
            // No slug provided - try to load last edited template
            const lastSlug = localStorage.getItem('last_edited_template_slug');
            if (lastSlug && lastSlug !== 'new') {
                // Redirect to last template
                navigate(`/templates/${lastSlug}`, { replace: true });
            } else {
                // No last template, reset to blank
                resetTemplate();
            }
        } else {
            // Specific slug provided - load that template
            loadTemplate();
        }
    }, [slug]);

    useEffect(() => {
        if (!isPreviewOpen) return;
        const container = previewContainerRef.current;
        if (!container) return;

        const updateScale = () => {
            const baseWidth = canvasBaseWidth || template?.canvas_width || template?.width || CANVAS_WIDTH;
            const baseHeight = canvasBaseHeight || template?.canvas_height || template?.height || CANVAS_HEIGHT;
            if (!baseWidth || !baseHeight) return;

            const availableWidth = Math.max(0, container.clientWidth - previewPadding * 2);
            const availableHeight = Math.max(0, container.clientHeight - previewPadding * 2);
            if (!availableWidth || !availableHeight) return;

            const fitScale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight) * 0.95;
            setPreviewScale(fitScale);
        };

        updateScale();
        const raf = requestAnimationFrame(updateScale);
        const resizeObserver = new ResizeObserver(updateScale);
        resizeObserver.observe(container);

        return () => {
            cancelAnimationFrame(raf);
            resizeObserver.disconnect();
        };
    }, [isPreviewOpen, template?.canvas_width, template?.canvas_height, canvasBaseWidth, canvasBaseHeight, previewPadding]);

    const loadTemplate = async () => {
        // Skip if template is already loaded in store (e.g., loaded via SidePanel)
        if (template.slug === slug && template.id) {
            // Just update localStorage for "last edited"
            localStorage.setItem('last_edited_template_slug', slug);
            return;
        }

        try {
            setLoading(true);
            const response = await templatesAPI.getBySlug(slug);
            const data = response.data?.data || response.data;
            if (data) {
                loadTemplateToStore(data, data.elements_json);
                // Save last accessed slug
                localStorage.setItem('last_edited_template_slug', slug);
            }
        } catch (error) {
            console.error('Failed to load template:', error);
            toast.error('Failed to load template');
        } finally {
            setLoading(false);
        }
    };

    // Handle element selection from canvas
    const handleElementSelect = (element) => {
        selectElement(element?.id || null);
    };

    // Handle element update from panel
    const handleElementUpdate = (updatedElement) => {
        updateElement(updatedElement.id, updatedElement);
    };

    // Handle adding new element
    const handleAddElement = (type, defaults) => {
        addElement(type, defaults);
        toast.success(`Added ${type}`);
    };

    // Handle element deletion
    const handleDeleteElement = () => {
        if (selectedIds.size === 0) return;
        deleteSelected();
        toast.success('Element deleted');
    };

    // Handle element duplicate
    const handleDuplicateElement = () => {
        if (selectedIds.size === 0) return;
        duplicateSelected();
        toast.success('Element duplicated');
    };

    // Handle element reordering
    const handleMoveUp = () => {
        if (!selectedElement) return;
        moveElementUp(selectedElement.id);
    };

    const handleMoveDown = () => {
        if (!selectedElement) return;
        moveElementDown(selectedElement.id);
    };

    // Generate and upload thumbnail
    const uploadThumbnail = async (slugName, oldThumbnailUrl = null) => {
        console.log('[Thumbnail] Starting upload for:', slugName);

        if (!exportFnRef.current) {
            console.warn('[Thumbnail] exportFnRef.current is null');
            return null;
        }

        try {
            // Export canvas as WebP for best compression
            console.log('[Thumbnail] Exporting canvas...');
            const blob = await exportFnRef.current('webp', 0.7);
            console.log('[Thumbnail] Blob:', blob);
            if (!blob) {
                console.warn('[Thumbnail] Blob is null');
                return null;
            }

            // Resize thumbnail for smaller file size (max 400px width)
            const resizedBlob = await resizeImage(blob, 400);
            console.log('[Thumbnail] Resized blob size:', resizedBlob?.size);

            const filename = `template-thumb-${slugName}-${Date.now()}.webp`;
            const file = new File([resizedBlob], filename, { type: 'image/webp' });

            // Build form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('templateSlug', slugName);
            if (oldThumbnailUrl) {
                formData.append('oldThumbnailUrl', oldThumbnailUrl);
            }

            // Upload via dedicated thumbnail API (doesn't save to media table)
            console.log('[Thumbnail] Uploading to API...');
            const response = await api.post('/upload-thumbnail', formData, {
                headers: { 'Content-Type': undefined }
            });

            console.log('[Thumbnail] API response:', response);
            const result = response.data;

            if (!result.success) {
                console.warn('[Thumbnail] Upload failed:', result);
                return null;
            }

            const thumbnailUrl = result.data?.url;
            console.log('[Thumbnail] Success! URL:', thumbnailUrl);
            if (thumbnailUrl) {
                return thumbnailUrl;
            }
            console.warn('[Thumbnail] Response missing URL:', result);
            return null;
        } catch (error) {
            console.error('[Thumbnail] Error:', error);
            return null;
        }
    };

    // Handle template save
    const handleSave = async () => {
        try {
            setSaving(true);

            // Validation
            if (!template.name?.trim()) {
                toast.error('Please give your template a name');
                setSaving(false);
                return;
            }

            // Determine if this is a new template based on store data, not URL
            // A template is "new" if it doesn't have an ID (never saved to DB)
            const isCreating = !template.id;

            // Generate slug if empty (for new templates)
            let templateSlug = template.slug;
            if (!templateSlug) {
                // Generate from name with timestamp to ensure uniqueness
                const baseSlug = template.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '') || 'untitled';

                // Always add timestamp for new templates to prevent slug conflicts
                templateSlug = `${baseSlug}-${Date.now()}`;
            }

            // Attempt to generate thumbnail (pass old URL to delete it)
            const oldThumbnailUrl = template.thumbnail_url || null;
            const thumbnailUrl = await uploadThumbnail(templateSlug, oldThumbnailUrl);

            const templateData = {
                ...template,
                slug: templateSlug,
                elements_json: JSON.stringify(elements),
                // Update thumbnail only if generated, otherwise keep existing
                thumbnail_url: thumbnailUrl || template.thumbnail_url
            };

            let response;
            if (isCreating) {
                response = await templatesAPI.create(templateData);
                const success = response.data?.success !== false;
                if (success) {
                    toast.success('Template created!');
                    markSaved();
                    // Notify sidebar to add the new template
                    window.dispatchEvent(new CustomEvent('template:saved', { detail: { template: templateData, isNew: true } }));
                    navigate(`/templates/${templateSlug}`);
                }
            } else {
                // Use template.slug for update (the existing slug in the DB)
                response = await templatesAPI.update(template.slug, templateData);
                const success = response.data?.success !== false;
                if (success) {
                    toast.success('Template saved!');
                    // Update thumbnail first, then mark as saved (order matters!)
                    setTemplate({ thumbnail_url: templateData.thumbnail_url });
                    markSaved();
                    // Notify sidebar to update this template in the list
                    window.dispatchEvent(new CustomEvent('template:saved', { detail: { template: templateData, isNew: false } }));
                }
            }
        } catch (error) {
            console.error('Failed to save template:', error);
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    // Handle export
    const handleExport = async () => {
        if (!exportFnRef.current) return;
        try {
            const blob = await exportFnRef.current('png');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${template.name || 'template'}.png`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success('Template exported!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Export failed');
        }
    };

    // Handle preview export (JPEG download)
    const handleDownloadPreview = async () => {
        if (!previewExportRef.current) return;
        try {
            const blob = await previewExportRef.current('jpeg', 0.95);

            if (!blob) {
                throw new Error('Failed to generate image blob');
            }

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Use title from mock data
            const title = MOCK_ARTICLE_DATA.title || 'preview-pin';
            const filename = title.replace(/[^a-z0-9\s-]/gi, '').trim().replace(/\s+/g, '-').toLowerCase();

            link.download = `${filename}.jpg`;
            link.setAttribute('download', `${filename}.jpg`);

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);
            toast.success('Preview downloaded!');
        } catch (error) {
            console.error('Download preview failed:', error);
            toast.error('Download failed');
        }
    };

    // Export image from main canvas
    const handleExportImage = async () => {
        if (!exportFnRef.current) {
            toast.error('Export not ready');
            return;
        }
        try {
            const blob = await exportFnRef.current('png', 1.0);
            if (!blob) {
                toast.error('Export failed');
                return;
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = template.name || template.slug || 'template';
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Image exported!');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Export failed');
        }
    };

    // Handle preview toggle
    const handlePreview = async () => {
        if (!isPreviewOpen) {
            if (exportFnRef.current) {
                try {
                    const blob = await exportFnRef.current('png', 1);
                    if (blob) {
                        const url = URL.createObjectURL(blob);
                        setPreviewImage(url);
                    }
                } catch (e) {
                    console.error("Preview generation failed", e);
                }
            }
            setIsPreviewOpen(true);
        } else {
            setIsPreviewOpen(false);
            if (previewImage) {
                URL.revokeObjectURL(previewImage);
                setPreviewImage(null);
            }
        }
    };

    // Clean up preview URL when dialog closes (not used anymore but kept for state)
    const handlePreviewOpenChange = (open) => {
        setIsPreviewOpen(open);
    };



    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <React.Fragment>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
            >
                <EditorLayout onExport={handleSave} onPreview={handlePreview} onExportImage={handleExportImage} isPreviewOpen={isPreviewOpen}>
                    <PinCanvas
                        template={template}
                        editable={true}
                        scale={0.5}
                        zoom={zoom}
                        showGrid={showGrid}
                        onElementSelect={handleElementSelect}
                        onExport={(fn) => { exportFnRef.current = fn; }}
                    />
                </EditorLayout>
            </motion.div>

            {/* Preview Panel - Slide in from right */}
            <AnimatePresence>
                {isPreviewOpen && (
                    <>
                        {/* Backdrop overlay - click to close */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="fixed inset-0 bg-black/30 z-[60]"
                            onClick={handlePreview}
                        />
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-14 bottom-0 w-[640px] bg-background/95 backdrop-blur-lg border-l border-border shadow-2xl z-[70] flex flex-col"
                        >
                            <div className="p-4 border-b">
                                <h2 className="font-semibold">Preview Template</h2>
                                <p className="text-sm text-muted-foreground">Preview with sample data</p>
                            </div>
                            <div
                                ref={previewContainerRef}
                                className="flex-1 overflow-auto flex items-start justify-center"
                            >
                                <div
                                    className="flex items-start justify-center bg-zinc-900/50 rounded-md shadow-inner"
                                    style={{ padding: `${previewPadding}px` }}
                                >
                                    <div
                                        className="flex items-start justify-center"
                                        style={{
                                            width: `${canvasBaseWidth * previewScale}px`,
                                            height: `${canvasBaseHeight * previewScale}px`,
                                        }}
                                    >
                                        {previewImage ? (
                                            <img
                                                src={previewImage}
                                                alt="Template Preview"
                                                className="w-full h-full object-contain shadow-lg"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
                                                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                                                Generating preview...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </React.Fragment>
    );
};

export default TemplateEditor;

