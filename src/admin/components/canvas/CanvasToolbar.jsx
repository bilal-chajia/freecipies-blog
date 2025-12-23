import React from 'react';
import { Button } from '@/ui/button';
import { Slider } from '@/ui/slider';
import { Separator } from '@/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from '@/ui/tooltip';
import {
    ZoomIn,
    ZoomOut,
    Maximize,
    Grid3X3,
    Undo2,
    Redo2,
    Eye,
    Download,
    RotateCcw,
} from 'lucide-react';

import { useUIStore } from '../../store/useStore';

/**
 * CanvasToolbar - Floating toolbar for canvas controls
 * Features: Zoom, Grid toggle, Undo/Redo, Preview
 */
const CanvasToolbar = ({
    zoom = 100,
    onZoomChange,
    showGrid = false,
    onGridToggle,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    onPreview,
    onExport,
    onReset,
}) => {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const handleZoomIn = () => {
        onZoomChange?.(Math.min(200, zoom + 25));
    };

    const handleZoomOut = () => {
        onZoomChange?.(Math.max(25, zoom - 25));
    };

    const handleFitToScreen = () => {
        onZoomChange?.(100);
    };

    return (
        <TooltipProvider>
            <div className={`canvas-toolbar flex items-center gap-1 px-3 py-2 backdrop-blur-sm border rounded-lg shadow-lg ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-zinc-200'}`}>
                {/* Zoom Controls */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                            onClick={handleZoomOut}
                            disabled={zoom <= 25}
                        >
                            <ZoomOut className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom Out</TooltipContent>
                </Tooltip>

                <div className="w-20 px-2">
                    <Slider
                        value={[zoom]}
                        min={25}
                        max={200}
                        step={5}
                        onValueChange={([v]) => onZoomChange?.(v)}
                    />
                </div>

                <span className="text-xs text-muted-foreground min-w-[40px] text-center">
                    {zoom}%
                </span>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                            onClick={handleZoomIn}
                            disabled={zoom >= 200}
                        >
                            <ZoomIn className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Zoom In</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                            onClick={handleFitToScreen}
                        >
                            <Maximize className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fit to Screen (100%)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className={`h-6 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                {/* Grid Toggle */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={showGrid ? 'secondary' : 'ghost'}
                            size="icon"
                            className={`h-8 w-8 rounded-full ${showGrid ? 'text-violet-500 bg-violet-500/10' : (isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900')}`}
                            onClick={onGridToggle}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Grid Snap (Off = Smart Guides)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className={`h-6 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                {/* Undo/Redo */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                            onClick={onUndo}
                            disabled={!canUndo}
                        >
                            <Undo2 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                            onClick={onRedo}
                            disabled={!canRedo}
                        >
                            <Redo2 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className={`h-6 mx-1 ${isDark ? 'bg-zinc-700' : 'bg-zinc-200'}`} />

                {/* Preview & Export */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                            onClick={onPreview}
                        >
                            <Eye className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Preview</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 rounded-full ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                            onClick={onExport}
                        >
                            <Download className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export Image</TooltipContent>
                </Tooltip>

                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-8 w-8 ${isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-900'}`}
                            onClick={onReset}
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reset Canvas</TooltipContent>
                </Tooltip>
            </div>
        </TooltipProvider>
    );
};

export default CanvasToolbar;
