import { useEffect, useState } from 'react';
import useEditorStore from '../../../store/useEditorStore';

/**
 * Hook to automatically load custom fonts from the store into the document
 * Returns fontsReady state to trigger re-renders after fonts are loaded.
 */
export const useCustomFontLoader = () => {
    const customFonts = useEditorStore(state => state.customFonts);
    const [fontsReady, setFontsReady] = useState(false);

    useEffect(() => {
        if (!customFonts || customFonts.length === 0) {
            setFontsReady(true);
            return;
        }

        const loadCustomFonts = async () => {
            let anyNewLoaded = false;

            for (const fontData of customFonts) {
                // Check if already loaded
                const isLoaded = Array.from(document.fonts).some(f => f.family === fontData.name);
                if (isLoaded) continue;

                try {
                    const font = new FontFace(fontData.name, `url("${fontData.url}")`);
                    await font.load();
                    document.fonts.add(font);
                    console.log(`Loaded custom font: ${fontData.name}`);
                    anyNewLoaded = true;
                } catch (error) {
                    console.error(`Failed to load custom font ${fontData.name}:`, error);
                }
            }

            // Trigger re-render after fonts load
            if (anyNewLoaded) {
                // Force Konva to pick up new fonts by toggling state
                setFontsReady(false);
                requestAnimationFrame(() => setFontsReady(true));
            } else {
                setFontsReady(true);
            }
        };

        loadCustomFonts();
    }, [customFonts]);

    return fontsReady;
};

export default useCustomFontLoader;
