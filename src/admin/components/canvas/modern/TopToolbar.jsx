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
    Maximize2,
    Eye,
    EyeOff,
    Grid,
    Sun,
    Moon,
    Home,
    FilePlus,
    Sparkles,
    Strikethrough,
    Underline as UnderlineIcon,
    CaseSensitive,
    ALargeSmall,
    AlignVerticalJustifyStart,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    Baseline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify
} from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Separator } from '@/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { Slider } from '@/ui/slider';
import { Label } from '@/ui/label';
import useEditorStore from '../../../store/useEditorStore';
import { useUIStore } from '../../../store/useStore';
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

const TopToolbar = ({ onExport, onPreview, onExportImage, isPreviewOpen }) => {
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
    const showGrid = useEditorStore(state => state.showGrid);
    const toggleGrid = useEditorStore(state => state.toggleGrid);
    const getFirstSelectedElement = useEditorStore(state => state.getFirstSelectedElement);
    const updateElement = useEditorStore(state => state.updateElement);
    const deleteSelected = useEditorStore(state => state.deleteSelected);
    const duplicateSelected = useEditorStore(state => state.duplicateSelected);
    const moveElementUp = useEditorStore(state => state.moveElementUp);
    const moveElementDown = useEditorStore(state => state.moveElementDown);
    const setActivePanel = useEditorStore(state => state.setActivePanel);
    const activePanel = useEditorStore(state => state.activePanel);
    const customFonts = useEditorStore(state => state.customFonts);

    const selectedElement = getFirstSelectedElement();

    // Theme
    const { theme, toggleTheme } = useUIStore();
    const isDark = theme === 'dark';

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
            <Separator orientation="vertical" className={`h-6 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            <Button variant="ghost" size="icon" className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={duplicateSelected} title="Duplicate" aria-label="Duplicate element">
                <Copy className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={() => moveElementDown(selectedElement.id)} title="Send Backward" aria-label="Send backward">
                <MoveDown className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`} onClick={() => moveElementUp(selectedElement.id)} title="Bring Forward" aria-label="Bring forward">
                <MoveUp className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={deleteSelected} title="Delete" aria-label="Delete element">
                <Trash2 className="w-4 h-4" />
            </Button>
        </>
    );

    // Render context-aware controls based on selected element
    const renderContextControls = () => {
        if (!selectedElement) {
            // No context controls when nothing selected (background is in Settings panel)
            return null;
        }

        if (selectedElement.type === 'text') {
            return (
                <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                    {/* Effects Button */}
                    <Button
                        variant={activePanel === 'effects' ? 'secondary' : 'ghost'}
                        size="sm"
                        className={`h-8 gap-2 px-3 text-xs font-medium border ${isDark ? 'border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-700' : 'border-zinc-300 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'} ${activePanel === 'effects' ? (isDark ? 'bg-zinc-700 text-white' : 'bg-zinc-100 text-zinc-900') : ''}`}
                        onClick={() => setActivePanel(activePanel === 'effects' ? 'default' : 'effects')}
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        Effects
                    </Button>

                    <Separator orientation="vertical" className={`h-6 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                    {/* Hidden font upload input */}
                    <input ref={fontInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFontUpload} />

                    {/* Font Select */}
                    <Select value={selectedElement.fontFamily} onValueChange={(val) => updateProp('fontFamily', val)}>
                        <SelectTrigger className={`w-36 h-8 text-xs ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`} aria-label="Select font">
                            <SelectValue placeholder="Font">
                                <span style={{ fontFamily: selectedElement.fontFamily }}>{selectedElement.fontFamily || 'Font'}</span>
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className={`${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
                            <div className={`p-2 border-b ${isDark ? 'border-zinc-700' : 'border-zinc-100'}`}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className={`w-full text-xs ${isDark ? 'bg-zinc-700 border-zinc-600 hover:bg-zinc-600' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-200 text-zinc-900'}`}
                                    onClick={(e) => { e.preventDefault(); fontInputRef.current?.click(); }}
                                >
                                    ⬆️ Upload Font
                                </Button>
                            </div>
                            {customFonts?.length > 0 && (
                                <>
                                    <div className={`px-2 py-1 text-xs ${isDark ? 'text-zinc-400 bg-zinc-900' : 'text-zinc-500 bg-zinc-100'}`}>Your Fonts</div>
                                    {customFonts.map(font => (
                                        <SelectItem key={font.name} value={font.name} style={{ fontFamily: font.name }}>{font.name}</SelectItem>
                                    ))}
                                    <div className={`px-2 py-1 text-xs ${isDark ? 'text-zinc-400 bg-zinc-900' : 'text-zinc-500 bg-zinc-100'}`}>Standard</div>
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
                        className={`relative flex flex-col items-center justify-center w-8 h-8 rounded cursor-pointer hover:bg-accent transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-zinc-100'}`}
                        onClick={() => setShowTextColorPicker(!showTextColorPicker)}
                        role="button"
                        aria-label="Change text color"
                    >
                        <span className={`text-base font-bold leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>A</span>
                        <div
                            className="w-5 h-1.5 rounded-sm mt-0.5"
                            style={{ backgroundColor: selectedElement.color || '#000000' }}
                        />
                    </div>
                    {showTextColorPicker && (
                        <ColorPicker
                            color={selectedElement.color || '#000000'}
                            onChange={(color) => updateProp('color', color)}
                            onClose={() => setShowTextColorPicker(false)}
                            triggerRect={getTriggerRect(textColorTriggerRef)}
                        />
                    )}

                    <Separator orientation="vertical" className={`h-6 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                    {/* Bold/Italic */}
                    <Button
                        variant={selectedElement.fontWeight === 'bold' ? 'secondary' : 'ghost'}
                        size="icon"
                        className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                        onClick={() => updateProp('fontWeight', selectedElement.fontWeight === 'bold' ? 'normal' : 'bold')}
                        aria-label="Toggle bold"
                    >
                        <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={selectedElement.fontStyle === 'italic' ? 'secondary' : 'ghost'}
                        size="icon"
                        className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                        onClick={() => updateProp('fontStyle', selectedElement.fontStyle === 'italic' ? 'normal' : 'italic')}
                        aria-label="Toggle italic"
                    >
                        <Italic className="w-4 h-4" />
                    </Button>

                    {/* Underline */}
                    <Button
                        variant={selectedElement.textDecoration?.includes('underline') ? 'secondary' : 'ghost'}
                        size="icon"
                        className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                        onClick={() => {
                            const current = selectedElement.textDecoration || '';
                            const hasUnderline = current.includes('underline');
                            const newDeco = hasUnderline ? current.replace('underline', '').trim() : `${current} underline`.trim();
                            updateProp('textDecoration', newDeco || '');
                        }}
                        aria-label="Toggle underline"
                    >
                        <UnderlineIcon className="w-4 h-4" />
                    </Button>

                    {/* Strikethrough */}
                    <Button
                        variant={selectedElement.textDecoration?.includes('line-through') ? 'secondary' : 'ghost'}
                        size="icon"
                        className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                        onClick={() => {
                            const current = selectedElement.textDecoration || '';
                            const hasStrike = current.includes('line-through');
                            const newDeco = hasStrike ? current.replace('line-through', '').trim() : `${current} line-through`.trim();
                            updateProp('textDecoration', newDeco || '');
                        }}
                        aria-label="Toggle strikethrough"
                    >
                        <Strikethrough className="w-4 h-4" />
                    </Button>

                    <Separator orientation="vertical" className={`h-6 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                    {/* Text Alignment Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                                aria-label="Text alignment"
                            >
                                {selectedElement.textAlign === 'center' ? <AlignCenter className="w-4 h-4" /> :
                                    selectedElement.textAlign === 'right' ? <AlignRight className="w-4 h-4" /> :
                                        selectedElement.textAlign === 'justify' ? <AlignJustify className="w-4 h-4" /> :
                                            <AlignLeft className="w-4 h-4" />}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" align="start" className={`w-auto p-1 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                            <div className="flex items-center gap-0.5">
                                <Button
                                    variant={selectedElement.textAlign === 'left' || !selectedElement.textAlign ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateProp('textAlign', 'left')}
                                    aria-label="Align left"
                                >
                                    <AlignLeft className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={selectedElement.textAlign === 'center' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateProp('textAlign', 'center')}
                                    aria-label="Align center"
                                >
                                    <AlignCenter className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={selectedElement.textAlign === 'right' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateProp('textAlign', 'right')}
                                    aria-label="Align right"
                                >
                                    <AlignRight className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant={selectedElement.textAlign === 'justify' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => updateProp('textAlign', 'justify')}
                                    aria-label="Justify"
                                >
                                    <AlignJustify className="w-4 h-4" />
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Font Weight Dropdown */}
                    <Select value={selectedElement.fontWeight || 'normal'} onValueChange={(val) => updateProp('fontWeight', val)}>
                        <SelectTrigger className={`w-24 h-8 text-xs ${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`} aria-label="Font weight">
                            <SelectValue placeholder="Weight" />
                        </SelectTrigger>
                        <SelectContent className={`${isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
                            <SelectItem value="100">Thin</SelectItem>
                            <SelectItem value="200">Extra Light</SelectItem>
                            <SelectItem value="300">Light</SelectItem>
                            <SelectItem value="normal">Regular</SelectItem>
                            <SelectItem value="500">Medium</SelectItem>
                            <SelectItem value="600">Semibold</SelectItem>
                            <SelectItem value="bold">Bold</SelectItem>
                            <SelectItem value="800">Extra Bold</SelectItem>
                            <SelectItem value="900">Black</SelectItem>
                        </SelectContent>
                    </Select>

                    {/* Text Case Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                                aria-label="Text case options"
                            >
                                <ALargeSmall className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" align="start" className={`w-40 p-2 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                            <div className="space-y-1">
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs" onClick={() => updateProp('textTransform', 'none')}>
                                    Default
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs uppercase" onClick={() => updateProp('textTransform', 'uppercase')}>
                                    UPPERCASE
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs lowercase" onClick={() => updateProp('textTransform', 'lowercase')}>
                                    lowercase
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full justify-start text-xs capitalize" onClick={() => updateProp('textTransform', 'capitalize')}>
                                    Capitalize
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Spacing Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                                aria-label="Text spacing options"
                            >
                                <Baseline className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" align="start" className={`w-56 p-4 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label className="text-xs">Letter spacing</Label>
                                        <span className={`text-xs font-mono w-8 text-right ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{selectedElement.letterSpacing || 0}</span>
                                    </div>
                                    <Slider
                                        value={[selectedElement.letterSpacing || 0]}
                                        min={-5}
                                        max={20}
                                        step={0.5}
                                        onValueChange={([val]) => updateProp('letterSpacing', val)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <Label className="text-xs">Line spacing</Label>
                                        <span className={`text-xs font-mono w-8 text-right ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{selectedElement.lineHeight || 1.4}</span>
                                    </div>
                                    <Slider
                                        value={[selectedElement.lineHeight || 1.4]}
                                        min={0.8}
                                        max={3}
                                        step={0.1}
                                        onValueChange={([val]) => updateProp('lineHeight', val)}
                                    />
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Font Size */}
                    <div className={`flex items-center gap-0.5 rounded border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 p-0 rounded-none ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-700' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                            onClick={() => updateProp('fontSize', Math.max(6, (selectedElement.fontSize || 16) - 1))}
                        >
                            -
                        </Button>
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    className={`w-10 h-7 text-center text-xs font-mono cursor-pointer hover:bg-primary/10 ${isDark ? 'text-white' : 'text-zinc-900'}`}
                                >
                                    {selectedElement.fontSize || 16}
                                </button>
                            </PopoverTrigger>
                            <PopoverContent
                                side="bottom"
                                align="center"
                                className={`w-20 p-1 max-h-64 overflow-y-auto ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}
                            >
                                <div className="space-y-0.5">
                                    {[6, 8, 10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 48, 56, 64, 72, 80, 96, 120, 144].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => updateProp('fontSize', size)}
                                            className={`w-full px-2 py-1 text-left text-sm rounded transition-colors ${selectedElement.fontSize === size
                                                ? 'bg-primary text-primary-foreground'
                                                : isDark ? 'hover:bg-zinc-800 text-zinc-300' : 'hover:bg-zinc-100 text-zinc-700'
                                                }`}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 p-0 rounded-none ${isDark ? 'text-zinc-400 hover:text-white hover:bg-zinc-700' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'}`}
                            onClick={() => updateProp('fontSize', Math.min(200, (selectedElement.fontSize || 16) + 1))}
                        >
                            +
                        </Button>
                    </div>
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
                        className={`h-8 text-xs ${isDark ? 'bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white' : 'bg-white border-zinc-200 hover:bg-zinc-100 text-zinc-900'}`}
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
                    <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Fill</span>
                    <div
                        ref={shapeColorTriggerRef}
                        className={`w-6 h-6 rounded border cursor-pointer hover:ring-2 hover:ring-primary/50 ${isDark ? 'border-zinc-600' : 'border-zinc-300'}`}
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
        <div className={`h-14 border-b flex items-center justify-between px-4 select-none z-50 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
            {/* Left: Navigation & File Info */}
            <div className="flex items-center gap-2">
                {/* Back to Admin Panel */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full border ${isDark ? 'border-zinc-700 text-primary hover:text-white' : 'border-zinc-300 text-primary hover:text-primary/80'}`}
                    onClick={() => navigate('/')}
                    title="Back to Admin Panel"
                    aria-label="Go back to admin panel"
                >
                    <Home className="w-4 h-4" />
                </Button>

                {/* New Template */}
                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 rounded-full border ${isDark ? 'border-zinc-700 text-primary hover:text-white' : 'border-zinc-300 text-primary hover:text-primary/80'}`}
                    onClick={() => {
                        if (hasUnsavedChanges) {
                            if (!window.confirm('You have unsaved changes. Discard and create new template?')) return;
                        }
                        const { resetTemplate } = useEditorStore.getState();
                        resetTemplate();
                        navigate('/templates/new');
                    }}
                    title="New Template"
                    aria-label="Create new template"
                >
                    <FilePlus className="w-4 h-4" />
                </Button>

                <Separator orientation="vertical" className={`h-6 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                        {hasUnsavedChanges && (
                            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                        )}
                        <Input
                            value={template.name || ''}
                            onChange={(e) => setTemplate({ name: e.target.value })}
                            className={`h-7 bg-transparent border-none font-medium transition-colors w-40 px-2 ${isDark ? 'text-primary hover:bg-white/5 focus:bg-white/10' : 'text-primary hover:bg-zinc-100 focus:bg-zinc-200'}`}
                            placeholder="Untitled Design"
                            aria-label="Template name"
                        />
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <span className={`text-[10px] ${isDark ? 'text-primary' : 'text-primary'}`}>
                            {hasUnsavedChanges ? 'Unsaved' : 'Saved'}
                        </span>
                        {isSaving && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                    </div>
                </div>

                <Separator orientation="vertical" className={`h-6 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                {/* Undo/Redo */}
                {/* Undo/Redo */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={undo}
                        disabled={!canUndo()}
                        className={`h-8 w-8 rounded-full border disabled:opacity-30 ${isDark ? 'border-zinc-700 text-primary hover:text-white' : 'border-zinc-300 text-primary hover:text-primary/80'}`}
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
                        className={`h-8 w-8 rounded-full border disabled:opacity-30 ${isDark ? 'border-zinc-700 text-primary hover:text-white' : 'border-zinc-300 text-primary hover:text-primary/80'}`}
                        title="Redo (Ctrl+Y)"
                        aria-label="Redo"
                    >
                        <Redo2 className="w-4 h-4" />
                    </Button>
                </div>

                <Separator orientation="vertical" className={`h-6 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                {/* Context Controls */}
                {renderContextControls()}
            </div>

            {/* Right: Zoom & Export */}
            <div className="flex items-center gap-3">
                {/* Zoom Slider */}
                <div className={`flex items-center gap-1 rounded-md px-2 py-1 border ${isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-100 border-zinc-200'}`}>
                    <button
                        onClick={() => handleZoomChange(zoom - 10)}
                        className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-white'}`}
                        aria-label="Zoom out"
                    >
                        <Minus className={`w-3 h-3 ${isDark ? 'text-primary hover:text-white' : 'text-primary hover:text-primary/80'}`} />
                    </button>
                    <input
                        type="range"
                        min="10"
                        max="200"
                        value={zoom}
                        onChange={(e) => handleZoomChange(parseInt(e.target.value, 10))}
                        className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-primary"
                        style={{
                            background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${((zoom - 10) / 190) * 100}%, ${isDark ? '#3f3f46' : '#e4e4e7'} ${((zoom - 10) / 190) * 100}%, ${isDark ? '#3f3f46' : '#e4e4e7'} 100%)`
                        }}
                        aria-label="Zoom level"
                    />
                    <button
                        onClick={() => handleZoomChange(zoom + 10)}
                        className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-zinc-700' : 'hover:bg-white'}`}
                        aria-label="Zoom in"
                    >
                        <Plus className={`w-3 h-3 ${isDark ? 'text-primary hover:text-white' : 'text-primary hover:text-primary/80'}`} />
                    </button>
                    <span className={`w-10 text-center text-xs font-mono ${isDark ? 'text-primary' : 'text-primary'}`}>{Math.round(zoom)}%</span>
                </div>

                {/* Grid Toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleGrid}
                    className={`h-8 w-8 rounded-full border ${showGrid ? 'border-violet-500 text-violet-500 bg-violet-500/10' : (isDark ? 'border-zinc-700 text-primary hover:text-white hover:bg-white/10' : 'border-zinc-300 text-primary hover:text-primary/80 hover:bg-zinc-100')}`}
                    title={showGrid ? 'Hide Grid' : 'Show Grid'}
                    aria-label={showGrid ? 'Hide grid' : 'Show grid'}
                >
                    <Grid className="w-4 h-4" />
                </Button>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full border ${isDark ? 'border-zinc-700 text-primary hover:text-white hover:bg-white/10' : 'border-zinc-300 text-primary hover:text-primary/80 hover:bg-zinc-100'}`}
                        onClick={onPreview}
                        title={isPreviewOpen ? "Close Preview" : "Preview"}
                        aria-label={isPreviewOpen ? "Close preview" : "Preview template"}
                    >
                        {isPreviewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full border ${isDark ? 'border-zinc-700 text-primary hover:text-white hover:bg-white/10' : 'border-zinc-300 text-primary hover:text-primary/80 hover:bg-zinc-100'}`}
                        onClick={onExport}
                        title="Save Template"
                        aria-label="Save template"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>

                    <Button
                        size="icon"
                        variant="ghost"
                        className={`h-8 w-8 rounded-full border ${isDark ? 'border-zinc-700 text-primary hover:text-white hover:bg-white/10' : 'border-zinc-300 text-primary hover:text-primary/80 hover:bg-zinc-100'}`}
                        onClick={onExportImage}
                        title="Export Image"
                        aria-label="Export as image"
                    >
                        <Download className="w-4 h-4" />
                    </Button>

                    <Separator orientation="vertical" className={`h-6 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                    {/* Theme Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-full border ${isDark ? 'border-zinc-700 text-primary hover:text-white hover:bg-white/10' : 'border-zinc-300 text-primary hover:text-primary/80 hover:bg-zinc-100'}`}
                        onClick={toggleTheme}
                        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        aria-label="Toggle theme"
                    >
                        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default TopToolbar;
