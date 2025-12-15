import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import ColorPicker from '../../../components/ColorPicker';
import BrandingCards from '../../../components/BrandingCards';
import { brandingAPI } from '../../../services/api';

const AppearanceSettings = ({ formData, handleInputChange }) => {
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

    // Load current branding on mount
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

    const handleFaviconChange = (url) => {
        setFavicon(url);
    };

    const handleFaviconDelete = () => {
        setFavicon(null);
        setFaviconVariants({});
    };

    const getTriggerRect = () => colorTriggerRef.current?.getBoundingClientRect() || null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Branding - Logos & Favicon */}
            <BrandingCards
                logos={logos}
                favicon={favicon}
                onLogoChange={handleLogoChange}
                onLogoDelete={handleLogoDelete}
                onFaviconChange={handleFaviconChange}
                onFaviconDelete={handleFaviconDelete}
            />

            {/* Badge Color */}
            <Card>
                <CardHeader>
                    <CardTitle>Badge Color</CardTitle>
                    <CardDescription>Customize the visual appearance of your blog badges</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="badgeColor">Default Badge Color</Label>
                        <p className="text-sm text-muted-foreground">
                            Choose the default color for badges throughout the site
                        </p>
                        <div className="flex items-center gap-4">
                            <Button
                                ref={colorTriggerRef}
                                variant="outline"
                                className="w-12 h-12 p-0 border-2"
                                style={{ backgroundColor: formData.badgeColor || '#3b82f6' }}
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                title="Change Badge Color"
                            />
                            {showColorPicker && (
                                <ColorPicker
                                    color={formData.badgeColor || '#3b82f6'}
                                    onChange={handleColorChange}
                                    onClose={() => setShowColorPicker(false)}
                                    triggerRect={getTriggerRect()}
                                />
                            )}
                            <div
                                className="px-3 py-1 rounded-full text-white text-sm font-medium"
                                style={{ backgroundColor: formData.badgeColor || '#3b82f6' }}
                            >
                                Preview Badge
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AppearanceSettings;