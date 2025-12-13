import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Undo2,
    Redo2,
    Minus,
    Plus,
    Download,
    Play,
    Loader2,
    Save,
    Bold,
    Italic,
    Underline,
    Type,
    Trash2,
    Copy,
    MoveUp,
    MoveDown,
    Image as ImageIcon,
    Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import useEditorStore from '../../../store/useEditorStore';
import ColorPicker from '../../ColorPicker';
import { mediaAPI } from '../../../services/api';

// Font options
const FONTS = [
    { name: 'Inter', value: 'Inter' },
    { name: 'Arial', value: 'Arial' },
    { name: 'Georgia', value: 'Georgia' },
    { name: 'Playfair Display', value: 'Playfair Display' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Montserrat', value: 'Montserrat' },
    { name: 'Lora', value: 'Lora' },
    { name: 'Poppins', value: 'Poppins' },
];

// Canvas size presets
const CANVAS_PRESETS = [
    { name: 'Pinterest Pin', width: 1000, height: 1500, ratio: '2:3' },
    { name: 'Pinterest Square', width: 1000, height: 1000, ratio: '1:1' },
    { name: 'Instagram Story', width: 1080, height: 1920, ratio: '9:16' },
    { name: 'Instagram Post', width: 1080, height: 1080, ratio: '1:1' },
    { name: 'Facebook Post', width: 1200, height: 630, ratio: '1.9:1' },
    { name: 'Twitter Post', width: 1200, height: 675, ratio: '16:9' },
];

const TopToolbar = ({ onExport, onPreview }) => {
    const navigate = useNavigate();

    // Store selectors
    const template = useEditorStore(state => state.template);
    const setTemplate = useEditorStore(state => state.setTemplate);
    const zoom = useEditorStore(state => state.zoom);
    const setZoom = useEditorStore(state => state.setZoom);
    const undo = useEditorStore(state => state.undo);
    const redo = useEditorStore(state => state.redo);
    const canUndo = useEditorStore(state => state.canUndo);
    const canRedo = useEditorStore(state => state.canRedo);
    const hasUnsavedChanges = useEditorStore(state => state.hasUnsavedChanges);
    const isSaving = useEditorStore(state => state.isSaving);
    const getFirstSelectedElement = useEditorStore(state => state.getFirstSelectedElement);
    const updateElement = useEditorStore(state => state.updateElement);
    const deleteSelected = useEditorStore(state => state.deleteSelected);
    const duplicateSelected = useEditorStore(state => state.duplicateSelected);
    const moveElementUp = useEditorStore(state => state.moveElementUp);
    const moveElementDown = useEditorStore(state => state.moveElementDown);
    const customFonts = useEditorStore(state => state.customFonts);

    const selectedElement = getFirstSelectedElement();

    // Local state
    const [zoomInput, setZoomInput] = useState(zoom.toString());
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);
    const [showTextColorPicker, setShowTextColorPicker] = useState(false);
    const [showShapeColorPicker, setShowShapeColorPicker] = useState(false);
    const bgColorTriggerRef = useRef(null);
    const textColorTriggerRef = useRef(null);
    const shapeColorTriggerRef = useRef(null);
    const fontInputRef = useRef(null);
    const imageInputRef = useRef(null);

    // Handle zoom change
    const handleZoomChange = (newZoom) => {
        const clamped = Math.min(Math.max(newZoom, 10), 500);
        setZoom(clamped);
        setZoomInput(clamped.toString());
    };

    // Helper to update element property
    const updateProp = (key, value) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, { [key]: value });
    };

    // Get trigger rect for color picker positioning
    const getTriggerRect = (ref) => ref.current?.getBoundingClientRect() || null;

    // Handle font upload
    const handleFontUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload-font', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
                body: formData
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Upload failed');

            const url = result.data?.url;
            if (!url) throw new Error('No URL returned');

            const fontName = result.data?.filename?.replace(/\.[^.]+$/, '') || file.name.split('.')[0];

            // Add to store
            const { addCustomFont } = useEditorStore.getState();
            addCustomFont({ name: fontName, url });

            // Load the font
            const fontFace = new FontFace(fontName, `url(${url})`);
            await fontFace.load();
            document.fonts.add(fontFace);

            // Apply to selected element
            if (selectedElement?.type === 'text') {
                updateProp('fontFamily', fontName);
            }
        } catch (error) {
            console.error('Font upload failed:', error);
        }
        e.target.value = '';
    };

    // Handle image replace
    const handleImageReplace = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedElement) return;

        try {
            const response = await mediaAPI.upload(file, { alt: file.name });
            const url = response.data?.data?.url || response.data?.url;
            if (url) updateProp('src', url);
        } catch (error) {
            console.error('Image upload failed:', error);
        }
        e.target.value = '';
    };

    // Common actions for selected elements
    const renderCommonActions = () => (
        <>
            <Separator orientation="vertical" className="h-6 bg-zinc-700 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={duplicateSelected} title="Duplicate" aria-label="Duplicate element">
                <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => moveElementDown(selectedElement.id)} title="Send Backward" aria-label="Send backward">
                <MoveDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white" onClick={() => moveElementUp(selectedElement.id)} title="Bring Forward" aria-label="Bring forward">
                <MoveUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={deleteSelected} title="Delete" aria-label="Delete element">
                <Trash2 className="w-4 h-4" />
            </Button>
        </>
    );

    // Render context-aware controls based on selected element
    const renderContextControls = () => {
        if (!selectedElement) {
            // Canvas background when nothing selected
            return (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Background</span>
                    <div
                        ref={bgColorTriggerRef}
                        className="w-6 h-6 rounded-full border border-zinc-600 cursor-pointer hover:ring-2 hover:ring-primary/50"
                        style={{ backgroundColor: template.background_color || '#ffffff' }}
                        onClick={() => setShowBgColorPicker(!showBgColorPicker)}
                        role="button"
                        aria-label="Change background color"
                    />
                    {showBgColorPicker && (
                        <ColorPicker
                            color={template.background_color || '#ffffff'}
                            onChange={(color) => setTemplate({ background_color: color })}
                            onClose={() => setShowBgColorPicker(false)}
                            triggerRect={getTriggerRect(bgColorTriggerRef)}
                        />
                    )}
                </div>
            );
        }

        if (selectedElement.type === 'text') {
            return (
                <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                    {/* Hidden font upload input */}
                    <input ref={fontInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFontUpload} />

                    {/* Font Select */}
                    <Select value={selectedElement.fontFamily} onValueChange={(val) => updateProp('fontFamily', val)}>
                        <SelectTrigger className="w-36 h-8 text-xs bg-zinc-800 border-zinc-700 text-white" aria-label="Select font">
                            <SelectValue placeholder="Font" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                            <div className="p-2 border-b border-zinc-700">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full text-xs bg-zinc-700 border-zinc-600 hover:bg-zinc-600"
                                    onClick={(e) => { e.preventDefault(); fontInputRef.current?.click(); }}
                                >
                                    ⬆️ Upload Font
                                </Button>
                            </div>
                            {customFonts?.length > 0 && (
                                <>
                                    <div className="px-2 py-1 text-xs text-zinc-400 bg-zinc-900">Your Fonts</div>
                                    {customFonts.map(font => (
                                        <SelectItem key={font.name} value={font.name} style={{ fontFamily: font.name }}>{font.name}</SelectItem>
                                    ))}
                                    <div className="px-2 py-1 text-xs text-zinc-400 bg-zinc-900">Standard</div>
                                </>
                            )}
                            {FONTS.map(font => (
                                <SelectItem key={font.name} value={font.name} style={{ fontFamily: font.name }}>{font.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Text Color */}
                    <div
                        ref={textColorTriggerRef}
                        className="w-6 h-6 rounded border border-zinc-600 cursor-pointer hover:ring-2 hover:ring-primary/50"
                        style={{ backgroundColor: selectedElement.fill || '#000000' }}
                        onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                        role="button"
                        aria-label="Change text color"
                    />
                    {showTextColorPicker && (
                        <ColorPicker
                            color={selectedElement.fill || '#000000'}
                            onChange={(color) => updateProp('fill', color)}
                            onClose={() => setShowTextColorPicker(false)}
                            triggerRect={getTriggerRect(textColorTriggerRef)}
                        />
                    )}

                    <Separator orientation="vertical" className="h-6 bg-zinc-700" />

                    {/* Bold/Italic/Underline */}
                    <Button
                        variant={selectedElement.fontStyle?.includes('bold') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                        onClick={() => updateProp('fontStyle', selectedElement.fontStyle?.includes('bold') ? 'normal' : 'bold')}
                        aria-label="Toggle bold"
                    >
                        <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={selectedElement.fontStyle?.includes('italic') ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                        onClick={() => updateProp('fontStyle', selectedElement.fontStyle?.includes('italic') ? 'normal' : 'italic')}
                        aria-label="Toggle italic"
                    >
                        <Italic className="w-4 h-4" />
                    </Button>

                    {/* Font Size */}
                    <div className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white p-0" onClick={() => updateProp('fontSize', Math.max(8, (selectedElement.fontSize || 16) - 1))}>-</Button>
                        <span className="w-8 text-center text-xs text-white">{selectedElement.fontSize || 16}</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white p-0" onClick={() => updateProp('fontSize', Math.min(200, (selectedElement.fontSize || 16) + 1))}>+</Button>
                    </div>

                    {renderCommonActions()}
                </div>
            );
        }

        if (selectedElement.type === 'image' || selectedElement.type === 'imageSlot') {
            return (
                <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageReplace} />
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                        onClick={() => imageInputRef.current?.click()}
                    >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Replace Image
                    </Button>
                    {renderCommonActions()}
                </div>
            );
        }

        if (selectedElement.type === 'shape') {
            return (
                <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                    <span className="text-xs text-zinc-400">Fill</span>
                    <div
                        ref={shapeColorTriggerRef}
                        className="w-6 h-6 rounded border border-zinc-600 cursor-pointer hover:ring-2 hover:ring-primary/50"
                        style={{ backgroundColor: selectedElement.fill || '#000000' }}
                        onClick={() => setShowShapeColorPicker(!showShapeColorPicker)}
                        role="button"
                        aria-label="Change shape fill color"
                    />
                    {showShapeColorPicker && (
                        <ColorPicker
                            color={selectedElement.fill || '#000000'}
                            onChange={(color) => updateProp('fill', color)}
                            onClose={() => setShowShapeColorPicker(false)}
                            triggerRect={getTriggerRect(shapeColorTriggerRef)}
                        />
                    )}
                    {renderCommonActions()}
                </div>
            );
        }

        // Default for other elements
        return renderCommonActions();
    };

    return (
        <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 select-none z-50">
            {/* Left: Navigation & File Info */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-zinc-400 hover:text-white"
                    onClick={() => navigate('/templates')}
                    aria-label="Go back to templates"
                >
                    <ChevronLeft className="w-5 h-5" />
                </Button>

                <Separator orientation="vertical" className="h-6 bg-zinc-700" />

                <div className="flex flex-col justify-center">
                    <Input
                        value={template.name || ''}
                        onChange={(e) => setTemplate({ name: e.target.value })}
                        className="h-7 bg-transparent border-none text-white font-medium hover:bg-white/5 focus:bg-white/10 transition-colors w-48 px-2"
                        placeholder="Untitled Design"
                        aria-label="Template name"
                    />
                    <div className="flex items-center gap-2 px-2">
                        <span className="text-[10px] text-zinc-500">
                            {hasUnsavedChanges ? 'Unsaved changes' : 'Saved'}
                        </span>
                        {isSaving && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />}
                    </div>
                </div>

                <Separator orientation="vertical" className="h-6 bg-zinc-700" />

                {/* Canvas Size Selector */}
                <Select
                    value={`${template.width || template.canvas_width || 1000}x${template.height || template.canvas_height || 1500}`}
                    onValueChange={(value) => {
                        const preset = CANVAS_PRESETS.find(p => `${p.width}x${p.height}` === value);
                        if (preset) {
                            setTemplate({
                                width: preset.width,
                                height: preset.height,
                                canvas_width: preset.width,
                                canvas_height: preset.height
                            });
                        }
                    }}
                >
                    <SelectTrigger className="w-44 h-8 bg-zinc-800 border-zinc-700 text-white text-xs">
                        <div className="flex items-center gap-2">
                            <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                            <SelectValue placeholder="Canvas Size" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                        {CANVAS_PRESETS.map((preset) => (
                            <SelectItem
                                key={`${preset.width}x${preset.height}`}
                                value={`${preset.width}x${preset.height}`}
                                className="text-white hover:bg-zinc-800"
                            >
                                <div className="flex justify-between items-center gap-4">
                                    <span>{preset.name}</span>
                                    <span className="text-zinc-500 text-xs">{preset.width}×{preset.height}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6 bg-zinc-700" />

                {/* Undo/Redo */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={undo}
                        disabled={!canUndo()}
                        className="h-8 w-8 text-zinc-400 hover:text-white disabled:opacity-30"
                        title="Undo (Ctrl+Z)"
                        aria-label="Undo"
                    >
                        <Undo2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={redo}
                        disabled={!canRedo()}
                        className="h-8 w-8 text-zinc-400 hover:text-white disabled:opacity-30"
                        title="Redo (Ctrl+Y)"
                        aria-label="Redo"
                    >
                        <Redo2 className="w-4 h-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className="h-6 bg-zinc-700" />

                {/* Context Controls */}
                {renderContextControls()}
            </div>

            {/* Right: Zoom & Export */}
            <div className="flex items-center gap-3">
                {/* Zoom Slider */}
                <div className="flex items-center gap-2 bg-zinc-800 rounded-md px-2 py-1 border border-zinc-700">
                    <Minus className="w-3 h-3 text-zinc-500" />
                    <input
                        type="range"
                        min="10"
                        max="200"
                        value={zoom}
                        onChange={(e) => handleZoomChange(parseInt(e.target.value, 10))}
                        className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        style={{
                            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((zoom - 10) / 190) * 100}%, #3f3f46 ${((zoom - 10) / 190) * 100}%, #3f3f46 100%)`
                        }}
                        aria-label="Zoom level"
                    />
                    <Plus className="w-3 h-3 text-zinc-500" />
                    <span className="w-10 text-center text-xs text-white font-mono">{Math.round(zoom)}%</span>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                        onClick={onPreview}
                        title="Preview"
                        aria-label="Preview template"
                    >
                        <Play className="w-4 h-4" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/10"
                        onClick={onExport}
                        title="Save Template"
                        aria-label="Save template"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>

                    <Button
                        size="icon"
                        className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={onPreview}
                        title="Export Image"
                        aria-label="Export as image"
                    >
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TopToolbar;
