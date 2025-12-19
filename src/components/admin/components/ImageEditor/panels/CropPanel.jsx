import React from 'react';
import { Button } from '@/ui/button';
import { Slider } from '@/ui/slider';
import { Label } from '@/ui/label';
import { Separator } from '@/ui/separator';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from '@/ui/select';
import { ASPECT_RATIO_GROUPS, parseAspectValue } from '../constants';

/**
 * CropPanel - Handles cropping, zoom, rotation, and flip controls
 */
const CropPanel = ({
    aspect,
    zoom,
    rotation,
    flipH,
    flipV,
    processing,
    onAspectChange,
    onZoomChange,
    onRotationChange,
    onFlipHChange,
    onFlipVChange,
    onApplyCrop,
    saveToHistory
}) => {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Aspect Ratio</Label>
                <Select
                    value={aspect === null ? 'free' : String(aspect)}
                    onValueChange={(val) => onAspectChange(parseAspectValue(val))}
                >
                    <SelectTrigger className="w-full bg-zinc-800 border-zinc-700">
                        <SelectValue placeholder="Select aspect ratio" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                        {Object.entries(ASPECT_RATIO_GROUPS).map(([key, group]) => (
                            <SelectGroup key={key}>
                                <SelectLabel className="text-muted-foreground">{group.label}</SelectLabel>
                                {group.ratios.map((ratio) => (
                                    <SelectItem key={ratio.value} value={ratio.value}>
                                        {ratio.label}
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <Separator />

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Zoom</Label>
                    <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}x</span>
                </div>
                <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(val) => onZoomChange(val[0])}
                    onPointerUp={saveToHistory}
                />
            </div>

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Rotation</Label>
                    <span className="text-xs text-muted-foreground">{rotation}°</span>
                </div>
                <Slider
                    value={[rotation]}
                    min={0}
                    max={360}
                    step={1}
                    onValueChange={(val) => onRotationChange(val[0])}
                    onPointerUp={saveToHistory}
                />
            </div>

            <Separator />

            {/* Flip */}
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Flip</Label>
                <div className="grid grid-cols-2 gap-2">
                    <Button
                        variant={flipH ? "default" : "outline"}
                        size="sm"
                        onClick={() => { onFlipHChange(!flipH); saveToHistory(); }}
                    >
                        ↔ Horizontal
                    </Button>
                    <Button
                        variant={flipV ? "default" : "outline"}
                        size="sm"
                        onClick={() => { onFlipVChange(!flipV); saveToHistory(); }}
                    >
                        ↕ Vertical
                    </Button>
                </div>
            </div>

            <Separator />

            {/* Apply Crop Button */}
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Apply</Label>
                <Button
                    variant="outline"
                    className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                    onClick={onApplyCrop}
                    disabled={processing}
                >
                    {processing ? 'Applying...' : '✓ Apply Crop & Continue'}
                </Button>
                <p className="text-xs text-muted-foreground">
                    Applies crop and resets transform. You can undo this action.
                </p>
            </div>
        </div>
    );
};

export default CropPanel;
