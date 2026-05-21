// Filter Presets
export interface FilterPreset {
    name: string;
    css: string;
}

export const FILTERS: Record<string, FilterPreset> = {
    normal: { name: 'Normal', css: '' },
    fresh: { name: 'Fresh', css: 'contrast(1.1) brightness(1.1) saturate(1.2)' },
    warm: { name: 'Warm', css: 'sepia(0.2) contrast(1.1) saturate(1.2)' },
    cool: { name: 'Cool', css: 'contrast(1.2) saturate(1.1) hue-rotate(180deg) sepia(0.1)' },
    vintage: { name: 'Vintage', css: 'sepia(0.4) contrast(0.8) brightness(1.1)' },
    bw: { name: 'B&W', css: 'grayscale(1)' },
};

// Aspect Ratios organized by orientation
export interface AspectRatio {
    label: string;
    value: string;
}

export interface AspectRatioGroup {
    label: string;
    ratios: AspectRatio[];
}

export const ASPECT_RATIO_GROUPS: Record<string, AspectRatioGroup> = {
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
export const parseAspectValue = (val: string): number | null => {
    if (val === 'free') return null;
    if (val.includes('/')) {
        const [a, b] = val.split('/');
        return parseFloat(a) / parseFloat(b);
    }
    return parseFloat(val);
};

export interface ToolDef {
    id: string;
    label: string;
    iconName: string;
}

// Tool definitions for left sidebar
export const TOOLS: ToolDef[] = [
    { id: 'crop', label: 'Crop', iconName: 'Crop' },
    { id: 'adjust', label: 'Adjust', iconName: 'SlidersHorizontal' },
    { id: 'text', label: 'Text', iconName: 'Type' },
    { id: 'watermark', label: 'Watermark', iconName: 'Stamp' },
];

export interface TextOverlayState {
    enabled: boolean;
    text: string;
    font: string;
    size: number;
    color: string;
    position: string;
    shadow: boolean;
}

export interface EditorState {
    crop: { x: number; y: number };
    zoom: number;
    rotation: number;
    aspect: number;
    flipH: boolean;
    flipV: boolean;
    activeFilter: string;
    brightness: number;
    contrast: number;
    saturation: number;
    temperature: number;
    blur: number;
    vignetteEnabled: boolean;
    vignetteIntensity: number;
    watermarkType: string;
    watermarkOpacity: number;
    watermarkPosition: string;
    watermarkScale: number;
    watermarkRepeat: string;
    watermarkPattern: string;
    watermarkSpacingH: number;
    watermarkSpacingV: number;
    watermarkRotation: number;
    watermarkDensity: number;
    textOverlay: TextOverlayState;
}

// Default state values
export const DEFAULT_STATE: EditorState = {
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

export interface PositionOption {
    key: string;
    label: string;
    value: string;
}

// Watermark position mappings
export const WATERMARK_POSITIONS: PositionOption[] = [
    { key: 'TL', label: '\u2196', value: 'TL' },
    { key: '', label: '', value: '' },
    { key: 'TR', label: '\u2197', value: 'TR' },
    { key: '', label: '', value: '' },
    { key: 'center', label: '\u2022', value: 'center' },
    { key: '', label: '', value: '' },
    { key: 'BL', label: '\u2199', value: 'BL' },
    { key: '', label: '', value: '' },
    { key: 'BR', label: '\u2198', value: 'BR' },
];

export interface TextPositionOption {
    label: string;
    value: string;
}

// Text overlay position mappings
export const TEXT_POSITIONS: TextPositionOption[] = [
    { label: 'TL', value: 'TL' },
    { label: 'Top', value: 'top' },
    { label: 'TR', value: 'TR' },
    { label: 'L', value: 'left' },
    { label: '\u2295', value: 'center' },
    { label: 'R', value: 'right' },
    { label: 'BL', value: 'BL' },
    { label: 'Bot', value: 'bottom' },
    { label: 'BR', value: 'BR' },
];

// Preset color palette for text overlay
export const TEXT_COLORS: string[] = [
    '#3b82f6'
];

export interface QualityPreset {
    quality: number;
    label: string;
}

// Compression Quality Presets
export const QUALITY_PRESETS: Record<string, QualityPreset> = {
    low: { quality: 0.6, label: 'Low (Smallest file)' },
    medium: { quality: 0.75, label: 'Medium (Balanced)' },
    high: { quality: 0.85, label: 'High (Best quality)' },
    original: { quality: 0.92, label: 'Original (Minimal compression)' },
};
