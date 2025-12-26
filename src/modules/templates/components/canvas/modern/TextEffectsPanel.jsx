import React, { useState, useRef } from 'react';
import { Button } from '@/ui/button';
import { ScrollArea } from '@/ui/scroll-area';
import { Slider } from '@/ui/slider';
import { Label } from '@/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { useUIStore } from '../../../store/useUIStore';
import { ChevronLeft, Settings2 } from 'lucide-react';
import ColorPicker from '@admin/components/ColorPicker';

// Effect presets configuration
const EFFECT_PRESETS = [
    { id: 'none', label: 'None', style: {} },
    { id: 'shadow', label: 'Shadow', style: { textShadow: '2px 2px 4px rgba(0,0,0,0.5)' } },
    { id: 'lift', label: 'Lift', style: { textShadow: '0px 4px 10px rgba(0,0,0,0.5)' } },
    { id: 'hollow', label: 'Hollow', style: { WebkitTextStroke: '1px black', color: 'transparent' } },
    { id: 'splice', label: 'Splice', style: { WebkitTextStroke: '1px black', color: 'transparent', textShadow: '2px 2px 0px #ccc' } },
    { id: 'outline', label: 'Outline', style: { WebkitTextStroke: '2px black' } },
    { id: 'echo', label: 'Echo', style: { textShadow: '-2px 0px 0px rgba(0,0,0,0.5), -4px 0px 0px rgba(0,0,0,0.3)' } },
    { id: 'glitch', label: 'Glitch', style: { textShadow: '2px 0px #ff00ff, -2px 0px #00ffff' } },
    { id: 'neon', label: 'Neon', style: { textShadow: '0 0 10px #ff00ff, 0 0 20px #ff00ff', color: 'white' } },
    { id: 'background', label: 'Background', style: { backgroundColor: '#facc15', padding: '4px 8px', borderRadius: '4px' } },
];

