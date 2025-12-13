import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    Type,
    Square,
    Image,
    Layers,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Trash2,
    Copy,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    Palette,
    Move,
    RotateCw,
    Maximize2,
    Upload,
    HardDriveUpload,
    Loader2,
    ALargeSmall,
    CaseSensitive,
} from 'lucide-react';
import { toast } from 'sonner';
import MediaDialog from '../MediaDialog';
import { mediaAPI } from '../../services/api';
import ColorPicker from '../ColorPicker';
import { FONTS, COLOR_PRESETS } from './utils/editorConstants';

/**
 * CollapsibleSection - Accordion section for property panels
 */
const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2 text-sm font-medium">
                    {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
                    {title}
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent className="px-3 pb-3">
                {children}
            </CollapsibleContent>
        </Collapsible>
    );
};

/**
 * ColorInput - Color picker with advanced picker
 */
const ColorInput = ({ value, onChange, label }) => {
    const [showPicker, setShowPicker] = useState(false);
    return (
        <div className="space-y-2 relative">
            {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
            <div className="flex gap-2">
                <div
                    className="w-10 h-10 rounded-lg border cursor-pointer hover:ring-2 hover:ring-primary/50"
                    style={{ backgroundColor: value || '#ffffff' }}
                    onClick={() => setShowPicker(!showPicker)}
                />
                <Input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 font-mono text-sm"
                />
            </div>
            {showPicker && (
                <ColorPicker
                    color={value || '#ffffff'}
                    onChange={onChange}
                    onClose={() => setShowPicker(false)}
                    className="top-16 left-0 z-50"
                />
            )}
        </div>
    );
};

/**
 * ElementPanel - Enhanced property panel for editing selected elements
 */
const ElementPanel = ({
    element,
    onUpdate,
    onDelete,
    onDuplicate,
    onMoveUp,
    onMoveDown,
}) => {
    const [mediaDialogOpen, setMediaDialogOpen] = useState(false);

    if (!element) {
        return (
            <div className="element-panel-empty flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Layers className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">Select an element to edit</p>
                <p className="text-muted-foreground text-xs mt-1">Click on any element in the canvas</p>
            </div>
        );
    }

    const handleChange = (key, value) => {
        onUpdate({ ...element, [key]: value });
    };

    const handleNestedChange = (parent, key, value) => {
        onUpdate({
            ...element,
            [parent]: {
                ...(element[parent] || {}),
                [key]: value,
            },
        });
    };

    const handleImageSelect = (media) => {
        if (!media) return;

        onUpdate({
            ...element,
            imageUrl: media.url,
            sourceType: 'upload',
            name: media.alt_text || element.name || 'Image',
        });
    };

    return (
        <div className="element-panel">
            {/* Header with actions */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        {element.type === 'text' && <Type className="w-4 h-4 text-primary" />}
                        {element.type === 'imageSlot' && <Image className="w-4 h-4 text-primary" />}
                        {element.type === 'shape' && <Square className="w-4 h-4 text-primary" />}
                        {element.type === 'overlay' && <Layers className="w-4 h-4 text-primary" />}
                    </div>
                    <div>
                        <p className="font-medium text-sm capitalize">{element.type}</p>
                        <p className="text-xs text-muted-foreground">{element.name || `Element`}</p>
                    </div>
                </div>
                <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} title="Move up">
                        <ChevronUp className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} title="Move down">
                        <ChevronDown className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDuplicate} title="Duplicate">
                        <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Properties */}
            <div className="divide-y">
                {/* Position & Size */}
                <CollapsibleSection title="Transform" icon={Move}>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <Label className="text-xs">X</Label>
                            <Input
                                type="number"
                                value={Math.round(element.x || 0)}
                                onChange={(e) => handleChange('x', parseInt(e.target.value) || 0)}
                                className="h-8"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Y</Label>
                            <Input
                                type="number"
                                value={Math.round(element.y || 0)}
                                onChange={(e) => handleChange('y', parseInt(e.target.value) || 0)}
                                className="h-8"
                            />
                        </div>
                        {(element.type === 'imageSlot' || element.type === 'shape' || element.type === 'overlay') && (
                            <>
                                <div>
                                    <Label className="text-xs">Width</Label>
                                    <Input
                                        type="number"
                                        value={Math.round(element.width || 100)}
                                        onChange={(e) => handleChange('width', parseInt(e.target.value) || 100)}
                                        className="h-8"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Height</Label>
                                    <Input
                                        type="number"
                                        value={Math.round(element.height || 100)}
                                        onChange={(e) => handleChange('height', parseInt(e.target.value) || 100)}
                                        className="h-8"
                                    />
                                </div>
                            </>
                        )}
                        {element.rotation !== undefined && (
                            <div className="col-span-2">
                                <Label className="text-xs">Rotation: {Math.round(element.rotation || 0)}°</Label>
                                <Slider
                                    value={[element.rotation || 0]}
                                    min={-180}
                                    max={180}
                                    step={1}
                                    onValueChange={([v]) => handleChange('rotation', v)}
                                />
                            </div>
                        )}
                    </div>
                </CollapsibleSection>

                {/* Text-specific options */}
                {element.type === 'text' && (
                    <>
                        <CollapsibleSection title="Text Content" icon={Type}>
                            <div className="space-y-3">
                                <Input
                                    value={element.content || ''}
                                    onChange={(e) => handleChange('content', e.target.value)}
                                    placeholder="Enter text or {{title}}"
                                />
                                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                    Variables: <code className="text-primary">{'{{title}}'}</code> <code className="text-primary">{'{{category}}'}</code> <code className="text-primary">{'{{author}}'}</code>
                                </div>
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Typography" icon={Type}>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs">Font Family</Label>
                                    <div className="space-y-2">
                                        <Select
                                            value={element.fontFamily || 'Inter'}
                                            onValueChange={(v) => handleChange('fontFamily', v)}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <div className="p-2 border-b mb-1">
                                                    <div className="flex flex-col gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full justify-start text-xs"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                document.getElementById('font-upload-input').click();
                                                            }}
                                                        >
                                                            <Upload className="w-3 h-3 mr-2" />
                                                            Upload Font
                                                        </Button>
                                                        <input
                                                            id="font-upload-input"
                                                            type="file"
                                                            accept=".ttf,.otf,.woff,.woff2"
                                                            className="hidden"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;

                                                                const loadingToast = toast.loading('Uploading font...');
                                                                try {
                                                                    // 1. Upload to R2
                                                                    const response = await mediaAPI.upload(file, {
                                                                        folder: 'fonts',
                                                                        alt: file.name
                                                                    });
                                                                    const url = response.data?.data?.url || response.data?.url;

                                                                    if (!url) throw new Error('No URL returned');

                                                                    const fontName = file.name.split('.')[0];

                                                                    // 2. Add to store (persisted)
                                                                    // We need to access useEditorStore directly here as this component doesn't use the hook
                                                                    // But wait, ElementPanel is a child of the Editor which uses the store? 
                                                                    // Actually we can just import the store hook in this file
                                                                    // Since we didn't add it to imports yet, let's fix imports first
                                                                    // For now, I'll access the store instance directly via getState() for non-hook usage or add hook usage
                                                                    const { addCustomFont } = require('../../store/useEditorStore').default.getState();

                                                                    addCustomFont({ name: fontName, url });

                                                                    // 3. Select it
                                                                    handleChange('fontFamily', fontName);

                                                                    toast.success(`Font ${fontName} added!`, { id: loadingToast });
                                                                } catch (error) {
                                                                    console.error(error);
                                                                    toast.error('Failed to upload font', { id: loadingToast });
                                                                }
                                                                // Reset input
                                                                e.target.value = '';
                                                            }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Custom Fonts Section */}
                                                {(() => {
                                                    // Access custom fonts from store state directly
                                                    const customFonts = require('../../store/useEditorStore').default.getState().customFonts || [];
                                                    if (customFonts.length > 0) {
                                                        return (
                                                            <>
                                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">Custom Fonts</div>
                                                                {customFonts.map((font) => (
                                                                    <SelectItem
                                                                        key={font.name}
                                                                        value={font.name}
                                                                        style={{ fontFamily: font.name }}
                                                                    >
                                                                        {font.name}
                                                                    </SelectItem>
                                                                ))}
                                                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 mt-1">Standard Fonts</div>
                                                            </>
                                                        );
                                                    }
                                                    return null;
                                                })()}

                                                {FONTS.map((font) => (
                                                    <SelectItem
                                                        key={font.name}
                                                        value={font.name}
                                                        style={{ fontFamily: font.name }}
                                                    >
                                                        {font.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs">Font Size: {element.fontSize || 32}px</Label>
                                    <Slider
                                        value={[element.fontSize || 32]}
                                        min={12}
                                        max={120}
                                        step={1}
                                        onValueChange={([v]) => handleChange('fontSize', v)}
                                    />
                                </div>

                                <div className="flex gap-1">
                                    <Button
                                        variant={element.fontWeight === 'bold' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('fontWeight', element.fontWeight === 'bold' ? 'normal' : 'bold')}
                                    >
                                        <Bold className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={element.fontStyle === 'italic' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('fontStyle', element.fontStyle === 'italic' ? 'normal' : 'italic')}
                                    >
                                        <Italic className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={element.textAlign === 'left' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('textAlign', 'left')}
                                    >
                                        <AlignLeft className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={element.textAlign === 'center' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('textAlign', 'center')}
                                    >
                                        <AlignCenter className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={element.textAlign === 'right' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('textAlign', 'right')}
                                    >
                                        <AlignRight className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Text Decoration */}
                                <div className="flex gap-1">
                                    <Button
                                        variant={element.textDecoration === 'underline' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('textDecoration', element.textDecoration === 'underline' ? 'none' : 'underline')}
                                        title="Underline"
                                    >
                                        <Underline className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={element.textDecoration === 'line-through' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('textDecoration', element.textDecoration === 'line-through' ? 'none' : 'line-through')}
                                        title="Strikethrough"
                                    >
                                        <Strikethrough className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Letter Spacing */}
                                <div>
                                    <Label className="text-xs">Letter Spacing: {element.letterSpacing || 0}px</Label>
                                    <Slider
                                        value={[element.letterSpacing || 0]}
                                        min={-5}
                                        max={20}
                                        step={0.5}
                                        onValueChange={([v]) => handleChange('letterSpacing', v)}
                                    />
                                </div>

                                {/* Line Height */}
                                <div>
                                    <Label className="text-xs">Line Height: {element.lineHeight || 1.2}</Label>
                                    <Slider
                                        value={[(element.lineHeight || 1.2) * 100]}
                                        min={80}
                                        max={250}
                                        step={5}
                                        onValueChange={([v]) => handleChange('lineHeight', v / 100)}
                                    />
                                </div>

                                {/* Text Transform */}
                                <div>
                                    <Label className="text-xs">Text Transform</Label>
                                    <Select
                                        value={element.textTransform || 'none'}
                                        onValueChange={(v) => handleChange('textTransform', v)}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Normal</SelectItem>
                                            <SelectItem value="uppercase">UPPERCASE</SelectItem>
                                            <SelectItem value="lowercase">lowercase</SelectItem>
                                            <SelectItem value="capitalize">Capitalize</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <ColorInput
                                    label="Text Color"
                                    value={element.color}
                                    onChange={(v) => handleChange('color', v)}
                                />
                            </div>
                        </CollapsibleSection>

                        {/* Text Background */}
                        <CollapsibleSection title="Text Background" icon={Palette} defaultOpen={false}>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="enable-bg"
                                        checked={!!element.background}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                handleChange('background', { color: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 8, opacity: 1 });
                                            } else {
                                                handleChange('background', null);
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <Label htmlFor="enable-bg" className="text-xs cursor-pointer">Enable Background</Label>
                                </div>

                                {element.background && (
                                    <>
                                        <ColorInput
                                            label="Background Color"
                                            value={element.background?.color || 'rgba(0,0,0,0.5)'}
                                            onChange={(v) => handleNestedChange('background', 'color', v)}
                                        />

                                        <div>
                                            <Label className="text-xs">Padding: {element.background?.padding || 0}px</Label>
                                            <Slider
                                                value={[element.background?.padding || 0]}
                                                min={0}
                                                max={40}
                                                step={2}
                                                onValueChange={([v]) => handleNestedChange('background', 'padding', v)}
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Corner Radius: {element.background?.borderRadius || 0}px</Label>
                                            <Slider
                                                value={[element.background?.borderRadius || 0]}
                                                min={0}
                                                max={30}
                                                step={1}
                                                onValueChange={([v]) => handleNestedChange('background', 'borderRadius', v)}
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Opacity: {Math.round((element.background?.opacity || 1) * 100)}%</Label>
                                            <Slider
                                                value={[(element.background?.opacity || 1) * 100]}
                                                min={0}
                                                max={100}
                                                step={5}
                                                onValueChange={([v]) => handleNestedChange('background', 'opacity', v / 100)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Text Shadow" icon={Layers} defaultOpen={false}>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs">Blur: {element.shadow?.blur || 0}px</Label>
                                    <Slider
                                        value={[element.shadow?.blur || 0]}
                                        min={0}
                                        max={30}
                                        step={1}
                                        onValueChange={([v]) => handleNestedChange('shadow', 'blur', v)}
                                    />
                                </div>
                                <ColorInput
                                    label="Shadow Color"
                                    value={element.shadow?.color || '#000000'}
                                    onChange={(v) => handleNestedChange('shadow', 'color', v)}
                                />
                            </div>
                        </CollapsibleSection>
                    </>
                )}

                {/* Shape/Overlay options */}
                {(element.type === 'shape' || element.type === 'overlay') && (
                    <CollapsibleSection title="Fill & Style" icon={Palette}>
                        <div className="space-y-3">
                            <ColorInput
                                label="Fill Color"
                                value={element.fill}
                                onChange={(v) => handleChange('fill', v)}
                            />

                            <div>
                                <Label className="text-xs">Opacity: {Math.round((element.opacity || 1) * 100)}%</Label>
                                <Slider
                                    value={[(element.opacity || 1) * 100]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={([v]) => handleChange('opacity', v / 100)}
                                />
                            </div>

                            {element.type === 'shape' && (
                                <div>
                                    <Label className="text-xs">Corner Radius: {element.borderRadius || 0}px</Label>
                                    <Slider
                                        value={[element.borderRadius || 0]}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onValueChange={([v]) => handleChange('borderRadius', v)}
                                    />
                                </div>
                            )}
                        </div>
                    </CollapsibleSection>
                )}

                {/* Image Slot options */}
                {element.type === 'imageSlot' && (
                    <CollapsibleSection title="Image Settings" icon={Image}>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs">Slot Name</Label>
                                <Input
                                    value={element.name || ''}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="e.g., Main Image"
                                />
                            </div>

                            <div>
                                <Label className="text-xs">Image Source</Label>
                                <div className="space-y-2">
                                    <Select
                                        value={element.sourceType || 'article'}
                                        onValueChange={(v) => handleChange('sourceType', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="article">From Article</SelectItem>
                                            <SelectItem value="upload">Specific Image</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {element.sourceType === 'upload' && (
                                        <div className="pt-2">
                                            {element.imageUrl && (
                                                <div className="mb-2 rounded overflow-hidden aspect-video relative group border border-zinc-700">
                                                    <img
                                                        src={element.imageUrl}
                                                        alt="Selected"
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            )}
                                            <Button
                                                variant="outline"
                                                className="w-full"
                                                onClick={() => setMediaDialogOpen(true)}
                                            >
                                                <Upload className="w-4 h-4 mr-2" />
                                                {element.imageUrl ? 'Change Image' : 'Select Image'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Corner Radius: {element.borderRadius || 0}px</Label>
                                <Slider
                                    value={[element.borderRadius || 0]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={([v]) => handleChange('borderRadius', v)}
                                />
                            </div>
                        </div>
                    </CollapsibleSection>
                )}
            </div>

            <MediaDialog
                open={mediaDialogOpen}
                onOpenChange={setMediaDialogOpen}
                onSelect={handleImageSelect}
            />
        </div>
    );
};

/**
 * AddElementPanel - Enhanced panel for adding new elements
 */
const AddElementPanel = ({ onAddElement }) => {
    const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const elements = [
        {
            type: 'imageSlot',
            icon: Image,
            label: 'Image Slot',
            description: 'Placeholder for recipe images',
            defaults: { width: 500, height: 400, x: 250, y: 100 }
        },
        {
            type: 'text',
            icon: Type,
            label: 'Text',
            description: 'Add title or description text',
            defaults: { content: 'Your Text', fontSize: 48, color: '#ffffff', width: 400, x: 300, y: 600 }
        },
        {
            type: 'shape',
            icon: Square,
            label: 'Shape',
            description: 'Rectangle or ribbon element',
            defaults: { width: 300, height: 80, fill: '#6366f1', x: 350, y: 700 }
        },
        {
            type: 'overlay',
            icon: Layers,
            label: 'Overlay',
            description: 'Semi-transparent background',
            defaults: { fill: 'rgba(0,0,0,0.4)', opacity: 1, width: 1000, height: 400, x: 0, y: 1100 }
        },
    ];

    const handleMediaSelect = (media) => {
        if (!media) return;

        onAddElement('imageSlot', {
            width: 500,
            height: 400,
            x: 250,
            y: 250,
            sourceType: 'upload',
            imageUrl: media.url,
            name: media.alt_text || 'Image'
        });
    };

    // Handle file upload from desktop
    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please select an image file (JPG, PNG, WebP, GIF, or SVG)');
            return;
        }

        try {
            setIsUploading(true);

            // Upload to media library
            const response = await mediaAPI.upload(file, {
                folder: 'canvas-elements',
                alt: file.name.replace(/\.[^/.]+$/, ''),
            });

            // Handle response structure
            const imageUrl = response.data?.data?.url || response.data?.url;

            if (!imageUrl) {
                throw new Error('Upload failed - no URL returned');
            }

            // Get actual image dimensions
            const img = new window.Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                let width = img.naturalWidth;
                let height = img.naturalHeight;

                // Maximum size constraints (fit within canvas reasonably)
                const maxWidth = 800;
                const maxHeight = 1200;

                // Scale down if needed while maintaining aspect ratio
                if (width > maxWidth) {
                    const ratio = maxWidth / width;
                    width = maxWidth;
                    height = Math.round(height * ratio);
                }
                if (height > maxHeight) {
                    const ratio = maxHeight / height;
                    height = maxHeight;
                    width = Math.round(width * ratio);
                }

                // Center on canvas (canvas is 1000x1500)
                const x = Math.max(0, Math.round((1000 - width) / 2));
                const y = Math.max(0, Math.round((1500 - height) / 4)); // Position in upper portion

                // Add image element to canvas with actual dimensions
                onAddElement('imageSlot', {
                    width,
                    height,
                    x,
                    y,
                    sourceType: 'upload',
                    imageUrl: imageUrl,
                    name: file.name.replace(/\.[^/.]+$/, '') || 'Uploaded Image'
                });

                toast.success('Image added to canvas!');
                setIsUploading(false);

                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            };

            img.onerror = () => {
                // Fallback to default size if image load fails
                onAddElement('imageSlot', {
                    width: 500,
                    height: 400,
                    x: 250,
                    y: 250,
                    sourceType: 'upload',
                    imageUrl: imageUrl,
                    name: file.name.replace(/\.[^/.]+$/, '') || 'Uploaded Image'
                });

                toast.success('Image added to canvas!');
                setIsUploading(false);

                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            };

            img.src = imageUrl;

        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload image');
            setIsUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="add-element-panel p-3">
            <p className="text-xs text-muted-foreground mb-3">Click to add elements to canvas</p>
            <div className="space-y-2">
                {elements.map(({ type, icon: Icon, label, description, defaults }) => (
                    <Button
                        key={type}
                        variant="outline"
                        className="w-full justify-start h-auto py-3 px-3 hover:bg-primary/5 hover:border-primary/50 transition-all group"
                        onClick={() => onAddElement(type, defaults)}
                    >
                        <div className="flex items-center gap-3 w-full">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-sm">{label}</p>
                                <p className="text-xs text-muted-foreground">{description}</p>
                            </div>
                        </div>
                    </Button>
                ))}

                <Separator className="my-2" />

                <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-3 hover:bg-primary/5 hover:border-primary/50 transition-all group"
                    onClick={() => setMediaDialogOpen(true)}
                >
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-sm">Image from Library</p>
                            <p className="text-xs text-muted-foreground">Add existing media</p>
                        </div>
                    </div>
                </Button>

                {/* Upload from Desktop */}
                <Button
                    variant="outline"
                    className="w-full justify-start h-auto py-3 px-3 hover:bg-primary/5 hover:border-primary/50 transition-all group"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                >
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                            {isUploading ? (
                                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                            ) : (
                                <HardDriveUpload className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            )}
                        </div>
                        <div className="text-left">
                            <p className="font-medium text-sm">{isUploading ? 'Uploading...' : 'Upload from Desktop'}</p>
                            <p className="text-xs text-muted-foreground">Import images, SVGs</p>
                        </div>
                    </div>
                </Button>

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,image/svg+xml"
                    onChange={handleFileUpload}
                    className="hidden"
                />
            </div>

            <MediaDialog
                open={mediaDialogOpen}
                onOpenChange={setMediaDialogOpen}
                onSelect={handleMediaSelect}
            />
        </div>
    );
};

export { ElementPanel, AddElementPanel, FONTS, COLOR_PRESETS };
export default ElementPanel;
