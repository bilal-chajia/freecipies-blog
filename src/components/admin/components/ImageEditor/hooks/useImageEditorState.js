import { useState, useCallback } from 'react';

export const useImageEditorState = () => {
    // Active Tool
    const [activeTool, setActiveTool] = useState('crop');

    // Crop State
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [aspect, setAspect] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [croppedArea, setCroppedArea] = useState(null);

    // Flip State
    const [flipH, setFlipH] = useState(false);
    const [flipV, setFlipV] = useState(false);

    // Filter State
    const [activeFilter, setActiveFilter] = useState('normal');

    // Adjustment Sliders
    const [brightness, setBrightness] = useState(1);
    const [contrast, setContrast] = useState(1);
    const [saturation, setSaturation] = useState(1);
    const [temperature, setTemperature] = useState(0);
    const [blur, setBlur] = useState(0);

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
    const [watermarkScale, setWatermarkScale] = useState(0.15);
    const [watermarkRepeat, setWatermarkRepeat] = useState('single');
    const [watermarkPattern, setWatermarkPattern] = useState('diagonal');
    const [watermarkSpacingH, setWatermarkSpacingH] = useState(100);
    const [watermarkSpacingV, setWatermarkSpacingV] = useState(80);
    const [watermarkRotation, setWatermarkRotation] = useState(-30);
    const [watermarkDensity, setWatermarkDensity] = useState(3);
    const [customWatermark, setCustomWatermark] = useState(null);

    // Working Images
    const [workingImage, setWorkingImage] = useState(null);
    const [originalImage, setOriginalImage] = useState(null);

    // UI flags
    const [showOriginal, setShowOriginal] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [processing, setProcessing] = useState(false);

    // Helper to get full state snapshot for history
    const getSnapshot = useCallback(() => ({
        crop, zoom, rotation, aspect, activeFilter,
        flipH, flipV,
        brightness, contrast, saturation, temperature, blur,
        vignetteEnabled, vignetteIntensity,
        watermarkType, watermarkOpacity, watermarkPosition, watermarkScale, watermarkRepeat, watermarkDensity,
        watermarkPattern, watermarkSpacingH, watermarkSpacingV, watermarkRotation, customWatermark,
        textOverlay,
        workingImage
    }), [
        crop, zoom, rotation, aspect, activeFilter,
        flipH, flipV,
        brightness, contrast, saturation, temperature, blur,
        vignetteEnabled, vignetteIntensity,
        watermarkType, watermarkOpacity, watermarkPosition, watermarkScale, watermarkRepeat, watermarkDensity,
        watermarkPattern, watermarkSpacingH, watermarkSpacingV, watermarkRotation, customWatermark,
        textOverlay,
        workingImage
    ]);

    // Apply a snapshot state
    const applySnapshot = useCallback((snapshot) => {
        if (!snapshot) return;
        setCrop(snapshot.crop);
        setZoom(snapshot.zoom);
        setRotation(snapshot.rotation);
        setAspect(snapshot.aspect);
        setActiveFilter(snapshot.activeFilter);
        setFlipH(snapshot.flipH);
        setFlipV(snapshot.flipV);
        setBrightness(snapshot.brightness);
        setContrast(snapshot.contrast);
        setSaturation(snapshot.saturation);
        setTemperature(snapshot.temperature);
        setBlur(snapshot.blur);
        setVignetteEnabled(snapshot.vignetteEnabled);
        setVignetteIntensity(snapshot.vignetteIntensity);
        setWatermarkType(snapshot.watermarkType);
        setWatermarkOpacity(snapshot.watermarkOpacity);
        setWatermarkPosition(snapshot.watermarkPosition);
        setWatermarkScale(snapshot.watermarkScale);
        setWatermarkRepeat(snapshot.watermarkRepeat);
        if (snapshot.watermarkDensity !== undefined) setWatermarkDensity(snapshot.watermarkDensity);
        if (snapshot.watermarkPattern !== undefined) setWatermarkPattern(snapshot.watermarkPattern);
        if (snapshot.watermarkSpacingH !== undefined) setWatermarkSpacingH(snapshot.watermarkSpacingH);
        if (snapshot.watermarkSpacingV !== undefined) setWatermarkSpacingV(snapshot.watermarkSpacingV);
        if (snapshot.watermarkRotation !== undefined) setWatermarkRotation(snapshot.watermarkRotation);
        if (snapshot.customWatermark !== undefined) setCustomWatermark(snapshot.customWatermark);

        setTextOverlay(snapshot.textOverlay);
        if (snapshot.workingImage !== undefined) setWorkingImage(snapshot.workingImage);
    }, []);

    const resetState = useCallback(() => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setAspect(1);
        setCroppedAreaPixels(null);
        setCroppedArea(null);
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
        // Watermark settings might be preserved from localStorage in the main component, but here we reset to defaults
        // Logic for preserving settings can remain in the main component or be moved here later
    }, []);

    return {
        // State
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

        // Actions
        getSnapshot,
        applySnapshot,
        resetState
    };
};
