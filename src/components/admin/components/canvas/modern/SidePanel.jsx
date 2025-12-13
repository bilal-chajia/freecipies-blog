import React, { useRef, useState, useEffect } from 'react';
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
    Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

import useEditorStore from '../../../store/useEditorStore';
import DraggableLayersList from '../DraggableLayersList';
import { mediaAPI, templatesAPI } from '../../../services/api';
import ColorPicker from '../../ColorPicker';
import FontsPanel from './FontsPanel';

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
    // Store
    const activeTab = useEditorStore(state => state.activeTab);
    const setActiveTab = useEditorStore(state => state.setActiveTab);
    const addElement = useEditorStore(state => state.addElement);
    const template = useEditorStore(state => state.template);
    const setTemplate = useEditorStore(state => state.setTemplate);
    const elements = useEditorStore(state => state.elements);
    const selectedIds = useEditorStore(state => state.selectedIds);
    const selectElement = useEditorStore(state => state.selectElement);
    const reorderElements = useEditorStore(state => state.reorderElements);
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

    // Render Tab Content
    const renderContent = () => {
        switch (activeTab) {
            case 'templates':
                return (
                    <div className="p-4 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search templates..." className="pl-8 bg-zinc-900 border-zinc-800" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {isLoadingTemplates ? (
                                <div className="col-span-2 text-center py-8 text-muted-foreground">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading...
                                </div>
                            ) : templates.length === 0 ? (
                                <p className="col-span-2 text-center text-sm text-muted-foreground">No templates found</p>
                            ) : (
                                templates.map(t => (
                                    <button
                                        key={t.id}
                                        className="aspect-[2/3] bg-zinc-800 rounded overflow-hidden hover:ring-2 ring-primary transition-all relative group"
                                        onClick={() => {
                                            const elements = typeof t.elements_json === 'string' ? JSON.parse(t.elements_json) : t.elements_json;
                                            useEditorStore.getState().loadTemplate(t, elements);
                                            toast.success('Template loaded');
                                        }}
                                    >
                                        {t.thumbnail_url ? (
                                            <img src={t.thumbnail_url} alt={t.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No Preview</div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 text-xs truncate">
                                            {t.name}
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                );
            case 'text':
                return (
                    <div className="p-4 space-y-4">
                        <Button
                            className="w-full h-12 text-lg font-bold bg-zinc-800 hover:bg-zinc-700 justify-start px-4"
                            variant="ghost"
                            onClick={() => handleAddText('heading')}
                        >
                            Add a Heading
                        </Button>
                        <Button
                            className="w-full h-10 text-base font-medium bg-zinc-800 hover:bg-zinc-700 justify-start px-4"
                            variant="ghost"
                            onClick={() => handleAddText('subheading')}
                        >
                            Add a Subheading
                        </Button>
                        <Button
                            className="w-full h-8 text-sm bg-zinc-800 hover:bg-zinc-700 justify-start px-4"
                            variant="ghost"
                            onClick={() => handleAddText('body')}
                        >
                            Add body text
                        </Button>

                        <Separator className="bg-zinc-800" />

                        {/* Font Management Section */}
                        <FontsPanel />
                    </div>
                );
            case 'elements':
                return (
                    <div className="p-4 space-y-4">
                        <h3 className="text-sm font-medium mb-2">Image Slot</h3>
                        <button
                            className="w-full h-20 bg-zinc-800 rounded hover:bg-zinc-700 border-2 border-dashed border-zinc-600 flex flex-col items-center justify-center gap-2 transition-colors"
                            onClick={handleAddImageSlot}
                        >
                            <ImageIcon className="w-6 h-6 text-zinc-400" />
                            <span className="text-xs text-zinc-400">Add Image Placeholder</span>
                        </button>

                        <Separator className="bg-zinc-800" />

                        <h3 className="text-sm font-medium mb-2">Shapes</h3>
                        <div className="grid grid-cols-3 gap-2">
                            <button className="aspect-square bg-zinc-800 rounded hover:bg-zinc-700 flex items-center justify-center" onClick={() => handleAddShape('rectangle')}>
                                <div className="w-8 h-8 bg-zinc-400 rounded-sm" />
                            </button>
                            <button className="aspect-square bg-zinc-800 rounded hover:bg-zinc-700 flex items-center justify-center" onClick={() => handleAddShape('circle')}>
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
                return (
                    <div className="p-4 space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Template Name</label>
                            <Input
                                value={template.name || ''}
                                onChange={(e) => setTemplate({ name: e.target.value })}
                                className="bg-zinc-900 border-zinc-800"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Slug</label>
                            <Input
                                value={template.slug || ''}
                                onChange={(e) => setTemplate({ slug: e.target.value })}
                                className="bg-zinc-900 border-zinc-800 font-mono text-xs"
                                placeholder="Auto-generated"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Description</label>
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={template.description || ''}
                                onChange={(e) => setTemplate({ description: e.target.value })}
                                placeholder="Template description..."
                            />
                        </div>
                        <Separator className="bg-zinc-800" />
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
                                    className="flex-1 bg-zinc-900 border-zinc-800 font-mono"
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
                            <label className="text-xs font-medium text-muted-foreground">Dimensions</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-[10px] text-zinc-500">Width</span>
                                    <Input
                                        type="number"
                                        value={template.width || 1000}
                                        disabled
                                        className="bg-zinc-900/50 border-zinc-800 text-zinc-500"
                                    />
                                </div>
                                <div>
                                    <span className="text-[10px] text-zinc-500">Height</span>
                                    <Input
                                        type="number"
                                        value={template.height || 1500}
                                        disabled
                                        className="bg-zinc-900/50 border-zinc-800 text-zinc-500"
                                    />
                                </div>
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
        <div className="flex h-full select-none">
            {/* Icons Strip */}
            <div className="w-16 bg-[#18181b] border-r border-[#27272a] flex flex-col items-center py-4 gap-4 z-20">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                        className={`flex flex-col items-center gap-1 w-full py-2 transition-colors ${activeTab === tab.id ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        title={tab.label}
                        aria-label={`Open ${tab.label} panel`}
                    >
                        <tab.icon className="w-5 h-5" />
                        <span className="text-[10px] font-medium">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Drawer */}
            {activeTab && (
                <div className="w-64 bg-[#1e1e2e] border-r border-[#27272a] flex flex-col z-10 animate-in slide-in-from-left duration-200">
                    <div className="h-12 border-b border-[#27272a] flex items-center justify-between px-4 bg-[#1e1e2e]">
                        <span className="font-medium text-white">
                            {TABS.find(t => t.id === activeTab)?.label}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-zinc-400 hover:text-white"
                            onClick={() => setActiveTab(null)}
                            aria-label="Close panel"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 bg-[#1e1e2e]">
                        {renderContent()}
                    </ScrollArea>
                </div>
            )}
        </div>
    );
};

export default SidePanel;
