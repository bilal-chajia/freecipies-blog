// Editor Constants
// Shared configuration for element panels and property editors

// Available Google Fonts for text elements
export const FONTS = [
    { name: 'Inter', style: 'sans-serif' },
    { name: 'Roboto', style: 'sans-serif' },
    { name: 'Open Sans', style: 'sans-serif' },
    { name: 'Montserrat', style: 'sans-serif' },
    { name: 'Playfair Display', style: 'serif' },
    { name: 'Merriweather', style: 'serif' },
    { name: 'Lora', style: 'serif' },
    { name: 'Oswald', style: 'sans-serif' },
    { name: 'Raleway', style: 'sans-serif' },
    { name: 'Poppins', style: 'sans-serif' },
    { name: 'Pacifico', style: 'cursive' },
    { name: 'Dancing Script', style: 'cursive' },
];

// Preset colors for color pickers
export const COLOR_PRESETS = [
    '#ffffff', '#000000', '#f43f5e', '#f97316', '#eab308',
    '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
];

// Default element sizes
export const DEFAULT_TEXT_SIZE = {
    width: 400,
    height: 50,
    fontSize: 32,
};

export const DEFAULT_IMAGE_SIZE = {
    width: 300,
    height: 300,
};

export const DEFAULT_SHAPE_SIZE = {
    width: 200,
    height: 200,
};

// Font weight options
export const FONT_WEIGHTS = [
    { value: 300, label: 'Light' },
    { value: 400, label: 'Regular' },
    { value: 500, label: 'Medium' },
    { value: 600, label: 'Semi Bold' },
    { value: 700, label: 'Bold' },
    { value: 800, label: 'Extra Bold' },
];

// Text alignment options
export const TEXT_ALIGNMENTS = ['left', 'center', 'right'];

// Object fit options for images
export const OBJECT_FIT_OPTIONS = [
    { value: 'cover', label: 'Cover' },
    { value: 'contain', label: 'Contain' },
    { value: 'fill', label: 'Fill' },
];
