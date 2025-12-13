import React, { useState, useRef } from 'react';
import {
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Type,
    Image as ImageIcon,
    ZoomIn,
    Trash2,
    Copy,
    MoveUp,
    MoveDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

import useEditorStore from '../../../store/useEditorStore';
import { FONTS } from '../../canvas/ElementPanel';
import { mediaAPI } from '../../../services/api';
import ColorPicker from '../../ColorPicker';
// Note: mediaAPI might not be needed directly if we reuse a Dialog, but for "Replace Image" simple upload might be good.
// For now, let's just trigger a file input for "Replace" or use the existing media dialog if available.
// Since MediaDialog is complex, let's use a hidden file input for quick replace for now.

const ContextToolbar = () => {
    const template = useEditorStore(state => state.template);
    const setTemplate = useEditorStore(state => state.setTemplate);
    const selectedIds = useEditorStore(state => state.selectedIds);
    const getFirstSelectedElement = useEditorStore(state => state.getFirstSelectedElement);
    const updateElement = useEditorStore(state => state.updateElement);
    const deleteSelected = useEditorStore(state => state.deleteSelected);
    const duplicateSelected = useEditorStore(state => state.duplicateSelected);
    const moveElementUp = useEditorStore(state => state.moveElementUp);
    const moveElementDown = useEditorStore(state => state.moveElementDown);

    const selectedElement = getFirstSelectedElement();

    // Color picker states
    const [showBgColorPicker, setShowBgColorPicker] = useState(false);
    const [showTextColorPicker, setShowTextColorPicker] = useState(false);
    const [showShapeColorPicker, setShowShapeColorPicker] = useState(false);

    // Refs for trigger buttons (to calculate position)
    const bgColorTriggerRef = useRef(null);
    const textColorTriggerRef = useRef(null);
    const shapeColorTriggerRef = useRef(null);
    const fontInputRef = useRef(null);

    // Get the bounding rect of a ref element
    const getTriggerRect = (ref) => {
        if (ref.current) {
            return ref.current.getBoundingClientRect();
        }
        return null;
    };

    // Helper to update specific prop
    const updateProp = (key, value) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, { [key]: value });
    };

    // Helper for nested style updates (textStyle)
    const updateTextStyle = (key, value) => {
        if (!selectedElement) return;
        updateElement(selectedElement.id, {
            [key]: value
        });
    };

    if (!selectedElement) {
        // Canvas Selection (No element selected)
        return (
            <div className="h-12 bg-white border-b border-zinc-200 flex items-center px-4 gap-4" onMouseDown={(e) => e.stopPropagation()}>
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Canvas</span>
                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-2 relative">
                    <span className="text-xs text-zinc-600">Background</span>
                    <div
                        ref={bgColorTriggerRef}
                        className="w-6 h-6 rounded-full border border-zinc-300 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50"
                        style={{ backgroundColor: template.background_color || '#ffffff' }}
                        onClick={() => setShowBgColorPicker(!showBgColorPicker)}
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
            </div>
        );
    }

    // Common Actions (Duplicate, Delete, Layer)
    const CommonActions = () => (
        <>
            <Separator orientation="vertical" className="h-6 mx-2" />
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600" onClick={duplicateSelected} title="Duplicate">
                    <Copy className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600" onClick={() => moveElementDown(selectedElement.id)} title="Send Backward">
                    <MoveDown className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-600" onClick={() => moveElementUp(selectedElement.id)} title="Bring Forward">
                    <MoveUp className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={deleteSelected} title="Delete">
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </>
    );

    // Text Toolbar
    if (selectedElement.type === 'text') {
        return (
            <div
                className="h-12 bg-white border-b border-zinc-200 flex items-center px-4 gap-2 overflow-x-auto"
                onMouseDown={(e) => e.stopPropagation()}
            >
                {/* Hidden Font Upload Input */}
                <input
                    ref={fontInputRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    className="hidden"
                    onChange={async (e) => {
                        const file = e.target.files?.[0];
                        console.log('[FontUpload] File selected:', file?.name);
                        if (!file) return;

                        try {
                            console.log('[FontUpload] Uploading to local fonts folder...');

                            // Upload to local fonts folder
                            const formData = new FormData();
                            formData.append('file', file);

                            const response = await fetch('/api/upload-font', {
                                method: 'POST',
                                headers: {
                                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                                },
                                body: formData
                            });

                            const result = await response.json();
                            console.log('[FontUpload] Upload response:', result);

                            if (!response.ok) throw new Error(result.error || 'Upload failed');

                            const url = result.data?.url;
                            if (!url) throw new Error('No URL returned');
                            console.log('[FontUpload] Font URL:', url);

                            const fontName = result.data?.filename?.replace(/\.[^.]+$/, '') || file.name.split('.')[0];
                            console.log('[FontUpload] Font name:', fontName);

                            // Add to store (persisted to localStorage)
                            const { addCustomFont } = useEditorStore.getState();
                            addCustomFont({ name: fontName, url });
                            console.log('[FontUpload] Added to store. Current fonts:', useEditorStore.getState().customFonts);

                            // Load the font immediately
                            console.log('[FontUpload] Loading font face...');
                            const fontFace = new FontFace(fontName, `url(${url})`);
                            await fontFace.load();
                            document.fonts.add(fontFace);
                            console.log('[FontUpload] Font loaded into document.fonts');

                            // Select the new font
                            updateProp('fontFamily', fontName);
                            console.log('[FontUpload] Applied font to element');
                        } catch (error) {
                            console.error('[FontUpload] Failed:', error);
                        }
                        e.target.value = '';
                    }}
                />

                <Select value={selectedElement.fontFamily} onValueChange={(val) => updateProp('fontFamily', val)}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                        <SelectValue placeholder="Font" />
                    </SelectTrigger>
                    <SelectContent>
                        {/* Upload Font Button */}
                        <div className="p-2 border-b mb-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full justify-start text-xs"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    console.log('[FontUpload] Button clicked');
                                    fontInputRef.current?.click();
                                }}
                            >
                                <span className="mr-2">⬆️</span>
                                Upload Font
                            </Button>
                        </div>

                        {/* Custom Fonts */}
                        {(() => {
                            const customFonts = useEditorStore.getState().customFonts || [];
                            if (customFonts.length > 0) {
                                return (
                                    <>
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50">Your Fonts</div>
                                        {customFonts.map(font => (
                                            <SelectItem key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                                {font.name}
                                            </SelectItem>
                                        ))}
                                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 mt-1">Standard Fonts</div>
                                    </>
                                );
                            }
                            return null;
                        })()}

                        {FONTS.map(font => (
                            <SelectItem key={font.name} value={font.name} style={{ fontFamily: font.name }}>
                                {font.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-1 border rounded bg-zinc-50 p-0.5">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateProp('fontSize', Math.max(8, (selectedElement.fontSize || 16) - 1))}>-</Button>
                    <span className="w-8 text-center text-xs">{selectedElement.fontSize}</span>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => updateProp('fontSize', (selectedElement.fontSize || 16) + 1)}>+</Button>
                </div>

                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <div
                        ref={textColorTriggerRef}
                        className="w-8 h-8 flex items-center justify-center rounded border border-zinc-200 cursor-pointer hover:bg-zinc-50"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setShowTextColorPicker(prev => !prev);
                        }}
                    >
                        <div className="font-bold text-lg" style={{ color: selectedElement.color || '#000000' }}>A</div>
                    </div>
                    {showTextColorPicker && (
                        <ColorPicker
                            color={selectedElement.color || '#000000'}
                            onChange={(color) => updateProp('color', color)}
                            onClose={() => setShowTextColorPicker(false)}
                            triggerRect={getTriggerRect(textColorTriggerRef)}
                        />
                    )}
                </div>

                <Separator orientation="vertical" className="h-6 mx-1" />

                <div className="flex items-center bg-zinc-50 rounded border p-0.5">
                    <Button
                        variant={selectedElement.fontWeight === 'bold' ? 'secondary' : 'ghost'}
                        size="icon" className="h-7 w-7"
                        onClick={() => updateProp('fontWeight', selectedElement.fontWeight === 'bold' ? 'normal' : 'bold')}
                    >
                        <Bold className="w-3 h-3" />
                    </Button>
                    <Button
                        variant={selectedElement.fontStyle === 'italic' ? 'secondary' : 'ghost'}
                        size="icon" className="h-7 w-7"
                        onClick={() => updateProp('fontStyle', selectedElement.fontStyle === 'italic' ? 'normal' : 'italic')}
                    >
                        <Italic className="w-3 h-3" />
                    </Button>
                    <Button
                        variant={selectedElement.textDecoration === 'underline' ? 'secondary' : 'ghost'}
                        size="icon" className="h-7 w-7"
                        onClick={() => updateProp('textDecoration', selectedElement.textDecoration === 'underline' ? 'none' : 'underline')}
                    >
                        <Underline className="w-3 h-3" />
                    </Button>
                </div>

                <div className="flex items-center bg-zinc-50 rounded border p-0.5">
                    <Button
                        variant={selectedElement.align === 'left' ? 'secondary' : 'ghost'}
                        size="icon" className="h-7 w-7"
                        onClick={() => updateProp('align', 'left')}
                    >
                        <AlignLeft className="w-3 h-3" />
                    </Button>
                    <Button
                        variant={selectedElement.align === 'center' ? 'secondary' : 'ghost'}
                        size="icon" className="h-7 w-7"
                        onClick={() => updateProp('align', 'center')}
                    >
                        <AlignCenter className="w-3 h-3" />
                    </Button>
                    <Button
                        variant={selectedElement.align === 'right' ? 'secondary' : 'ghost'}
                        size="icon" className="h-7 w-7"
                        onClick={() => updateProp('align', 'right')}
                    >
                        <AlignRight className="w-3 h-3" />
                    </Button>
                </div>

                <CommonActions />
            </div>
        );
    }

    // Image Slot Toolbar
    if (selectedElement.type === 'imageSlot') {
        return (
            <div className="h-12 bg-white border-b border-zinc-200 flex items-center px-4 gap-4" onMouseDown={(e) => e.stopPropagation()}>
                <span className="text-xs font-semibold text-zinc-500 uppercase flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Image
                </span>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-4">
                    {/* Replace Button (Simplified) */}
                    <div className="relative">
                        <Button variant="outline" size="sm" className="h-8 text-xs">Replace Image</Button>
                        <input
                            type="file"
                            accept="image/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    const url = URL.createObjectURL(file);
                                    updateProp('imageUrl', url);
                                    updateProp('sourceType', 'upload');
                                }
                            }}
                        />
                    </div>

                    {/* Zoom Slider (Parity Feature) */}
                    {selectedElement.imageUrl && (
                        <div className="flex items-center gap-2 w-48">
                            <ZoomIn className="w-4 h-4 text-zinc-400" />
                            <Slider
                                value={[selectedElement.scale || 1]}
                                min={1}
                                max={3}
                                step={0.1}
                                onValueChange={([val]) => updateProp('scale', val)}
                                className="flex-1"
                            />
                            <span className="text-xs text-zinc-500 w-8 text-right">
                                {(selectedElement.scale || 1).toFixed(1)}x
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-600">Radius</span>
                        <Input
                            type="number"
                            value={selectedElement.borderRadius || 0}
                            onChange={(e) => updateProp('borderRadius', parseInt(e.target.value))}
                            className="w-16 h-8 text-xs"
                        />
                    </div>
                </div>

                <CommonActions />
            </div>
        );
    }

    // Shape Toolbar
    if (selectedElement.type === 'shape') {
        return (
            <div className="h-12 bg-white border-b border-zinc-200 flex items-center px-4 gap-4" onMouseDown={(e) => e.stopPropagation()}>
                <span className="text-xs font-semibold text-zinc-500 uppercase">Shape</span>

                <Separator orientation="vertical" className="h-6" />

                <div className="flex items-center gap-2 relative">
                    <span className="text-xs text-zinc-600">Fill</span>
                    <div
                        ref={shapeColorTriggerRef}
                        className="w-6 h-6 rounded border border-zinc-300 shadow-sm cursor-pointer hover:ring-2 hover:ring-primary/50"
                        style={{ backgroundColor: selectedElement.fill || '#000000' }}
                        onClick={() => setShowShapeColorPicker(!showShapeColorPicker)}
                    />
                    {showShapeColorPicker && (
                        <ColorPicker
                            color={selectedElement.fill || '#000000'}
                            onChange={(color) => updateProp('fill', color)}
                            onClose={() => setShowShapeColorPicker(false)}
                            triggerRect={getTriggerRect(shapeColorTriggerRef)}
                        />
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">Radius</span>
                    <Input
                        type="number"
                        value={selectedElement.borderRadius || 0}
                        onChange={(e) => updateProp('borderRadius', parseInt(e.target.value))}
                        className="w-16 h-8 text-xs"
                    />
                </div>

                <CommonActions />
            </div>
        );
    }

    return null;
};

export default ContextToolbar;
