// @ts-nocheck
// NOTE: Types available - @ts-nocheck can be removed when all errors resolved
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Group, Line } from 'react-konva';
import { AnimatePresence } from 'motion/react';
import { useEditorStore } from '../../store';
import { useUIStore } from '../../store/useUIStore';
import type { TemplateElement } from '../../types';
import { GRID_SIZE, SNAP_THRESHOLD } from './utils/canvasConstants';
import { useKeyboardShortcuts, useSmartGuides, useImageLoader, getProxiedUrl } from './hooks';
import useCustomFontLoader from './hooks/useCustomFontLoader';
import FloatingToolbar from './FloatingToolbar';
import ElementRenderer from './elements/ElementRenderer';
import TransformerLayer from './layers/TransformerLayer';
import RotationControls from './layers/RotationControls';

// Default canvas dimensions (Pinterest 2:3 ratio)
const DEFAULT_CANVAS_WIDTH = 1000;
const DEFAULT_CANVAS_HEIGHT = 1500;

/**
 * PinCanvas - Professional Konva-based canvas for Pinterest pin design
 * Features: Transformer controls, zoom, grid, smart guides, premium UI
 * Supports custom canvas dimensions via template.width/height
 */
const PinCanvas = ({
    template = null,
    articleData = null,
    onExport = null,
    editable = true,
    scale = 0.4,
    onElementSelect = null,
    onTemplateChange = null,
    showGrid = false,
    zoom = 100,
    allowImageDrag = false,
    onImageOffsetChange = null,
    fitToCanvas = false,
    previewMode = false,
    canvasWidthOverride = null,
    canvasHeightOverride = null,
}) => {
    const stageRef = useRef(null);
    const transformerRef = useRef(null);
    const containerRef = useRef(null);

    // === DYNAMIC CANVAS DIMENSIONS ===
    // Derive canvas size from template (supports custom sizes)
    const canvasWidth = canvasWidthOverride || template?.width || template?.canvas_width || DEFAULT_CANVAS_WIDTH;
    const canvasHeight = canvasHeightOverride || template?.height || template?.canvas_height || DEFAULT_CANVAS_HEIGHT;

    // Use store for elements (not local state)
    const elements = useEditorStore(state => state.elements);
    const setElements = useEditorStore(state => state.setElements);

    // === IMAGE LOADER HOOK ===
    // Replaces ~80 lines of inline image preloading logic
    const { loadedImages, setImage: setLoadedImage } = useImageLoader({ elements, articleData });

    // === CUSTOM FONT LOADER ===
    useCustomFontLoader();

    // Container dimensions for responsive Stage
    const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
    const [isRotating, setIsRotating] = useState(false);
    const [hoveredRotationHandle, setHoveredRotationHandle] = useState(false);

    // Use store for selection state (enables multi-select)
    const selectedIds = useEditorStore(state => state.selectedIds);
    const selectElement = useEditorStore(state => state.selectElement);
    const toggleSelection = useEditorStore(state => state.toggleSelection);
    const addToSelection = useEditorStore(state => state.addToSelection);
    const updateElement = useEditorStore(state => state.updateElement);
    const saveHistory = useEditorStore(state => state.saveHistory);
    const deleteSelected = useEditorStore(state => state.deleteSelected);
    const duplicateSelected = useEditorStore(state => state.duplicateSelected);
    const undo = useEditorStore(state => state.undo);
    const redo = useEditorStore(state => state.redo);

    // Global Theme State
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    // Helper to check if element is selected
    const isSelected = (id) => selectedIds.has(id);
    // Get first selected for single-item scenarios
    const selectedId = selectedIds.size > 0 ? [...selectedIds][0] : null;

    // Text editing state (for on-canvas text editing)
    const [editingTextId, setEditingTextId] = useState(null);
    const [editingTextValue, setEditingTextValue] = useState('');
    const textareaRef = useRef(null);

    // Dragging/Transforming state - to hide floating toolbar
    const [isDragging, setIsDragging] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false);
    const dragHistorySavedRef = useRef(false);
    const transformHistorySavedRef = useRef(false);


    // Note: clipboard state is now managed by useKeyboardShortcuts hook
    // Note: guides state is now managed by useSmartGuides hook

    // Calculate actual scale based on zoom
    const actualScale = scale * (zoom / 100);

    // Track container size with ResizeObserver
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateSize = () => {
            setContainerSize({
                width: container.clientWidth,
                height: container.clientHeight
            });
        };

        // Initial size
        updateSize();

        // Watch for resize
        const resizeObserver = new ResizeObserver(updateSize);
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, []);

    // Elements are now managed by the store - no need to parse template here
    // The loadTemplateToStore action handles parsing elements_json

    // === TRANSFORMER CUSTOMIZATION ===
    // Custom styling for transformer handles (Canva-like pills and circles)
    useEffect(() => {
        if (transformerRef.current) {
            // Check if anchorStyleFunc is supported (Konva v9+)
            if (typeof transformerRef.current.anchorStyleFunc === 'function') {
                transformerRef.current.anchorStyleFunc((anchor) => {
                    const name = anchor.name();

                    // Reset standard styles
                    anchor.fill('#ffffff');
                    anchor.stroke('#8b5cf6');
                    anchor.strokeWidth(1);

                    // Specific shapes based on position
                    if (name.includes('middle')) {
                        // Side handles -> Vertical pills
                        anchor.cornerRadius(10);
                        anchor.width(6);
                        anchor.height(20);
                    } else if (name.includes('center')) {
                        // Top/Bottom handles -> Horizontal pills
                        anchor.cornerRadius(10);
                        anchor.width(20);
                        anchor.height(6);
                    } else {
                        // Corner handles -> Circles
                        anchor.cornerRadius(50);
                        anchor.width(10);
                        anchor.height(10);
                    }
                });
            }
        }
    }, [editable, selectedIds]);

    // Note: Image preloading is now handled by useImageLoader hook above

    // Update transformer when selection changes
    useEffect(() => {
        if (transformerRef.current && stageRef.current && editable) {
            const stage = stageRef.current;
            if (selectedIds.size > 0) {
                // Find all selected nodes, but EXCLUDE locked elements
                const selectedNodes = [...selectedIds]
                    .map(id => {
                        const element = elements.find(el => el.id === id);
                        // Skip locked elements - they shouldn't have transformer
                        if (element?.locked) return null;
                        return stage.findOne(`#${id}`);
                    })
                    .filter(node => node !== null && node !== undefined);

                if (selectedNodes.length > 0) {
                    // For single selection, check element type for keepRatio
                    if (selectedNodes.length === 1) {
                        const element = elements.find(el => el.id === [...selectedIds][0]);
                        if (element?.type === 'imageSlot') {
                            transformerRef.current.keepRatio(true);
                        } else {
                            transformerRef.current.keepRatio(false);
                        }
                    } else {
                        // For multiple selection, use uniform scaling
                        transformerRef.current.keepRatio(true);
                    }

                    transformerRef.current.nodes(selectedNodes);
                    transformerRef.current.getLayer()?.batchDraw();
                } else {
                    // All selected are locked, hide transformer
                    transformerRef.current.nodes([]);
                    transformerRef.current.getLayer()?.batchDraw();
                }
            } else {
                transformerRef.current.nodes([]);
                transformerRef.current.getLayer()?.batchDraw();
            }
        }
    }, [selectedIds, elements, editable]);

    // Handle element selection (with Shift support for multi-select)
    const handleSelect = (id, e) => {
        if (e) e.cancelBubble = true;

        // Check if element is locked - locked elements cannot be selected
        const element = elements.find(el => el.id === id);
        if (element?.locked) return;

        // Check if Shift key is held for multi-select
        const shiftPressed = e?.evt?.shiftKey || e?.shiftKey || window.event?.shiftKey || false;

        if (shiftPressed) {
            // Toggle selection (add if not selected, remove if selected)
            toggleSelection(id);
        } else {
            // Normal click: replace selection with this element
            selectElement(id);
            // Notify parent (for compatibility) - ONLY for single select!
            onElementSelect?.(element);
        }
    };

    // === TEXT EDITING HANDLERS ===

    // Start editing text on double-click
    const handleTextDoubleClick = (element, e) => {
        if (!editable) return;
        if (element?.locked) return; // Locked elements cannot be edited
        if (e) e.cancelBubble = true;

        setEditingTextId(element.id);
        setEditingTextValue(element.content || '');
        selectElement(element.id);
    };

    // Save text edit and exit edit mode
    const handleTextEditSave = () => {
        if (editingTextId && editingTextValue !== null) {
            saveHistory();
            handleElementChange(editingTextId, { content: editingTextValue });
        }
        setEditingTextId(null);
        setEditingTextValue('');
    };

    // Cancel text edit
    const handleTextEditCancel = () => {
        setEditingTextId(null);
        setEditingTextValue('');
    };

    // Focus textarea when editing starts
    useEffect(() => {
        if (editingTextId && textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
        }
    }, [editingTextId]);

    // Handle element updates (drag, resize, rotate)
    // MUST be defined before hooks that use it
    const handleElementChange = (id, newProps) => {
        // Use the store's updateElement action directly
        updateElement(id, newProps);
        // Also notify parent if callback provided
        if (onTemplateChange) {
            const updated = elements.map(el =>
                el.id === id ? { ...el, ...newProps } : el
            );
            onTemplateChange(updated);
        }
    };

    // === KEYBOARD SHORTCUTS HOOK ===
    // Replaces ~95 lines of inline keyboard handling
    useKeyboardShortcuts({
        editable,
        editingTextId,
        selectedIds,
        elements,
        deleteSelected,
        duplicateSelected,
        undo,
        redo,
        addToSelection,
        setElements,
        updateElement: handleElementChange,
        onTemplateChange,
        saveHistory,
    });



    // Handle transform start
    const handleTransformStart = () => {
        if (!transformHistorySavedRef.current) {
            saveHistory();
            transformHistorySavedRef.current = true;
        }
        setIsTransforming(true);
    };

    // Handle transform end (resize/rotate)
    const handleTransformEnd = (id, e) => {
        setIsTransforming(false);
        transformHistorySavedRef.current = false;
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale
        node.scaleX(1);
        node.scaleY(1);

        // Find the element to check its type
        const element = elements.find(el => el.id === id);

        if (element?.type === 'text') {
            // For text elements: fontSize and width are already updated in handleTextTransform
            // Just save position and rotation
            handleElementChange(id, {
                x: node.x(),
                y: node.y(),
                rotation: node.rotation(),
            });
        } else {
            // For other elements: apply scale to width/height
            handleElementChange(id, {
                x: node.x(),
                y: node.y(),
                width: Math.max(20, node.width() * scaleX),
                height: Math.max(20, node.height() * scaleY),
                rotation: node.rotation(),
            });
        }
    };

    const handleDragStart = () => {
        if (!dragHistorySavedRef.current) {
            saveHistory();
            dragHistorySavedRef.current = true;
        }
        setIsDragging(true);
    };

    // Handle TEXT transform start - store original fontSize for proportional scaling
    const handleTextTransformStart = (e, element) => {
        const node = e.target;
        // Store original fontSize as a custom attribute on the node
        node.setAttr('_originalFontSize', element.fontSize || 32);
        node.setAttr('_originalWidth', element.width || 300);
    };

    // Handle TEXT transform (real-time) - per Konva documentation
    // Scales fontSize proportionally and resets scale
    const handleTextTransform = (id, e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Get the original fontSize stored at transform start
        const originalFontSize = node.getAttr('_originalFontSize') || 32;
        const originalWidth = node.getAttr('_originalWidth') || 300;

        // Calculate new fontSize based on average scale
        const avgScale = (scaleX + scaleY) / 2;
        const newFontSize = Math.max(10, Math.round(originalFontSize * avgScale));
        const newWidth = Math.max(50, Math.round(originalWidth * scaleX));

        // Update the element state with new fontSize and width
        handleElementChange(id, {
            fontSize: newFontSize,
            width: newWidth,
        });

        // Reset scale immediately
        node.setAttrs({
            scaleX: 1,
            scaleY: 1,
        });
    };

    // === SMART GUIDES HOOK ===
    // Replaces ~100 lines of inline smart guide logic
    const {
        guides,
        handleDragMove,
        handleDragEnd: smartGuideDragEnd,
        handleTransformMove,
        clearGuides,
        snapToGrid
    } = useSmartGuides({
        showGrid,
        canvasWidth,
        canvasHeight,
        onElementChange: handleElementChange
    });

    // Wrapper for handleDragEnd to match expected signature and clear dragging state
    const handleDragEnd = (id, e) => {
        setIsDragging(false);
        dragHistorySavedRef.current = false;
        smartGuideDragEnd(id, e);
    };

    // Wrapper for handleDragMove to set dragging state
    const wrappedHandleDragMove = (e) => {
        setIsDragging(true);
        handleDragMove(e);
    };

    // Replace variable placeholders with article data
    const replaceVariables = (text) => {
        if (!text || !articleData) return text;
        return text
            .replace(/\{\{title\}\}/g, articleData.label || articleData.title || '')
            .replace(/\{\{category\}\}/g, articleData.categoryLabel || '')
            .replace(/\{\{author\}\}/g, articleData.authorName || '')
            .replace(/\{\{prepTime\}\}/g, articleData.prepTime || '')
            .replace(/\{\{cookTime\}\}/g, articleData.cookTime || '');
    };

    // Export canvas to image blob
    const exportToImage = useCallback(async (format = 'png', quality = 1) => {
        if (!stageRef.current) return null;

        // Temporarily hide transformer and guides for export
        if (transformerRef.current) {
            transformerRef.current.nodes([]);
        }
        clearGuides();

        // Calculate canvas position on stage
        const container = containerRef.current;
        const containerWidth = container?.clientWidth || 800;
        const containerHeight = container?.clientHeight || 600;
        const handlePadding = 100;
        const stageW = Math.max(containerWidth, (canvasWidth + handlePadding * 2) * actualScale);
        const stageH = Math.max(containerHeight, (canvasHeight + handlePadding * 2) * actualScale);
        const offsetX = (stageW / actualScale - canvasWidth) / 2;
        const offsetY = (stageH / actualScale - canvasHeight) / 2;

        // Export ONLY the canvas area (not the entire stage with padding)
        // Use x, y, width, height to crop to the actual canvas content
        const dataUrl = stageRef.current.toDataURL({
            x: offsetX * actualScale,
            y: offsetY * actualScale,
            width: canvasWidth * actualScale,
            height: canvasHeight * actualScale,
            pixelRatio: 1 / actualScale,
            mimeType: format === 'webp' ? 'image/webp' : (format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png'),
            quality: quality,
        });

        // Restore transformer
        if (selectedId && transformerRef.current) {
            const selectedNode = stageRef.current.findOne(`#${selectedId}`);
            if (selectedNode) {
                transformerRef.current.nodes([selectedNode]);
            }
        }

        // Convert data URL to Blob (CSP-safe - no fetch needed)
        const base64 = dataUrl.split(',')[1];
        const mimeType = dataUrl.match(/data:(.*?);/)?.[1] || 'image/png';
        const byteString = atob(base64);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeType });
        return blob;
    }, [actualScale, selectedId, clearGuides]);

    // Expose export function
    useEffect(() => {
        if (onExport) {
            onExport(exportToImage);
        }
    }, [exportToImage, onExport]);

    const gridLines = useMemo(() => {
        if (!showGrid) return null;

        // Dynamic grid size: divide canvas into 20 columns
        const gridSize = canvasWidth / 20;
        const lines = [];

        // Vertical lines
        for (let i = 0; i <= 20; i++) {
            lines.push(
                <Line
                    key={`v${i}`}
                    points={[i * gridSize, 0, i * gridSize, canvasHeight]}
                    stroke={isDark ? "rgba(38, 0, 255, 0.97)" : "rgba(38, 0, 255, 0.97)"}
                    strokeWidth={1}
                    dash={[1, 8]}
                    listening={false}
                />
            );
        }
        // Horizontal lines - same spacing as vertical for uniform squares
        const numHorizontal = Math.ceil(canvasHeight / gridSize);
        for (let i = 0; i <= numHorizontal; i++) {
            lines.push(
                <Line
                    key={`h${i}`}
                    points={[0, i * gridSize, canvasWidth, i * gridSize]}
                    stroke={isDark ? "rgba(38, 0, 255, 0.97)" : "rgba(38, 0, 255, 0.97)"}
                    strokeWidth={1}
                    dash={[1, 8]}
                    listening={false}
                />
            );
        }
        return lines;
    }, [showGrid, canvasWidth, canvasHeight, isDark]);

    const smartGuideLines = useMemo(() => {
        // Vibrant magenta/pink for guides (distinct from cyan selection)
        const guideColor = '#5900ffff';
        const glowColor = '#5900ffff';

        return guides.flatMap((guide, i) => {
            if (guide.orientation === 'V') {
                return [
                    // Glow layer (thicker, semi-transparent)
                    <Line
                        key={`guide-v-glow-${i}`}
                        points={[guide.lineGuide, 0, guide.lineGuide, canvasHeight]}
                        stroke={glowColor}
                        strokeWidth={3}
                        opacity={0.7}
                        listening={false}
                    />,
                    // Main line (solid, crisp)
                    <Line
                        key={`guide-v-${i}`}
                        points={[guide.lineGuide, 0, guide.lineGuide, canvasHeight]}
                        stroke={guideColor}
                        strokeWidth={3}
                        listening={false}
                    />,
                ];
            }
            return [
                // Glow layer
                <Line
                    key={`guide-h-glow-${i}`}
                    points={[0, guide.lineGuide, canvasWidth, guide.lineGuide]}
                    stroke={glowColor}
                    strokeWidth={4}
                    opacity={0.3}
                    listening={false}
                />,
                // Main line
                <Line
                    key={`guide-h-${i}`}
                    points={[0, guide.lineGuide, canvasWidth, guide.lineGuide]}
                    stroke={guideColor}
                    strokeWidth={1}
                    listening={false}
                />,
            ];
        });
    }, [guides, canvasWidth, canvasHeight]);

    // Render element based on type
    // Stage must be large enough to show transformer handles outside canvas
    // Minimum: canvas + 200px padding on all sides, or container size (whichever is larger)
    const shouldFitCanvas = fitToCanvas || previewMode;
    const handlePadding = shouldFitCanvas ? 0 : 100; // 100px on each side for handles
    const stageWidth = shouldFitCanvas
        ? canvasWidth * actualScale
        : Math.max(containerSize.width, (canvasWidth + handlePadding * 2) * actualScale);
    const stageHeight = shouldFitCanvas
        ? canvasHeight * actualScale
        : Math.max(containerSize.height, (canvasHeight + handlePadding * 2) * actualScale);

    // Center the canvas within the Stage
    const canvasOffsetX = shouldFitCanvas ? 0 : (stageWidth / actualScale - canvasWidth) / 2;
    const canvasOffsetY = shouldFitCanvas ? 0 : (stageHeight / actualScale - canvasHeight) / 2;

    // Render the canvas
    return (
        <div
            ref={containerRef}
            className="pin-canvas-wrapper"
            style={{
                width: '100%',
                height: '100%',
                overflow: previewMode ? 'hidden' : 'auto',
                position: 'relative',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                backgroundColor: previewMode ? 'transparent' : (isDark ? '#1a1a2e' : '#edeff2'),
                transition: 'background-color 0.3s ease'
            }}
        >
            <style>{`
                .pin-canvas-wrapper::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
            <Stage
                ref={stageRef}
                width={stageWidth}
                height={stageHeight}
                scaleX={actualScale}
                scaleY={actualScale}
                onClick={(e) => {
                    // Deselect when clicking empty area (not on canvas content)
                    if (e.target === e.target.getStage()) {
                        selectElement(null);
                        onElementSelect?.(null);
                    }
                }}
            >

                <Layer x={canvasOffsetX} y={canvasOffsetY}>
                    {/* Clipped Group - elements stay within canvas bounds */}
                    <Group
                        clipFunc={(ctx) => {
                            ctx.rect(0, 0, canvasWidth, canvasHeight);
                        }}
                    >
                        {/* Background */}
                        <Rect
                            x={0}
                            y={0}
                            width={canvasWidth}
                            height={canvasHeight}
                            fill={template?.background_color || (isDark ? '#1a1a2e' : '#ffffff')}
                            shadowColor={previewMode ? 'transparent' : 'rgba(0,0,0,0.15)'}
                            shadowBlur={previewMode ? 0 : 20}
                            shadowOffset={previewMode ? { x: 0, y: 0 } : { x: 0, y: 4 }}
                        />

                        {/* Render all elements (clipped to canvas) */}
                        {elements.map(element => (
                            <ElementRenderer
                                key={element.id}
                                element={element}
                                isSelected={isSelected(element.id)}
                                isLocked={element.locked}
                                editable={editable}
                                loadedImage={loadedImages[element.id] || (articleData?.image && loadedImages['article_main'])}
                                logoImage={loadedImages[`logo_${element.id}`]}
                                articleData={articleData}
                                replaceVariables={replaceVariables}
                                onSelect={handleSelect}
                                onDragStart={handleDragStart}
                                onDragMove={wrappedHandleDragMove}
                                onDragEnd={handleDragEnd}
                                onTransformStart={handleTransformStart}
                                onTransformEnd={handleTransformEnd}
                                onElementChange={handleElementChange}
                                onImageOffsetChange={onImageOffsetChange}
                                onTextDoubleClick={handleTextDoubleClick}
                                allowImageDrag={allowImageDrag}
                                selectedId={selectedId}
                                canvasWidth={canvasWidth}
                                canvasHeight={canvasHeight}
                            />
                        ))}

                        {/* Grid overlay - rendered ON TOP of elements */}
                        {gridLines}
                    </Group>
                </Layer>

                {/* Separate unclipped layer for Transformer - visible outside canvas */}
                <Layer x={canvasOffsetX} y={canvasOffsetY}>
                    <TransformerLayer
                        transformerRef={transformerRef}
                        onTransformStart={handleTransformStart}
                        onTransform={handleTransformMove}
                        onTransformEnd={() => {
                            setIsTransforming(false);
                            transformHistorySavedRef.current = false;
                            clearGuides();
                        }}
                        enabled={editable}
                    />
                </Layer>

                {/* Smart Guides Layer - ABOVE Transformer for visibility */}
                <Layer x={canvasOffsetX} y={canvasOffsetY}>
                    {smartGuideLines}
                </Layer>

                {/* Custom Rotation Handle Layer - same coordinate system as Transformer */}
                <Layer x={canvasOffsetX} y={canvasOffsetY}>
                    {editable && selectedIds.size === 1 && !editingTextId && !isDragging && !isTransforming && (() => {
                        const selectedElement = elements.find(el => el.id === [...selectedIds][0]);
                        if (!selectedElement) return null;

                        return (
                            <RotationControls
                                selectedElement={selectedElement}
                                actualScale={actualScale}
                                canvasOffset={{ x: canvasOffsetX, y: canvasOffsetY }}
                                isRotating={isRotating}
                                setIsRotating={setIsRotating}
                                onElementChange={handleElementChange}
                            />
                        );
                    })()}
                </Layer>
            </Stage>

            {/* Floating Toolbar - Canva-style context actions */}
            <AnimatePresence>
                {editable && selectedIds.size === 1 && !editingTextId && !isDragging && !isTransforming && !isRotating && (() => {
                    const selectedElement = elements.find(el => el.id === [...selectedIds][0]);
                    if (!selectedElement) return null;
                    return (
                        <FloatingToolbar
                            key="floating-toolbar"
                            selectedElement={selectedElement}
                            canvasScale={actualScale}
                            canvasOffset={{ x: canvasOffsetX, y: canvasOffsetY }}
                            containerRef={containerRef}
                            stageRef={stageRef}
                            onElementChange={handleElementChange}
                        />
                    );
                })()}
            </AnimatePresence>

            {/* Text Editing Overlay */}
            {editingTextId && (() => {
                const editingElement = elements.find(el => el.id === editingTextId);
                if (!editingElement) return null;

                return (
                    <textarea
                        ref={textareaRef}
                        value={editingTextValue}
                        onChange={(e) => setEditingTextValue(e.target.value)}
                        onBlur={handleTextEditSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                handleTextEditCancel();
                            }
                            // Enter without Shift saves (Shift+Enter for new line)
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleTextEditSave();
                            }
                        }}
                        style={{
                            position: 'absolute',
                            left: (editingElement.x + canvasOffsetX) * actualScale,
                            top: (editingElement.y + canvasOffsetY) * actualScale,
                            width: (editingElement.width || 300) * actualScale,
                            minHeight: 40,
                            maxHeight: 'none',
                            height: 'auto',
                            padding: '8px',
                            fontSize: (editingElement.fontSize || 32) * actualScale,
                            fontFamily: editingElement.fontFamily || 'Inter, sans-serif',
                            fontWeight: editingElement.fontWeight || 'normal',
                            fontStyle: editingElement.fontStyle || 'normal',
                            textAlign: editingElement.textAlign || 'center',
                            color: editingElement.color || '#ffffff',
                            background: 'rgba(20, 20, 40, 0.95)',
                            border: '2px solid #6366f1',
                            borderRadius: '4px',
                            outline: 'none',
                            resize: 'vertical', // Allow vertical resize
                            zIndex: 1000,
                            lineHeight: editingElement.lineHeight || 1.4,
                            letterSpacing: editingElement.letterSpacing || 0,
                            overflow: 'visible',
                            boxSizing: 'border-box',
                        }}
                    />
                );
            })()}
        </div>
    );
};

// Export both the component and utility constants
export { PinCanvas, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, GRID_SIZE };
export default PinCanvas;

