import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import ColorPicker from '../../../components/ColorPicker';

const AppearanceSettings = ({ formData, handleInputChange }) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorTriggerRef = useRef(null);

    const handleColorChange = (color) => {
        handleInputChange('badgeColor', color);
        setShowColorPicker(false);
    };

    const getTriggerRect = () => colorTriggerRef.current?.getBoundingClientRect() || null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>Customize the visual appearance of your blog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="badgeColor">Badge Color</Label>
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
    );
};

export default AppearanceSettings;