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
import PinCanvas from '../canvas/PinCanvas';
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
        const objectUrl = URL.createObjectURL(blob);

        img.onload = () => {
            // Clean up object URL to prevent memory leak
            URL.revokeObjectURL(objectUrl);

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

        img.src = objectUrl;
    });
};

// Force browsers/CDN to fetch the fresh thumbnail (stable key is reused)
const addCacheBust = (url) => {
    if (!url) return url;
    const stamp = `v=${Date.now()}`;
    return url.includes('?') ? `${url}&${stamp}` : `${url}?${stamp}`;
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
 * TemplateEditor - Professional Canva-like template designer
 */
const TemplateEditor = () => {
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

    // Reset export refs when template changes (route slug OR in-app template switch)
    useEffect(() => {
        exportFnRef.current = null;
        previewExportRef.current = null;
    }, [slug, template?.slug, template?.id]);

    // Load existing template or reset for new
    useEffect(() => {
        if (isNewTemplate) {
            resetTemplate();
            return;
        }

        // If a template switch already populated the store, avoid reloading
        if (template?.slug === slug) {
            return;
        }

        loadTemplate();
    }, [slug, template?.slug]);

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
        } catch (error: any) {
            console.error('Failed to load template:', error);

            // If template not found (deleted), clear localStorage and redirect to new
            const is404 = error?.response?.status === 404 ||
                error?.status === 404 ||
                error?.message?.includes('not found');

            if (is404) {
                localStorage.removeItem('last_edited_template_slug');
                toast.error('Template not found - it may have been deleted');
                navigate('/templates/new', { replace: true });
            } else {
                toast.error('Failed to load template');
            }
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

    // Generate and upload thumbnail with stable URL (overwrites existing)
    const uploadThumbnail = async (slugName: string) => {
        console.log('[Thumbnail] Starting upload for:', slugName);
        console.log('[Thumbnail] exportFnRef.current:', exportFnRef.current);

        if (!exportFnRef.current) {
            console.warn('[Thumbnail] FAILED: exportFnRef.current is NULL');
            return null;
        }

        try {
            console.log('[Thumbnail] Exporting canvas as WebP...');
            // Export canvas as WebP for best compression
            const blob = await exportFnRef.current('webp', 0.7);
            console.log('[Thumbnail] Export result:', blob);
            if (!blob) {
                console.warn('[Thumbnail] FAILED: blob is null');
                return null;
            }

            // Resize thumbnail for smaller file size (max 400px width)
            const resizedBlob = await resizeImage(blob, 400);

            // Use stable filename - same URL will be overwritten on each save
            const filename = `thumb-${slugName}.webp`;
            const file = new File([resizedBlob], filename, { type: 'image/webp' });

            // Build form data
            const formData = new FormData();
            formData.append('file', file);
            formData.append('templateSlug', slugName);

            // Upload via dedicated thumbnail API (overwrites existing file)
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

            return result.data?.url || null;
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
            const isCreating = !template.id;

            // Generate slug if empty (for new templates)
            let templateSlug = template.slug;
            if (!templateSlug) {
                templateSlug = generateSlug(template.name);
            }

            // Step 1: Save template WITHOUT changing thumbnail_url yet
            // Keep existing URL (or null for new templates)
            const templateData = {
                ...template,
                slug: templateSlug,
                elements_json: JSON.stringify(elements),
                // Keep existing thumbnail URL for now
                thumbnail_url: template.thumbnail_url || null
            };

            let response;
            let saveSuccess = false;

            if (isCreating) {
                response = await templatesAPI.create(templateData);
                saveSuccess = response.data?.success !== false;
                if (saveSuccess) {
                    toast.success('Template created!');
                    const createdSlug = response.data?.slug || templateSlug;
                    const createdId = response.data?.id ?? null;

                    // Upload thumbnail BEFORE navigation (exportFnRef will be null after navigate)
                    const uploadedUrl = await uploadThumbnail(createdSlug);
                    const finalThumbnailUrl = addCacheBust(uploadedUrl || template.thumbnail_url || null);
                    if (finalThumbnailUrl) {
                        await templatesAPI.update(createdSlug, { thumbnail_url: finalThumbnailUrl });
                    }

                    // Refresh store with saved data so subsequent saves go through update path
                    loadTemplateToStore(
                        {
                            ...templateData,
                            id: createdId,
                            slug: createdSlug,
                            thumbnail_url: finalThumbnailUrl
                        },
                        elements
                    );
                    markSaved();

                    window.dispatchEvent(new CustomEvent('template:saved', {
                        detail: {
                            template: { ...templateData, id: createdId, slug: createdSlug, thumbnail_url: finalThumbnailUrl },
                            isNew: true
                        }
                    }));
                    navigate(`/templates/${createdSlug}`);
                }
            } else {
                response = await templatesAPI.update(template.slug, templateData);
                saveSuccess = response.data?.success !== false;
                if (saveSuccess) {
                    toast.success('Template saved!');

                    // Upload thumbnail for existing templates
                    const uploadedUrl = await uploadThumbnail(templateSlug);
                    if (uploadedUrl) {
                        const cacheBustedUrl = addCacheBust(uploadedUrl);
                        await templatesAPI.update(templateSlug, { thumbnail_url: cacheBustedUrl });
                        setTemplate({ thumbnail_url: cacheBustedUrl });
                        templateData.thumbnail_url = cacheBustedUrl;
                    }

                    markSaved();

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
                    <PinCanvas
                        key={template?.slug || template?.id || 'new'}
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
                                <PinCanvas
                                    key={`preview-${template?.slug || template?.id || 'new'}`}
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

export default TemplateEditor;

