import React from 'react';
import { Button } from '@/ui/button';
import { Slider } from '@/ui/slider';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Separator } from '@/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select';
import { TEXT_POSITIONS, TEXT_COLORS } from '../constants';

/**
 * TextPanel - Handles text overlay settings
 */
const TextPanel = ({
    textOverlay,
    onTextOverlayChange,
    saveToHistory
}) => {
    const updateTextOverlay = (updates) => {
        onTextOverlayChange(prev => ({ ...prev, ...updates }));
    };

    const handleRecipeCardTemplate = () => {
        onTextOverlayChange(prev => ({
            ...prev,
            enabled: true,
            text: 'Recipe Title',
            font: 'serif',
            size: 64,
            color: '#ffffff',
            position: 'bottom',
            shadow: true
        }));
        saveToHistory();
    };

    const handleCopyrightTemplate = () => {
        onTextOverlayChange(prev => ({
            ...prev,
            enabled: true,
            text: '© Freecipies',
            font: 'sans-serif',
            size: 24,
            color: '#ffffff',
            position: 'BR',
            shadow: true
        }));
        saveToHistory();
    };

    return (
        <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex justify-between items-center">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Text Overlay</Label>
                <Button
                    variant={textOverlay.enabled ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                        updateTextOverlay({ enabled: !textOverlay.enabled });
                        saveToHistory();
                    }}
                >
                    {textOverlay.enabled ? 'On' : 'Off'}
                </Button>
            </div>

            {textOverlay.enabled && (
                <>
                    {/* Text Input */}
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Text</Label>
                        <Input
                            value={textOverlay.text}
                            onChange={(e) => updateTextOverlay({ text: e.target.value })}
                            onBlur={saveToHistory}
                            placeholder="Enter your text..."
                            className="bg-zinc-800 border-zinc-700"
                        />
                    </div>

                    {/* Quick Templates */}
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Templates</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={handleRecipeCardTemplate}
                            >
                                📖 Recipe Card
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs"
                                onClick={handleCopyrightTemplate}
                            >
                                © Copyright
                            </Button>
                        </div>
                    </div>

                    <Separator />

                    {/* Font */}
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Font</Label>
                        <Select value={textOverlay.font} onValueChange={(v) => { updateTextOverlay({ font: v }); saveToHistory(); }}>
                            <SelectTrigger className="bg-zinc-800 border-zinc-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-800 border-zinc-700">
                                <SelectItem value="sans-serif">Sans Serif</SelectItem>
                                <SelectItem value="serif">Serif</SelectItem>
                                <SelectItem value="monospace">Monospace</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Size */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <span className="text-xs">Size</span>
                            <span className="text-xs text-muted-foreground">{textOverlay.size}px</span>
                        </div>
                        <Slider
                            value={[textOverlay.size]}
                            min={12}
                            max={120}
                            step={4}
                            onValueChange={(v) => updateTextOverlay({ size: v[0] })}
                            onPointerUp={saveToHistory}
                        />
                    </div>

                    {/* Color */}
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Color</Label>
                        <div className="flex gap-2">
                            {TEXT_COLORS.map(color => (
                                <button
                                    key={color}
                                    className={`w-8 h-8 rounded-full border-2 ${textOverlay.color === color ? 'border-primary scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => { updateTextOverlay({ color }); saveToHistory(); }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Position */}
                    <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Position</Label>
                        <div className="grid grid-cols-3 gap-1.5">
                            {TEXT_POSITIONS.map((pos) => (
                                <Button
                                    key={pos.value}
                                    variant={textOverlay.position === pos.value ? 'default' : 'outline'}
                                    size="sm"
                                    className="h-8 text-xs"
                                    onClick={() => { updateTextOverlay({ position: pos.value }); saveToHistory(); }}
                                >
                                    {pos.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Shadow Toggle */}
                    <div className="flex justify-between items-center">
                        <Label className="text-xs">Text Shadow</Label>
                        <Button
                            variant={textOverlay.shadow ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs"
                            onClick={() => { updateTextOverlay({ shadow: !textOverlay.shadow }); saveToHistory(); }}
                        >
                            {textOverlay.shadow ? 'On' : 'Off'}
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
};

export default TextPanel;
