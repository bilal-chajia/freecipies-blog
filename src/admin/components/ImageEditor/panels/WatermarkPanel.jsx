import React from 'react';
import { Button } from '@/ui/button';
import { Slider } from '@/ui/slider';
import { Label } from '@/ui/label';
import { Separator } from '@/ui/separator';
import { Grid3X3, Square, Image as ImageIcon } from 'lucide-react';
import { WATERMARK_POSITIONS } from '../constants';

/**
 * WatermarkPanel - Handles watermark settings
 */
const WatermarkPanel = ({
    watermarkType,
    watermarkRepeat,
    watermarkPosition,
    watermarkScale,
    watermarkOpacity,
    watermarkRotation,
    watermarkSpacingH,
    watermarkSpacingV,
    fileInputRef,
    onWatermarkTypeChange,
    onWatermarkRepeatChange,
    onWatermarkPositionChange,
    onWatermarkScaleChange,
    onWatermarkOpacityChange,
    onWatermarkRotationChange,
    onWatermarkSpacingHChange,
    onWatermarkSpacingVChange,
    onWatermarkUpload,
    saveToHistory
}) => {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Type</Label>
                <div className="grid grid-cols-3 gap-2">
                    <Button
                        variant={watermarkType === 'none' ? 'default' : 'outline'}
                        onClick={() => { onWatermarkTypeChange('none'); saveToHistory(); }}
                        size="sm"
                    >None</Button>
                    <Button
                        variant={watermarkType === 'text' ? 'default' : 'outline'}
                        onClick={() => { onWatermarkTypeChange('text'); saveToHistory(); }}
                        size="sm"
                    >Logo</Button>
                    <Button
                        variant={watermarkType === 'custom' ? 'default' : 'outline'}
                        onClick={() => onWatermarkTypeChange('custom')}
                        size="sm"
                    >Custom</Button>
                </div>
            </div>

            {watermarkType !== 'none' && (
                <>
                    {watermarkType === 'custom' && (
                        <div className="space-y-2">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Upload</Label>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={onWatermarkUpload}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImageIcon className="w-4 h-4 mr-2" />
                                Select Image
                            </Button>
                        </div>
                    )}

                    <Separator />

                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Position</Label>
                        <div className="grid grid-cols-3 gap-1.5 w-28 mx-auto">
                            {['TL', 'T', 'TR', 'L', 'C', 'R', 'BL', 'B', 'BR'].map((pos) => (
                                <Button
                                    key={pos}
                                    variant={watermarkPosition === pos ? 'default' : 'outline'}
                                    size="icon"
                                    className="h-7 w-7 text-xs"
                                    onClick={() => { onWatermarkPositionChange(pos); saveToHistory(); }}
                                >
                                    {pos === 'TL' ? '↖' : pos === 'T' ? '↑' : pos === 'TR' ? '↗' :
                                        pos === 'L' ? '←' : pos === 'C' ? '•' : pos === 'R' ? '→' :
                                            pos === 'BL' ? '↙' : pos === 'B' ? '↓' : '↘'}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Size</Label>
                            <span className="text-xs text-muted-foreground">{(watermarkScale * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                            value={[watermarkScale]}
                            min={0.05}
                            max={0.5}
                            step={0.01}
                            onValueChange={(val) => onWatermarkScaleChange(val[0])}
                            onPointerUp={saveToHistory}
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Opacity</Label>
                            <span className="text-xs text-muted-foreground">{(watermarkOpacity * 100).toFixed(0)}%</span>
                        </div>
                        <Slider
                            value={[watermarkOpacity]}
                            min={0.1}
                            max={1}
                            step={0.1}
                            onValueChange={(val) => onWatermarkOpacityChange(val[0])}
                            onPointerUp={saveToHistory}
                        />
                    </div>

                    <Separator />

                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pattern</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant={watermarkRepeat === 'single' ? 'default' : 'outline'}
                                onClick={() => { onWatermarkRepeatChange('single'); saveToHistory(); }}
                                size="sm"
                            >
                                <Square className="w-4 h-4 mr-2" /> Single
                            </Button>
                            <Button
                                variant={watermarkRepeat === 'tiled' ? 'default' : 'outline'}
                                onClick={() => { onWatermarkRepeatChange('tiled'); saveToHistory(); }}
                                size="sm"
                            >
                                <Grid3X3 className="w-4 h-4 mr-2" /> Tiled
                            </Button>
                        </div>
                    </div>

                    {/* Tiled Pattern Options */}
                    {watermarkRepeat === 'tiled' && (
                        <>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rotation</Label>
                                    <span className="text-xs text-muted-foreground">{watermarkRotation}°</span>
                                </div>
                                <Slider
                                    value={[watermarkRotation]}
                                    min={-90}
                                    max={90}
                                    step={5}
                                    onValueChange={(val) => onWatermarkRotationChange(val[0])}
                                    onPointerUp={saveToHistory}
                                />
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Spacing</Label>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs">↔ Horizontal</span>
                                        <span className="text-xs text-muted-foreground">{watermarkSpacingH}px</span>
                                    </div>
                                    <Slider
                                        value={[watermarkSpacingH]}
                                        min={20}
                                        max={300}
                                        step={10}
                                        onValueChange={(val) => onWatermarkSpacingHChange(val[0])}
                                        onPointerUp={saveToHistory}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs">↕ Vertical</span>
                                        <span className="text-xs text-muted-foreground">{watermarkSpacingV}px</span>
                                    </div>
                                    <Slider
                                        value={[watermarkSpacingV]}
                                        min={20}
                                        max={300}
                                        step={10}
                                        onValueChange={(val) => onWatermarkSpacingVChange(val[0])}
                                        onPointerUp={saveToHistory}
                                    />
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default WatermarkPanel;
