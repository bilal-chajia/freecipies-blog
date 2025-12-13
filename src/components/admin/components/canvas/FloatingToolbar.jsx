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
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import useEditorStore from '../../store/useEditorStore';

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

    // Calculate toolbar position based on selected element
    const calculatePosition = () => {
        if (!selectedElement || !containerRef?.current) return { x: 0, y: 0 };

        const container = containerRef.current.getBoundingClientRect();

        // Element position (canvas coordinates)
        const elX = selectedElement.x || 0;
        const elY = selectedElement.y || 0;
        const elWidth = selectedElement.width || 100;
        const elHeight = selectedElement.height || 100;

        // canvasOffset is in stage coordinate units (needs to be scaled)
        // The element position on screen = (canvasOffset + element position) * scale
        const screenX = (canvasOffset.x + elX + elWidth / 2) * canvasScale;

        // Toolbar dimensions (approximate)
        const toolbarWidth = 220;
        const toolbarHeight = 44;
        const gap = 16; // Gap between element and toolbar

        // Position ABOVE element, centered
        let x = screenX - toolbarWidth / 2;
        let y = (canvasOffset.y + elY) * canvasScale - toolbarHeight - gap;

        // Clamp to container bounds
        x = Math.max(8, Math.min(x, container.width - toolbarWidth - 8));

        // If too close to top, position below element
        if (y < 60) {
            y = (canvasOffset.y + elY + elHeight) * canvasScale + gap;
        }

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

    // Button style - purple icons matching selection border (#8b5cf6)
    const buttonClass = "h-8 w-8 p-0 hover:bg-violet-500/20 text-violet-400 hover:text-violet-300";

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
            <div className="flex items-center gap-0.5 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl px-2 py-1.5">
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
                            <RotateCw className="h-4 w-4" />
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
                                <Lock className="h-4 w-4 text-amber-500" />
                            ) : (
                                <Unlock className="h-4 w-4" />
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
                            <Copy className="h-4 w-4" />
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
                            <Trash2 className="h-4 w-4" />
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
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="right" align="start" sideOffset={8} className="w-48 bg-zinc-900/95 backdrop-blur-md border-white/10 text-violet-300">
                        <DropdownMenuItem onClick={handleCopy}>
                            <ClipboardCopy className="h-4 w-4 mr-2" />
                            Copy
                            <span className="ml-auto text-xs text-muted-foreground">Ctrl+C</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handlePaste} disabled={!clipboard}>
                            <Clipboard className="h-4 w-4 mr-2" />
                            Paste
                            <span className="ml-auto text-xs text-muted-foreground">Ctrl+V</span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Align to Page - inline buttons in two rows */}
                        <div className="px-2 py-1.5">
                            <div className="text-xs text-muted-foreground mb-1.5">Align to page</div>
                            <div className="flex flex-col gap-1">
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAlignToPage('left')} title="Left">
                                        <AlignLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAlignToPage('center')} title="Center horizontally">
                                        <AlignCenter className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAlignToPage('right')} title="Right">
                                        <AlignRight className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAlignToPage('top')} title="Top">
                                        <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAlignToPage('middle')} title="Center vertically">
                                        <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleAlignToPage('bottom')} title="Bottom">
                                        <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <DropdownMenuSeparator />

                        {/* Layer Controls */}
                        <DropdownMenuItem onClick={() => bringToFront?.(selectedElement.id)}>
                            <ChevronsUp className="h-4 w-4 mr-2" />
                            Bring to front
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => moveElementUp?.(selectedElement.id)}>
                            <ChevronUp className="h-4 w-4 mr-2" />
                            Bring forward
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => moveElementDown?.(selectedElement.id)}>
                            <ChevronDown className="h-4 w-4 mr-2" />
                            Send backward
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => sendToBack?.(selectedElement.id)}>
                            <ChevronsDown className="h-4 w-4 mr-2" />
                            Send to back
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </motion.div>
    );
};

export default FloatingToolbar;