const TextEffectsPanel = ({
    selectedElement,
    updateElement,
    onClose
}) => {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';
    const [openPopoverId, setOpenPopoverId] = useState(null);

    const currentEffect = selectedElement?.effect?.type || 'none';
    const effectParams = selectedElement?.effect || {};

    const handleEffectSelect = (effectId) => {
        if (currentEffect === effectId && effectId !== 'none') {
            // Toggle popover if already selected
            setOpenPopoverId(openPopoverId === effectId ? null : effectId);
        } else {
            // Apply effect and open popover
            updateElement(selectedElement.id, {
                effect: {
                    type: effectId,
                    offset: 50,
                    direction: 45,
                    blur: 50,
                    transparency: 40,
                    thickness: 50,
                    color: '#000000',
                    ...((effectId === 'neon' || effectId === 'glitch') ? { color: '#ff00ff' } : {}),
                    ...((effectId === 'background') ? { color: '#facc15' } : {})
                }
            });
            if (effectId !== 'none') {
                setOpenPopoverId(effectId);
            }
        }
    };

    const updateParam = (key, value) => {
        updateElement(selectedElement.id, {
            effect: {
                ...selectedElement.effect,
                [key]: value
            }
        });
    };

    const renderSettings = (effectId) => {
        const showOffset = ['shadow', 'lift', 'splice', 'echo', 'glitch'].includes(effectId);
        const showDirection = ['shadow'].includes(effectId);
        const showBlur = ['shadow', 'lift', 'neon'].includes(effectId);
        const showTransparency = ['shadow', 'lift', 'echo', 'glitch'].includes(effectId);
        const showThickness = ['hollow', 'splice', 'outline', 'neon'].includes(effectId);
        const showColor = ['shadow', 'outline', 'echo', 'glitch', 'neon', 'background', 'splice'].includes(effectId);
        const showRoundness = ['background'].includes(effectId);

        return (
            <div className="space-y-3 p-1">
                {showOffset && (
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-xs">Offset</Label>
                            <span className="text-xs text-muted-foreground">{effectParams.offset || 50}</span>
                        </div>
                        <Slider value={[effectParams.offset || 50]} min={0} max={100} step={1} onValueChange={([val]) => updateParam('offset', val)} />
                    </div>
                )}
                {showDirection && (
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-xs">Direction</Label>
                            <span className="text-xs text-muted-foreground">{effectParams.direction || 45}°</span>
                        </div>
                        <Slider value={[effectParams.direction || 45]} min={-180} max={180} step={1} onValueChange={([val]) => updateParam('direction', val)} />
                    </div>
                )}
                {showBlur && (
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-xs">Blur</Label>
                            <span className="text-xs text-muted-foreground">{effectParams.blur || 50}</span>
                        </div>
                        <Slider value={[effectParams.blur || 50]} min={0} max={100} step={1} onValueChange={([val]) => updateParam('blur', val)} />
                    </div>
                )}
                {showTransparency && (
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-xs">Transparency</Label>
                            <span className="text-xs text-muted-foreground">{effectParams.transparency || 40}</span>
                        </div>
                        <Slider value={[effectParams.transparency || 40]} min={0} max={100} step={1} onValueChange={([val]) => updateParam('transparency', val)} />
                    </div>
                )}
                {showThickness && (
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-xs">{effectId === 'neon' ? 'Intensity' : 'Thickness'}</Label>
                            <span className="text-xs text-muted-foreground">{effectParams.thickness || 50}</span>
                        </div>
                        <Slider value={[effectParams.thickness || 50]} min={0} max={100} step={1} onValueChange={([val]) => updateParam('thickness', val)} />
                    </div>
                )}
                {showColor && (
                    <div className="space-y-1">
                        <Label className="text-xs">Color</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <div
                                    className="w-full h-8 rounded border cursor-pointer flex items-center gap-2 px-2 hover:ring-2 hover:ring-violet-500/50 transition-all"
                                    style={{ backgroundColor: effectParams.color || '#000000' }}
                                >
                                    <span className="text-xs font-mono text-white drop-shadow-sm">{effectParams.color || '#000000'}</span>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent
                                side="right"
                                sideOffset={16}
                                align="center"
                                avoidCollisions={true}
                                collisionPadding={16}
                                className="w-auto p-0 z-[100]"
                            >
                                <ColorPicker
                                    color={effectParams.color || '#000000'}
                                    onChange={(val) => updateParam('color', val)}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                )}
                {showRoundness && (
                    <div className="space-y-1">
                        <div className="flex justify-between">
                            <Label className="text-xs">Roundness</Label>
                            <span className="text-xs text-muted-foreground">{effectParams.roundness || 50}</span>
                        </div>
                        <Slider value={[effectParams.roundness || 50]} min={0} max={100} step={1} onValueChange={([val]) => updateParam('roundness', val)} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className={`flex flex-col h-full ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            <div className={`p-4 border-b flex items-center gap-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold">Effects</h3>
            </div>

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                    <Label className="text-xs font-medium uppercase text-muted-foreground">Style</Label>
                    <div className="grid grid-cols-3 gap-2">
                        {EFFECT_PRESETS.map((preset) => (
                            <Popover
                                key={preset.id}
                                open={openPopoverId === preset.id && preset.id !== 'none' && currentEffect === preset.id}
                                onOpenChange={(open) => !open && setOpenPopoverId(null)}
                            >
                                <PopoverTrigger asChild>
                                    <button
                                        onClick={() => handleEffectSelect(preset.id)}
                                        onMouseEnter={() => {
                                            if (currentEffect === preset.id && preset.id !== 'none') {
                                                setOpenPopoverId(preset.id);
                                            }
                                        }}
                                        onMouseLeave={() => {
                                            // Don't close immediately - let popover handle it
                                        }}
                                        className={`
                                            relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all
                                            ${currentEffect === preset.id
                                                ? 'border-violet-500 bg-violet-500/10 ring-1 ring-violet-500'
                                                : isDark ? 'border-zinc-700 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-100'}
                                        `}
                                    >
                                        <div
                                            className={`w-10 h-10 flex items-center justify-center text-xl font-bold rounded ${isDark ? 'bg-zinc-900' : 'bg-white'}`}
                                            style={preset.style}
                                        >
                                            Ag
                                        </div>
                                        <span className="text-[10px] font-medium">{preset.label}</span>
                                        {currentEffect === preset.id && preset.id !== 'none' && (
                                            <Settings2 className="absolute top-1 right-1 w-3 h-3 text-violet-500" />
                                        )}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    side="right"
                                    align="start"
                                    className={`w-56 ${isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}
                                    onMouseEnter={() => setOpenPopoverId(preset.id)}
                                    onMouseLeave={() => setOpenPopoverId(null)}
                                >
                                    <div className="space-y-2">
                                        <h4 className="font-medium text-sm">{preset.label} Settings</h4>
                                        {renderSettings(preset.id)}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};

export default TextEffectsPanel;

