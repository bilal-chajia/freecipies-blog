import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Crop as CropIcon,
    SlidersHorizontal,
    Stamp,
    Undo2,
    Redo2,
    Image as ImageIcon,
    X,
    Save,
    Grid3X3,
    Square,
    RotateCcw,
    Eye,
    EyeOff,
    Info,
    FlipHorizontal2,
    FlipVertical2,
    Type,
    FileSearch
} from 'lucide-react';
import getCroppedImg from '../../../utils/canvasUtils';
import { authorsAPI } from '../services/api';

// Import from modular structure
import { FILTERS, ASPECT_RATIO_GROUPS, parseAspectValue, DEFAULT_STATE } from './ImageEditor/constants';
import { CropPanel, AdjustPanel, TextPanel, WatermarkPanel, SEOPanel, QUALITY_PRESETS } from './ImageEditor/panels';

const TOOLS = [
    { id: 'crop', label: 'Crop', icon: CropIcon },
    { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'watermark', label: 'Watermark', icon: Stamp },
    { id: 'seo', label: 'SEO', icon: FileSearch },
];


const ImageEditor = ({ isOpen, image, originalFilename, onSave, onCancel }) => {
    // Active Tool
    const [activeTool, setActiveTool] = useState('crop');

    // Crop State
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspect, setAspect] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [croppedArea, setCroppedArea] = useState(null); // Percentage-based crop area for overlay positioning

    // Flip State
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);

    // Filter State
    const [activeFilter, setActiveFilter] = useState('normal');

    // Adjustment Sliders (manual fine-tuning)
    const [brightness, setBrightness] = useState(1);
    const [contrast, setContrast] = useState(1);
    const [saturation, setSaturation] = useState(1);
    const [temperature, setTemperature] = useState(0); // -100 to 100
    const [blur, setBlur] = useState(0); // 0-10px

    // Vignette
    const [vignetteEnabled, setVignetteEnabled] = useState(false);
    const [vignetteIntensity, setVignetteIntensity] = useState(0.5);

    // Text Overlay
    const [textOverlay, setTextOverlay] = useState({
        enabled: false,
        text: '',
        font: 'sans-serif',
        size: 48,
        color: '#ffffff',
        position: 'center',
        shadow: true
    });

    // Watermark State
    const [watermarkType, setWatermarkType] = useState('none');
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.5);
    const [watermarkPosition, setWatermarkPosition] = useState('BR');
    const [watermarkScale, setWatermarkScale] = useState(0.15); // 0.05 to 0.5 (5% to 50% of image)
    const [watermarkRepeat, setWatermarkRepeat] = useState('single');
    const [watermarkPattern, setWatermarkPattern] = useState('diagonal'); // 'grid', 'diagonal', 'horizontal', 'vertical'
    const [watermarkSpacingH, setWatermarkSpacingH] = useState(100); // Horizontal spacing in px
    const [watermarkSpacingV, setWatermarkSpacingV] = useState(80); // Vertical spacing in px
    const [watermarkRotation, setWatermarkRotation] = useState(-30); // Rotation angle for diagonal
    const [watermarkDensity, setWatermarkDensity] = useState(3); // 1-5 scale for tiled watermark density
    const [customWatermark, setCustomWatermark] = useState(null);
    const fileInputRef = useRef(null);

    // SEO State
    const [altText, setAltText] = useState('');
    const [selectedAuthor, setSelectedAuthor] = useState('none');
    const [compressionQuality, setCompressionQuality] = useState('high');
    const [authors, setAuthors] = useState([]);

    // Fetch authors on mount
    useEffect(() => {
        const loadAuthors = async () => {
            try {
                const response = await authorsAPI.getAll();
                if (response.data.success) {
                    setAuthors(response.data.data || []);
                }
            } catch (error) {
                console.error('Failed to load authors:', error);
            }
        };
        if (isOpen) {
            loadAuthors();
        }
    }, [isOpen]);

    // Load saved watermark settings from localStorage on mount
    useEffect(() => {
        const savedSettings = localStorage.getItem('imageEditor_watermarkSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.watermarkOpacity) setWatermarkOpacity(settings.watermarkOpacity);
                if (settings.watermarkPosition) setWatermarkPosition(settings.watermarkPosition);
                if (settings.watermarkScale) setWatermarkScale(settings.watermarkScale);
                if (settings.watermarkRepeat) setWatermarkRepeat(settings.watermarkRepeat);
                if (settings.watermarkPattern) setWatermarkPattern(settings.watermarkPattern);
                if (settings.watermarkSpacingH) setWatermarkSpacingH(settings.watermarkSpacingH);
                if (settings.watermarkSpacingV) setWatermarkSpacingV(settings.watermarkSpacingV);
                if (settings.watermarkRotation !== undefined) setWatermarkRotation(settings.watermarkRotation);
                if (settings.watermarkDensity) setWatermarkDensity(settings.watermarkDensity);
            } catch (e) {
                console.warn('Failed to load saved watermark settings:', e);
            }
        }
    }, []);

    // Save watermark settings to localStorage when they change
    useEffect(() => {
        const settings = {
            watermarkOpacity,
            watermarkPosition,
            watermarkScale,
            watermarkRepeat,
            watermarkPattern,
            watermarkSpacingH,
            watermarkSpacingV,
            watermarkRotation,
            watermarkDensity
        };
        localStorage.setItem('imageEditor_watermarkSettings', JSON.stringify(settings));
    }, [watermarkOpacity, watermarkPosition, watermarkScale, watermarkRepeat, watermarkPattern, watermarkSpacingH, watermarkSpacingV, watermarkRotation, watermarkDensity]);

    // UI State
    const [showOriginal, setShowOriginal] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    // Working Image (changes when crop is applied)
    const [workingImage, setWorkingImage] = useState(null);
    const [originalImage, setOriginalImage] = useState(null);

    // Undo/Redo State
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [processing, setProcessing] = useState(false);

    // Get current state as snapshot
    const getStateSnapshot = useCallback(() => ({
        crop, zoom, rotation, aspect, activeFilter,
        flipH, flipV,
        brightness, contrast, saturation, temperature, blur,
        vignetteEnabled, vignetteIntensity,
        watermarkType, watermarkOpacity, watermarkPosition, watermarkScale, watermarkRepeat, watermarkDensity,
        textOverlay,
        workingImage
    }), [crop, zoom, rotation, aspect, activeFilter, flipH, flipV, brightness, contrast, saturation, temperature, blur, vignetteEnabled, vignetteIntensity, watermarkType, watermarkOpacity, watermarkPosition, watermarkScale, watermarkRepeat, watermarkDensity, textOverlay, workingImage]);

    // Save state to history
    const saveToHistory = useCallback(() => {
        const snapshot = getStateSnapshot();
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, snapshot];
        });
        setHistoryIndex(prev => prev + 1);
    }, [getStateSnapshot, historyIndex]);

    // Reset editor state when a new image is opened
    useEffect(() => {
        if (isOpen && image) {
            // Reset crop/transform state
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setAspect(1);
            setCroppedAreaPixels(null);
            setCroppedArea(null);
            setFlipH(false);
            setFlipV(false);

            // Reset filter/adjustment state
            setActiveFilter('normal');
            setBrightness(1);
            setContrast(1);
            setSaturation(1);
            setTemperature(0);
            setBlur(0);

            // Reset vignette
            setVignetteEnabled(false);
            setVignetteIntensity(0.5);

            // Reset text overlay
            setTextOverlay({
                enabled: false,
                text: '',
                font: 'sans-serif',
                size: 48,
                color: '#ffffff',
                position: 'center',
                shadow: true
            });

            // Reset watermark type (keep saved settings from localStorage)
            setWatermarkType('none');
            setCustomWatermark(null);

            // Reset working image and history
            setWorkingImage(null);
            setOriginalImage(null);
            setHistory([]);
            setHistoryIndex(-1);

            // Reset UI state
            setShowOriginal(false);
            setShowInfo(false);
            setProcessing(false);
            setActiveTool('crop');
        }
    }, [image, isOpen]);

    // Initialize history on mount
    useEffect(() => {
        if (isOpen && history.length === 0) {
            const initial = getStateSnapshot();
            setHistory([initial]);
            setHistoryIndex(0);
        }
    }, [isOpen, history.length, getStateSnapshot]);

    // Undo
    const handleUndo = useCallback(() => {
        if (historyIndex > 0) {
            const prevState = history[historyIndex - 1];
            setCrop(prevState.crop);
            setZoom(prevState.zoom);
            setRotation(prevState.rotation);
            setAspect(prevState.aspect);
            setActiveFilter(prevState.activeFilter);
            setFlipH(prevState.flipH);
            setFlipV(prevState.flipV);
            setBrightness(prevState.brightness);
            setContrast(prevState.contrast);
            setSaturation(prevState.saturation);
            setTemperature(prevState.temperature);
            setBlur(prevState.blur);
            setVignetteEnabled(prevState.vignetteEnabled);
            setVignetteIntensity(prevState.vignetteIntensity);
            setWatermarkType(prevState.watermarkType);
            setWatermarkOpacity(prevState.watermarkOpacity);
            setWatermarkPosition(prevState.watermarkPosition);
            setWatermarkScale(prevState.watermarkScale);
            setWatermarkRepeat(prevState.watermarkRepeat);
            if (prevState.watermarkDensity !== undefined) setWatermarkDensity(prevState.watermarkDensity);
            setTextOverlay(prevState.textOverlay);
            if (prevState.workingImage !== undefined) setWorkingImage(prevState.workingImage);
            setHistoryIndex(prev => prev - 1);
        }
    }, [history, historyIndex]);

    // Redo
    const handleRedo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setCrop(nextState.crop);
            setZoom(nextState.zoom);
            setRotation(nextState.rotation);
            setAspect(nextState.aspect);
            setActiveFilter(nextState.activeFilter);
            setFlipH(nextState.flipH);
            setFlipV(nextState.flipV);
            setBrightness(nextState.brightness);
            setContrast(nextState.contrast);
            setSaturation(nextState.saturation);
            setTemperature(nextState.temperature);
            setBlur(nextState.blur);
            setVignetteEnabled(nextState.vignetteEnabled);
            setVignetteIntensity(nextState.vignetteIntensity);
            setWatermarkType(nextState.watermarkType);
            setWatermarkOpacity(nextState.watermarkOpacity);
            setWatermarkPosition(nextState.watermarkPosition);
            setWatermarkScale(nextState.watermarkScale);
            setWatermarkRepeat(nextState.watermarkRepeat);
            if (nextState.watermarkDensity !== undefined) setWatermarkDensity(nextState.watermarkDensity);
            setTextOverlay(nextState.textOverlay);
            if (nextState.workingImage !== undefined) setWorkingImage(nextState.workingImage);
            setHistoryIndex(prev => prev + 1);
        }
    }, [history, historyIndex]);

    // Reset All
    const handleReset = useCallback(() => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setAspect(1);
        setFlipH(false);
        setFlipV(false);
        setActiveFilter('normal');
        setBrightness(1);
        setContrast(1);
        setSaturation(1);
        setTemperature(0);
        setBlur(0);
        setVignetteEnabled(false);
        setVignetteIntensity(0.5);
        setWatermarkType('none');
        setWatermarkOpacity(0.5);
        setWatermarkPosition('BR');
        setWatermarkScale(0.2);
        setWatermarkRepeat('single');
        setWatermarkDensity(3);
        setTextOverlay({ enabled: false, text: '', font: 'sans-serif', size: 48, color: '#ffffff', position: 'center', shadow: true });
        saveToHistory();
    }, [saveToHistory]);

    // Watermark upload handler
    const handleWatermarkUpload = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                setCustomWatermark(img);
                setWatermarkType('custom');
                saveToHistory();
            };
        }
    };

    const onCropComplete = useCallback((croppedAreaPercent, croppedAreaPixelsVal) => {
        setCroppedAreaPixels(croppedAreaPixelsVal);
        setCroppedArea(croppedAreaPercent); // Save percentage-based area for overlay positioning
    }, []);

    // Apply Crop - crops the image and continues editing on the cropped version
    const handleApplyCrop = useCallback(async () => {
        if (!croppedAreaPixels) return;

        try {
            setProcessing(true);

            // Get current working image source
            const currentSrc = workingImage || (typeof image === 'string' ? image : (image instanceof File ? URL.createObjectURL(image) : null));

            // Generate cropped image with current adjustments
            const croppedBlob = await getCroppedImg(
                currentSrc,
                croppedAreaPixels,
                rotation,
                { horizontal: flipH, vertical: flipV },
                '', // No filters in the crop - they'll be applied in preview
                null, // No watermark
                null, // No vignette
                null  // No text overlay
            );

            // Create new object URL for the cropped image
            const newImageUrl = URL.createObjectURL(croppedBlob);

            // Update working image
            setWorkingImage(newImageUrl);

            // Reset crop-related states
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setFlipH(false);
            setFlipV(false);

            // Save to history (this will include the new workingImage)
            setTimeout(() => saveToHistory(), 0);

        } catch (e) {
            console.error('Apply crop failed:', e);
            alert('Failed to apply crop');
        } finally {
            setProcessing(false);
        }
    }, [croppedAreaPixels, workingImage, image, rotation, flipH, flipV, saveToHistory]);

    // Initialize working image when dialog opens
    useEffect(() => {
        if (isOpen && image) {
            const initialSrc = typeof image === 'string' ? image : (image instanceof File ? URL.createObjectURL(image) : null);
            if (initialSrc && !originalImage) {
                setOriginalImage(initialSrc);
                setWorkingImage(null); // Use original via fallback
            }
        }
    }, [isOpen, image, originalImage]);

    // Handle changes that should save to history
    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
        saveToHistory();
    };

    const handleAspectChange = (value) => {
        setAspect(value);
        saveToHistory();
    };

    const handleSave = async () => {
        try {
            setProcessing(true);

            const watermarkConfig = watermarkType !== 'none' ? {
                type: watermarkType === 'custom' ? 'image' : 'text',
                content: watermarkType === 'text' ? 'Freecipies' : null,
                imageObj: watermarkType === 'custom' ? customWatermark : null,
                opacity: watermarkOpacity,
                position: watermarkPosition,
                scale: watermarkScale,
                repeat: watermarkRepeat,
                pattern: watermarkPattern,
                spacingH: watermarkSpacingH,
                spacingV: watermarkSpacingV,
                rotation: watermarkRotation
            } : null;

            // Build combined filter string
            const combinedFilter = [
                FILTERS[activeFilter].css,
                `brightness(${brightness})`,
                `contrast(${contrast})`,
                `saturate(${saturation})`,
                temperature !== 0 ? `sepia(${Math.abs(temperature) / 100 * 0.3}) hue-rotate(${temperature > 0 ? 0 : 180}deg)` : '',
                blur > 0 ? `blur(${blur}px)` : ''
            ].filter(Boolean).join(' ');

            const vignetteConfig = vignetteEnabled ? {
                enabled: true,
                intensity: vignetteIntensity
            } : null;

            // Use working image if crop has been applied, otherwise use original
            const saveImageSrc = workingImage || (typeof image === 'string' ? image : (image instanceof File ? URL.createObjectURL(image) : null));

            // Get quality value from preset
            const qualityValue = QUALITY_PRESETS[compressionQuality]?.quality || 0.85;

            const croppedImageBlob = await getCroppedImg(
                saveImageSrc,
                croppedAreaPixels,
                rotation,
                { horizontal: flipH, vertical: flipV },
                combinedFilter,
                watermarkConfig,
                vignetteConfig,
                textOverlay,
                qualityValue
            );

            // Create a File object with .webp extension - preserve original name if provided
            let fileName;
            if (originalFilename) {
                // Replace extension with .webp
                const baseName = originalFilename.replace(/\.[^/.]+$/, '');
                fileName = `${baseName}.webp`;
            } else {
                fileName = `edited-${Date.now()}.webp`;
            }
            const file = new File([croppedImageBlob], fileName, { type: 'image/webp' });

            onSave(file);
        } catch (e) {
            console.error(e);
            alert('Failed to save image edit');
        } finally {
            setProcessing(false);
        }
    };

    // Ensure image source is valid string - use workingImage if crop has been applied
    const baseImageSrc = typeof image === 'string' ? image : (image instanceof File ? URL.createObjectURL(image) : null);
    const imageSrc = workingImage || baseImageSrc;

    if (!isOpen || !imageSrc) return null;

    // Render Right Panel content based on active tool
    const renderToolPanel = () => {
        switch (activeTool) {
            case 'crop':
                return (
                    <CropPanel
                        aspect={aspect}
                        zoom={zoom}
                        rotation={rotation}
                        flipH={flipH}
                        flipV={flipV}
                        processing={processing}
                        onAspectChange={handleAspectChange}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onFlipHChange={setFlipH}
                        onFlipVChange={setFlipV}
                        onApplyCrop={handleApplyCrop}
                        saveToHistory={saveToHistory}
                    />
                );

            case 'adjust':
                return (
                    <AdjustPanel
                        imageSrc={imageSrc}
                        activeFilter={activeFilter}
                        brightness={brightness}
                        contrast={contrast}
                        saturation={saturation}
                        temperature={temperature}
                        blur={blur}
                        vignetteEnabled={vignetteEnabled}
                        vignetteIntensity={vignetteIntensity}
                        onFilterChange={handleFilterChange}
                        onBrightnessChange={setBrightness}
                        onContrastChange={setContrast}
                        onSaturationChange={setSaturation}
                        onTemperatureChange={setTemperature}
                        onBlurChange={setBlur}
                        onVignetteEnabledChange={setVignetteEnabled}
                        onVignetteIntensityChange={setVignetteIntensity}
                        saveToHistory={saveToHistory}
                    />
                );

            case 'text':
                return (
                    <TextPanel
                        textOverlay={textOverlay}
                        onTextOverlayChange={setTextOverlay}
                        saveToHistory={saveToHistory}
                    />
                );

            case 'watermark':
                return (
                    <WatermarkPanel
                        watermarkType={watermarkType}
                        watermarkRepeat={watermarkRepeat}
                        watermarkPosition={watermarkPosition}
                        watermarkScale={watermarkScale}
                        watermarkOpacity={watermarkOpacity}
                        watermarkRotation={watermarkRotation}
                        watermarkSpacingH={watermarkSpacingH}
                        watermarkSpacingV={watermarkSpacingV}
                        fileInputRef={fileInputRef}
                        onWatermarkTypeChange={setWatermarkType}
                        onWatermarkRepeatChange={setWatermarkRepeat}
                        onWatermarkPositionChange={setWatermarkPosition}
                        onWatermarkScaleChange={setWatermarkScale}
                        onWatermarkOpacityChange={setWatermarkOpacity}
                        onWatermarkRotationChange={setWatermarkRotation}
                        onWatermarkSpacingHChange={setWatermarkSpacingH}
                        onWatermarkSpacingVChange={setWatermarkSpacingV}
                        onWatermarkUpload={handleWatermarkUpload}
                        saveToHistory={saveToHistory}
                    />
                );

            case 'seo':
                return (
                    <SEOPanel
                        altText={altText}
                        selectedAuthor={selectedAuthor}
                        authors={authors}
                        compressionQuality={compressionQuality}
                        onAltTextChange={setAltText}
                        onSelectedAuthorChange={setSelectedAuthor}
                        onCompressionQualityChange={setCompressionQuality}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
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

                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-12 h-12 text-muted-foreground hover:text-foreground"
                        onClick={handleUndo}
                        disabled={historyIndex <= 0}
                        title="Undo"
                    >
                        <Undo2 className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-12 h-12 text-muted-foreground hover:text-foreground"
                        onClick={handleRedo}
                        disabled={historyIndex >= history.length - 1}
                        title="Redo"
                    >
                        <Redo2 className="w-5 h-5" />
                    </Button>
                </div>

                {/* Center Canvas */}
                <div className="flex-1 flex flex-col">
                    {/* Header */}
                    <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold text-white">Edit Image</h2>

                            {/* Reset Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="text-muted-foreground hover:text-foreground"
                                title="Reset All"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </Button>

                            {/* Before/After Toggle */}
                            <Button
                                variant={showOriginal ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setShowOriginal(!showOriginal)}
                                className={showOriginal ? "" : "text-muted-foreground hover:text-foreground"}
                                title="Toggle Original"
                            >
                                {showOriginal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>

                            {/* Info Toggle */}
                            <Button
                                variant={showInfo ? "default" : "ghost"}
                                size="sm"
                                onClick={() => setShowInfo(!showInfo)}
                                className={showInfo ? "" : "text-muted-foreground hover:text-foreground"}
                                title="Image Info"
                            >
                                <Info className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={onCancel} className="border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300">
                                <X className="w-4 h-4 mr-2" /> Cancel
                            </Button>
                            <Button size="sm" onClick={handleSave} disabled={processing} className="bg-primary hover:bg-primary/90">
                                <Save className="w-4 h-4 mr-2" />
                                {processing ? 'Processing...' : 'Save'}
                            </Button>
                        </div>
                    </div>

                    {/* Image Info Bar */}
                    {showInfo && croppedAreaPixels && (
                        <div className="h-8 bg-zinc-900/80 border-b border-zinc-800 flex items-center px-4 text-xs text-muted-foreground gap-4">
                            <span>Output: {croppedAreaPixels.width} × {croppedAreaPixels.height}px</span>
                            <span>•</span>
                            <span>Zoom: {zoom.toFixed(1)}x</span>
                            <span>•</span>
                            <span>Rotation: {rotation}°</span>
                            {flipH && <span className="text-primary">• Flipped H</span>}
                            {flipV && <span className="text-primary">• Flipped V</span>}
                        </div>
                    )}

                    {/* Canvas Area */}
                    <div className="flex-1 relative bg-zinc-900/30">
                        {!showOriginal ? (
                            <div
                                className="absolute inset-0"
                                style={{
                                    transform: `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                                    transformOrigin: 'center center'
                                }}
                            >
                                <Cropper
                                    image={imageSrc}
                                    crop={crop}
                                    zoom={zoom}
                                    rotation={rotation}
                                    aspect={aspect}
                                    onCropChange={setCrop}
                                    onCropComplete={onCropComplete}
                                    onZoomChange={setZoom}
                                    onRotationChange={setRotation}
                                    style={{
                                        containerStyle: {
                                            width: '100%',
                                            height: '100%',
                                            position: 'relative',
                                        },
                                        mediaStyle: {
                                            filter: [
                                                FILTERS[activeFilter].css,
                                                `brightness(${brightness})`,
                                                `contrast(${contrast})`,
                                                `saturate(${saturation})`,
                                                temperature !== 0 ? `sepia(${Math.abs(temperature) / 100 * 0.3}) hue-rotate(${temperature > 0 ? 0 : 180}deg)` : '',
                                                blur > 0 ? `blur(${blur}px)` : ''
                                            ].filter(Boolean).join(' ')
                                        }
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <img src={imageSrc} alt="Original" className="max-h-full max-w-full object-contain" />
                                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 px-3 py-1 rounded text-xs text-white">
                                    Original Image
                                </div>
                            </div>
                        )}

                        {/* Watermark Preview Overlay - matches react-easy-crop's centered crop box */}
                        {watermarkType !== 'none' && !showOriginal && (
                            <div
                                className="absolute pointer-events-none z-10"
                                style={{
                                    // React-easy-crop centers the crop box, so we center the overlay too
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    // Match the crop area's aspect ratio and max dimensions
                                    width: aspect >= 1 ? 'auto' : `calc(min(100%, 100vh * ${aspect}))`,
                                    height: aspect >= 1 ? `calc(min(100%, 100vw / ${aspect}))` : 'auto',
                                    aspectRatio: aspect || 1,
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    opacity: watermarkOpacity,
                                    overflow: 'hidden'
                                }}
                            >
                                {/* Single Watermark */}
                                {watermarkRepeat === 'single' && (
                                    <div className={`absolute ${watermarkPosition === 'TL' ? 'top-[5%] left-[5%]' :
                                        watermarkPosition === 'T' ? 'top-[5%] left-1/2 -translate-x-1/2' :
                                            watermarkPosition === 'TR' ? 'top-[5%] right-[5%]' :
                                                watermarkPosition === 'L' ? 'top-1/2 left-[5%] -translate-y-1/2' :
                                                    watermarkPosition === 'C' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                                                        watermarkPosition === 'R' ? 'top-1/2 right-[5%] -translate-y-1/2' :
                                                            watermarkPosition === 'BL' ? 'bottom-[5%] left-[5%]' :
                                                                watermarkPosition === 'B' ? 'bottom-[5%] left-1/2 -translate-x-1/2' :
                                                                    'bottom-[5%] right-[5%]' /* BR is default */
                                        }`}>
                                        {watermarkType === 'text' ? (
                                            <span
                                                className="font-bold"
                                                style={{
                                                    fontSize: `${watermarkScale * 200}px`,
                                                    background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                }}
                                            >
                                                Freecipies
                                            </span>
                                        ) : customWatermark ? (
                                            <img
                                                src={customWatermark.src}
                                                alt="Watermark"
                                                style={{ maxWidth: `${watermarkScale * 400}px` }}
                                            />
                                        ) : null}
                                    </div>
                                )}

                                {/* Tiled Watermark Pattern */}
                                {watermarkRepeat === 'tiled' && (() => {
                                    const baseSize = watermarkType === 'text' ? 100 : 80;
                                    const effectiveSpacingH = Math.max(watermarkSpacingH, 20);
                                    const effectiveSpacingV = Math.max(watermarkSpacingV, 20);
                                    const cols = Math.max(8, Math.ceil(1200 / (effectiveSpacingH + baseSize * watermarkScale)) + 4);
                                    const rows = Math.max(8, Math.ceil(1200 / (effectiveSpacingV + baseSize * watermarkScale)) + 4);
                                    const totalWatermarks = cols * rows;

                                    return (
                                        <div
                                            className="absolute inset-0"
                                            style={{
                                                transform: `rotate(${watermarkRotation}deg)`,
                                                transformOrigin: 'center center'
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                                    gap: `${effectiveSpacingV}px ${effectiveSpacingH}px`,
                                                    position: 'absolute',
                                                    top: '-150%',
                                                    left: '-150%',
                                                    width: '400%',
                                                    height: '400%',
                                                    justifyItems: 'center',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                {Array.from({ length: totalWatermarks }).map((_, i) => (
                                                    <div key={i} className="flex-shrink-0">
                                                        {watermarkType === 'text' ? (
                                                            <span
                                                                className="font-bold whitespace-nowrap"
                                                                style={{
                                                                    fontSize: `${watermarkScale * 100}px`,
                                                                    background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                                                                    WebkitBackgroundClip: 'text',
                                                                    WebkitTextFillColor: 'transparent',
                                                                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                                                }}
                                                            >
                                                                Freecipies
                                                            </span>
                                                        ) : customWatermark ? (
                                                            <img
                                                                src={customWatermark.src}
                                                                alt="Watermark"
                                                                style={{ maxWidth: `${watermarkScale * 200}px` }}
                                                            />
                                                        ) : null}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {/* Vignette Preview Overlay - matches react-easy-crop's centered crop box */}
                        {vignetteEnabled && !showOriginal && (
                            <div
                                className="absolute pointer-events-none z-10"
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: aspect >= 1 ? 'auto' : `calc(min(100%, 100vh * ${aspect}))`,
                                    height: aspect >= 1 ? `calc(min(100%, 100vw / ${aspect}))` : 'auto',
                                    aspectRatio: aspect || 1,
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${vignetteIntensity}) 100%)`
                                }}
                            />
                        )}

                        {/* Text Overlay Preview - matches react-easy-crop's centered crop box */}
                        {textOverlay.enabled && textOverlay.text && !showOriginal && (
                            <div
                                className="absolute pointer-events-none z-20"
                                style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: aspect >= 1 ? 'auto' : `calc(min(100%, 100vh * ${aspect}))`,
                                    height: aspect >= 1 ? `calc(min(100%, 100vw / ${aspect}))` : 'auto',
                                    aspectRatio: aspect || 1,
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                }}
                            >
                                <div
                                    className={`absolute ${textOverlay.position === 'TL' ? 'top-[5%] left-[5%]' :
                                        textOverlay.position === 'top' ? 'top-[5%] left-1/2 -translate-x-1/2' :
                                            textOverlay.position === 'TR' ? 'top-[5%] right-[5%]' :
                                                textOverlay.position === 'left' ? 'top-1/2 left-[5%] -translate-y-1/2' :
                                                    textOverlay.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                                                        textOverlay.position === 'right' ? 'top-1/2 right-[5%] -translate-y-1/2' :
                                                            textOverlay.position === 'BL' ? 'bottom-[5%] left-[5%]' :
                                                                textOverlay.position === 'bottom' ? 'bottom-[5%] left-1/2 -translate-x-1/2' :
                                                                    textOverlay.position === 'BR' ? 'bottom-[5%] right-[5%]' :
                                                                        'bottom-[5%] left-1/2 -translate-x-1/2'
                                        }`}
                                    style={{
                                        fontFamily: textOverlay.font,
                                        fontSize: `${textOverlay.size}px`,
                                        fontWeight: 'bold',
                                        color: textOverlay.color,
                                        textShadow: textOverlay.shadow ? '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)' : 'none',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {textOverlay.text}
                                </div>
                            </div>
                        )}
                    </div>
                </div >

                {/* Right Panel */}
                < div className="w-72 bg-zinc-900/50 border-l border-zinc-800 flex flex-col" >
                    <div className="h-14 border-b border-zinc-800 flex items-center px-4">
                        <h3 className="font-medium text-white capitalize">{activeTool}</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {renderToolPanel()}
                    </div>
                </div >

            </DialogContent >
        </Dialog >
    );
};

export default ImageEditor;
