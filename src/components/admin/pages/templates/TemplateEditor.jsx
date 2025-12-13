import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import PinCanvas from '../../components/canvas/PinCanvas';
import { FONTS } from '../../components/canvas/ElementPanel'; // Keep FONTS for loader
// import CanvasToolbar from '../../components/canvas/CanvasToolbar'; // Deprecated
// import DraggableLayersList from '../../components/canvas/DraggableLayersList'; // Deprecated
import EditorLayout from '../../components/canvas/modern/EditorLayout';
import { templatesAPI, mediaAPI } from '../../services/api';
import { useFontLoader } from '../../utils/FontLoader';
import useEditorStore, { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../store/useEditorStore';



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

    // Load existing template
    useEffect(() => {
        if (!isNewTemplate) {
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
            }
        } catch (error) {
            console.error('Failed to load template:', error);
            toast.error('Failed to load template');
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
            // Export canvas as low quality jpeg for thumbnail
            const blob = await exportFnRef.current('jpeg', 0.8);
            if (!blob) return null;

            const filename = `template-thumb-${slugName}-${Date.now()}.jpg`;
            const file = new File([blob], filename, { type: 'image/jpeg' });

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
            if (isNewTemplate) {
                response = await templatesAPI.create(templateData);
                const success = response.data?.success !== false;
                if (success) {
                    toast.success('Template created!');
                    markSaved();
                    navigate(`/templates/${templateSlug}`);
                }
            } else {
                response = await templatesAPI.update(slug, templateData);
                const success = response.data?.success !== false;
                if (success) {
                    toast.success('Template saved!');
                    markSaved();
                    setTemplate({ thumbnail_url: templateData.thumbnail_url });
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

    // Handle preview
    const handlePreview = () => {
        setIsPreviewOpen(true);
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
            <EditorLayout onExport={handleSave} onPreview={handlePreview}>
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

            {/* Preview Modal */}
            <Dialog open={isPreviewOpen} onOpenChange={handlePreviewOpenChange}>
                <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background/95 border-none shadow-2xl">
                    <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                        <div>
                            <DialogTitle>Preview Template</DialogTitle>
                            <DialogDescription>
                                Preview with sample data to simulate final result.
                            </DialogDescription>
                        </div>
                        <Button onClick={handleDownloadPreview} size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Export Pin
                        </Button>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[#0a0a14]">
                        {isPreviewOpen && (
                            <PinCanvas
                                template={template}
                                articleData={MOCK_ARTICLE_DATA}
                                editable={false}
                                scale={0.5}
                                zoom={100}
                                showGrid={false}
                                onExport={(fn) => { previewExportRef.current = fn; }}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </React.Fragment>
    );
};

export default TemplateEditor;
