import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
} from '@/ui/dialog';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { ScrollArea } from '@/ui/scroll-area';
import { Separator } from '@/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select';
import {
    Loader2,
    Download,
    X,
    ImagePlus,
    LayoutTemplate,
    Settings2,
    ChevronLeft,
    Link,
    Image,
    ZoomIn,
} from 'lucide-react';
import { Slider } from '@/ui/slider';
import { toast } from 'sonner';

import TemplateCanvas from '@admin/features/templates/components/canvas/TemplateCanvas';
import TemplateSelector from './TemplateSelector';
import { templatesAPI, pinterestBoardsAPI, pinterestPinsAPI } from '@/services/api';
import { useFontLoader } from '@/utils/FontLoader';
import { FONTS } from '@admin/features/templates/components/canvas/ElementPanel';
import type { EditorElement } from '@admin/features/templates/store';
import type { ExportFormat } from '@admin/features/templates/hooks';

interface PinCreatorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    article: Record<string, any> | null;
    onPinCreated?: () => void;
}

interface ImageSlotUrl {
    slotId: string;
    name: string;
    url: string;
}

/**
 * PinCreator - Quick workflow to create pins from articles
 * Design matches ImageEditor for unified UI
 */
const PinCreator: React.FC<PinCreatorProps> = ({
    open,
    onOpenChange,
    article,
    onPinCreated
}) => {
    // State
    const [step, setStep] = useState(1); // 1: Select Template, 2: Preview & Edit
    const [templates, setTemplates] = useState<any[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
    const [boards, setBoards] = useState<any[]>([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [isLoadingBoards, setIsLoadingBoards] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form data
    const [pinData, setPinData] = useState({
        title: '',
        description: '',
        board_id: '',
    });

    // Image URLs for template slots
    const [imageUrls, setImageUrls] = useState<ImageSlotUrl[]>([]);

    // Image offsets for repositioning within slots (for fine-tuning before export)
    const [imageOffsets, setImageOffsets] = useState<Record<string, { x: number; y: number }>>({});
    // Image scales for zooming
    const [imageScales, setImageScales] = useState<Record<string, number>>({});

    // Export ref
    const exportFnRef = useRef<((format?: ExportFormat, quality?: number) => Promise<Blob | null>) | null>(null);

    // Build template object for canvas
    const canvasTemplate = useMemo(() => selectedTemplate ? {
        ...selectedTemplate,
        elements_json: typeof selectedTemplate.elements_json === 'string'
            ? JSON.parse(selectedTemplate.elements_json)
            : selectedTemplate.elements_json || [],
    } : null, [selectedTemplate]);

    // Load fonts for the selected template
    const templateFonts = useMemo(() => {
        if (!canvasTemplate?.elements_json) return [];
        const usedFonts = (canvasTemplate.elements_json as EditorElement[])
            .filter((el): el is EditorElement & { fontFamily: string } => el.type === 'text' && !!(el as any).fontFamily)
            .map(el => (el as any).fontFamily as string);
        // Always include default fonts to be safe
        const defaultFonts = FONTS.map(f => f.name);
        return [...new Set([...defaultFonts, ...usedFonts])];
    }, [canvasTemplate]);

    useFontLoader(templateFonts);

    // Load templates on mount
    useEffect(() => {
        if (open) {
            loadTemplates();
            loadBoards();
            // Reset state
            setStep(1);
            setSelectedTemplate(null);
            if (article) {
                setPinData({
                    title: article.label || article.title || '',
                    description: article.short_description || article.meta_description || '',
                    board_id: '',
                });
            }
        }
    }, [open, article]);

    const loadTemplates = async () => {
        try {
            setIsLoadingTemplates(true);
            const response = await templatesAPI.getAll();
            const data = response.data?.data || response.data || [];
            setTemplates(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setIsLoadingTemplates(false);
        }
    };

    const loadBoards = async () => {
        try {
            setIsLoadingBoards(true);
            const response = await pinterestBoardsAPI.getAll();
            const data = response.data?.boards || response.data || [];
            setBoards(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load boards:', error);
            toast.error('Failed to load boards');
        } finally {
            setIsLoadingBoards(false);
        }
    };

    // Handle template selection
    const handleSelectTemplate = (template: any) => {
        setSelectedTemplate(template);

        // Parse template elements to find image slots
        let elements: any[] = [];
        try {
            elements = typeof template.elements_json === 'string'
                ? JSON.parse(template.elements_json)
                : template.elements_json || [];
        } catch (e) {
            elements = [];
        }

        // Find all imageSlot elements
        const imageSlots = elements.filter(el => el.type === 'imageSlot');

        // Initialize imageUrls array based on number of slots
        const initialUrls = imageSlots.map((slot: any, index: number) => ({
            slotId: slot.id,
            name: slot.name || `Image ${index + 1}`,
            url: '',
        }));
        setImageUrls(initialUrls);

        setStep(2);
    };

    // Build article data for canvas with custom images
    // Include all fields for data binding (dot notation)
    const articleData = article ? {
        // Basic article fields
        title: pinData.title || article.label || article.title || '',
        label: pinData.title || article.label || '',
        categoryLabel: article.category_label || article.categoryLabel || '',
        authorName: article.author_name || article.authorName || '',
        prepTime: article.prep_time || article.prepTime || '',
        cookTime: article.cook_time || article.cookTime || '',
        image: article.image_url || article.cover_url || article.image || '',
        thumbnail: article.thumbnail_url || article.thumbnail || '',
        featuredImage: article.featured_image || article.image_url || '',

        // Recipe JSON for nested binding (recipe_json.prep, recipe_json.servings, etc.)
        recipe_json: article.recipe_json || article.recipe_json || article.recipe || null,

        // Short text
        short_description: article.short_description || article.meta_description || '',
        metaDescription: article.meta_description || '',

        // Map custom image URLs to slot IDs
        customImages: imageUrls.reduce<Record<string, string>>((acc, item) => {
            if (item.url) {
                acc[item.slotId] = item.url;
            }
            return acc;
        }, {}),

        // Custom image offsets for repositioning
        imageOffsets: imageOffsets,
        imageScales: imageScales,

        // Pass through the entire article for any other bindings
        ...article,
    } : null;

    // Handle image offset change when user drags image within slot
    const handleImageOffsetChange = (slotId: string, offset: { x: number; y: number }) => {
        setImageOffsets(prev => ({
            ...prev,
            [slotId]: offset,
        }));
    };

    // Handle image scale change
    const handleImageScaleChange = (slotId: string, scale: number) => {
        setImageScales(prev => ({
            ...prev,
            [slotId]: scale,
        }));
    };

    // Handle export and save
    const handleExportAndSave = async () => {
        if (!exportFnRef.current) {
            toast.error('Canvas not ready');
            return;
        }

        try {
            setIsSaving(true);

            // Generate JPEG
            const blob = await exportFnRef.current('jpeg', 0.95);
            if (!blob) {
                throw new Error('Failed to generate image');
            }

            // Create file name
            const filename = pinData.title
                .replace(/[^a-z0-9\s-]/gi, '')
                .trim()
                .replace(/\s+/g, '-')
                .toLowerCase();

            // Upload to R2 via media upload endpoint
            const formData = new FormData();
            formData.append('file', blob, `${filename}.jpg`);
            formData.append('type', 'pinterest-pin');

            let image_url = '';
            try {
                const uploadResponse = await fetch('/api/pins/upload-image', {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadResponse.json();

                if (uploadData.success) {
                    image_url = uploadData.data?.url || uploadData.url || '';
                }
            } catch (uploadError) {
                console.warn('R2 upload failed, falling back to download:', uploadError);
            }

            // If we have an image URL, save the pin to database
            if (image_url && article?.id) {
                await pinterestPinsAPI.create({
                    article_id: article.id,
                    board_id: pinData.board_id ? parseInt(pinData.board_id) : null,
                    title: pinData.title,
                    description: pinData.description,
                    image_url: image_url,
                    image_alt: pinData.title,
                    image_width: 1000,
                    image_height: 1500,
                    is_primary: false,
                });
                toast.success('Pin saved successfully!');
            } else {
                // Fallback: just download the image
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${filename}.jpg`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                toast.success('Pin exported successfully!');
            }

            onPinCreated?.();
            onOpenChange(false);

        } catch (error) {
            console.error('Failed to create pin:', error);
            toast.error('Failed to create pin');
        } finally {
            setIsSaving(false);
        }
    };

    // Tools for left sidebar
    const TOOLS = [
        { id: 'templates', label: 'Templates', icon: LayoutTemplate },
        { id: 'settings', label: 'Settings', icon: Settings2 },
    ];

    const [activeTool, setActiveTool] = useState('templates');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-none! w-[calc(100vw-120px)] h-[calc(100vh-40px)] p-0 gap-0 bg-background border-border flex overflow-hidden">
                {/* Left Toolbar */}
                <div className="w-16 bg-muted/50 border-r border-border flex flex-col items-center py-4 gap-2">
                    {TOOLS.map((tool) => (
                        <Button
                            key={tool.id}
                            variant={activeTool === tool.id ? "default" : "ghost"}
                            size="icon"
                            className={`w-12 h-12 ${activeTool === tool.id ? '' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTool(tool.id)}
                            title={tool.label}
                        >
                            <tool.icon className="size-5" />
                        </Button>
                    ))}

                    <div className="flex-1" />

                    <Separator className="my-2 w-8" />

                    {step === 2 && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-12 h-12 text-muted-foreground hover:text-foreground"
                            onClick={() => setStep(1)}
                            title="Back to Templates"
                        >
                            <ChevronLeft className="size-5" />
                        </Button>
                    )}
                </div>

                {/* Center Content */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="h-14 border-b border-border flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <ImagePlus className="size-5 text-primary" />
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    {step === 1 ? 'Select Template' : 'Create Pin'}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                    {article?.label || 'New Pin'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChange(false)}
                                className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive-foreground"
                            >
                                <X className="size-4 mr-2" /> Cancel
                            </Button>
                            {step === 2 && (
                                <Button
                                    size="sm"
                                    onClick={handleExportAndSave}
                                    disabled={isSaving || !pinData.title}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    {isSaving ? (
                                        <Loader2 className="size-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="size-4 mr-2" />
                                    )}
                                    {isSaving ? 'Exporting...' : 'Export Pin'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Main Canvas Area */}
                    <div className="flex-1 bg-muted flex items-center justify-center overflow-auto p-8">
                        {step === 1 ? (
                            // Template Selection Grid
                            <ScrollArea className="h-full w-full max-w-4xl">
                                <div className="p-4">
                                    <h3 className="text-foreground font-medium mb-4">Choose a Template</h3>
                                    <TemplateSelector
                                        templates={templates}
                                        selectedId={selectedTemplate?.id}
                                        onSelect={handleSelectTemplate}
                                        isLoading={isLoadingTemplates}
                                    />
                                </div>
                            </ScrollArea>
                        ) : (
                            // Canvas Preview
                            canvasTemplate && articleData ? (
                                <TemplateCanvas
                                    template={canvasTemplate}
                                    articleData={articleData}
                                    editable={false}
                                    scale={0.5}
                                    zoom={100}
                                    showGrid={false}
                                    allowImageDrag={true}
                                    onImageOffsetChange={handleImageOffsetChange}
                                    onExport={(fn) => { exportFnRef.current = fn; }}
                                />
                            ) : (
                                <div className="text-muted-foreground flex flex-col items-center gap-2">
                                    <Loader2 className="size-8 animate-spin" />
                                    <p>Loading preview...</p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-80 bg-muted/50 border-l border-border flex flex-col">
                    <div className="h-14 border-b border-zinc-800 flex items-center px-4">
                        <h3 className="text-sm font-medium text-foreground">
                            {activeTool === 'templates' ? 'Pin Details' : 'Settings'}
                        </h3>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-6">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label>Pin Title</Label>
                                <Input
                                    value={pinData.title}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPinData(prev => ({
                                        ...prev,
                                        title: e.target.value
                                    }))}
                                    placeholder="Enter pin title..."
                                    className="bg-muted border-border"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    value={pinData.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPinData(prev => ({
                                        ...prev,
                                        description: e.target.value
                                    }))}
                                    placeholder="Pinterest description for SEO..."
                                    rows={4}
                                    className="bg-muted border-border resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {pinData.description.length}/500 characters
                                </p>
                            </div>

                            {/* Dynamic Image URLs based on template slots */}
                            {imageUrls.length > 0 && (
                                <>
                                    <Separator />
                                    <div className="space-y-3">
                                        <Label className="text-foreground flex items-center gap-2">
                                            <Image className="size-4" />
                                            Image URLs ({imageUrls.length} slot{imageUrls.length > 1 ? 's' : ''})
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Paste image URLs to replace template images
                                        </p>
                                        {imageUrls.map((item, index) => (
                                            <div key={item.slotId} className="space-y-1">
                                                <Label className="text-xs text-muted-foreground">
                                                    {item.name}
                                                </Label>
                                                <div className="relative">
                                                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                                    <Input
                                                        value={item.url}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                            const newUrls = [...imageUrls];
                                                            newUrls[index] = { ...item, url: e.target.value };
                                                            setImageUrls(newUrls);
                                                        }}
                                                        placeholder="https://example.com/image.jpg"
                                                        className="bg-muted border-border pl-9"
                                                    />
                                                </div>
                                                {item.url && (
                                                    <>
                                                        <img
                                                            src={item.url}
                                                            alt={item.name}
                                                            className="w-full h-20 object-cover rounded-md mt-1"
                                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                                        />
                                                        <div className="flex items-center gap-3 pt-1">
                                                            <ZoomIn className="size-3 text-muted-foreground" />
                                                            <Slider
                                                                value={[imageScales[item.slotId] || 1]}
                                                                min={1}
                                                                max={3}
                                                                step={0.1}
                                                                onValueChange={([value]) => handleImageScaleChange(item.slotId, value)}
                                                                className="flex-1"
                                                            />
                                                            <span className="text-[10px] text-muted-foreground w-6 text-right font-mono">
                                                                {(imageScales[item.slotId] || 1).toFixed(1)}x
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}

                            <Separator />

                            {/* Board Selection */}
                            <div className="space-y-2">
                                <Label>Pinterest Board</Label>
                                <Select
                                    value={pinData.board_id}
                                    onValueChange={(value) => setPinData(prev => ({
                                        ...prev,
                                        board_id: value
                                    }))}
                                >
                                    <SelectTrigger className="bg-muted border-border">
                                        <SelectValue placeholder="Select a board..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {boards.map((board) => (
                                            <SelectItem
                                                key={board.id}
                                                value={board.id.toString()}
                                            >
                                                {board.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <Separator />

                            {/* Article Info */}
                            <div className="space-y-3">
                                <Label className="text-xs uppercase tracking-wide">Article Details</Label>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Category</span>
                                        <span className="text-foreground">{articleData?.categoryLabel || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Author</span>
                                        <span className="text-foreground">{articleData?.authorName || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Selected Template Info */}
                            {selectedTemplate && (
                                <>
                                    <Separator />
                                    <div className="space-y-3">
                                        <Label className="text-xs uppercase tracking-wide">Template</Label>
                                        <div className="p-3 bg-zinc-800 rounded-lg">
                                            <p className="text-foreground font-medium">{selectedTemplate.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {selectedTemplate.description || 'No description'}
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PinCreator;
