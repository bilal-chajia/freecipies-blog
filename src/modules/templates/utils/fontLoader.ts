/**
 * Template Module - Font Loader
 * ==============================
 * Utility to load Google Fonts dynamically.
 */

import { useEffect } from 'react';

// Cache loaded fonts to avoid duplicate requests
const loadedFonts = new Set<string>();

/**
 * Load Google Fonts dynamically
 */
export const loadFonts = (fonts: string[]): void => {
  if (!fonts || fonts.length === 0) return;

  // Filter out already loaded fonts
  const fontsToLoad = fonts.filter(font => !loadedFonts.has(font));
  if (fontsToLoad.length === 0) return;

  // Add to cache immediately
  fontsToLoad.forEach(font => loadedFonts.add(font));

  // Construct Google Fonts URL
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
 */
export const useFontLoader = (fonts: string[]): void => {
  useEffect(() => {
    loadFonts(fonts);
  }, [fonts]);
};

export default loadFonts;
