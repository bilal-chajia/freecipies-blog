import React from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
    TooltipProvider
} from '@/components/ui/tooltip';
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
            <div className="canvas-toolbar flex items-center gap-1 px-3 py-2 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg">
                {/* Zoom Controls */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                            className="h-8 w-8"
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
                            className="h-8 w-8"
                            onClick={handleFitToScreen}
                        >
                            <Maximize className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Fit to Screen (100%)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Grid Toggle */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant={showGrid ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={onGridToggle}
                        >
                            <Grid3X3 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Grid Snap (Off = Smart Guides)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Undo/Redo */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                            className="h-8 w-8"
                            onClick={onRedo}
                            disabled={!canRedo}
                        >
                            <Redo2 className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-6 mx-1" />

                {/* Preview & Export */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
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
                            className="h-8 w-8"
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
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
