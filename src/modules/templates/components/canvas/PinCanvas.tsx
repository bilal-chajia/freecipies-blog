// @ts-nocheck
import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Transformer, Line, Circle, Path } from 'react-konva';
import { AnimatePresence } from 'motion/react';
import { useEditorStore } from '../../store';
import { useUIStore } from '../../store/useUIStore';
import { GRID_SIZE, SNAP_THRESHOLD } from './utils/canvasConstants';
import { useKeyboardShortcuts, useSmartGuides, useImageLoader, getProxiedUrl } from './hooks';
import useCustomFontLoader from './hooks/useCustomFontLoader';
import { resolveBinding } from '../../utils/dataBinding';
import FloatingToolbar from './FloatingToolbar';

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
}) => {
    const stageRef = useRef(null);
    const transformerRef = useRef(null);
    const containerRef = useRef(null);

    // === DYNAMIC CANVAS DIMENSIONS ===
    // Derive canvas size from template (supports custom sizes)
    const canvasWidth = template?.width || template?.canvas_width || DEFAULT_CANVAS_WIDTH;
    const canvasHeight = template?.height || template?.canvas_height || DEFAULT_CANVAS_HEIGHT;

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
            // Update via store
            updateElement(editingTextId, { content: editingTextValue });
            // Also update local state for immediate feedback
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
    });



    // Handle transform start
    const handleTransformStart = () => {
        setIsTransforming(true);
    };

    // Handle transform end (resize/rotate)
    const handleTransformEnd = (id, e) => {
        setIsTransforming(false);
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
        smartGuideDragEnd(id, e);
    };

    // Wrapper for handleDragMove to set dragging state
    const wrappedHandleDragMove = (e) => {
        setIsDragging(true);
        handleDragMove(e);
    };

    // Replace variable placeholders with article data (legacy support for {{...}} syntax)
    const replaceVariables = (text) => {
        if (!text || !articleData) return text;
        return text
            .replace(/\{\{title\}\}/g, articleData.label || articleData.title || '')
            .replace(/\{\{category\}\}/g, articleData.categoryLabel || '')
            .replace(/\{\{author\}\}/g, articleData.authorName || '')
            .replace(/\{\{prepTime\}\}/g, articleData.prepTime || '')
            .replace(/\{\{cookTime\}\}/g, articleData.cookTime || '');
    };

    // Get text content using binding (new system) or replaceVariables (legacy)
    const getTextContent = (element) => {
        // If element has binding, use new dot notation system
        if (element.binding && articleData) {
            return resolveBinding(element.binding, articleData, element.content || '');
        }
        // Fallback to legacy {{...}} replacement
        return replaceVariables(element.content);
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

        // Convert data URL to blob (CSP-safe, without fetch)
        const base64Data = dataUrl.split(',')[1];
        const mimeType = dataUrl.split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        return blob;
    }, [actualScale, selectedId, clearGuides]);

    // Expose export function
    useEffect(() => {
        if (onExport) {
            onExport(exportToImage);
        }
    }, [exportToImage, onExport]);

    // Render grid lines
    const renderGrid = () => {
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
    };

    // Render Smart Guides - Modern Canva Pro style
    const renderSmartGuides = () => {
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
            } else {
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
            }
        });
    };

    // Render element based on type
    const renderElement = (element) => {
        const isLocked = element.locked;
        const commonProps = {
            id: element.id,
            draggable: editable && !isLocked,
            onClick: isLocked ? undefined : (e) => handleSelect(element.id, e),
            onTap: isLocked ? undefined : (e) => handleSelect(element.id, e),
            onDragMove: isLocked ? undefined : wrappedHandleDragMove,
            onDragEnd: isLocked ? undefined : (e) => handleDragEnd(element.id, e),
            onTransformStart: isLocked ? undefined : handleTransformStart,
            onTransformEnd: isLocked ? undefined : (e) => handleTransformEnd(element.id, e),
        };

        switch (element.type) {
            case 'imageSlot':
                return renderImageSlot(element, commonProps);
            case 'text':
                return renderText(element, commonProps);
            case 'shape':
                return renderShape(element, commonProps);
            case 'logo':
                return renderLogo(element, commonProps);
            case 'overlay':
                return renderOverlay(element, commonProps);
            default:
                return null;
        }
    };

    // Render image slot
    const renderImageSlot = (element, commonProps) => {
        // Use specific image or fallback to article main image
        const image = loadedImages[element.id] || (articleData?.image && loadedImages['article_main']);

        // Calculate cover scaling (like CSS object-fit: cover)
        let imageScale = 1;
        let baseOffsetX = 0;
        let baseOffsetY = 0;
        let scaledWidth = element.width;
        let scaledHeight = element.height;

        if (image) {
            const imgWidth = image.naturalWidth || image.width;
            const imgHeight = image.naturalHeight || image.height;
            const slotRatio = element.width / element.height;
            const imgRatio = imgWidth / imgHeight;

            if (imgRatio > slotRatio) {
                // Image is wider than slot - scale by height, crop width
                imageScale = element.height / imgHeight;
                scaledWidth = imgWidth * imageScale;
                scaledHeight = element.height;
                baseOffsetX = (element.width - scaledWidth) / 2;
            } else {
                // Image is taller than slot - scale by width, crop height
                imageScale = element.width / imgWidth;
                scaledWidth = element.width;
                scaledHeight = imgHeight * imageScale;
                baseOffsetY = (element.height - scaledHeight) / 2;
            }
        }

        // Apply Zoom scaling
        const zoomScale = articleData?.imageScales?.[element.id] || 1;
        const finalWidth = scaledWidth * zoomScale;
        const finalHeight = scaledHeight * zoomScale;

        // Adjust base offset to center the zoomed image
        const zoomOffsetX = (finalWidth - scaledWidth) / 2;
        const zoomOffsetY = (finalHeight - scaledHeight) / 2;

        const adjustedBaseOffsetX = baseOffsetX - zoomOffsetX;
        const adjustedBaseOffsetY = baseOffsetY - zoomOffsetY;

        // Apply custom offset if available
        const customOffset = articleData?.imageOffsets?.[element.id] || { x: 0, y: 0 };
        const imageOffsetX = adjustedBaseOffsetX + customOffset.x;
        const imageOffsetY = adjustedBaseOffsetY + customOffset.y;

        // DIFFERENT RENDER PATHS:
        // When allowImageDrag is true (Pin Creator), render image directly without Group
        // When false (Template Editor), use Group for proper transformer integration

        // DISABLED: Divergent path caused issues. Using unified path below.
        if (false && allowImageDrag && image) {
            // PIN CREATOR MODE: Render draggable image with its own clipFunc
            // No Group wrapper = no event bubbling issues
            const imageX = element.x + baseOffsetX + customOffset.x;
            const imageY = element.y + baseOffsetY + customOffset.y;

            return (
                <KonvaImage
                    key={element.id}
                    id={element.id}
                    image={image}
                    x={imageX}
                    y={imageY}
                    width={scaledWidth}
                    height={scaledHeight}
                    draggable={true}
                    clipFunc={(ctx) => {
                        // Calculate clip region relative to image position
                        const clipX = element.x - imageX;
                        const clipY = element.y - imageY;
                        const radius = element.borderRadius || 0;

                        if (radius > 0) {
                            ctx.beginPath();
                            ctx.moveTo(clipX + radius, clipY);
                            ctx.lineTo(clipX + element.width - radius, clipY);
                            ctx.quadraticCurveTo(clipX + element.width, clipY, clipX + element.width, clipY + radius);
                            ctx.lineTo(clipX + element.width, clipY + element.height - radius);
                            ctx.quadraticCurveTo(clipX + element.width, clipY + element.height, clipX + element.width - radius, clipY + element.height);
                            ctx.lineTo(clipX + radius, clipY + element.height);
                            ctx.quadraticCurveTo(clipX, clipY + element.height, clipX, clipY + element.height - radius);
                            ctx.lineTo(clipX, clipY + radius);
                            ctx.quadraticCurveTo(clipX, clipY, clipX + radius, clipY);
                            ctx.closePath();
                        } else {
                            ctx.rect(clipX, clipY, element.width, element.height);
                        }
                    }}
                    onDragEnd={(e) => {
                        if (onImageOffsetChange) {
                            // Calculate the new custom offset
                            const newX = e.target.x() - element.x - baseOffsetX;
                            const newY = e.target.y() - element.y - baseOffsetY;
                            onImageOffsetChange(element.id, { x: newX, y: newY });
                        }
                    }}
                />
            );
        }



        // Unified render path: Group acts as static frame, Image moves inside
        // In Pin Creator (allowImageDrag), Group is NOT draggable
        const groupDraggable = allowImageDrag ? false : commonProps.draggable;
        const groupHandlers = allowImageDrag ? {} : {
            onDragStart: commonProps.onDragStart,
            onDragMove: commonProps.onDragMove,
            onDragEnd: commonProps.onDragEnd,
            onTransformStart: commonProps.onTransformStart,
            onTransformEnd: (e) => handleTransformEnd(element.id, e),
            onClick: (e) => handleSelect(element.id, e),
            onTap: (e) => handleSelect(element.id, e),
        };

        return (
            <Group
                key={element.id}
                id={element.id}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                rotation={element.rotation}
                draggable={groupDraggable}
                {...groupHandlers}

                clipFunc={(ctx) => {
                    // Clip to slot dimensions with optional border radius
                    const radius = element.borderRadius || 0;
                    if (radius > 0) {
                        ctx.beginPath();
                        ctx.moveTo(radius, 0);
                        ctx.lineTo(element.width - radius, 0);
                        ctx.quadraticCurveTo(element.width, 0, element.width, radius);
                        ctx.lineTo(element.width, element.height - radius);
                        ctx.quadraticCurveTo(element.width, element.height, element.width - radius, element.height);
                        ctx.lineTo(radius, element.height);
                        ctx.quadraticCurveTo(0, element.height, 0, element.height - radius);
                        ctx.lineTo(0, radius);
                        ctx.quadraticCurveTo(0, 0, radius, 0);
                        ctx.closePath();
                    } else {
                        ctx.rect(0, 0, element.width, element.height);
                    }
                }}
            >
                {/* Image or placeholder */}
                {image ? (
                    <KonvaImage
                        image={image}
                        x={imageOffsetX}
                        y={imageOffsetY}
                        width={finalWidth}
                        height={finalHeight}
                        draggable={allowImageDrag}
                        dragBoundFunc={function (pos) {
                            // Important: Use regular function to access 'this' (the Konva node)
                            // Transform absolute position to local position relative to parent Group
                            // This handles rotation, scaling, and stage zoom automatically
                            const node = this;
                            const transform = node.getParent().getAbsoluteTransform().copy();
                            transform.invert();
                            const localPos = transform.point(pos);

                            // Calculate constraints (ensure image always covers the slot)
                            // x must be <= 0 (left edge not past slot start)
                            // x must be >= element.width - scaledWidth (right edge not past slot end)
                            const minX = element.width - finalWidth;
                            const maxX = 0;

                            // y must be <= 0
                            // y must be >= element.height - scaledHeight
                            const minY = element.height - finalHeight;
                            const maxY = 0;

                            // Clamp values
                            const x = Math.max(minX, Math.min(localPos.x, maxX));
                            const y = Math.max(minY, Math.min(localPos.y, maxY));

                            // Transform back to absolute position
                            // Note: We must get the transform again (non-inverted)
                            return node.getParent().getAbsoluteTransform().point({ x, y });
                        }}
                        onDragStart={(e) => {
                            if (allowImageDrag) {
                                e.cancelBubble = true;
                            }
                        }}
                        onDragMove={(e) => {
                            if (allowImageDrag) {
                                e.cancelBubble = true;
                            }
                        }}
                        onDragEnd={(e) => {
                            if (allowImageDrag) {
                                e.cancelBubble = true;
                                if (onImageOffsetChange) {
                                    // Calculate the new custom offset relative to base position
                                    const newX = e.target.x() - adjustedBaseOffsetX;
                                    const newY = e.target.y() - adjustedBaseOffsetY;
                                    onImageOffsetChange(element.id, { x: newX, y: newY });
                                }
                            }
                        }}
                    />
                ) : (
                    <>
                        <Rect
                            width={element.width}
                            height={element.height}
                            fill="#2a2a3e"
                            cornerRadius={element.borderRadius || 0}
                            stroke={selectedId === element.id ? '#8b5cf6' : '#4a4a5e'}
                            strokeWidth={1}
                        />
                        {/* Placeholder icon */}
                        <Text
                            text="📷"
                            width={element.width}
                            height={element.height}
                            fontSize={48}
                            align="center"
                            verticalAlign="middle"
                        />
                        <Text
                            text={element.name || 'Drop Image'}
                            y={element.height / 2 + 30}
                            width={element.width}
                            fontSize={16}
                            fill="#8b8ba7"
                            align="center"
                        />
                    </>
                )}
            </Group>
        );
    };

    // Render text element
    const renderText = (element, commonProps) => {
        let displayText = getTextContent(element);

        // Apply text transform
        if (element.textTransform === 'uppercase') {
            displayText = displayText?.toUpperCase();
        } else if (element.textTransform === 'lowercase') {
            displayText = displayText?.toLowerCase();
        } else if (element.textTransform === 'capitalize') {
            displayText = displayText?.replace(/\b\w/g, l => l.toUpperCase());
        }

        const baseFontSize = element.fontSize || 32;
        const lineHeight = element.lineHeight || 1.2;
        const width = element.width || 300;
        const height = element.height || 100;

        // Auto-fit: Calculate optimal font size to fit text within zone
        // This activates when content contains variables (like {{title}}) or autoFit is enabled
        const hasVariables = element.content?.includes('{{');
        const shouldAutoFit = element.autoFit !== false && (hasVariables || element.autoFit === true);

        let fontSize = baseFontSize;

        if (shouldAutoFit && displayText) {
            // Binary search for optimal font size
            let minSize = 10;
            let maxSize = baseFontSize;

            while (maxSize - minSize > 1) {
                const testSize = Math.floor((minSize + maxSize) / 2);

                // Create a test text node to measure
                const testText = new window.Konva.Text({
                    text: displayText,
                    width: width,
                    fontSize: testSize,
                    fontFamily: element.fontFamily || 'Inter, sans-serif',
                    fontStyle: `${element.fontStyle === 'italic' ? 'italic ' : ''}${element.fontWeight === 'bold' ? 'bold' : ''}`.trim() || 'normal',
                    lineHeight: lineHeight,
                    wrap: 'word',
                });

                const textHeight = testText.height();
                testText.destroy();

                if (textHeight <= height) {
                    // Text fits, try larger
                    minSize = testSize;
                } else {
                    // Text too tall, try smaller
                    maxSize = testSize;
                }
            }

            fontSize = minSize;
        }

        const isLocked = element.locked;

        // Get effect settings
        const effect = element.effect || { type: 'none' };

        // Calculate effect-based properties
        let effectProps = {};

        if (effect.type === 'shadow') {
            const offsetVal = effect.offset || 50;
            const dir = (effect.direction || 45) * Math.PI / 180;
            effectProps = {
                shadowColor: effect.color || 'rgba(0,0,0,0.5)',
                shadowBlur: (effect.blur || 50) / 10,
                shadowOffsetX: offsetVal * 0.1 * Math.cos(dir),
                shadowOffsetY: offsetVal * 0.1 * Math.sin(dir),
                shadowOpacity: 1 - ((effect.transparency || 40) / 100),
            };
        } else if (effect.type === 'lift') {
            effectProps = {
                shadowColor: 'rgba(0,0,0,0.4)',
                shadowBlur: (effect.blur || 50) / 5,
                shadowOffsetX: 0,
                shadowOffsetY: 15,
                shadowOpacity: 0.5,
            };
        } else if (effect.type === 'hollow') {
            effectProps = {
                stroke: element.color || '#000000',
                strokeWidth: (effect.thickness || 50) / 25,
                fillEnabled: false,
            };
        } else if (effect.type === 'outline') {
            effectProps = {
                stroke: effect.color || '#000000',
                strokeWidth: (effect.thickness || 50) / 15,
            };
        } else if (effect.type === 'echo') {
            // Echo requires multiple layers - simplified as shadow here
            const offsetVal = (effect.offset || 50) / 10;
            effectProps = {
                shadowColor: effect.color || '#000000',
                shadowBlur: 0,
                shadowOffsetX: -offsetVal,
                shadowOffsetY: 0,
                shadowOpacity: 0.5,
            };
        } else if (effect.type === 'glitch') {
            // Glitch simplified - purple shadow offset
            const offsetVal = (effect.offset || 50) / 20;
            effectProps = {
                shadowColor: '#ff00ff',
                shadowBlur: 0,
                shadowOffsetX: offsetVal,
                shadowOffsetY: -offsetVal,
                shadowOpacity: 0.7,
            };
        } else if (effect.type === 'neon') {
            effectProps = {
                shadowColor: effect.color || '#ff00ff',
                shadowBlur: (effect.blur || 50) / 2,
                shadowOffsetX: 0,
                shadowOffsetY: 0,
                shadowOpacity: 1,
            };
        } else if (effect.type === 'splice') {
            const offsetVal = (effect.offset || 50) / 10;
            effectProps = {
                stroke: element.color || '#000000',
                strokeWidth: (effect.thickness || 50) / 25,
                fillEnabled: false,
                shadowColor: effect.color || '#cccccc',
                shadowBlur: 0,
                shadowOffsetX: offsetVal,
                shadowOffsetY: offsetVal,
                shadowOpacity: 1,
            };
        }

        // Render Text directly - zone is resizable, uses auto-fit or stored fontSize
        return (
            <Text
                key={element.id}
                {...commonProps}
                x={element.x}
                y={element.y}
                text={displayText || 'Text'}
                width={width}
                height={height}
                fontSize={fontSize}
                fontFamily={element.fontFamily || 'Inter, sans-serif'}
                fontStyle={(() => {
                    const italic = element.fontStyle === 'italic' ? 'italic' : '';
                    // Handle numeric weights (100-900) and keywords (bold, normal)
                    const weight = element.fontWeight || 'normal';
                    const weightStr = weight === 'normal' ? '' : weight;
                    return [italic, weightStr].filter(Boolean).join(' ') || 'normal';
                })()}
                fill={effectProps.fillEnabled === false ? 'transparent' : (element.color || '#ffffff')}
                align={element.textAlign || 'center'}
                verticalAlign="middle"
                letterSpacing={element.letterSpacing || 0}
                lineHeight={lineHeight}
                textDecoration={element.textDecoration || ''}
                {...effectProps}
                wrap="word"
                ellipsis={false}
                rotation={element.rotation || 0}
                onDblClick={isLocked ? undefined : (e) => handleTextDoubleClick(element, e)}
                onDblTap={isLocked ? undefined : (e) => handleTextDoubleClick(element, e)}
                onTransform={isLocked ? undefined : (e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    // Reset scale
                    node.scaleX(1);
                    node.scaleY(1);

                    // Update width and height
                    const newWidth = Math.max(50, node.width() * scaleX);
                    const newHeight = Math.max(30, node.height() * scaleY);

                    // Update fontSize based on scale
                    // Using Math.max(scaleX, scaleY) ensures text grows if either dimension grows
                    // But typically text scaling matches height scaling or proportional scaling
                    const scale = Math.max(scaleX, scaleY);
                    const currentFontSize = element.fontSize || 32;
                    const newFontSize = Math.round(currentFontSize * scale);

                    node.width(newWidth);
                    node.height(newHeight);

                    // We can't easily update React state mid-transform without lag
                    // But we can update the Konva node props directly for preview
                    // However, for controlled components, it's tricky.
                    // The best way for text scaling in Konva with React is often to let scale apply, 
                    // then reset scale and update fontSize on TransformEnd.
                    // But user wants "always on text box", implying real-time update.

                    // Let's try just updating the store on transform end, but for now 
                    // we HAVE to use the "enabled anchors" approach if we want width-only resize vs scale resize.
                    // If user drags corner, it scales. If user drags side, it changes width.
                    // For now, let's implement the standard "scale = resize font" behavior.
                }}
                onTransformEnd={isLocked ? undefined : (e) => {
                    setIsTransforming(false);
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    // Reset scale
                    node.scaleX(1);
                    node.scaleY(1);

                    // Calculate new font size based on scale
                    const currentFontSize = element.fontSize || 32;
                    const scale = Math.max(scaleX, scaleY);
                    const newFontSize = Math.round(currentFontSize * scale);

                    // Update width to match scaled width
                    const newWidth = Math.round(node.width() * scaleX);

                    handleElementChange(element.id, {
                        x: node.x(),
                        y: node.y(),
                        width: newWidth,
                        fontSize: newFontSize,
                        rotation: node.rotation(),
                    });
                }}
            />
        );
    };

    // Render shape (rectangle)
    const renderShape = (element, commonProps) => {
        return (
            <Rect
                key={element.id}
                {...commonProps}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                fill={element.fill || '#6366f1'}
                opacity={element.opacity || 1}
                cornerRadius={element.borderRadius || 0}
                rotation={element.rotation || 0}
            />
        );
    };

    // Render logo
    const renderLogo = (element, commonProps) => {
        const logoImage = loadedImages[`logo_${element.id}`];

        return (
            <Group
                key={element.id}
                {...commonProps}
                x={element.x}
                y={element.y}
                opacity={element.opacity || 1}
            >
                {logoImage ? (
                    <KonvaImage
                        image={logoImage}
                        width={element.width}
                        height={element.height}
                    />
                ) : (
                    <Rect
                        width={element.width || 120}
                        height={element.height || 40}
                        fill="#2a2a3e"
                        stroke="#4a4a5e"
                        strokeWidth={1}
                        cornerRadius={4}
                    />
                )}
            </Group>
        );
    };

    // Render semi-transparent overlay
    const renderOverlay = (element, commonProps) => {
        return (
            <Rect
                key={element.id}
                {...commonProps}
                x={element.x || 0}
                y={element.y || 0}
                width={element.width || canvasWidth}
                height={element.height || canvasHeight}
                fill={element.fill || 'rgba(0,0,0,0.3)'}
                opacity={element.opacity || 1}
            />
        );
    };

    // Stage must be large enough to show transformer handles outside canvas
    // Minimum: canvas + 200px padding on all sides, or container size (whichever is larger)
    const handlePadding = 100; // 100px on each side for handles
    const stageWidth = Math.max(containerSize.width, (canvasWidth + handlePadding * 2) * actualScale);
    const stageHeight = Math.max(containerSize.height, (canvasHeight + handlePadding * 2) * actualScale);

    // Center the canvas within the Stage
    const canvasOffsetX = (stageWidth / actualScale - canvasWidth) / 2;
    const canvasOffsetY = (stageHeight / actualScale - canvasHeight) / 2;

    // Render the canvas
    return (
        <div
            ref={containerRef}
            className="pin-canvas-wrapper"
            style={{
                width: '100%',
                height: '100%',
                overflow: 'auto',
                position: 'relative',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                backgroundColor: isDark ? '#1a1a2e' : '#edeff2', // Dynamic theme background
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

                {/* Layer 1: STATIC BACKGROUND - listening={false} prevents re-renders */}
                <Layer x={canvasOffsetX} y={canvasOffsetY} listening={false}>
                    <Rect
                        x={0}
                        y={0}
                        width={canvasWidth}
                        height={canvasHeight}
                        fill={template?.background_color || (isDark ? '#1a1a2e' : '#ffffff')}
                        shadowColor="rgba(0,0,0,0.15)"
                        shadowBlur={20}
                        shadowOffset={{ x: 0, y: 4 }}
                    />
                </Layer>

                {/* Layer 2: CONTENT - Interactive elements + grid */}
                <Layer x={canvasOffsetX} y={canvasOffsetY}>
                    {/* Clipped Group - elements stay within canvas bounds */}
                    <Group
                        clipFunc={(ctx) => {
                            ctx.rect(0, 0, canvasWidth, canvasHeight);
                        }}
                    >
                        {/* Render all elements (clipped to canvas) */}
                        {elements.map(renderElement)}

                        {/* Grid overlay - rendered ON TOP of elements */}
                        {renderGrid()}
                    </Group>
                </Layer>

                {/* Separate unclipped layer for Transformer - visible outside canvas */}
                <Layer x={canvasOffsetX} y={canvasOffsetY}>
                    {editable && (
                        <Transformer
                            ref={transformerRef}
                            onTransformStart={handleTransformStart}
                            onTransform={handleTransformMove}
                            onTransformEnd={() => {
                                setIsTransforming(false);
                                clearGuides();
                            }}
                            boundBoxFunc={(oldBox, newBox) => {
                                if (newBox.width < 20 || newBox.height < 20) {
                                    return oldBox;
                                }
                                return newBox;
                            }}
                            // Canva style: white filled circular anchors with purple stroke
                            anchorFill="#ffffff"
                            anchorStroke="#8b5cf6"
                            anchorStrokeWidth={1}
                            anchorSize={10}
                            anchorCornerRadius={5}
                            // Selection border - purple like Canva
                            borderStroke="#8b5cf6"
                            borderStrokeWidth={1}
                            borderDash={[]}
                            // Disable default top rotation handle (we'll make a custom one)
                            rotateEnabled={false}
                            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                            // All anchors for full control
                            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
                            keepRatio={false}
                            ignoreStroke={true}
                            padding={5}
                        />
                    )}
                </Layer>

                {/* Smart Guides Layer - ABOVE Transformer for visibility */}
                <Layer x={canvasOffsetX} y={canvasOffsetY}>
                    {renderSmartGuides()}
                </Layer>

                {/* Custom Rotation Handle Layer - same coordinate system as Transformer */}
                <Layer x={canvasOffsetX} y={canvasOffsetY}>
                    {editable && selectedIds.size === 1 && !editingTextId && !isDragging && !isTransforming && (() => {
                        const selectedElement = elements.find(el => el.id === [...selectedIds][0]);
                        if (!selectedElement || selectedElement.locked) return null;

                        const rotation = selectedElement.rotation || 0;
                        const rad = (rotation * Math.PI) / 180;


                        const screenTopY = (selectedElement.y + canvasOffsetY) * actualScale;
                        const toolbarHeight = 36;
                        const toolbarGap = 40;
                        const isToolbarTop = screenTopY > (toolbarHeight + toolbarGap + 10);

                        // Ideally: Toolbar Top -> Handle Bottom. Toolbar Bottom -> Handle Top.
                        const handleY = isToolbarTop
                            ? (selectedElement.height || 100) * (selectedElement.scaleY || 1) + (30 / actualScale) // Bottom
                            : -(30 / actualScale); // Top

                        return (
                            <Group
                                x={selectedElement.x}
                                y={selectedElement.y}
                                rotation={rotation}
                                id="rotation-layer-group"
                            >
                                <Group
                                    draggable
                                    x={((selectedElement.width || 100) * (selectedElement.scaleX || 1)) / 2}
                                    y={handleY}
                                    scaleX={1 / actualScale}
                                    scaleY={1 / actualScale}
                                    opacity={isRotating ? 0 : 1}
                                    onMouseEnter={() => setHoveredRotationHandle(true)}
                                    onMouseLeave={() => setHoveredRotationHandle(false)}
                                    onDragStart={(e) => {
                                        e.cancelBubble = true;
                                        setIsRotating(true);
                                    }}
                                    onDragEnd={(e) => {
                                        e.cancelBubble = true;
                                        setIsRotating(false);
                                    }}
                                    onDragMove={(e) => {
                                        e.cancelBubble = true;
                                        const stage = e.target.getStage();
                                        const pointer = stage.getPointerPosition();
                                        if (!pointer) return;

                                        // Calculate angle in "canvas" space
                                        const pointerX = pointer.x / actualScale - canvasOffsetX;
                                        const pointerY = pointer.y / actualScale - canvasOffsetY;

                                        const w = (selectedElement.width || 100) * (selectedElement.scaleX || 1);
                                        const h = (selectedElement.height || 100) * (selectedElement.scaleY || 1);
                                        // Center of element
                                        // P_center = P_topleft + Rot(w/2, h/2)
                                        const currRotRad = (selectedElement.rotation || 0) * Math.PI / 180;
                                        const cx = selectedElement.x + (w / 2) * Math.cos(currRotRad) - (h / 2) * Math.sin(currRotRad);
                                        const cy = selectedElement.y + (w / 2) * Math.sin(currRotRad) + (h / 2) * Math.cos(currRotRad);

                                        // Vector from center to pointer
                                        const vecX = pointerX - cx;
                                        const vecY = pointerY - cy;

                                        // Angle of vector
                                        let newRotation = Math.atan2(vecY, vecX) * 180 / Math.PI;

                                        // Adjust rotation based on handle position (Top vs Bottom)
                                        // If handle is at bottom (+90 deg relative to center), dragging to right (0 deg) should mean -90 rotation?
                                        // Actually atan2 gives absolute angle.
                                        // If handle is at Bottom (90 deg relative to center):
                                        // When pointer is at (0, 1) relative to center, rotation should be 0.
                                        // atan2(1, 0) = 90 deg. 
                                        // So newRotation = angle - 90.

                                        // If handle is at Top (-90 deg relative to center):
                                        // When pointer is at (0, -1), rotation should be 0.
                                        // atan2(-1, 0) = -90.
                                        // So newRotation = angle - (-90) = angle + 90.

                                        const angleOffset = isToolbarTop ? 90 : -90;
                                        newRotation -= angleOffset;

                                        // Snap
                                        if (e.evt.shiftKey) {
                                            newRotation = Math.round(newRotation / 45) * 45;
                                        }

                                        // Calculate new top-left to keep center fixed
                                        const newRotRad = newRotation * Math.PI / 180;
                                        const newX = cx - ((w / 2) * Math.cos(newRotRad) - (h / 2) * Math.sin(newRotRad));
                                        const newY = cy - ((w / 2) * Math.sin(newRotRad) + (h / 2) * Math.cos(newRotRad));

                                        handleElementChange(selectedElement.id, {
                                            rotation: newRotation,
                                            x: newX,
                                            y: newY
                                        });

                                        // Keep handle visual in place (relative to group rot)
                                        e.target.position({
                                            x: w / 2,
                                            y: handleY
                                        });
                                    }}
                                >
                                    <Circle
                                        radius={14}
                                        fill={hoveredRotationHandle ? "#8b5cf6" : "white"}
                                        stroke="#8b5cf6"
                                        strokeWidth={1}
                                        shadowColor="black"
                                        shadowBlur={5}
                                        shadowOpacity={0.1}
                                    />
                                    <Path
                                        data="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8 M21 3v5h-5"
                                        stroke={hoveredRotationHandle ? "white" : "#8b5cf6"}
                                        strokeWidth={2.5}
                                        scaleX={0.6}
                                        scaleY={0.6}
                                        x={-7.2}
                                        y={-7.2}
                                    />
                                </Group>
                            </Group>
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
                            left: editingElement.x * actualScale,
                            top: editingElement.y * actualScale,
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

