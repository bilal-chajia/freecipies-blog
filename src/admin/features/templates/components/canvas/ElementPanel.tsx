import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Slider } from '@/ui/slider';
import { Separator } from '@/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/ui/collapsible';
import {
    Type,
    Square,
    Image as ImageIcon,
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
    Upload,
    HardDriveUpload,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { MediaDialog } from '@admin/features/media/components';
import ColorPicker from '@admin/components/ColorPicker';
import { FONTS, COLOR_PRESETS } from './utils/editorConstants';
import useEditorStore, { type EditorElement } from '@admin/features/templates/store/useEditorStore';

interface CollapsibleSectionProps {
    title: string;
    icon?: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

/**
 * CollapsibleSection - Accordion section for property panels
 */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon: Icon, children, defaultOpen = true }) => {
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

interface ColorInputProps {
    value?: string;
    onChange: (value: string) => void;
    label?: string;
}

/**
 * ColorInput - Color picker with advanced picker
 */
const ColorInput: React.FC<ColorInputProps> = ({ value, onChange, label }) => {
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
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 font-mono text-sm"
                />
            </div>
            {showPicker && (
                <ColorPicker
                    color={value || '#ffffff'}
                    onChange={(color: string | null) => onChange(color ?? '')}
                    onClose={() => setShowPicker(false)}
                    className="top-16 left-0 z-50"
                />
            )}
        </div>
    );
};

interface ElementPanelProps {
    element: EditorElement | null;
    onUpdate: (element: EditorElement) => void;
    onDelete: () => void;
    onDuplicate: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}

/**
 * ElementPanel - Enhanced property panel for editing selected elements
 */
