import React, { useState, useRef, useEffect } from 'react';
import { Label } from '@/ui/label.jsx';
import { Button } from '@/ui/button.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import ColorPicker from '@/components/ColorPicker';
import BrandingCards from '@/components/BrandingCards';
import { brandingAPI } from '../../../services/api';
import { Palette, Layout, Sparkles, Loader2, Info, Image } from 'lucide-react';

const AppearanceSettings = ({ formData, handleInputChange }) => {
    const [activeSection, setActiveSection] = useState('branding');
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [logos, setLogos] = useState({
        logoMain: null,
        logoDark: null,
        logoMobile: null,
    });
    const [favicon, setFavicon] = useState(null);
    const [faviconVariants, setFaviconVariants] = useState({});
    const [loading, setLoading] = useState(true);
    const colorTriggerRef = useRef(null);

    useEffect(() => {
        const loadBranding = async () => {
            try {
                const response = await brandingAPI.getAll();
                if (response.data?.success && response.data?.data) {
                    setLogos({
                        logoMain: response.data.data.logoMain,
                        logoDark: response.data.data.logoDark,
                        logoMobile: response.data.data.logoMobile,
                    });
                    setFavicon(response.data.data.favicon);
                    setFaviconVariants(response.data.data.faviconVariants || {});
                }
            } catch (error) {
                console.error('Failed to load branding:', error);
            } finally {
                setLoading(false);
            }
        };
        loadBranding();
    }, []);

    const handleColorChange = (color) => {
        handleInputChange('badgeColor', color);
        setShowColorPicker(false);
    };

    const handleLogoChange = (type, url) => {
        const keyMap = { main: 'logoMain', dark: 'logoDark', mobile: 'logoMobile' };
        setLogos(prev => ({ ...prev, [keyMap[type]]: url }));
    };

    const handleLogoDelete = (type) => {
        const keyMap = { main: 'logoMain', dark: 'logoDark', mobile: 'logoMobile' };
        setLogos(prev => ({ ...prev, [keyMap[type]]: null }));
    };

    const handleFaviconChange = (url) => setFavicon(url);
    const handleFaviconDelete = () => {
        setFavicon(null);
        setFaviconVariants({});
    };

    const getTriggerRect = () => colorTriggerRef.current?.getBoundingClientRect() || null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading assets...
                </div>
            </div>
        );
    }

    return (
        <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-4">
            <TabsList className="h-9 p-1 bg-muted/50 rounded-lg">
                <TabsTrigger value="branding" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Image className="w-3.5 h-3.5 mr-1.5" />
                    Branding
                </TabsTrigger>
                <TabsTrigger value="colors" className="text-xs px-3 py-1.5 rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm">
                    <Palette className="w-3.5 h-3.5 mr-1.5" />
                    Colors
                </TabsTrigger>
            </TabsList>

            <TabsContent value="branding" className="mt-0">
                <BrandingCards
                    logos={logos}
                    favicon={favicon}
                    onLogoChange={handleLogoChange}
                    onLogoDelete={handleLogoDelete}
                    onFaviconChange={handleFaviconChange}
                    onFaviconDelete={handleFaviconDelete}
                />
            </TabsContent>

            <TabsContent value="colors" className="mt-0 space-y-4">
                <div className="space-y-2">
                    <Label className="text-xs font-medium">Accent Color</Label>
                    <p className="text-[11px] text-muted-foreground">
                        Applied to badges, category tags, and highlight components.
                    </p>
                    <div className="flex items-center gap-3 pt-1">
                        <Button
                            ref={colorTriggerRef}
                            variant="outline"
                            className="w-10 h-10 p-1 border border-border/60 rounded-md"
                            onClick={() => setShowColorPicker(!showColorPicker)}
                        >
                            <div
                                className="w-full h-full rounded"
                                style={{ backgroundColor: formData.badgeColor || '#3b82f6' }}
                            />
                        </Button>
                        <div className="font-mono text-xs text-muted-foreground">
                            {formData.badgeColor || '#3b82f6'}
                        </div>

                        {showColorPicker && (
                            <ColorPicker
                                color={formData.badgeColor || '#3b82f6'}
                                onChange={handleColorChange}
                                onClose={() => setShowColorPicker(false)}
                                triggerRect={getTriggerRect()}
                            />
                        )}
                    </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg border border-border/40">
                    <span className="text-[10px] font-medium text-muted-foreground">Preview</span>
                    <div className="flex gap-2 mt-2">
                        <div
                            className="px-3 py-1 rounded-full text-white text-xs font-medium"
                            style={{ backgroundColor: formData.badgeColor || '#3b82f6' }}
                        >
                            Featured
                        </div>
                        <div
                            className="px-3 py-1 rounded-full text-xs font-medium border"
                            style={{ borderColor: formData.badgeColor || '#3b82f6', color: formData.badgeColor || '#3b82f6' }}
                        >
                            Category
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 bg-amber-500/10 rounded-md text-xs text-amber-700 dark:text-amber-400">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    Ensure contrast for accessibility on both light and dark backgrounds.
                </div>
            </TabsContent>
        </Tabs>
    );
};

export default AppearanceSettings;