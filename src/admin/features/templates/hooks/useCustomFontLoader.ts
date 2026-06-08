import { useEffect, useState } from 'react';
import { useCustomFonts } from '@admin/features/templates/store';
import type { CustomFont } from '@admin/features/templates/store';

/**
 * Hook to automatically load custom fonts from the store into the document.
 * Uses the FontFace API with Promise.all for parallel loading.
 *
 * @returns boolean indicating whether fonts have finished loading
 */
export function useCustomFontLoader(): boolean {
  const customFonts = useCustomFonts();
  const [fontsReady, setFontsReady] = useState<boolean>(false);

  useEffect(() => {
    if (!customFonts || customFonts.length === 0) {
      setFontsReady(true);
      return;
    }

    let cancelled = false;

    const loadCustomFonts = async (): Promise<void> => {
      const loadPromises = customFonts.map(async (fontData: CustomFont) => {
        const family = fontData.name;

        // Already loaded?
        if (document.fonts.check(`12px "${family}"`)) {
          return { family, loaded: true, isNew: false };
        }

        if (!fontData.url) {
          return { family, loaded: false, isNew: false };
        }

        try {
          const fontFace = new FontFace(family, `url("${fontData.url}")`);
          await fontFace.load();
          document.fonts.add(fontFace);
          return { family, loaded: true, isNew: true };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`[useCustomFontLoader] Failed to load font "${family}":`, error);
          return { family, loaded: false, isNew: false };
        }
      });

      const results = await Promise.all(loadPromises);

      if (cancelled) return;

      const anyNewLoaded = results.some((r) => r.isNew);

      if (anyNewLoaded) {
        // Force Konva to pick up new fonts by toggling state in next frame
        setFontsReady(false);
        requestAnimationFrame(() => {
          if (!cancelled) setFontsReady(true);
        });
      } else {
        setFontsReady(true);
      }
    };

    loadCustomFonts();

    return () => {
      cancelled = true;
    };
  }, [customFonts]);

  return fontsReady;
}

export default useCustomFontLoader;
