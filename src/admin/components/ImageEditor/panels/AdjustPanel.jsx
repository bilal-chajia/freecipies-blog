import React from 'react';
import { Button } from '@/ui/button';
import { Slider } from '@/ui/slider';
import { Label } from '@/ui/label';
import { Separator } from '@/ui/separator';
import { FILTERS } from '../constants';

/**
 * AdjustPanel - Handles brightness, contrast, saturation, temperature, blur, vignette, and filters
 */
const AdjustPanel = ({
    imageSrc,
    activeFilter,
    brightness,
    contrast,
    saturation,
    temperature,
    blur,
    vignetteEnabled,
    vignetteIntensity,
    onFilterChange,
    onBrightnessChange,
    onContrastChange,
    onSaturationChange,
    onTemperatureChange,
    onBlurChange,
    onVignetteEnabledChange,
    onVignetteIntensityChange,
    saveToHistory
}) => {
    const handleResetAdjust = () => {
        onBrightnessChange(1);
        onContrastChange(1);
        onSaturationChange(1);
        onTemperatureChange(0);
        onBlurChange(0);
        onVignetteEnabledChange(false);
        onFilterChange('normal');
        saveToHistory();
    };

    const handleFoodEnhance = () => {
        onBrightnessChange(1.1);
        onContrastChange(1.15);
        onSaturationChange(1.25);
        onTemperatureChange(15);
        saveToHistory();
    };

    return (
        <div className="space-y-4">
            {/* Quick Presets */}
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Quick Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={handleFoodEnhance}
                    >
                        🍕 Food Enhance
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={handleResetAdjust}
                    >
                        ↺ Reset Adjust
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Filter Presets */}
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Filters</Label>
                <div className="grid grid-cols-3 gap-2">
                    {Object.entries(FILTERS).map(([key, filter]) => (
                        <button
                            key={key}
                            onClick={() => { onFilterChange(key); saveToHistory(); }}
                            className={`relative h-16 rounded-lg overflow-hidden border-2 transition-all ${activeFilter === key
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-transparent hover:border-muted-foreground/30'
                                }`}
                        >
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                    backgroundImage: `url(${imageSrc})`,
                                    filter: filter.css
                                }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-1 left-1 text-[10px] font-medium text-white">
                                {filter.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Adjustment Sliders */}
            <div className="space-y-4">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fine-Tune</Label>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs">Brightness</span>
                        <span className="text-xs text-muted-foreground">{(brightness * 100).toFixed(0)}%</span>
                    </div>
                    <Slider value={[brightness]} min={0.5} max={1.5} step={0.05} onValueChange={(v) => onBrightnessChange(v[0])} onPointerUp={saveToHistory} />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs">Contrast</span>
                        <span className="text-xs text-muted-foreground">{(contrast * 100).toFixed(0)}%</span>
                    </div>
                    <Slider value={[contrast]} min={0.5} max={1.5} step={0.05} onValueChange={(v) => onContrastChange(v[0])} onPointerUp={saveToHistory} />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs">Saturation</span>
                        <span className="text-xs text-muted-foreground">{(saturation * 100).toFixed(0)}%</span>
                    </div>
                    <Slider value={[saturation]} min={0} max={2} step={0.1} onValueChange={(v) => onSaturationChange(v[0])} onPointerUp={saveToHistory} />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs">Temperature</span>
                        <span className="text-xs text-muted-foreground">{temperature > 0 ? `+${temperature}` : temperature}</span>
                    </div>
                    <Slider value={[temperature]} min={-50} max={50} step={5} onValueChange={(v) => onTemperatureChange(v[0])} onPointerUp={saveToHistory} />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs">Blur</span>
                        <span className="text-xs text-muted-foreground">{blur}px</span>
                    </div>
                    <Slider value={[blur]} min={0} max={10} step={0.5} onValueChange={(v) => onBlurChange(v[0])} onPointerUp={saveToHistory} />
                </div>
            </div>

            <Separator />

            {/* Vignette */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Vignette</Label>
                    <Button
                        variant={vignetteEnabled ? "default" : "outline"}
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => { onVignetteEnabledChange(!vignetteEnabled); saveToHistory(); }}
                    >
                        {vignetteEnabled ? 'On' : 'Off'}
                    </Button>
                </div>
                {vignetteEnabled && (
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs">Intensity</span>
                            <span className="text-xs text-muted-foreground">{(vignetteIntensity * 100).toFixed(0)}%</span>
                        </div>
                        <Slider value={[vignetteIntensity]} min={0.1} max={1} step={0.1} onValueChange={(v) => onVignetteIntensityChange(v[0])} onPointerUp={saveToHistory} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdjustPanel;
