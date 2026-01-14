--- src/modules/templates/components/editor/OptimizedTemplateEditor.tsx (原始)


+++ src/modules/templates/components/editor/OptimizedTemplateEditor.tsx (修改后)
// @ts-nocheck
import React, { useEffect, useRef } from 'react';
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
import { OptimizedPinCanvas } from '../canvas/OptimizedPinCanvas';
import { FONTS } from '../canvas/ElementPanel';
// import CanvasToolbar from '../canvas/CanvasToolbar'; // Deprecated
// import DraggableLayersList from '../canvas/DraggableLayersList'; // Deprecated
import EditorLayout from '../canvas/modern/EditorLayout';
import { templatesAPI, mediaAPI } from '@admin/services/api';
import { useFontLoader } from '../../utils/fontLoader';
import { useEditorStore, CANVAS_WIDTH, CANVAS_HEIGHT } from '../../store';
import { generateSlug } from '../../utils/slugUtils';

// Helper to resize images for thumbnails
const resizeImage = (blob, maxWidth) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            // Calculate new dimensions maintaining aspect ratio
            const ratio = Math.min(maxWidth / img.width, 1);
            const width = Math.round(img.width * ratio);
            const height = Math.round(img.height * ratio);

            // Draw to canvas at new size
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob with compression (WebP for best size)
            canvas.toBlob(resolve, 'image/webp', 0.7);
        };
        img.src = URL.createObjectURL(blob);
    });
};


const MOCK_ARTICLE_DATA = {
    title: "Delicious Chocolate Cake with Berries",
    categoryLabel: "Desserts",
    authorName: "Chef Anna",
    prepTime: "20 min",
    cookTime: "45 min",
    image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80"
};

/**
 * OptimizedTemplateEditor - High-performance Canva-like template designer
 * Optimizations: Layer separation, uncontrolled drag updates, image caching
 */
const OptimizedTemplateEditor = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const isNewTemplate = !slug || slug === 'new';

    // Load fonts used in editor
    // Extract unique font families from elements + default fonts
    const defaultFonts = FONTS.map(f => f.name);
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

    // Store actions
    const setTemplate = useEditorStore(state => state.setTemplate);
    const updateTemplate = setTemplate; // Alias for backward compatibility
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
    const undo = useEditorStore(state => state.undo);
    const redo = useEditorStore(state => state.redo);
    const canUndo = useEditorStore(state => state.canUndo);
    const canRedo = useEditorStore(state => state.canRedo);
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

    // Export function ref
    const exportFnRef = useRef(null);
    const previewExportRef = useRef(null);

    // Load existing template or reset for new
    useEffect(() => {
        if (isNewTemplate) {
            // Checks for last edited template in localStorage
            const lastSlug = localStorage.getItem('last_edited_template_slug');
            if (lastSlug && lastSlug !== 'new') {
                // Redirect to last template if it exists
                navigate(`/templates/${lastSlug}`, { replace: true });
                return;
            }
            // Reset to blank template for new designs
            resetTemplate();
        } else {
            loadTemplate();
        }
    }, [slug]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                redo();
            }
            if (e.key === 'Delete' && selectedIds.size > 0) {
                deleteSelected();
                toast.success('Element deleted');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIds, undo, redo, deleteSelected]);

    const loadTemplate = async () => {
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
            // Check if 404/not found, maybe clear last_slug?
            // But let's verify error type first.
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
        if (!exportFnRef.current) return null;

        try {
            // Export canvas as WebP for best compression
            const blob = await exportFnRef.current('webp', 0.7);
            if (!blob) return null;

            // Resize thumbnail for smaller file size (max 400px width)
            const resizedBlob = await resizeImage(blob, 400);

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
            const response = await fetch('/api/upload-thumbnail', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                console.warn('Thumbnail upload failed:', result);
                return null;
            }

            const thumbnailUrl = result.data?.url;
            if (thumbnailUrl) {
                return thumbnailUrl;
            }
            console.warn('Thumbnail upload response missing URL:', result);
            return null;
        } catch (error) {
            console.warn('Failed to generate/upload thumbnail:', error);
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
                // Generate from name using centralized utility
                templateSlug = generateSlug(template.name);
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
            const filename = title.replace(/[^a-z0-9\\s-]/gi, '').trim().replace(/\\s+/g, '-').toLowerCase();

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
    const handlePreview = () => {
        setIsPreviewOpen(!isPreviewOpen);
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
                    <OptimizedPinCanvas
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
                            onClick={() => setIsPreviewOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '100%', opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-14 bottom-0 w-[500px] bg-background/95 backdrop-blur-lg border-l border-border shadow-2xl z-[70] flex flex-col"
                        >
                            <div className="p-4 border-b">
                                <h2 className="font-semibold">Preview Template</h2>
                                <p className="text-sm text-muted-foreground">Preview with sample data</p>
                            </div>
                            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-zinc-900/50">
                                <OptimizedPinCanvas
                                    template={template}
                                    articleData={MOCK_ARTICLE_DATA}
                                    editable={false}
                                    scale={0.35}
                                    zoom={100}
                                    showGrid={false}
                                    onExport={(fn) => { previewExportRef.current = fn; }}
                                />
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </React.Fragment>
    );
};

export default OptimizedTemplateEditor;