import { useEffect } from 'react';

// Cache loaded fonts to avoid duplicate requests
const loadedFonts = new Set<string>();

/**
 * Utility to load Google Fonts dynamically
 * @param fonts - Array of font family names
 */
export const loadFonts = (fonts: string[] | undefined): void => {
    if (!fonts || fonts.length === 0) return;

    // Filter out already loaded fonts
    const fontsToLoad = fonts.filter(font => !loadedFonts.has(font));

    if (fontsToLoad.length === 0) return;

    // Add to cache immediately
    fontsToLoad.forEach(font => loadedFonts.add(font));

    // Construct Google Fonts URL
    // Example: https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&family=Playfair+Display&display=swap
    const families = fontsToLoad
        .map(font => `family=${font.replace(/\s+/g, '+')}:wght@400;700;900`)
        .join('&');

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    link.rel = 'stylesheet';

    document.head.appendChild(link);
};

/**
 * Hook to load fonts in a component
 * @param fonts - Array of font family names
 */
export const useFontLoader = (fonts: string[] | undefined): void => {
    useEffect(() => {
        loadFonts(fonts);
    }, [fonts]); // Dependencies array should be stable or useMemo'd in parent
};

export default loadFonts;
