import React, { useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from '@/ui/button';
import { Separator } from '@/ui/separator';
import {
    Dialog,
    DialogContent,
} from '@/ui/dialog';
import {
    Crop as CropIcon,
    SlidersHorizontal,
    Stamp,
    Undo2,
    Redo2,
    X,
    Save,
    RotateCcw,
    Eye,
    EyeOff,
    Info,
    Type,
    FileSearch
} from 'lucide-react';
import getCroppedImg from '../../../utils/canvasUtils';
import { authorsAPI } from '../services/api';

// Imports from modular structure
import { FILTERS, QUALITY_PRESETS } from './ImageEditor/constants';
import { CropPanel, AdjustPanel, TextPanel, WatermarkPanel, SEOPanel } from './ImageEditor/panels';
import { useImageEditorState } from './ImageEditor/hooks/useImageEditorState';
import { useImageHistory } from './ImageEditor/hooks/useImageHistory';
import WatermarkOverlay from './ImageEditor/overlays/WatermarkOverlay';
import VignetteOverlay from './ImageEditor/overlays/VignetteOverlay';
import TextOverlay from './ImageEditor/overlays/TextOverlay';

const TOOLS = [
    { id: 'crop', label: 'Crop', icon: CropIcon },
    { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'watermark', label: 'Watermark', icon: Stamp },
    { id: 'seo', label: 'SEO', icon: FileSearch },
];

const ImageEditor = ({ isOpen, image, originalFilename, onSave, onCancel }) => {
    // 1. Core State
    const {
        activeTool, setActiveTool,
        crop, setCrop,
        zoom, setZoom,
        rotation, setRotation,
        aspect, setAspect,
        croppedAreaPixels, setCroppedAreaPixels,
        croppedArea, setCroppedArea,
        flipH, setFlipH,
        flipV, setFlipV,
        activeFilter, setActiveFilter,
        brightness, setBrightness,
        contrast, setContrast,
        saturation, setSaturation,
        temperature, setTemperature,
        blur, setBlur,
        vignetteEnabled, setVignetteEnabled,
        vignetteIntensity, setVignetteIntensity,
        textOverlay, setTextOverlay,
        watermarkType, setWatermarkType,
        watermarkOpacity, setWatermarkOpacity,
        watermarkPosition, setWatermarkPosition,
        watermarkScale, setWatermarkScale,
        watermarkRepeat, setWatermarkRepeat,
        watermarkPattern, setWatermarkPattern,
        watermarkSpacingH, setWatermarkSpacingH,
        watermarkSpacingV, setWatermarkSpacingV,
        watermarkRotation, setWatermarkRotation,
        watermarkDensity, setWatermarkDensity,
        customWatermark, setCustomWatermark,
        workingImage, setWorkingImage,
        originalImage, setOriginalImage,
        showOriginal, setShowOriginal,
        showInfo, setShowInfo,
        processing, setProcessing,
        getSnapshot,
        applySnapshot,
        resetState
    } = useImageEditorState();

    // 2. SEO State (Managed Separately, not in Undo/Redo)
    const [altText, setAltText] = React.useState('');
    const [selectedAuthor, setSelectedAuthor] = React.useState('none');
    const [compressionQuality, setCompressionQuality] = React.useState('high');
    const [authors, setAuthors] = React.useState([]);

    const fileInputRef = useRef(null);
    const initializedForImageRef = useRef(null); // Track which image we've initialized for

    // 3. History Management
    const {
        saveToHistory,
        initializeHistory,
        resetHistory,
        getPreviousState,
        getNextState,
        decrementHistoryIndex,
        incrementHistoryIndex,
        canUndo,
        canRedo
    } = useImageHistory(getSnapshot);

    // 4. Effects

    // Fetch authors
    useEffect(() => {
        const loadAuthors = async () => {
            if (!isOpen) return;
            try {
                const response = await authorsAPI.getAll();
                if (response.data.success) {
                    setAuthors(response.data.data || []);
                }
            } catch (error) {
                console.error('Failed to load authors:', error);
            }
        };
        loadAuthors();
    }, [isOpen]);

    // Load/Save Watermark details from localStorage
    useEffect(() => {
        const savedSettings = localStorage.getItem('imageEditor_watermarkSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.watermarkOpacity !== undefined) setWatermarkOpacity(settings.watermarkOpacity);
                if (settings.watermarkPosition !== undefined) setWatermarkPosition(settings.watermarkPosition);
                if (settings.watermarkScale !== undefined) setWatermarkScale(settings.watermarkScale);
                if (settings.watermarkRepeat !== undefined) setWatermarkRepeat(settings.watermarkRepeat);
                if (settings.watermarkPattern !== undefined) setWatermarkPattern(settings.watermarkPattern);
                if (settings.watermarkSpacingH !== undefined) setWatermarkSpacingH(settings.watermarkSpacingH);
                if (settings.watermarkSpacingV !== undefined) setWatermarkSpacingV(settings.watermarkSpacingV);
                if (settings.watermarkRotation !== undefined) setWatermarkRotation(settings.watermarkRotation);
                if (settings.watermarkDensity !== undefined) setWatermarkDensity(settings.watermarkDensity);
            } catch (e) {
                console.warn('Failed to load saved watermark settings:', e);
            }
        }
    }, [setWatermarkOpacity, setWatermarkPosition, setWatermarkScale, setWatermarkRepeat, setWatermarkPattern, setWatermarkSpacingH, setWatermarkSpacingV, setWatermarkRotation, setWatermarkDensity]);

    useEffect(() => {
        const settings = {
            watermarkOpacity, watermarkPosition, watermarkScale, watermarkRepeat,
            watermarkPattern, watermarkSpacingH, watermarkSpacingV, watermarkRotation, watermarkDensity
        };
        localStorage.setItem('imageEditor_watermarkSettings', JSON.stringify(settings));
    }, [watermarkOpacity, watermarkPosition, watermarkScale, watermarkRepeat, watermarkPattern, watermarkSpacingH, watermarkSpacingV, watermarkRotation, watermarkDensity]);

    // Initialization when opening
    useEffect(() => {
        if (isOpen && image) {
            // Get a stable identifier for this image
            const imageId = typeof image === 'string' ? image : (image instanceof File ? image.name + image.size : null);

            // Only initialize if this is a NEW image (not the same one we already initialized)
            if (imageId && initializedForImageRef.current !== imageId) {
                initializedForImageRef.current = imageId;

                resetState();
                resetHistory();

                // Set initial image
                const initialSrc = typeof image === 'string' ? image : URL.createObjectURL(image);
                setOriginalImage(initialSrc);

                // Load image to detect aspect ratio
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    // Calculate and set the natural aspect ratio
                    const naturalAspect = img.naturalWidth / img.naturalHeight;
                    setAspect(naturalAspect);

                    // Force history init after aspect is set
                    setTimeout(() => initializeHistory(), 0);
                };
                img.onerror = () => {
                    // Fallback to 1:1 if image fails to load
                    setAspect(1);
                    setTimeout(() => initializeHistory(), 0);
                };
                img.src = initialSrc;
            }
        }

        // Reset the ref when dialog closes so next open initializes properly
        if (!isOpen) {
            initializedForImageRef.current = null;
        }
    }, [image, isOpen]); // Only depend on image and isOpen - the functions are stable


    // 5. Handlers

    const handleUndo = () => {
        if (canUndo) {
            const prevState = getPreviousState();
            if (prevState) applySnapshot(prevState);
            decrementHistoryIndex();
        }
    };

    const handleRedo = () => {
        if (canRedo) {
            const nextState = getNextState();
            if (nextState) applySnapshot(nextState);
            incrementHistoryIndex();
        }
    };

    const handleReset = () => {
        resetState();
        setTimeout(() => saveToHistory(), 0);
    };

    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
        saveToHistory();
    };

    const handleAspectChange = (value) => {
        setAspect(value);
        saveToHistory();
    };

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

    const onCropComplete = (croppedAreaPercent, croppedAreaPixelsVal) => {
        setCroppedAreaPixels(croppedAreaPixelsVal);
        setCroppedArea(croppedAreaPercent);
    };

    const handleApplyCrop = async () => {
        try {
            setProcessing(true);
            const currentSrc = workingImage || (typeof image === 'string' ? image : (image instanceof File ? URL.createObjectURL(image) : null));

            // If croppedAreaPixels is null, get full image dimensions
            let cropAreaToUse = croppedAreaPixels;
            if (!cropAreaToUse) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = currentSrc;
                });
                cropAreaToUse = {
                    x: 0,
                    y: 0,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                };
            }

            const croppedBlob = await getCroppedImg(
                currentSrc,
                cropAreaToUse,
                rotation,
                { horizontal: flipH, vertical: flipV },
                '', // No filters in the crop
                null, null, null
            );

            const newImageUrl = URL.createObjectURL(croppedBlob);
            setWorkingImage(newImageUrl);

            // Reset crop UI
            setCrop({ x: 0, y: 0 });
            setZoom(1);
            setRotation(0);
            setFlipH(false);
            setFlipV(false);

            setTimeout(() => saveToHistory(), 0);

        } catch (e) {
            console.error('Apply crop failed:', e);
            alert('Failed to apply crop');
        } finally {
            setProcessing(false);
        }
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

            const saveImageSrc = workingImage || (typeof image === 'string' ? image : (image instanceof File ? URL.createObjectURL(image) : null));
            const qualityValue = QUALITY_PRESETS[compressionQuality]?.quality || 0.85;

            // If croppedAreaPixels is null, we need to get the full image dimensions
            let cropAreaToUse = croppedAreaPixels;
            if (!cropAreaToUse) {
                // Load image to get dimensions
                const img = new Image();
                img.crossOrigin = 'anonymous';
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = saveImageSrc;
                });
                cropAreaToUse = {
                    x: 0,
                    y: 0,
                    width: img.naturalWidth,
                    height: img.naturalHeight
                };
            }

            const croppedImageBlob = await getCroppedImg(
                saveImageSrc,
                cropAreaToUse,
                rotation,
                { horizontal: flipH, vertical: flipV },
                combinedFilter,
                watermarkConfig,
                vignetteConfig,
                textOverlay,
                qualityValue
            );

            let fileName;
            if (originalFilename) {
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

    // 6. Rendering

    const baseImageSrc = typeof image === 'string' ? image : (image instanceof File ? URL.createObjectURL(image) : null);
    const imageSrc = workingImage || baseImageSrc;

    if (!isOpen || !imageSrc) return null;

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
                        disabled={!canUndo}
                        title="Undo"
                    >
                        <Undo2 className="w-5 h-5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-12 h-12 text-muted-foreground hover:text-foreground"
                        onClick={handleRedo}
                        disabled={!canRedo}
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
                            <div className="absolute inset-0">
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
                                            ].filter(Boolean).join(' '),
                                            transform: `scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`
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

                        {/* Overlays */}
                        {!showOriginal && (
                            <>
                                <WatermarkOverlay
                                    watermarkType={watermarkType}
                                    watermarkOpacity={watermarkOpacity}
                                    watermarkRepeat={watermarkRepeat}
                                    watermarkPosition={watermarkPosition}
                                    watermarkScale={watermarkScale}
                                    watermarkRotation={watermarkRotation}
                                    watermarkSpacingH={watermarkSpacingH}
                                    watermarkSpacingV={watermarkSpacingV}
                                    customWatermark={customWatermark}
                                    aspect={aspect}
                                />

                                <VignetteOverlay
                                    enabled={vignetteEnabled}
                                    intensity={vignetteIntensity}
                                    aspect={aspect}
                                />

                                <TextOverlay
                                    textOverlay={textOverlay}
                                    aspect={aspect}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Right Panel */}
                <div className="w-72 bg-zinc-900/50 border-l border-zinc-800 flex flex-col">
                    <div className="h-14 border-b border-zinc-800 flex items-center px-4">
                        <h3 className="font-medium text-white capitalize">{activeTool}</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                        {renderToolPanel()}
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
};

export default ImageEditor;
