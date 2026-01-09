import React, { useRef, useState } from 'react';
import { FormField } from '@/components/settings';
import { SectionCard } from '@/components/homepage';
import { LayoutPanelLeft, Image, Search } from 'lucide-react';
import { Input } from '@/ui/input.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Label } from '@/ui/label.jsx';
import ColorPicker from '@/components/ColorPicker';

const HeroSection = ({ formData, handleNestedInputChange }) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const colorTriggerRef = useRef(null);

    return (
        <SectionCard
            title="Hero Section"
            description="The main value proposition and call-to-action above the fold"
            icon={LayoutPanelLeft}
            enabled={formData.hero.enabled}
            onEnabledChange={(checked) => handleNestedInputChange('hero', 'enabled', checked)}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="heroTitle"
                    label="Hero Title"
                    value={formData.hero.title}
                    onChange={(e) => handleNestedInputChange('hero', 'title', e.target.value)}
                    placeholder="Welcome to Our Blog"
                    description="The main headline displayed in the hero"
                />
                <FormField
                    id="heroCta"
                    label="CTA Button Text"
                    value={formData.hero.ctaText}
                    onChange={(e) => handleNestedInputChange('hero', 'ctaText', e.target.value)}
                    placeholder="Explore Recipes"
                />
            </div>

            <FormField
                id="heroSubtitle"
                label="Subtitle"
                multiline
                rows={2}
                value={formData.hero.subtitle}
                onChange={(e) => handleNestedInputChange('hero', 'subtitle', e.target.value)}
                placeholder="Discover amazing recipes and cooking tips"
                description="Supporting text below the headline"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="heroBackground"
                    label="Background Image URL"
                    icon={Image}
                    value={formData.hero.backgroundImage}
                    onChange={(e) => handleNestedInputChange('hero', 'backgroundImage', e.target.value)}
                    placeholder="https://cdn.example.com/hero.jpg"
                />

                <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground/80">
                        Background Color
                    </Label>
                    <div className="flex items-center gap-2 h-8 px-2 border border-input rounded-md">
                        <div
                            ref={colorTriggerRef}
                            className="w-6 h-6 rounded border border-border/40 cursor-pointer hover:scale-105 transition-transform"
                            style={{ backgroundColor: formData.hero.backgroundColor || '#f8fafc' }}
                            onClick={() => setShowColorPicker(!showColorPicker)}
                        />
                        <Input
                            value={formData.hero.backgroundColor}
                            onChange={(e) => handleNestedInputChange('hero', 'backgroundColor', e.target.value)}
                            className="flex-1 border-none shadow-none focus-visible:ring-0 h-7 px-1 font-mono text-xs uppercase"
                            placeholder="#f8fafc"
                        />
                    </div>
                    {showColorPicker && (
                        <ColorPicker
                            color={formData.hero.backgroundColor}
                            onChange={(color) => handleNestedInputChange('hero', 'backgroundColor', color)}
                            onClose={() => setShowColorPicker(false)}
                            triggerRect={colorTriggerRef.current?.getBoundingClientRect()}
                        />
                    )}
                </div>
            </div>

            {/* Search Toggle */}
            <div className="flex items-center justify-between p-3 rounded-md border border-border/40 bg-muted/30">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                        <Search className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-sm font-medium">Show Search Bar</p>
                        <p className="text-xs text-muted-foreground">Display a search input in the hero section</p>
                    </div>
                </div>
                <Switch
                    checked={formData.hero.showSearch}
                    onCheckedChange={(checked) => handleNestedInputChange('hero', 'showSearch', checked)}
                />
            </div>
        </SectionCard>
    );
};

export default HeroSection;
