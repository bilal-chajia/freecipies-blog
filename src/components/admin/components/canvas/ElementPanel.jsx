import React, { useState, useCallback } from 'react';
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
    Trash2,
    Copy,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    Palette,
    Move,
    RotateCw,
    Maximize2,
} from 'lucide-react';

// Available Google Fonts
const FONTS = [
    { name: 'Inter', style: 'sans-serif' },
    { name: 'Roboto', style: 'sans-serif' },
    { name: 'Open Sans', style: 'sans-serif' },
    { name: 'Montserrat', style: 'sans-serif' },
    { name: 'Playfair Display', style: 'serif' },
    { name: 'Lora', style: 'serif' },
    { name: 'Poppins', style: 'sans-serif' },
    { name: 'Raleway', style: 'sans-serif' },
    { name: 'Nunito', style: 'sans-serif' },
    { name: 'Oswald', style: 'sans-serif' },
];

// Preset colors
const COLOR_PRESETS = [
    '#ffffff', '#000000', '#f43f5e', '#f97316', '#eab308',
    '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

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
 * ColorInput - Color picker with presets
 */
const ColorInput = ({ value, onChange, label }) => {
    return (
        <div className="space-y-2">
            {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
            <div className="flex gap-2">
                <input
                    type="color"
                    value={value || '#ffffff'}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer bg-transparent"
                />
                <Input
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 font-mono text-sm"
                />
            </div>
            <div className="flex gap-1 flex-wrap">
                {COLOR_PRESETS.map((color) => (
                    <button
                        key={color}
                        onClick={() => onChange(color)}
                        className={`w-6 h-6 rounded border-2 transition-all hover:scale-110 ${value === color ? 'border-primary ring-2 ring-primary/20' : 'border-transparent'
                            }`}
                        style={{ backgroundColor: color }}
                    />
                ))}
            </div>
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
                                    <Select
                                        value={element.fontFamily || 'Inter'}
                                        onValueChange={(v) => handleChange('fontFamily', v)}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
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

                                <ColorInput
                                    label="Text Color"
                                    value={element.color}
                                    onChange={(v) => handleChange('color', v)}
                                />
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
                                <Select
                                    value={element.sourceType || 'article'}
                                    onValueChange={(v) => handleChange('sourceType', v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="article">From Article</SelectItem>
                                        <SelectItem value="upload">Manual Upload</SelectItem>
                                    </SelectContent>
                                </Select>
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
        </div>
    );
};

/**
 * AddElementPanel - Enhanced panel for adding new elements
 */
const AddElementPanel = ({ onAddElement }) => {
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
            </div>
        </div>
    );
};

export { ElementPanel, AddElementPanel, FONTS, COLOR_PRESETS };
export default ElementPanel;
