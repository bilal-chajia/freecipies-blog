// Filter Presets
export const FILTERS = {
    normal: { name: 'Normal', css: '' },
    fresh: { name: 'Fresh', css: 'contrast(1.1) brightness(1.1) saturate(1.2)' },
    warm: { name: 'Warm', css: 'sepia(0.2) contrast(1.1) saturate(1.2)' },
    cool: { name: 'Cool', css: 'contrast(1.2) saturate(1.1) hue-rotate(180deg) sepia(0.1)' },
    vintage: { name: 'Vintage', css: 'sepia(0.4) contrast(0.8) brightness(1.1)' },
    bw: { name: 'B&W', css: 'grayscale(1)' },
};

// Aspect Ratios organized by orientation
export const ASPECT_RATIO_GROUPS = {
    common: {
        label: 'Common',
        ratios: [
            { label: 'Free', value: 'free' },
            { label: '1:1 (Square)', value: '1' },
        ]
    },
    horizontal: {
        label: 'Landscape',
        ratios: [
            { label: '16:9 (YouTube)', value: '16/9' },
            { label: '4:3 (Photo)', value: '4/3' },
            { label: '3:2 (DSLR)', value: '3/2' },
            { label: '21:9 (Cinematic)', value: '21/9' },
            { label: '1.91:1 (Social)', value: '1.91' },
            { label: '2:1 (FB Cover)', value: '2' },
        ]
    },
    vertical: {
        label: 'Portrait',
        ratios: [
            { label: '9:16 (Stories)', value: '9/16' },
            { label: '2:3 (Pinterest)', value: '2/3' },
            { label: '4:5 (Instagram)', value: '4/5' },
            { label: '3:4 (Photo)', value: '3/4' },
        ]
    }
};

// Convert value string to number
export const parseAspectValue = (val) => {
    if (val === 'free') return null;
    if (val.includes('/')) {
        const [a, b] = val.split('/');
        return parseFloat(a) / parseFloat(b);
    }
    return parseFloat(val);
};

// Tool definitions for left sidebar
export const TOOLS = [
    { id: 'crop', label: 'Crop', iconName: 'Crop' },
    { id: 'adjust', label: 'Adjust', iconName: 'SlidersHorizontal' },
    { id: 'text', label: 'Text', iconName: 'Type' },
    { id: 'watermark', label: 'Watermark', iconName: 'Stamp' },
];

// Default state values
export const DEFAULT_STATE = {
    crop: { x: 0, y: 0 },
    zoom: 1,
    rotation: 0,
    aspect: 1,
    flipH: false,
    flipV: false,
    activeFilter: 'normal',
    brightness: 1,
    contrast: 1,
    saturation: 1,
    temperature: 0,
    blur: 0,
    vignetteEnabled: false,
    vignetteIntensity: 0.5,
    watermarkType: 'none',
    watermarkOpacity: 0.5,
    watermarkPosition: 'BR',
    watermarkScale: 0.15,
    watermarkRepeat: 'single',
    watermarkPattern: 'diagonal',
    watermarkSpacingH: 100,
    watermarkSpacingV: 80,
    watermarkRotation: -30,
    watermarkDensity: 3,
    textOverlay: {
        enabled: false,
        text: '',
        font: 'sans-serif',
        size: 48,
        color: '#ffffff',
        position: 'center',
        shadow: true
    }
};

// Watermark position mappings
export const WATERMARK_POSITIONS = [
    { key: 'TL', label: '↖', value: 'TL' },
    { key: '', label: '', value: '' },
    { key: 'TR', label: '↗', value: 'TR' },
    { key: '', label: '', value: '' },
    { key: 'center', label: '•', value: 'center' },
    { key: '', label: '', value: '' },
    { key: 'BL', label: '↙', value: 'BL' },
    { key: '', label: '', value: '' },
    { key: 'BR', label: '↘', value: 'BR' },
];

// Text overlay position mappings
export const TEXT_POSITIONS = [
    { label: 'TL', value: 'TL' },
    { label: 'Top', value: 'top' },
    { label: 'TR', value: 'TR' },
    { label: 'L', value: 'left' },
    { label: '⊕', value: 'center' },
    { label: 'R', value: 'right' },
    { label: 'BL', value: 'BL' },
    { label: 'Bot', value: 'bottom' },
    { label: 'BR', value: 'BR' },
];

// Preset color palette for text overlay
export const TEXT_COLORS = [
    '#3b82f6'
];

// Compression Quality Presets
export const QUALITY_PRESETS = {
    low: { quality: 0.6, label: 'Low (Smallest file)' },
    medium: { quality: 0.75, label: 'Medium (Balanced)' },
    high: { quality: 0.85, label: 'High (Best quality)' },
    original: { quality: 0.92, label: 'Original (Minimal compression)' },
};
