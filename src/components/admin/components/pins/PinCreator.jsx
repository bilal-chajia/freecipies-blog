import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2,
    Download,
    X,
    ImagePlus,
    LayoutTemplate,
    Settings2,
    ChevronLeft,
    Save,
    Link,
    Image,
    ZoomIn,
} from 'lucide-react';
import { Slider } from '../ui/slider';
import { toast } from 'sonner';

import PinCanvas from '../canvas/PinCanvas';
import TemplateSelector from './TemplateSelector';
import { templatesAPI, pinterestBoardsAPI, pinterestPinsAPI } from '../../services/api';
import { useFontLoader } from '../../utils/FontLoader';
import { FONTS } from '../canvas/ElementPanel';

/**
 * PinCreator - Quick workflow to create pins from articles
 * Design matches ImageEditor for unified UI
 */
const PinCreator = ({
    open,
    onOpenChange,
    article,
    onPinCreated
}) => {
    // State
    const [step, setStep] = useState(1); // 1: Select Template, 2: Preview & Edit
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [boards, setBoards] = useState([]);
    const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
    const [isLoadingBoards, setIsLoadingBoards] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form data
    const [pinData, setPinData] = useState({
        title: '',
        description: '',
        boardId: '',
    });

    // Image URLs for template slots
    const [imageUrls, setImageUrls] = useState([]);

    // Image offsets for repositioning within slots (for fine-tuning before export)
    const [imageOffsets, setImageOffsets] = useState({});
    // Image scales for zooming
    const [imageScales, setImageScales] = useState({});

    // Export ref
    const exportFnRef = useRef(null);

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
        const usedFonts = canvasTemplate.elements_json
            .filter(el => el.type === 'text' && el.fontFamily)
            .map(el => el.fontFamily);
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
                    boardId: '',
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
    const handleSelectTemplate = (template) => {
        setSelectedTemplate(template);

        // Parse template elements to find image slots
        let elements = [];
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
        const initialUrls = imageSlots.map((slot, index) => ({
            slotId: slot.id,
            name: slot.name || `Image ${index + 1}`,
            url: '',
        }));
        setImageUrls(initialUrls);

        setStep(2);
    };

    // Build article data for canvas with custom images
    const articleData = article ? {
        title: pinData.title || article.label || '',
        label: pinData.title || article.label || '',
        categoryLabel: article.category_label || article.categoryLabel || '',
        authorName: article.author_name || article.authorName || '',
        prepTime: article.prep_time || '',
        cookTime: article.cook_time || '',
        image: article.image_url || article.cover_url || '',
        // Map custom image URLs to slot IDs
        customImages: imageUrls.reduce((acc, item) => {
            if (item.url) {
                acc[item.slotId] = item.url;
            }
            return acc;
        }, {}),
        // Custom image offsets for repositioning
        imageOffsets: imageOffsets,
        imageScales: imageScales,
    } : null;

    // Handle image offset change when user drags image within slot
    const handleImageOffsetChange = (slotId, offset) => {
        setImageOffsets(prev => ({
            ...prev,
            [slotId]: offset,
        }));
    };

    // Handle image scale change
    const handleImageScaleChange = (slotId, scale) => {
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

            let imageUrl = '';
            try {
                const uploadResponse = await fetch('/api/upload-image', {
                    method: 'POST',
                    body: formData,
                });
                const uploadData = await uploadResponse.json();
                if (uploadData.success && uploadData.url) {
                    imageUrl = uploadData.url;
                }
            } catch (uploadError) {
                console.warn('R2 upload failed, falling back to download:', uploadError);
            }

            // If we have an image URL, save the pin to database
            if (imageUrl && article?.id) {
                await pinterestPinsAPI.create({
                    article_id: article.id,
                    board_id: pinData.boardId ? parseInt(pinData.boardId) : null,
                    title: pinData.title,
                    description: pinData.description,
                    image_url: imageUrl,
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
            <DialogContent className="!max-w-none w-[calc(100vw-120px)] h-[calc(100vh-40px)] p-0 gap-0 bg-zinc-950 border-zinc-800 flex overflow-hidden">
                {/* Left Toolbar */}
                <div className="w-16 bg-zinc-900/50 border-r border-zinc-800 flex flex-col items-center py-4 gap-2">
                    {TOOLS.map((tool) => (
                        <Button
                            key={tool.id}
                            variant={activeTool === tool.id ? "default" : "ghost"}
                            size="icon"
                            className={`w-12 h-12 ${activeTool === tool.id ? '' : 'text-muted-foreground hover:text-foreground'}`}
                            onClick={() => setActiveTool(tool.id)}
                            title={tool.label}
                        >
                            <tool.icon className="w-5 h-5" />
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
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    )}
                </div>

                {/* Center Content */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
                        <div className="flex items-center gap-3">
                            <ImagePlus className="w-5 h-5 text-primary" />
                            <div>
                                <h2 className="text-lg font-semibold text-white">
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
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                            >
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            {step === 2 && (
                                <Button
                                    size="sm"
                                    onClick={handleExportAndSave}
                                    disabled={isSaving || !pinData.title}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    {isSaving ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    {isSaving ? 'Exporting...' : 'Export Pin'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Main Canvas Area */}
                    <div className="flex-1 bg-zinc-900 flex items-center justify-center overflow-auto p-8">
                        {step === 1 ? (
                            // Template Selection Grid
                            <ScrollArea className="h-full w-full max-w-4xl">
                                <div className="p-4">
                                    <h3 className="text-white font-medium mb-4">Choose a Template</h3>
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
                                <PinCanvas
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
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p>Loading preview...</p>
                                </div>
                            )
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-80 bg-zinc-900/50 border-l border-zinc-800 flex flex-col">
                    <div className="h-14 border-b border-zinc-800 flex items-center px-4">
                        <h3 className="text-sm font-medium text-white">
                            {activeTool === 'templates' ? 'Pin Details' : 'Settings'}
                        </h3>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-6">
                            {/* Title */}
                            <div className="space-y-2">
                                <Label className="text-white">Pin Title</Label>
                                <Input
                                    value={pinData.title}
                                    onChange={(e) => setPinData(prev => ({
                                        ...prev,
                                        title: e.target.value
                                    }))}
                                    placeholder="Enter pin title..."
                                    className="bg-zinc-800 border-zinc-700"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-2">
                                <Label className="text-white">Description</Label>
                                <Textarea
                                    value={pinData.description}
                                    onChange={(e) => setPinData(prev => ({
                                        ...prev,
                                        description: e.target.value
                                    }))}
                                    placeholder="Pinterest description for SEO..."
                                    rows={4}
                                    className="bg-zinc-800 border-zinc-700 resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {pinData.description.length}/500 characters
                                </p>
                            </div>

                            {/* Dynamic Image URLs based on template slots */}
                            {imageUrls.length > 0 && (
                                <>
                                    <Separator className="bg-zinc-800" />
                                    <div className="space-y-3">
                                        <Label className="text-white flex items-center gap-2">
                                            <Image className="w-4 h-4" />
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
                                                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                        value={item.url}
                                                        onChange={(e) => {
                                                            const newUrls = [...imageUrls];
                                                            newUrls[index] = { ...item, url: e.target.value };
                                                            setImageUrls(newUrls);
                                                        }}
                                                        placeholder="https://example.com/image.jpg"
                                                        className="bg-zinc-800 border-zinc-700 pl-9"
                                                    />
                                                </div>
                                                {item.url && (
                                                    <>
                                                        <img
                                                            src={item.url}
                                                            alt={item.name}
                                                            className="w-full h-20 object-cover rounded-md mt-1"
                                                            onError={(e) => e.target.style.display = 'none'}
                                                        />
                                                        <div className="flex items-center gap-3 pt-1">
                                                            <ZoomIn className="w-3 h-3 text-muted-foreground" />
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

                            <Separator className="bg-zinc-800" />

                            {/* Board Selection */}
                            <div className="space-y-2">
                                <Label className="text-white">Pinterest Board</Label>
                                <Select
                                    value={pinData.boardId}
                                    onValueChange={(value) => setPinData(prev => ({
                                        ...prev,
                                        boardId: value
                                    }))}
                                >
                                    <SelectTrigger className="bg-zinc-800 border-zinc-700">
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

                            <Separator className="bg-zinc-800" />

                            {/* Article Info */}
                            <div className="space-y-3">
                                <Label className="text-white text-xs uppercase tracking-wide">Article Details</Label>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Category</span>
                                        <span className="text-white">{articleData?.categoryLabel || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Author</span>
                                        <span className="text-white">{articleData?.authorName || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Selected Template Info */}
                            {selectedTemplate && (
                                <>
                                    <Separator className="bg-zinc-800" />
                                    <div className="space-y-3">
                                        <Label className="text-white text-xs uppercase tracking-wide">Template</Label>
                                        <div className="p-3 bg-zinc-800 rounded-lg">
                                            <p className="text-white font-medium">{selectedTemplate.name}</p>
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