const ElementPanel: React.FC<ElementPanelProps> = ({
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

    // Generic field updater — accepts any property key since element type is
    // always narrowed in JSX via `element.type === 'text'` guards before use.
    const handleChange = (key: string, value: unknown) => {
        onUpdate({ ...element, [key]: value } as EditorElement);
    };

    // Alias for sub-type specific keys (kept for readability in imageSlot/shape sections)
    const handleAnyChange = handleChange;

    // Rich read alias — unions all sub-type properties for read access.
    // Runtime correctness is guaranteed by element.type === '...' guards in JSX.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const el = element as any;


    const handleNestedChange = <K extends 'background' | 'shadow' | 'border'>(
        parent: K,
        key: string,
        value: any
    ) => {
        onUpdate({
            ...element,
            [parent]: {
                ...((el[parent] as Record<string, unknown>) || {}),
                [key]: value,
            },
        } as EditorElement);
    };

    const handleImageSelect = (media: any) => {
        if (!media) return;

        onUpdate({
            ...element,
            imageUrl: media.url,
            sourceType: 'upload',
            name: media.alt_text || element.name || 'Image',
        } as EditorElement);
    };

    return (
        <div className="element-panel">
            {/* Header with actions */}
            <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                        {element.type === 'text' && <Type className="w-4 h-4 text-primary" />}
                        {element.type === 'imageSlot' && <ImageIcon className="w-4 h-4 text-primary" />}
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('x', parseInt(e.target.value) || 0)}
                                className="h-8"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Y</Label>
                            <Input
                                type="number"
                                value={Math.round(element.y || 0)}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('y', parseInt(e.target.value) || 0)}
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
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('width', parseInt(e.target.value) || 100)}
                                        className="h-8"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Height</Label>
                                    <Input
                                        type="number"
                                        value={Math.round(element.height || 100)}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('height', parseInt(e.target.value) || 100)}
                                        className="h-8"
                                    />
                                </div>
                            </>
                        )}
                        {element.rotation !== undefined && (
                            <div className="col-span-2">
                                <Label className="text-xs">Rotation: {Math.round(element.rotation || 0)}°</Label>
                                <Slider
                                    className=""
                                    defaultValue={[0]}
                                    value={[element.rotation || 0]}
                                    min={-180}
                                    max={180}
                                    step={1}
                                    onValueChange={([v]: [number]) => handleChange('rotation', v)}
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
                                <div>
                                    <Label className="text-xs">Static Text</Label>
                                    <Input
                                        value={el.content || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('content', e.target.value)}
                                        placeholder="Enter text..."
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Data Binding (dot notation)</Label>
                                    <Input
                                        value={el.binding || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('binding', e.target.value)}
                                        placeholder="e.g. title, recipeJson.prep"
                                    />
                                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded mt-1">
                                        <p className="mb-1">Common bindings:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {['title', 'categoryLabel', 'recipeJson.prep', 'recipeJson.servings', 'recipeJson.difficulty'].map(b => (
                                                <button
                                                    key={b}
                                                    type="button"
                                                    className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:bg-primary/20"
                                                    onClick={() => handleChange('binding', b)}
                                                >
                                                    {b}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Typography" icon={Type}>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs">Font Family</Label>
                                    <div className="space-y-2">
                                        <Select
                                            value={el.fontFamily || 'Inter'}
                                            onValueChange={(v: string) => handleChange('fontFamily', v)}
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
                                                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                                e.preventDefault();
                                                                const input = document.getElementById('font-upload-input');
                                                                if (input) input.click();
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
                                                                    const formData = new FormData();
                                                                    formData.append('file', file);

                                                                    const response = await fetch('/api/upload-font', {
                                                                        method: 'POST',
                                                                        headers: {
                                                                            Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
                                                                        },
                                                                        body: formData,
                                                                    });

                                                                    const result = await response.json();
                                                                    if (!response.ok) throw new Error(result.error || 'Upload failed');

                                                                    const url = result.data?.url;

                                                                    if (!url) throw new Error('No URL returned');

                                                                    const fontName = result.data?.filename?.replace(/\.[^.]+$/, '') || file.name.split('.')[0];

                                                                    // 2. Add to store (persisted)
                                                                    const { addCustomFont } = useEditorStore.getState();

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
                                                    const customFonts = useEditorStore.getState().customFonts || [];
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
                                    <Label className="text-xs">Font Size: {el.fontSize || 32}px</Label>
                                    <Slider
                                        className=""
                                        defaultValue={[32]}
                                        value={[el.fontSize || 32]}
                                        min={12}
                                        max={120}
                                        step={1}
                                        onValueChange={([v]: [number]) => handleChange('fontSize', v)}
                                    />
                                </div>

                                <div className="flex gap-1">
                                    <Button
                                        variant={el.fontWeight === 'bold' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('fontWeight', el.fontWeight === 'bold' ? 'normal' : 'bold')}
                                    >
                                        <Bold className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={el.fontStyle === 'italic' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('fontStyle', el.fontStyle === 'italic' ? 'normal' : 'italic')}
                                    >
                                        <Italic className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={el.textAlign === 'left' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('textAlign', 'left')}
                                    >
                                        <AlignLeft className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={el.textAlign === 'center' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('textAlign', 'center')}
                                    >
                                        <AlignCenter className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={el.textAlign === 'right' ? 'secondary' : 'outline'}
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
                                        variant={el.textDecoration === 'underline' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('textDecoration', el.textDecoration === 'underline' ? 'none' : 'underline')}
                                        title="Underline"
                                    >
                                        <Underline className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant={el.textDecoration === 'line-through' ? 'secondary' : 'outline'}
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleChange('textDecoration', el.textDecoration === 'line-through' ? 'none' : 'line-through')}
                                        title="Strikethrough"
                                    >
                                        <Strikethrough className="w-4 h-4" />
                                    </Button>
                                </div>

                                {/* Letter Spacing */}
                                <div>
                                    <Label className="text-xs">Letter Spacing: {el.letterSpacing || 0}px</Label>
                                    <Slider
                                        className=""
                                        defaultValue={[0]}
                                        value={[el.letterSpacing || 0]}
                                        min={-5}
                                        max={20}
                                        step={0.5}
                                        onValueChange={([v]: [number]) => handleChange('letterSpacing', v)}
                                    />
                                </div>

                                {/* Line Height */}
                                <div>
                                    <Label className="text-xs">Line Height: {el.lineHeight || 1.2}</Label>
                                    <Slider
                                        className=""
                                        defaultValue={[120]}
                                        value={[(el.lineHeight || 1.2) * 100]}
                                        min={80}
                                        max={250}
                                        step={5}
                                        onValueChange={([v]: [number]) => handleChange('lineHeight', v / 100)}
                                    />
                                </div>

                                {/* Text Transform */}
                                <div>
                                    <Label className="text-xs">Text Transform</Label>
                                    <Select
                                        value={el.textTransform || 'none'}
                                        onValueChange={(v: string) => handleChange('textTransform', v)}
                                    >
                                        <SelectTrigger className="h-8">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="">
                                            <SelectItem className="" value="none">Normal</SelectItem>
                                            <SelectItem className="" value="uppercase">UPPERCASE</SelectItem>
                                            <SelectItem className="" value="lowercase">lowercase</SelectItem>
                                            <SelectItem className="" value="capitalize">Capitalize</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <ColorInput
                                    label="Text Color"
                                    value={el.color}
                                    onChange={(v: string) => handleChange('color', v)}
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
                                        checked={!!el.background}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            if (e.target.checked) {
                                                handleChange('background', { color: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 8, opacity: 1 });
                                            } else {
                                                handleChange('background', undefined);
                                            }
                                        }}
                                        className="rounded"
                                    />
                                    <Label htmlFor="enable-bg" className="text-xs cursor-pointer">Enable Background</Label>
                                </div>

                                {el.background && (
                                    <>
                                        <ColorInput
                                            label="Background Color"
                                            value={el.background?.color || 'rgba(0,0,0,0.5)'}
                                            onChange={(v: string) => handleNestedChange('background', 'color', v)}
                                        />

                                        <div>
                                            <Label className="text-xs">Padding: {el.background?.padding || 0}px</Label>
                                            <Slider
                                                className=""
                                                defaultValue={[0]}
                                                value={[el.background?.padding || 0]}
                                                min={0}
                                                max={40}
                                                step={2}
                                                onValueChange={([v]: [number]) => handleNestedChange('background', 'padding', v)}
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Corner Radius: {el.background?.borderRadius || 0}px</Label>
                                            <Slider
                                                className=""
                                                defaultValue={[0]}
                                                value={[el.background?.borderRadius || 0]}
                                                min={0}
                                                max={30}
                                                step={1}
                                                onValueChange={([v]: [number]) => handleNestedChange('background', 'borderRadius', v)}
                                            />
                                        </div>

                                        <div>
                                            <Label className="text-xs">Opacity: {Math.round((el.background?.opacity || 1) * 100)}%</Label>
                                            <Slider
                                                className=""
                                                defaultValue={[100]}
                                                value={[(el.background?.opacity || 1) * 100]}
                                                min={0}
                                                max={100}
                                                step={5}
                                                onValueChange={([v]: [number]) => handleNestedChange('background', 'opacity', v / 100)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </CollapsibleSection>

                        <CollapsibleSection title="Text Shadow" icon={Layers} defaultOpen={false}>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs">Blur: {el.shadow?.blur || 0}px</Label>
                                    <Slider
                                        className=""
                                        defaultValue={[0]}
                                        value={[el.shadow?.blur || 0]}
                                        min={0}
                                        max={30}
                                        step={1}
                                        onValueChange={([v]: [number]) => handleNestedChange('shadow', 'blur', v)}
                                    />
                                </div>
                                <ColorInput
                                    label="Shadow Color"
                                    value={el.shadow?.color || '#000000'}
                                    onChange={(v: string) => handleNestedChange('shadow', 'color', v)}
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
                                value={el.fill}
                                onChange={(v: string) => handleChange('fill', v)}
                            />

                            <div>
                                <Label className="text-xs">Opacity: {Math.round((element.opacity || 1) * 100)}%</Label>
                                <Slider
                                    className=""
                                    defaultValue={[100]}
                                    value={[(element.opacity || 1) * 100]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={([v]: [number]) => handleChange('opacity', v / 100)}
                                />
                            </div>

                            {element.type === 'shape' && (
                                <div>
                                    <Label className="text-xs">Corner Radius: {el.borderRadius || 0}px</Label>
                                    <Slider
                                        className=""
                                        defaultValue={[0]}
                                        value={[el.borderRadius || 0]}
                                        min={0}
                                        max={100}
                                        step={1}
                                        onValueChange={([v]: [number]) => handleAnyChange('borderRadius', v)}
                                    />
                                </div>
                            )}
                        </div>
                    </CollapsibleSection>
                )}

                {/* Image Slot options */}
                {element.type === 'imageSlot' && (
                    <CollapsibleSection title="Image Settings" icon={ImageIcon}>
                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs">Slot Name</Label>
                                <Input
                                    value={element.name || ''}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
                                    placeholder="e.g., Main Image"
                                />
                            </div>

                            <div>
                                <Label className="text-xs">Image Source</Label>
                                <div className="space-y-2">
                                    <Select
                                        value={el.sourceType || 'article'}
                                        onValueChange={(v: string) => handleAnyChange('sourceType', v)}
                                    >
                                        <SelectTrigger className="">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="">
                                            <SelectItem className="" value="article">From Article</SelectItem>
                                            <SelectItem className="" value="upload">Specific Image</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {el.sourceType === 'upload' && (
                                        <div className="pt-2">
                                            {el.imageUrl && (
                                                <div className="mb-2 rounded overflow-hidden aspect-video relative group border border-zinc-700">
                                                    <img
                                                        src={el.imageUrl}
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
                                                {el.imageUrl ? 'Change Image' : 'Select Image'}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Corner Radius: {el.borderRadius || 0}px</Label>
                                <Slider
                                    className=""
                                    defaultValue={[0]}
                                    value={[el.borderRadius || 0]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={([v]: [number]) => handleAnyChange('borderRadius', v)}
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
                variantSizes={undefined}
            />
        </div>
    );
};

interface AddElementPanelProps {
    onAddElement: (type: string, defaults: Record<string, any>) => void;
}

/**
 * AddElementPanel - Enhanced panel for adding new elements
 */
const AddElementPanel: React.FC<AddElementPanelProps> = ({ onAddElement }) => {
    const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const elements = [
        {
            type: 'imageSlot',
            icon: ImageIcon,
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

    const handleMediaSelect = (media: any) => {
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
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        toast.error('Template asset upload needs the dedicated template asset flow first.');
        setIsUploading(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
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
                variantSizes={undefined}
            />
        </div>
    );
};

export { ElementPanel, AddElementPanel, FONTS, COLOR_PRESETS };
export default ElementPanel;
