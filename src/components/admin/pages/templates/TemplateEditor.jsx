import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    Save,
    ArrowLeft,
    Layers,
    Settings,
    Plus,
    GripVertical,
    Loader2,
    X,
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
import PinCanvas, { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../components/canvas/PinCanvas';
import { ElementPanel, AddElementPanel, FONTS } from '../../components/canvas/ElementPanel';
import CanvasToolbar from '../../components/canvas/CanvasToolbar';
import DraggableLayersList from '../../components/canvas/DraggableLayersList';
import { templatesAPI, mediaAPI } from '../../services/api';
import { useFontLoader } from '../../utils/FontLoader';

// Generate unique ID for elements
const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// History reducer for undo/redo
const historyReducer = (state, action) => {
    switch (action.type) {
        case 'SET':
            return {
                past: [...state.past, state.present].slice(-50),
                present: action.value,
                future: [],
            };
        case 'UNDO':
            if (state.past.length === 0) return state;
            return {
                past: state.past.slice(0, -1),
                present: state.past[state.past.length - 1],
                future: [state.present, ...state.future],
            };
        case 'REDO':
            if (state.future.length === 0) return state;
            return {
                past: [...state.past, state.present],
                present: state.future[0],
                future: state.future.slice(1),
            };
        case 'RESET':
            return { past: [], present: action.value, future: [] };
        default:
            return state;
    }
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

    // Template state
    const [template, setTemplate] = useState({
        name: 'New Template',
        slug: '',
        description: '',
        canvas_width: CANVAS_WIDTH,
        canvas_height: CANVAS_HEIGHT,
        background_color: '#1a1a2e',
        elements_json: [],
        thumbnail_url: '',
        is_default: false,
        is_active: true,
    });

    // Editor state with history
    const [history, dispatchHistory] = useReducer(historyReducer, {
        past: [],
        present: [],
        future: [],
    });
    const elements = history.present;

    // Preview state
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const [selectedElement, setSelectedElement] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!isNewTemplate);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Canvas controls
    const [zoom, setZoom] = useState(100);
    const [showGrid, setShowGrid] = useState(false);

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
                    dispatchHistory({ type: 'REDO' });
                } else {
                    dispatchHistory({ type: 'UNDO' });
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                dispatchHistory({ type: 'REDO' });
            }
            if (e.key === 'Delete' && selectedElement) {
                handleDeleteElement();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedElement]);

    const loadTemplate = async () => {
        try {
            setIsLoading(true);
            const response = await templatesAPI.getBySlug(slug);
            const data = response.data?.data || response.data;
            if (data) {
                setTemplate(data);
                const parsed = typeof data.elements_json === 'string'
                    ? JSON.parse(data.elements_json)
                    : data.elements_json || [];
                dispatchHistory({ type: 'RESET', value: parsed });
            }
        } catch (error) {
            console.error('Failed to load template:', error);
            toast.error('Failed to load template');
        } finally {
            setIsLoading(false);
        }
    };

    // Update elements with history
    const setElements = useCallback((newElements) => {
        const value = typeof newElements === 'function'
            ? newElements(elements)
            : newElements;
        dispatchHistory({ type: 'SET', value });
        setHasUnsavedChanges(true);
    }, [elements]);

    // Update template metadata with dirty flag
    const updateTemplate = useCallback((updates) => {
        setTemplate(prev => ({ ...prev, ...updates }));
        setHasUnsavedChanges(true);
    }, []);

    // Handle element selection from canvas
    const handleElementSelect = (element) => {
        setSelectedElement(element);
    };

    // Handle element update from panel
    const handleElementUpdate = (updatedElement) => {
        setElements(prev => prev.map(el =>
            el.id === updatedElement.id ? updatedElement : el
        ));
        setSelectedElement(updatedElement);
    };

    // Handle adding new element
    const handleAddElement = (type, defaults) => {
        const newElement = {
            id: generateId(),
            type,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${elements.length + 1}`,
            ...defaults,
        };
        setElements(prev => [...prev, newElement]);
        setSelectedElement(newElement);
        toast.success(`Added ${type}`);
    };

    // Handle element deletion
    const handleDeleteElement = () => {
        if (!selectedElement) return;
        setElements(prev => prev.filter(el => el.id !== selectedElement.id));
        setSelectedElement(null);
        toast.success('Element deleted');
    };

    // Handle element duplicate
    const handleDuplicateElement = () => {
        if (!selectedElement) return;
        const duplicate = {
            ...selectedElement,
            id: generateId(),
            name: `${selectedElement.name} Copy`,
            x: selectedElement.x + 20,
            y: selectedElement.y + 20,
        };
        setElements(prev => [...prev, duplicate]);
        setSelectedElement(duplicate);
        toast.success('Element duplicated');
    };

    // Handle element reordering
    const handleMoveUp = () => {
        if (!selectedElement) return;
        const index = elements.findIndex(el => el.id === selectedElement.id);
        if (index < elements.length - 1) {
            const newElements = [...elements];
            [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
            setElements(newElements);
        }
    };

    const handleMoveDown = () => {
        if (!selectedElement) return;
        const index = elements.findIndex(el => el.id === selectedElement.id);
        if (index > 0) {
            const newElements = [...elements];
            [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
            setElements(newElements);
        }
    };

    // Generate and upload thumbnail
    const uploadThumbnail = async (slugName) => {
        if (!exportFnRef.current) return null;

        try {
            // Export canvas as low quality jpeg for thumbnail
            const blob = await exportFnRef.current('jpeg', 0.8);
            if (!blob) return null;

            const filename = `template-thumb-${slugName}-${Date.now()}.jpg`;
            const file = new File([blob], filename, { type: 'image/jpeg' });

            // Upload via Media API
            const response = await mediaAPI.upload(file, {
                folder: 'thumbnails',
                alt: `Thumbnail for template ${slugName}`,
                contextSlug: slugName
            });

            // Handle both response formats: direct or wrapped in 'data'
            const thumbnailUrl = response.data?.data?.url || response.data?.url;
            if (thumbnailUrl) {
                return thumbnailUrl;
            }
            console.warn('Thumbnail upload response missing URL:', response.data);
            return null;
        } catch (error) {
            console.warn('Failed to generate/upload thumbnail:', error);
            return null;
        }
    };

    // Handle template save
    const handleSave = async () => {
        try {
            setIsSaving(true);

            // Generate slug if empty
            let templateSlug = template.slug;
            if (!templateSlug) {
                templateSlug = template.name
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-|-$/g, '');
            }

            // Attempt to generate thumbnail
            const thumbnailUrl = await uploadThumbnail(templateSlug);

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
                    setHasUnsavedChanges(false);
                    navigate(`/templates/${templateSlug}`);
                }
            } else {
                response = await templatesAPI.update(slug, templateData);
                const success = response.data?.success !== false;
                if (success) {
                    toast.success('Template saved!');
                    setHasUnsavedChanges(false);
                    setTemplate(prev => ({ ...prev, thumbnail_url: templateData.thumbnail_url }));
                }
            }
        } catch (error) {
            console.error('Failed to save template:', error);
            toast.error(`Failed to save: ${error.message}`);
        } finally {
            setIsSaving(false);
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

    // Template metadata form
    const renderMetadataPanel = () => (
        <div className="space-y-4 p-4">
            <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                    value={template.name}
                    onChange={(e) => updateTemplate({ name: e.target.value })}
                    placeholder="My Template"
                />
            </div>

            <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input
                    value={template.slug}
                    onChange={(e) => updateTemplate({ slug: e.target.value })}
                    placeholder="auto-generated"
                    className="font-mono text-sm"
                />
            </div>

            <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                    value={template.description || ''}
                    onChange={(e) => updateTemplate({ description: e.target.value })}
                    placeholder="Template description..."
                    rows={3}
                />
            </div>

            <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                    <input
                        type="color"
                        value={template.background_color}
                        onChange={(e) => updateTemplate({ background_color: e.target.value })}
                        className="w-10 h-10 rounded border cursor-pointer"
                    />
                    <Input
                        value={template.background_color}
                        onChange={(e) => updateTemplate({ background_color: e.target.value })}
                        className="font-mono"
                    />
                </div>
            </div>

            {template.thumbnail_url && (
                <div className="space-y-2">
                    <Label>Thumbnail</Label>
                    <div className="aspect-[2/3] w-24 rounded border border-zinc-700 overflow-hidden bg-muted">
                        <img
                            src={template.thumbnail_url}
                            alt="Template Thumbnail"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
            )}
        </div>
    );

    // Layers list
    const renderLayersPanel = () => (
        <DraggableLayersList
            elements={elements}
            selectedElement={selectedElement}
            onSelect={(el) => setSelectedElement(el)}
            onReorder={(newElements) => setElements(newElements)}
        />
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="template-editor h-full flex flex-col bg-background">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/templates')}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="font-semibold">
                                    {isNewTemplate ? 'New Template' : template.name}
                                </h1>
                                {hasUnsavedChanges && (
                                    <span className="w-2 h-2 bg-yellow-500 rounded-full" title="Unsaved changes" />
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {CANVAS_WIDTH} × {CANVAS_HEIGHT}px • Pinterest Pin
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {hasUnsavedChanges && (
                        <span className="text-xs text-muted-foreground mr-2">Unsaved changes</span>
                    )}
                    <Button onClick={handleSave} disabled={isSaving} className={hasUnsavedChanges ? 'animate-pulse' : ''}>
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Template'}
                    </Button>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Add Elements */}
                <div className="w-72 border-r bg-muted/20 flex flex-col">
                    <Tabs defaultValue="add" className="flex-1 flex flex-col">
                        <TabsList className="w-full grid grid-cols-3 m-2">
                            <TabsTrigger value="add" className="text-xs">
                                <Plus className="w-3 h-3 mr-1" />
                                Add
                            </TabsTrigger>
                            <TabsTrigger value="layers" className="text-xs">
                                <Layers className="w-3 h-3 mr-1" />
                                Layers
                            </TabsTrigger>
                            <TabsTrigger value="settings" className="text-xs">
                                <Settings className="w-3 h-3 mr-1" />
                                Settings
                            </TabsTrigger>
                        </TabsList>
                        <ScrollArea className="flex-1">
                            <TabsContent value="add" className="m-0 mt-0">
                                <AddElementPanel onAddElement={handleAddElement} />
                            </TabsContent>
                            <TabsContent value="layers" className="m-0 mt-0">
                                {renderLayersPanel()}
                            </TabsContent>
                            <TabsContent value="settings" className="m-0 mt-0">
                                {renderMetadataPanel()}
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </div>

                {/* Canvas Area */}
                <div className="flex-1 relative bg-[#0a0a14] overflow-hidden">
                    {/* Canvas Scroll Container */}
                    <div className="absolute inset-0 overflow-auto flex items-center justify-center p-8 pb-20">
                        <PinCanvas
                            template={{ ...template, elements_json: elements }}
                            editable={true}
                            scale={0.45}
                            zoom={zoom}
                            showGrid={showGrid}
                            onElementSelect={handleElementSelect}
                            onTemplateChange={setElements}
                            onExport={(fn) => { exportFnRef.current = fn; }}
                        />
                    </div>

                    {/* Floating Toolbar */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50">
                        <CanvasToolbar
                            zoom={zoom}
                            onZoomChange={setZoom}
                            showGrid={showGrid}
                            onGridToggle={() => setShowGrid(!showGrid)}
                            canUndo={history.past.length > 0}
                            canRedo={history.future.length > 0}
                            onUndo={() => dispatchHistory({ type: 'UNDO' })}
                            onRedo={() => dispatchHistory({ type: 'REDO' })}
                            onExport={handleExport}
                            onPreview={handlePreview}
                            onReset={() => {
                                dispatchHistory({ type: 'RESET', value: [] });
                                setSelectedElement(null);
                            }}
                        />
                    </div>
                </div>

                {/* Right Panel - Element Properties */}
                <div className="w-80 border-l bg-muted/20">
                    <ScrollArea className="h-full">
                        <ElementPanel
                            element={selectedElement}
                            onUpdate={handleElementUpdate}
                            onDelete={handleDeleteElement}
                            onDuplicate={handleDuplicateElement}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                        />
                    </ScrollArea>
                </div>
            </div>
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
                                template={{ ...template, elements_json: elements }}
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
        </div>
    );
};

export default TemplateEditor;
