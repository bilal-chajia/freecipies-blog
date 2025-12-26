// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    RotateCw,
    Lock,
    Unlock,
    Copy,
    Trash2,
    MoreHorizontal,
    Clipboard,
    ClipboardCopy,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignVerticalJustifyStart,
    AlignVerticalJustifyCenter,
    AlignVerticalJustifyEnd,
    ChevronUp,
    ChevronDown,
    ChevronsUp,
    ChevronsDown,
} from 'lucide-react';
import { Button } from '@/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { useEditorStore } from '../../store';
import { useUIStore } from '../../store/useUIStore';

// Default canvas dimensions (fallback)
const DEFAULT_CANVAS_WIDTH = 1000;
const DEFAULT_CANVAS_HEIGHT = 1500;

/**
 * FloatingToolbar - Canva-style floating toolbar above selected elements
 * 
 * Shows quick actions: Rotate, Lock, Duplicate, Delete, More (...)
 * Positioned above the selected element on the canvas
 */
const FloatingToolbar = ({
    selectedElement,
    canvasScale = 1,
    canvasOffset = { x: 0, y: 0 },
    containerRef,
    stageRef,
    onElementChange,
}) => {
    const toolbarRef = useRef(null);

    // Get canvas dimensions from store template
    const template = useEditorStore(state => state.template);
    const CANVAS_WIDTH = template?.width || template?.canvas_width || DEFAULT_CANVAS_WIDTH;
    const CANVAS_HEIGHT = template?.height || template?.canvas_height || DEFAULT_CANVAS_HEIGHT;

    // Store actions
    const deleteSelected = useEditorStore(state => state.deleteSelected);
    const duplicateSelected = useEditorStore(state => state.duplicateSelected);
    const moveElementUp = useEditorStore(state => state.moveElementUp);
    const moveElementDown = useEditorStore(state => state.moveElementDown);
    const bringToFront = useEditorStore(state => state.bringToFront);
    const sendToBack = useEditorStore(state => state.sendToBack);

    // Clipboard state for copy/paste
    const [clipboard, setClipboard] = useState(null);

    // Theme state
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    // Calculate toolbar position based on selected element
    const calculatePosition = () => {
        if (!selectedElement || !containerRef?.current) return { x: 0, y: 0 };

        const container = containerRef.current.getBoundingClientRect();

        // Element position (canvas coordinates)
        const elX = selectedElement.x || 0;
        const elY = selectedElement.y || 0;
        const elWidth = selectedElement.width || 100;
        const elHeight = selectedElement.height || 100;
        const rotation = (selectedElement.rotation || 0) * (Math.PI / 180);

        // Find bounding box of rotated element
        // Canvas uses top-left origin for rotation (unless offset)
        // We calculate all 4 corners relative to (elX, elY)
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);

        const corners = [
            { x: 0, y: 0 },
            { x: elWidth, y: 0 },
            { x: elWidth, y: elHeight },
            { x: 0, y: elHeight },
        ].map(p => ({
            x: elX + (p.x * cos - p.y * sin),
            y: elY + (p.x * sin + p.y * cos)
        }));

        const minY = Math.min(...corners.map(c => c.y));
        const maxY = Math.max(...corners.map(c => c.y));
        const minX = Math.min(...corners.map(c => c.x));
        const maxX = Math.max(...corners.map(c => c.x));
        const centerX = (minX + maxX) / 2;

        // canvasOffset is in stage coordinate units
        const screenX = (canvasOffset.x + centerX) * canvasScale;

        // Position relative to the HIGHEST point of the rotated element
        const screenTopY = (canvasOffset.y + minY) * canvasScale;
        const screenBottomY = (canvasOffset.y + maxY) * canvasScale;

        // Toolbar dimensions
        const toolbarWidth = 220;
        const toolbarHeight = 44;
        const gap = 16;
        const padding = 8; // Minimum distance from viewport edge

        // Initial position: centered horizontally, above element
        let x = screenX - toolbarWidth / 2;
        let y = screenTopY - toolbarHeight - gap;

        // If above element is off-screen (top), try below element
        if (y < padding) {
            y = screenBottomY + gap;
        }

        // --- VIEWPORT CLAMPING (Always keep visible) ---

        // Clamp X: ensure it doesn't go off left or right edge
        x = Math.max(padding, Math.min(x, container.width - toolbarWidth - padding));

        // Clamp Y: ensure it doesn't go off top or bottom edge
        // Note: We prioritize keeping it on screen over not overlapping element
        // if the element takes up the whole screen height.
        y = Math.max(padding, Math.min(y, container.height - toolbarHeight - padding));

        return { x, y };
    };

    // Recalculate on every relevant change (including element position for fluid dragging)
    const toolbarPosition = calculatePosition();

    if (!selectedElement) return null;

    const isLocked = selectedElement.locked;

    // === Actions ===
    const handleRotate = () => {
        const currentRotation = selectedElement.rotation || 0;
        onElementChange?.(selectedElement.id, { rotation: (currentRotation + 90) % 360 });
    };

    const handleToggleLock = () => {
        onElementChange?.(selectedElement.id, { locked: !isLocked });
    };

    const handleDuplicate = () => {
        duplicateSelected();
    };

    const handleDelete = () => {
        deleteSelected();
    };

    const handleCopy = () => {
        setClipboard({ ...selectedElement });
    };

    const handlePaste = () => {
        if (!clipboard) return;
        // Paste logic would go through store
        // For now, just duplicate
        duplicateSelected();
    };

    const handleAlignToPage = (alignment) => {
        let newProps = {};

        switch (alignment) {
            case 'left':
                newProps.x = 0;
                break;
            case 'center':
                newProps.x = (CANVAS_WIDTH - (selectedElement.width || 100)) / 2;
                break;
            case 'right':
                newProps.x = CANVAS_WIDTH - (selectedElement.width || 100);
                break;
            case 'top':
                newProps.y = 0;
                break;
            case 'middle':
                newProps.y = (CANVAS_HEIGHT - (selectedElement.height || 100)) / 2;
                break;
            case 'bottom':
                newProps.y = CANVAS_HEIGHT - (selectedElement.height || 100);
                break;
        }

        onElementChange?.(selectedElement.id, newProps);
    };

    // Button style - purple icons matching selection border (#8b5cf6) - smaller size
    const buttonClass = `h-6 w-6 rounded-full p-0 border hover:bg-violet-500/20 ${isDark ? 'border-zinc-700 text-primary hover:text-white' : 'border-zinc-300 text-primary hover:text-primary/80 hover:bg-violet-100'}`;

    return (
        <motion.div
            ref={toolbarRef}
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute z-50 pointer-events-auto"
            style={{
                left: toolbarPosition.x,
                top: toolbarPosition.y,
            }}
        >
            <div className={`flex items-center gap-0.5 backdrop-blur-md border rounded-xl shadow-2xl px-2 py-1.5 ${isDark
                ? 'bg-zinc-900/95 border-white/10'
                : 'bg-white/95 border-zinc-200'
                }`}>
                {/* Rotate */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={buttonClass}
                            onClick={handleRotate}
                            disabled={isLocked}
                        >
                            <RotateCw className="h-3 w-3" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Rotate 90°
                    </TooltipContent>
                </Tooltip>

                {/* Lock/Unlock */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={buttonClass}
                            onClick={handleToggleLock}
                        >
                            {isLocked ? (
                                <Lock className="h-3 w-3 text-amber-500" />
                            ) : (
                                <Unlock className="h-3 w-3" />
                            )}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        {isLocked ? 'Unlock' : 'Lock'}
                    </TooltipContent>
                </Tooltip>

                {/* Duplicate */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={buttonClass}
                            onClick={handleDuplicate}
                            disabled={isLocked}
                        >
                            <Copy className="h-3 w-3" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Duplicate
                    </TooltipContent>
                </Tooltip>

                {/* Delete */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={buttonClass}
                            onClick={handleDelete}
                            disabled={isLocked}
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                        Delete
                    </TooltipContent>
                </Tooltip>

                {/* Separator */}
                <div className="w-px h-5 bg-border mx-0.5" />

                {/* More Options (...) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={buttonClass}
                        >
                            <MoreHorizontal className="h-3 w-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        side="right"
                        align="start"
                        sideOffset={8}
                        className={`w-48 backdrop-blur-md border ${isDark
                            ? 'bg-zinc-900/95 border-white/10 text-violet-300'
                            : 'bg-white/95 border-zinc-200 text-zinc-700'
                            }`}
                    >
                        <DropdownMenuItem onClick={handleCopy} className={isDark ? 'focus:bg-violet-500/20 focus:text-violet-200' : 'focus:bg-zinc-100'}>
                            <ClipboardCopy className="h-3 w-3 mr-2" />
                            Copy
                            <span className="ml-auto text-xs opacity-50">Ctrl+C</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePaste} disabled={!clipboard} className={isDark ? 'focus:bg-violet-500/20 focus:text-violet-200' : 'focus:bg-zinc-100'}>
                            <Clipboard className="h-3 w-3 mr-2" />
                            Paste
                            <span className="ml-auto text-xs text-muted-foreground">Ctrl+V</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Align to Page - inline buttons in two rows */}
                        {/* Align to Page - inline buttons in two rows */}
                        <div className="px-2 py-1.5">
                            <div className={`text-xs mb-1.5 ${isDark ? 'text-muted-foreground' : 'text-zinc-500'}`}>Align to page</div>
                            <div className="flex flex-col gap-1">
                                <div className="flex gap-1">
                                    {['left', 'center', 'right'].map(align => (
                                        <Button
                                            key={align}
                                            variant="ghost"
                                            size="sm"
                                            className={`h-7 w-7 p-0 ${isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                                            onClick={() => handleAlignToPage(align)}
                                            title={align.charAt(0).toUpperCase() + align.slice(1)}
                                        >
                                            {align === 'left' && <AlignLeft className="h-3.5 w-3.5" />}
                                            {align === 'center' && <AlignCenter className="h-3.5 w-3.5" />}
                                            {align === 'right' && <AlignRight className="h-3.5 w-3.5" />}
                                        </Button>
                                    ))}
                                </div>
                                <div className="flex gap-1">
                                    {['top', 'middle', 'bottom'].map(align => (
                                        <Button
                                            key={align}
                                            variant="ghost"
                                            size="sm"
                                            className={`h-7 w-7 p-0 ${isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900'}`}
                                            onClick={() => handleAlignToPage(align)}
                                            title={align.charAt(0).toUpperCase() + align.slice(1)}
                                        >
                                            {align === 'top' && <AlignVerticalJustifyStart className="h-3.5 w-3.5" />}
                                            {align === 'middle' && <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />}
                                            {align === 'bottom' && <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <DropdownMenuSeparator />

                        {/* Layer Controls */}
                        <DropdownMenuItem onClick={() => bringToFront?.(selectedElement.id)} className={isDark ? 'focus:bg-violet-500/20 focus:text-violet-200' : 'focus:bg-zinc-100'}>
                            <ChevronsUp className="h-3 w-3 mr-2" />
                            Bring to front
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => moveElementUp?.(selectedElement.id)} className={isDark ? 'focus:bg-violet-500/20 focus:text-violet-200' : 'focus:bg-zinc-100'}>
                            <ChevronUp className="h-3 w-3 mr-2" />
                            Bring forward
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => moveElementDown?.(selectedElement.id)} className={isDark ? 'focus:bg-violet-500/20 focus:text-violet-200' : 'focus:bg-zinc-100'}>
                            <ChevronDown className="h-3 w-3 mr-2" />
                            Send backward
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => sendToBack?.(selectedElement.id)} className={isDark ? 'focus:bg-violet-500/20 focus:text-violet-200' : 'focus:bg-zinc-100'}>
                            <ChevronsDown className="h-3 w-3 mr-2" />
                            Send to back
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </motion.div>
    );
};

export default FloatingToolbar;

