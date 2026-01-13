import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import {
    LayoutTemplate,
    Type,
    Image as ImageIcon,
    Square,
    Layers,
    Upload,
    ChevronLeft,
    Search,
    Plus,
    X,
    Loader2,
    Settings,
    Trash2,
    Copy
} from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { ScrollArea } from '@/ui/scroll-area';
import { Separator } from '@/ui/separator';
import { toast } from 'sonner';

import useEditorStore from '../../../store/useEditorStore';
import { useUIStore } from '../../../store/useUIStore';
import DraggableLayersList from '../DraggableLayersList';
import { mediaAPI, templatesAPI } from '@admin/services/api';
import ColorPicker from '@admin/components/ColorPicker';
import FontsPanel from './FontsPanel';
import TextEffectsPanel from './TextEffectsPanel';
import ConfirmationModal from '@/ui/confirmation-modal';
import { cleanDuplicateSlug } from '../../../utils/slugUtils';

const TABS = [
    { id: 'templates', icon: LayoutTemplate, label: 'Templates' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'photos', icon: ImageIcon, label: 'Photos' },
    { id: 'elements', icon: Square, label: 'Elements' },
    { id: 'uploads', icon: Upload, label: 'Uploads' },
    { id: 'layers', icon: Layers, label: 'Layers' },
    { id: 'settings', icon: Settings, label: 'Settings' },
];

