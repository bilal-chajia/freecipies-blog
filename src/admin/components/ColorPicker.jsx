import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '@/ui/input.jsx';
import { Button } from '@/ui/button.jsx';
import { cn } from '@/lib/utils';

// Convert HSV to RGB
const hsvToRgb = (h, s, v) => {
    let r, g, b;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
};

// Convert RGB to HSV
const rgbToHsv = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h, s, v = max;

    s = max === 0 ? 0 : d / max;

    if (max === min) {
        h = 0;
    } else {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h, s, v };
};

// Convert hex to RGB
const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 102, b: 0 };
};

// Convert RGB to hex
const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
};

const ColorPicker = ({
    color,
    onChange,
    onClose,
    className,
    triggerRect = null // { top, left, bottom, right, width, height }
}) => {
    // Parse initial color (supports hex with alpha like #ff6600ff)
    const parseColor = (c) => {
        if (!c) return { rgb: { r: 255, g: 102, b: 0 }, alpha: 1 };
        const hex = c.replace('#', '');
        if (hex.length === 8) {
            return {
                rgb: hexToRgb('#' + hex.slice(0, 6)),
                alpha: parseInt(hex.slice(6, 8), 16) / 255
            };
        }
        return { rgb: hexToRgb(c), alpha: 1 };
    };

    const initial = parseColor(color);
    const initialHsv = rgbToHsv(initial.rgb.r, initial.rgb.g, initial.rgb.b);

    const [hsv, setHsv] = useState(initialHsv);
    const [rgb, setRgb] = useState(initial.rgb);
    const [opacity, setOpacity] = useState(initial.alpha);
    const [hexInput, setHexInput] = useState(color || '#ff6600');
    const [activeTab, setActiveTab] = useState('Hex');

    const saturationRef = useRef(null);
    const hueRef = useRef(null);
    const opacityRef = useRef(null);
    const containerRef = useRef(null);
    const isDragging = useRef(false);
    const dragType = useRef(null);

    // Output color with alpha
    const outputColor = useCallback((r, g, b, a) => {
        const hex = rgbToHex(r, g, b);
        if (a < 1) {
            const alphaHex = Math.round(a * 255).toString(16).padStart(2, '0');
            return hex + alphaHex;
        }
        return hex;
    }, []);

    // Update color from HSV
    const updateFromHsv = useCallback((newHsv, newOpacity = opacity) => {
        const newRgb = hsvToRgb(newHsv.h, newHsv.s, newHsv.v);
        const newHex = outputColor(newRgb.r, newRgb.g, newRgb.b, newOpacity);
        setHsv(newHsv);
        setRgb(newRgb);
        setHexInput(newHex);
        onChange?.(newHex);
    }, [onChange, opacity, outputColor]);

    // Handle saturation/brightness picker
    const handleSaturationMouseDown = (e) => {
        isDragging.current = true;
        dragType.current = 'saturation';
        handleSaturationMove(e);
    };

    const handleSaturationMove = (e) => {
        if (!saturationRef.current) return;
        const rect = saturationRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        updateFromHsv({ ...hsv, s: x, v: 1 - y });
    };

    // Handle hue slider
    const handleHueMouseDown = (e) => {
        isDragging.current = true;
        dragType.current = 'hue';
        handleHueMove(e);
    };

    const handleHueMove = (e) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        updateFromHsv({ ...hsv, h: x });
    };

    // Handle opacity slider
    const handleOpacityMouseDown = (e) => {
        isDragging.current = true;
        dragType.current = 'opacity';
        handleOpacityMove(e);
    };

    const handleOpacityMove = (e) => {
        const target = e.target.closest('[data-opacity]')?.parentElement || opacityRef.current;
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        setOpacity(x);
        const newHex = outputColor(rgb.r, rgb.g, rgb.b, x);
        setHexInput(newHex);
        onChange?.(newHex);
    };

    // Global mouse move/up handlers
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging.current) return;
            if (dragType.current === 'saturation') {
                handleSaturationMove(e);
            } else if (dragType.current === 'hue') {
                handleHueMove(e);
            } else if (dragType.current === 'opacity') {
                handleOpacityMove(e);
            }
        };

        const handleMouseUp = () => {
            isDragging.current = false;
            dragType.current = null;
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [hsv, rgb, opacity]);

    // Close picker when clicking outside (with delay to prevent immediate close)
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                onClose?.();
            }
        };
        // Small delay to prevent the opening click from triggering close
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);
        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    // Handle hex input
    const handleHexChange = (e) => {
        const value = e.target.value;
        setHexInput(value);
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
            const newRgb = hexToRgb(value);
            const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
            setRgb(newRgb);
            setHsv(newHsv);
            onChange?.(value);
        }
    };

    // Handle RGB input
    const handleRgbChange = (channel, value) => {
        const numValue = Math.max(0, Math.min(255, parseInt(value) || 0));
        const newRgb = { ...rgb, [channel]: numValue };
        const newHsv = rgbToHsv(newRgb.r, newRgb.g, newRgb.b);
        const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
        setRgb(newRgb);
        setHsv(newHsv);
        setHexInput(newHex);
        onChange?.(newHex);
    };

    const hueColor = `hsl(${hsv.h * 360}, 100%, 50%)`;

    // Calculate fixed position styles if triggerRect is provided
    const getPositionStyles = () => {
        if (triggerRect) {
            return {
                position: 'fixed',
                top: triggerRect.bottom + 4,
                left: triggerRect.left,
                zIndex: 9999
            };
        }
        return {};
    };

    const pickerContent = (
        <div
            ref={containerRef}
            className={cn(
                "p-3 bg-popover border border-border rounded-xl shadow-xl",
                "w-[220px] animate-in fade-in-0 zoom-in-95",
                !triggerRect && "absolute z-50",
                className
            )}
            style={triggerRect ? getPositionStyles() : undefined}
        >
            {/* Tabs */}
            <div className="flex border-b border-border mb-3">
                {['Hex', 'RGB', 'HSL', 'Null'].map((tab) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "flex-1 py-1.5 text-xs font-medium transition-colors",
                            activeTab === tab
                                ? "text-foreground border-b-2 border-primary"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'Null' ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            onChange?.(null);
                            onClose?.();
                        }}
                    >
                        Clear Color
                    </Button>
                </div>
            ) : (
                <>
                    {/* Saturation/Brightness Area */}
                    <div
                        ref={saturationRef}
                        data-saturation
                        className="relative w-full h-32 rounded-lg cursor-crosshair mb-3 overflow-hidden"
                        style={{ backgroundColor: hueColor }}
                        onMouseDown={handleSaturationMouseDown}
                    >
                        {/* White gradient (left to right) */}
                        <div
                            className="absolute inset-0"
                            style={{ background: 'linear-gradient(to right, #fff, transparent)' }}
                        />
                        {/* Black gradient (top to bottom) */}
                        <div
                            className="absolute inset-0"
                            style={{ background: 'linear-gradient(to bottom, transparent, #000)' }}
                        />
                        {/* Picker circle */}
                        <div
                            className="absolute w-4 h-4 border-2 border-white rounded-full shadow-lg"
                            style={{
                                left: `${hsv.s * 100}%`,
                                top: `${(1 - hsv.v) * 100}%`,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: rgbToHex(rgb.r, rgb.g, rgb.b)
                            }}
                        />
                    </div>

                    {/* Hue Slider */}
                    <div
                        ref={hueRef}
                        data-hue
                        className="relative w-full h-3 rounded-full cursor-pointer mb-3"
                        style={{
                            background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)'
                        }}
                        onMouseDown={handleHueMouseDown}
                    >
                        <div
                            className="absolute w-3 h-3 border-2 border-white rounded-full shadow-lg"
                            style={{
                                left: `${hsv.h * 100}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: hueColor
                            }}
                        />
                    </div>

                    {/* Opacity Slider */}
                    <div ref={opacityRef} className="relative w-full h-3 rounded-full cursor-pointer mb-3 overflow-hidden" onMouseDown={handleOpacityMouseDown}>
                        {/* Checkered background */}
                        <div
                            className="absolute inset-0"
                            style={{
                                backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), 
                                                  linear-gradient(-45deg, #ccc 25%, transparent 25%), 
                                                  linear-gradient(45deg, transparent 75%, #ccc 75%), 
                                                  linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
                                backgroundSize: '8px 8px',
                                backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                            }}
                        />
                        {/* Opacity gradient */}
                        <div
                            data-opacity
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: `linear-gradient(to right, transparent, ${rgbToHex(rgb.r, rgb.g, rgb.b)})`
                            }}
                            onMouseDown={handleOpacityMouseDown}
                        />
                        {/* Slider handle */}
                        <div
                            className="absolute w-3 h-3 border-2 border-white rounded-full shadow-lg"
                            style={{
                                left: `${opacity * 100}%`,
                                top: '50%',
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`
                            }}
                        />
                    </div>

                    {/* Opacity percentage */}
                    <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                        <span>Opacity</span>
                        <span className="font-mono">{Math.round(opacity * 100)}%</span>
                    </div>

                    {/* Inputs based on active tab */}
                    {activeTab === 'Hex' && (
                        <div className="flex items-center gap-2">
                            <div
                                className="w-8 h-8 rounded-md border flex-shrink-0"
                                style={{ backgroundColor: hexInput }}
                            />
                            <Input
                                value={hexInput}
                                onChange={handleHexChange}
                                placeholder="#FF6600"
                                className="h-8 text-xs font-mono uppercase"
                                maxLength={7}
                            />
                        </div>
                    )}

                    {activeTab === 'RGB' && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-red-500 font-medium w-3">R</span>
                                    <Input
                                        type="number"
                                        value={rgb.r}
                                        onChange={(e) => handleRgbChange('r', e.target.value)}
                                        className="h-7 text-xs px-2"
                                        min={0}
                                        max={255}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-green-500 font-medium w-3">G</span>
                                    <Input
                                        type="number"
                                        value={rgb.g}
                                        onChange={(e) => handleRgbChange('g', e.target.value)}
                                        className="h-7 text-xs px-2"
                                        min={0}
                                        max={255}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-blue-500 font-medium w-3">B</span>
                                    <Input
                                        type="number"
                                        value={rgb.b}
                                        onChange={(e) => handleRgbChange('b', e.target.value)}
                                        className="h-7 text-xs px-2"
                                        min={0}
                                        max={255}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'HSL' && (
                        <div className="flex items-center gap-2">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground font-medium w-3">H</span>
                                    <Input
                                        type="number"
                                        value={Math.round(hsv.h * 360)}
                                        onChange={(e) => updateFromHsv({ ...hsv, h: (parseInt(e.target.value) || 0) / 360 })}
                                        className="h-7 text-xs px-2"
                                        min={0}
                                        max={360}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground font-medium w-3">S</span>
                                    <Input
                                        type="number"
                                        value={Math.round(hsv.s * 100)}
                                        onChange={(e) => updateFromHsv({ ...hsv, s: (parseInt(e.target.value) || 0) / 100 })}
                                        className="h-7 text-xs px-2"
                                        min={0}
                                        max={100}
                                    />
                                </div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground font-medium w-3">L</span>
                                    <Input
                                        type="number"
                                        value={Math.round(hsv.v * 100)}
                                        onChange={(e) => updateFromHsv({ ...hsv, v: (parseInt(e.target.value) || 0) / 100 })}
                                        className="h-7 text-xs px-2"
                                        min={0}
                                        max={100}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );

    // Use portal if triggerRect is provided (to escape overflow containers)
    if (triggerRect) {
        return createPortal(pickerContent, document.body);
    }

    return pickerContent;
};

export default ColorPicker;