const SidePanel = () => {
    const navigate = useNavigate();
    // Store
    const activeTab = useEditorStore(state => state.activeTab);
    const setActiveTab = useEditorStore(state => state.setActiveTab);
    const activePanel = useEditorStore(state => state.activePanel);
    const setActivePanel = useEditorStore(state => state.setActivePanel);
    const updateElement = useEditorStore(state => state.updateElement);
    const addElement = useEditorStore(state => state.addElement);
    const template = useEditorStore(state => state.template);
    const setTemplate = useEditorStore(state => state.setTemplate);
    const elements = useEditorStore(state => state.elements);
    const setElements = useEditorStore(state => state.setElements);
    const selectedIds = useEditorStore(state => state.selectedIds);
    const selectElement = useEditorStore(state => state.selectElement);
    const reorderElements = useEditorStore(state => state.reorderElements);
    const hasUnsavedChanges = useEditorStore(state => state.hasUnsavedChanges);
    const loadTemplateToStore = useEditorStore(state => state.loadTemplateToStore);

    // Theme
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const toggleLock = useEditorStore(state => state.toggleLock);

    // Local state for contents
    const [templates, setTemplates] = useState([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);
    const bgColorTriggerRef = useRef(null);

    // Derived selected element for layers
    const selectedElement = elements.find(el => selectedIds.has(el.id));

    // Load templates on mount/tab change
    useEffect(() => {
        if (activeTab === 'templates' && templates.length === 0) {
            loadTemplates();
        }
    }, [activeTab]);

    // Listen for template save events to update the list
    useEffect(() => {
        const handleTemplateSaved = (event) => {
            const { template: savedTemplate, isNew } = event.detail || {};
            if (!savedTemplate) return;

            setTemplates(prev => {
                if (isNew) {
                    // Add new template to the beginning of the list
                    return [savedTemplate, ...prev];
                } else {
                    // Update existing template in place
                    return prev.map(t => t.slug === savedTemplate.slug ? { ...t, ...savedTemplate } : t);
                }
            });
        };
        window.addEventListener('template:saved', handleTemplateSaved);
        return () => window.removeEventListener('template:saved', handleTemplateSaved);
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoadingTemplates(true);
            const response = await templatesAPI.getAll();
            const data = response.data?.data || response.data || [];
            if (Array.isArray(data)) {
                setTemplates(data);
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    // Handle File Upload
    const fileInputRef = useRef(null);
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Invalid file type');
            return;
        }

        try {
            setIsUploading(true);
            const response = await mediaAPI.upload(file, {
                folder: 'canvas-elements',
                alt: file.name.replace(/\.[^/.]+$/, ''),
            });

            const imageUrl = response.data?.data?.url || response.data?.url;
            if (!imageUrl) throw new Error('No URL returned');

            // Add to canvas
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                let width = img.naturalWidth;
                let height = img.naturalHeight;
                // Scale logic could be here, but let's keep it simple
                if (width > 800) {
                    const ratio = 800 / width;
                    width = 800;
                    height = Math.round(height * ratio);
                }

                addElement('imageSlot', {
                    width,
                    height,
                    x: 100, // Default position
                    y: 100,
                    sourceType: 'upload',
                    imageUrl: imageUrl,
                    name: file.name.replace(/\.[^/.]+$/, '')
                });

                toast.success('Image added');
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            };
            img.src = imageUrl;

        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Upload failed');
            setIsUploading(false);
        }
    };

    const handleAddText = (style) => {
        const defaults = {
            content: style === 'heading' ? 'Heading' : style === 'subheading' ? 'Subheading' : 'Body Text',
            fontSize: style === 'heading' ? 64 : style === 'subheading' ? 48 : 32,
            fontWeight: style === 'heading' ? 'bold' : 'normal',
            width: 400,
            x: 300,
            y: 500
        };
        addElement('text', defaults);
    };

    const handleAddShape = (type) => {
        if (type === 'rectangle') {
            addElement('shape', {
                width: 300, height: 200, fill: '#6366f1', x: 350, y: 500
            });
        } else if (type === 'circle') {
            // Shapes in our system are currently rects, assuming 'shape' type handles borderRadius
            // We can simulate circle with borderRadius
            addElement('shape', {
                width: 200, height: 200, fill: '#ef4444', x: 350, y: 500, borderRadius: 100
            });
        }
    };

    const handleAddImageSlot = () => {
        addElement('imageSlot', {
            width: 400,
            height: 400,
            x: 300,
            y: 500,
            name: 'Image Slot',
            borderRadius: 0,
        });
    };

    // Execute functions for confirmation actions (must be outside renderContent for scope)
    const executeLoadTemplate = (t) => {
        const elements = typeof t.elements_json === 'string' ? JSON.parse(t.elements_json) : t.elements_json;
        loadTemplateToStore(t, elements);
        navigate(`/templates/${t.slug}`);
        toast.success('Template loaded');
    };

    const executeDeleteTemplate = async (templateSlug) => {
        try {
            await templatesAPI.delete(templateSlug);
            setTemplates(prev => prev.filter(t => t.slug !== templateSlug));

            // Clear localStorage if the deleted template was the last edited one
            const lastSlug = localStorage.getItem('last_edited_template_slug');
            if (lastSlug === templateSlug) {
                localStorage.removeItem('last_edited_template_slug');
            }

            toast.success('Template deleted');
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete template');
        }
    };

    // Confirmation State
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        type: null, // 'delete_template' | 'unsaved_changes'
        data: null,
        title: '',
        description: ''
    });

    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    const handleConfirmAction = () => {
        if (confirmState.type === 'delete_template') {
            const templateSlug = confirmState.data;
            executeDeleteTemplate(templateSlug);
        } else if (confirmState.type === 'unsaved_changes') {
            const template = confirmState.data;
            executeLoadTemplate(template);
        }
        closeConfirm();
    };

    // Render Tab Content
    const renderContent = () => {
        // Handle template switch with unsaved changes warning
        const handleTemplateClick = (t) => {
            if (hasUnsavedChanges) {
                setConfirmState({
                    isOpen: true,
                    type: 'unsaved_changes',
                    data: t,
                    title: 'Unsaved Changes',
                    description: 'You have unsaved changes. Discard them and load this template?',
                    confirmText: 'Discard & Load'
                });
            } else {
                executeLoadTemplate(t);
            }
        };

        const handleDeleteTemplate = async (e, templateSlug) => {
            e.stopPropagation();
            setConfirmState({
                isOpen: true,
                type: 'delete_template',
                data: templateSlug,
                title: 'Delete Template?',
                description: 'This action cannot be undone. Typically we archive, but this is a permanent delete.',
                confirmText: 'Delete'
            });
        };

        // Handle template duplicate
        const handleDuplicateTemplate = async (e, templateToCopy) => {
            e.stopPropagation();
            try {
                // Create unique slug using centralized utility
                const newSlug = cleanDuplicateSlug(templateToCopy.slug);

                const newTemplateData = {
                    ...templateToCopy,
                    name: `${templateToCopy.name} (Copy)`,
                    slug: newSlug,
                    id: undefined // Let DB assign new ID
                };

                // Remove ID and timestamps from payload if API doesn't handle them
                delete newTemplateData.id;
                delete newTemplateData.created_at;
                delete newTemplateData.updated_at;

                const response = await templatesAPI.create(newTemplateData);
                const success = response.data?.success !== false;

                if (success) {
                    toast.success('Template duplicated');
                    // Add to list immediately or reload
                    loadTemplates();
                } else {
                    throw new Error('Duplicate failed');
                }
            } catch (error) {
                console.error('Duplicate failed:', error);
                toast.error('Failed to duplicate template');
            }
        };

        switch (activeTab) {
            case 'templates':
                return (
                    <div className="p-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search templates..." className={`pl-8 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {isLoadingTemplates ? (
                                <div className="col-span-2 text-center py-12 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
                                    <p className="text-xs">Loading templates...</p>
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="col-span-2 text-center py-12 px-4 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                                    <p className="text-sm font-medium text-muted-foreground mb-1">No templates found</p>
                                    <p className="text-xs text-zinc-400">Create a new design to save as a template</p>
                                </div>
                            ) : (
                                templates.map((t, index) => (
                                    <motion.div
                                        key={t.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05, duration: 0.3 }}
                                        whileHover={{ scale: 1.05, zIndex: 10 }}
                                        role="button"
                                        tabIndex={0}
                                        className={`group relative aspect-[2/3] rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all border cursor-pointer ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}
                                        onClick={() => handleTemplateClick(t)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleTemplateClick(t);
                                            }
                                        }}
                                    >
                                        {/* Thumbnail */}
                                        {t.thumbnail_url ? (
                                            <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className={`w-full h-full flex flex-col items-center justify-center gap-2 p-4 ${isDark ? 'text-zinc-600' : 'text-zinc-300'}`} style={{ backgroundColor: t.background_color || (isDark ? '#27272a' : '#f4f4f5') }}>
                                                <LayoutTemplate className="w-8 h-8 opacity-50" />
                                            </div>
                                        )}

                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                        {/* Actions */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col gap-2 transform translate-y-2 group-hover:translate-y-0">
                                            {/* Duplicate Button */}
                                            <button
                                                onClick={(e) => handleDuplicateTemplate(e, t)}
                                                className="p-1.5 bg-blue-500 text-white rounded-full hover:bg-blue-600 shadow-lg hover:scale-110 transition-all"
                                                title="Duplicate template"
                                            >
                                                <Copy className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Delete Button */}
                                            <button
                                                onClick={(e) => handleDeleteTemplate(e, t.slug)}
                                                className="p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg hover:scale-110 transition-all"
                                                title="Delete template"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>

                                        {/* Content Info */}
                                        <div className="absolute inset-x-0 bottom-0 p-3 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-black/60 backdrop-blur-sm">
                                            <p className="text-xs font-semibold text-white truncate text-left">{t.name}</p>
                                            {t.category && <p className="text-[10px] text-zinc-300 truncate text-left">{t.category}</p>}
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </div>

                        {/* Confirmation Modal */}
                        <ConfirmationModal
                            isOpen={confirmState.isOpen}
                            onClose={closeConfirm}
                            onConfirm={handleConfirmAction}
                            title={confirmState.title}
                            description={confirmState.description}
                            confirmText={confirmState.confirmText || 'Confirm'}
                        />
                    </div>
                );
            case 'text':
                return (
                    <div className="p-4 space-y-4">
                        <Button
                            className={`w-full h-12 text-lg font-bold justify-start px-4 ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'}`}
                            variant="ghost"
                            onClick={() => handleAddText('heading')}
                        >
                            Add a Heading
                        </Button>
                        <Button
                            className={`w-full h-10 text-base font-medium justify-start px-4 ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'}`}
                            variant="ghost"
                            onClick={() => handleAddText('subheading')}
                        >
                            Add a Subheading
                        </Button>
                        <Button
                            className={`w-full h-8 text-sm justify-start px-4 ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900'}`}
                            variant="ghost"
                            onClick={() => handleAddText('body')}
                        >
                            Add body text
                        </Button>

                        <Separator className={`${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

                        {/* Font Management Section */}
                        <FontsPanel />
                    </div>
                );
            case 'elements':
                return (
                    <div className="p-4 space-y-4">
                        <h3 className={`text-sm font-medium mb-2 ${isDark ? '' : 'text-zinc-900'}`}>Image Slot</h3>
                        <button
                            className={`w-full h-20 rounded border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-600' : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-300'}`}
                            onClick={handleAddImageSlot}
                        >
                            <ImageIcon className={`w-6 h-6 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`} />
                            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Add Image Placeholder</span>
                        </button>

                        <Separator className={`${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

                        <h3 className={`text-sm font-medium mb-2 ${isDark ? '' : 'text-zinc-900'}`}>Shapes</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button className={`aspect-square rounded flex items-center justify-center ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`} onClick={() => handleAddShape('rectangle')}>
                                <div className="w-8 h-8 bg-zinc-400 rounded-sm" />
                            </button>
                            <button className={`aspect-square rounded flex items-center justify-center ${isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-zinc-100 hover:bg-zinc-200'}`} onClick={() => handleAddShape('circle')}>
                                <div className="w-8 h-8 bg-zinc-400 rounded-full" />
                            </button>
                        </div>
                    </div>
                );
            case 'uploads':
                return (
                    <div className="p-4 space-y-4">
                        <Button className="w-full" onClick={() => fileInputRef.current?.click()}>
                            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            Upload Media
                        </Button>
                        <input
                            type="file"
                            className="hidden"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileUpload}
                        />
                        <p className="text-xs text-center text-muted-foreground">
                            Drag images from here onto the canvas to create new image slots.
                        </p>
                        {/* Placeholder for uploaded images list if we were persisting them */}
                    </div>
                );
            case 'settings':
                const CANVAS_PRESETS = [
                    { name: 'Pinterest Pin', width: 1000, height: 1500 },
                    { name: 'Pinterest Square', width: 1000, height: 1000 },
                    { name: 'Instagram Story', width: 1080, height: 1920 },
                    { name: 'Instagram Post', width: 1080, height: 1080 },
                    { name: 'Facebook Post', width: 1200, height: 630 },
                    { name: 'Twitter Post', width: 1200, height: 675 },
                ];
                const currentPreset = CANVAS_PRESETS.find(p =>
                    p.width === (template.width || 1000) && p.height === (template.height || 1500)
                );
                return (
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Template Name</label>
                            <Input
                                value={template.name || ''}
                                onChange={(e) => setTemplate({ name: e.target.value })}
                                className={`${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Description</label>
                            <textarea
                                className={`flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${isDark ? 'border-zinc-800 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-900'}`}
                                value={template.description || ''}
                                onChange={(e) => setTemplate({ description: e.target.value })}
                                placeholder="Template description..."
                            />
                        </div>
                        <Separator className={`${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />
                        <div className="space-y-2 relative">
                            <label className="text-xs font-medium text-muted-foreground">Background Color</label>
                            <div className="flex gap-2">
                                <div
                                    ref={bgColorTriggerRef}
                                    className="w-10 h-10 rounded border border-zinc-700 cursor-pointer hover:ring-2 hover:ring-primary/50"
                                    style={{ backgroundColor: template.background_color || '#ffffff' }}
                                    onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                                />
                                <Input
                                    value={template.background_color || '#ffffff'}
                                    onChange={(e) => setTemplate({ background_color: e.target.value })}
                                    className={`flex-1 font-mono ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}
                                />
                            </div>
                            {showBgColorPicker && (
                                <ColorPicker
                                    color={template.background_color || '#ffffff'}
                                    onChange={(color) => setTemplate({ background_color: color })}
                                    onClose={() => setShowBgColorPicker(false)}
                                    triggerRect={bgColorTriggerRef.current?.getBoundingClientRect()}
                                />
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Canvas Size</label>
                            <select
                                value={`${template.width || 1000}x${template.height || 1500}`}
                                onChange={(e) => {
                                    const preset = CANVAS_PRESETS.find(p => `${p.width}x${p.height}` === e.target.value);
                                    if (preset) {
                                        // Calculate scale ratio
                                        const oldW = template.width || 1000;
                                        const oldH = template.height || 1500;
                                        const scaleX = preset.width / oldW;
                                        const scaleY = preset.height / oldH;

                                        // Resize elements proportionally
                                        const newElements = elements.map(el => ({
                                            ...el,
                                            x: el.x * scaleX,
                                            y: el.y * scaleY,
                                            width: el.width * scaleX,
                                            height: el.height * scaleY,
                                            fontSize: el.fontSize ? el.fontSize * Math.min(scaleX, scaleY) : el.fontSize
                                        }));
                                        setElements(newElements);

                                        setTemplate({
                                            width: preset.width,
                                            height: preset.height,
                                            canvas_width: preset.width,
                                            canvas_height: preset.height
                                        });
                                    }
                                }}
                                className={`w-full h-10 px-3 rounded-md border text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}
                            >
                                {CANVAS_PRESETS.map((preset) => (
                                    <option key={`${preset.width}x${preset.height}`} value={`${preset.width}x${preset.height}`}>
                                        {preset.name} ({preset.width}×{preset.height})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-muted-foreground">Scale</label>
                                <span className="text-xs text-zinc-400 font-mono">
                                    {template.width || 1000}×{template.height || 1500}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min="10"
                                    max="30"
                                    step="1"
                                    value={Math.round(((template.width || 1000) / (currentPreset?.width || 1000)) * 10)}
                                    onChange={(e) => {
                                        const scale = parseInt(e.target.value, 10) / 10;
                                        const baseWidth = currentPreset?.width || 1000;
                                        const baseHeight = currentPreset?.height || 1500;

                                        const newWidth = Math.round(baseWidth * scale);
                                        const newHeight = Math.round(baseHeight * scale);

                                        // Calculate scale relative to CURRENT size (not base)
                                        const currentW = template.width || 1000;
                                        const currentH = template.height || 1500;
                                        // Avoid division by zero
                                        if (currentW === 0 || currentH === 0) return;

                                        const sX = newWidth / currentW;
                                        const sY = newHeight / currentH;

                                        // Resize elements
                                        const newElements = elements.map(el => ({
                                            ...el,
                                            x: el.x * sX,
                                            y: el.y * sY,
                                            width: el.width * sX,
                                            height: el.height * sY,
                                            fontSize: el.fontSize ? el.fontSize * Math.min(sX, sY) : el.fontSize
                                        }));
                                        setElements(newElements);

                                        setTemplate({
                                            width: newWidth,
                                            height: newHeight,
                                            canvas_width: newWidth,
                                            canvas_height: newHeight
                                        });
                                    }}
                                    className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                                    style={{
                                        background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${(((template.width || 1000) / (currentPreset?.width || 1000)) * 10 - 10) / 0.2}%, ${isDark ? '#3f3f46' : '#e4e4e7'} ${(((template.width || 1000) / (currentPreset?.width || 1000)) * 10 - 10) / 0.2}%, ${isDark ? '#3f3f46' : '#e4e4e7'} 100%)`
                                    }}
                                />
                                <span className={`w-12 text-center text-xs font-mono px-2 py-1 rounded ${isDark ? 'text-white bg-zinc-800' : 'text-zinc-900 bg-zinc-100'}`}>
                                    ×{(((template.width || 1000) / (currentPreset?.width || 1000))).toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                );
            case 'layers':
                return (
                    <div className="flex-1 overflow-hidden">
                        <DraggableLayersList
                            elements={elements}
                            selectedElement={selectedElement}
                            onSelect={(el) => selectElement(el?.id || null)}
                            onReorder={reorderElements}
                            onToggleLock={toggleLock}
                        />
                    </div>
                );
            default:
                return (
                    <div className="p-4 text-center text-muted-foreground">
                        Coming Soon
                    </div>
                );
        }
    };

    return (
        <div className="relative flex h-full select-none">
            {/* Icons Strip */}
            <div className={`w-16 border-r flex flex-col items-center py-4 gap-4 z-50 ${isDark ? 'bg-[#18181b] border-[#27272a]' : 'bg-white border-zinc-200'
                }`}>
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(activeTab === tab.id ? null : tab.id);
                            setActivePanel('default'); // Close effects panel when switching tabs
                        }}
                        className={`flex flex-col items-center gap-1 w-full py-2 transition-colors ${activeTab === tab.id
                            ? (isDark ? 'text-white' : 'text-primary')
                            : (isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-500 hover:text-zinc-900')
                            }`}
                        title={tab.label}
                        aria-label={`Open ${tab.label} panel`}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Drawer with smooth animations - overlays content */}
            <AnimatePresence>
                {(activeTab || activePanel === 'effects') && (
                    <motion.div
                        initial={{ x: -256 }}
                        animate={{ x: 0 }}
                        exit={{ x: -256 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        className={`absolute left-16 top-0 bottom-0 w-64 border-r flex flex-col z-40 overflow-hidden shadow-xl ${isDark ? 'bg-[#1e1e2e] border-[#27272a]' : 'bg-white border-zinc-200'}`}
                    >
                        {activePanel === 'effects' ? (
                            <TextEffectsPanel
                                selectedElement={selectedElement}
                                updateElement={updateElement}
                                onClose={() => setActivePanel('default')}
                            />
                        ) : (
                            <>
                                <div className={`h-12 border-b flex items-center justify-between px-4 ${isDark ? 'bg-[#1e1e2e] border-[#27272a]' : 'bg-white border-zinc-200'}`}>
                                    <span className={`font-medium ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                        {TABS.find(t => t.id === activeTab)?.label}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
                                        onClick={() => setActiveTab(null)}
                                        aria-label="Close panel"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                </div>
                                <ScrollArea className={`flex-1 ${isDark ? 'bg-[#1e1e2e]' : 'bg-white'}`}>
                                    {renderContent()}
                                </ScrollArea>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SidePanel;
