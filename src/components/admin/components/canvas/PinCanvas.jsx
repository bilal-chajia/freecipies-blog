import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Group, Transformer, Line } from 'react-konva';

// Pin canvas dimensions (Pinterest standard)
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1500;

// Grid size for snapping
const GRID_SIZE = 25;
// Snap threshold for smart guides
const SNAP_THRESHOLD = 5;

/**
 * PinCanvas - Professional Konva-based canvas for Pinterest pin design
 * Features: Transformer controls, zoom, grid, smart guides, premium UI
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
}) => {
    const stageRef = useRef(null);
    const transformerRef = useRef(null);
    const [elements, setElements] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loadedImages, setLoadedImages] = useState({});

    // Smart guides state
    const [guides, setGuides] = useState([]);

    // Calculate actual scale based on zoom
    const actualScale = scale * (zoom / 100);

    // Load template elements
    useEffect(() => {
        if (template?.elements_json) {
            try {
                const parsed = typeof template.elements_json === 'string'
                    ? JSON.parse(template.elements_json)
                    : template.elements_json;
                setElements(parsed);
            } catch (e) {
                console.error('Failed to parse template elements:', e);
                setElements([]);
            }
        }
    }, [template]);

    // Preload images for image slots
    useEffect(() => {
        // Load element specific images
        elements.forEach(el => {
            if (el.type === 'imageSlot' && el.imageUrl && !loadedImages[el.id]) {
                const img = new window.Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    setLoadedImages(prev => ({ ...prev, [el.id]: img }));
                };
                img.src = el.imageUrl;
            }
        });

        // Load article main image
        if (articleData?.image && !loadedImages['article_main']) {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                setLoadedImages(prev => ({ ...prev, 'article_main': img }));
            };
            img.src = articleData.image;
        }
    }, [elements, loadedImages, articleData]);

    // Update transformer when selection changes
    useEffect(() => {
        if (transformerRef.current && stageRef.current) {
            const stage = stageRef.current;
            if (selectedId) {
                const selectedNode = stage.findOne(`#${selectedId}`);
                if (selectedNode) {
                    transformerRef.current.nodes([selectedNode]);
                    transformerRef.current.getLayer().batchDraw();
                }
            } else {
                transformerRef.current.nodes([]);
                transformerRef.current.getLayer().batchDraw();
            }
        }
    }, [selectedId]);

    // Handle element selection
    const handleSelect = (id, e) => {
        if (e) e.cancelBubble = true;
        setSelectedId(id);
        const element = elements.find(el => el.id === id);
        onElementSelect?.(element);
    };

    // Handle element updates (drag, resize, rotate)
    const handleElementChange = (id, newProps) => {
        setElements(prev => {
            const updated = prev.map(el =>
                el.id === id ? { ...el, ...newProps } : el
            );
            onTemplateChange?.(updated);
            return updated;
        });
    };

    // Handle transform end (resize/rotate)
    const handleTransformEnd = (id, e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale and apply to width/height
        node.scaleX(1);
        node.scaleY(1);

        handleElementChange(id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(20, node.width() * scaleX),
            height: Math.max(20, node.height() * scaleY),
            rotation: node.rotation(),
        });
    };

    // Snap to grid standard function
    const snapToGrid = (value) => {
        if (!showGrid) return value;
        return Math.round(value / GRID_SIZE) * GRID_SIZE;
    };

    // Get line guide stops (center, edges)
    const getLineGuideStops = (skipShape) => {
        // Just canvas center and edges for now
        // Can be extended to include other object edges
        return {
            vertical: [0, CANVAS_WIDTH / 2, CANVAS_WIDTH],
            horizontal: [0, CANVAS_HEIGHT / 2, CANVAS_HEIGHT],
        };
    };

    // Get object snapping edges
    const getObjectSnappingEdges = (node) => {
        // Simple bounding box for standard layout
        const width = node.width();
        const height = node.height();
        const x = node.x();
        const y = node.y();

        return {
            vertical: [
                { guide: Math.round(x), offset: 0, snap: 'start' },
                { guide: Math.round(x + width / 2), offset: Math.round(width / 2), snap: 'center' },
                { guide: Math.round(x + width), offset: Math.round(width), snap: 'end' },
            ],
            horizontal: [
                { guide: Math.round(y), offset: 0, snap: 'start' },
                { guide: Math.round(y + height / 2), offset: Math.round(height / 2), snap: 'center' },
                { guide: Math.round(y + height), offset: Math.round(height), snap: 'end' },
            ],
        };
    };

    // Handle drag move with Smart Guides
    const handleDragMove = (e) => {
        const node = e.target;

        // Clear previous guides
        setGuides([]);

        // If grid is on, prioritize grid snapping
        if (showGrid) {
            node.position({
                x: snapToGrid(node.x()),
                y: snapToGrid(node.y()),
            });
            return;
        }

        // --- Smart Snapping Logic ---
        const guideLines = getLineGuideStops(node);
        const itemBounds = getObjectSnappingEdges(node);
        const newGuides = [];

        let minV = SNAP_THRESHOLD;
        let minH = SNAP_THRESHOLD;

        // Find vertical snap (X axis)
        itemBounds.vertical.forEach((bound) => {
            guideLines.vertical.forEach((line) => {
                const diff = Math.abs(line - bound.guide);
                if (diff < minV) {
                    minV = diff;
                    // Snap the node
                    node.x(line - bound.offset);
                    // Add guide line
                    newGuides.push({
                        orientation: 'V',
                        lineGuide: line,
                        offset: bound.offset,
                        snap: bound.snap,
                    });
                }
            });
        });

        // Find horizontal snap (Y axis)
        itemBounds.horizontal.forEach((bound) => {
            guideLines.horizontal.forEach((line) => {
                const diff = Math.abs(line - bound.guide);
                if (diff < minH) {
                    minH = diff;
                    // Snap the node
                    node.y(line - bound.offset);
                    // Add guide line
                    newGuides.push({
                        orientation: 'H',
                        lineGuide: line,
                        offset: bound.offset,
                        snap: bound.snap,
                    });
                }
            });
        });

        setGuides(newGuides);
    };

    // Handle drag end
    const handleDragEnd = (id, e) => {
        // Clear guides
        setGuides([]);

        // Save final position
        handleElementChange(id, {
            x: e.target.x(),
            y: e.target.y(),
        });
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
        setGuides([]);

        // Get data URL at full resolution
        const dataUrl = stageRef.current.toDataURL({
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

        // Convert to blob
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        return blob;
    }, [actualScale, selectedId]);

    // Expose export function
    useEffect(() => {
        if (onExport) {
            onExport(exportToImage);
        }
    }, [exportToImage, onExport]);

    // Render grid lines
    const renderGrid = () => {
        if (!showGrid) return null;

        const lines = [];
        // Vertical lines
        for (let i = 0; i <= CANVAS_WIDTH / GRID_SIZE; i++) {
            lines.push(
                <Line
                    key={`v${i}`}
                    points={[i * GRID_SIZE, 0, i * GRID_SIZE, CANVAS_HEIGHT]}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1}
                    listening={false}
                />
            );
        }
        // Horizontal lines
        for (let i = 0; i <= CANVAS_HEIGHT / GRID_SIZE; i++) {
            lines.push(
                <Line
                    key={`h${i}`}
                    points={[0, i * GRID_SIZE, CANVAS_WIDTH, i * GRID_SIZE]}
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1}
                    listening={false}
                />
            );
        }
        return lines;
    };

    // Render Smart Guides
    const renderSmartGuides = () => {
        return guides.map((guide, i) => {
            if (guide.orientation === 'V') {
                return (
                    <Line
                        key={`guide-v-${i}`}
                        points={[guide.lineGuide, 0, guide.lineGuide, CANVAS_HEIGHT]}
                        stroke="#ec4899"
                        strokeWidth={1}
                        dash={[4, 2]}
                        listening={false}
                    />
                );
            } else {
                return (
                    <Line
                        key={`guide-h-${i}`}
                        points={[0, guide.lineGuide, CANVAS_WIDTH, guide.lineGuide]}
                        stroke="#ec4899"
                        strokeWidth={1}
                        dash={[4, 2]}
                        listening={false}
                    />
                );
            }
        });
    };

    // Render element based on type
    const renderElement = (element) => {
        const commonProps = {
            id: element.id,
            draggable: editable,
            onClick: (e) => handleSelect(element.id, e),
            onTap: (e) => handleSelect(element.id, e),
            onDragMove: handleDragMove,
            onDragEnd: (e) => handleDragEnd(element.id, e),
            onTransformEnd: (e) => handleTransformEnd(element.id, e),
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

        return (
            <Group
                key={element.id}
                {...commonProps}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
            >
                {/* Image or placeholder */}
                {image ? (
                    <KonvaImage
                        image={image}
                        width={element.width}
                        height={element.height}
                        cornerRadius={element.borderRadius || 0}
                    />
                ) : (
                    <>
                        <Rect
                            width={element.width}
                            height={element.height}
                            fill="#2a2a3e"
                            cornerRadius={element.borderRadius || 0}
                            stroke={selectedId === element.id ? '#6366f1' : '#4a4a5e'}
                            strokeWidth={2}
                            dash={[8, 4]}
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
        const displayText = replaceVariables(element.content);

        return (
            <Group
                key={element.id}
                {...commonProps}
                x={element.x}
                y={element.y}
            >
                {/* Text background */}
                {element.background && (
                    <Rect
                        width={element.width || 300}
                        height={(element.fontSize || 32) * 1.5 + (element.background.padding || 0) * 2}
                        fill={element.background.color}
                        cornerRadius={element.background.borderRadius || 0}
                        opacity={element.background.opacity || 1}
                    />
                )}

                {/* Text */}
                <Text
                    text={displayText || 'Text'}
                    width={element.width || 300}
                    fontSize={element.fontSize || 32}
                    fontFamily={element.fontFamily || 'Inter, sans-serif'}
                    fontStyle={`${element.fontWeight || 'normal'} ${element.fontStyle || 'normal'}`}
                    fill={element.color || '#ffffff'}
                    align={element.textAlign || 'center'}
                    shadowColor={element.shadow?.color}
                    shadowBlur={element.shadow?.blur || 0}
                    shadowOffsetX={element.shadow?.offsetX || 0}
                    shadowOffsetY={element.shadow?.offsetY || 0}
                    x={element.background?.padding || 0}
                    y={element.background?.padding || 0}
                    wrap="word"
                />
            </Group>
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
                width={element.width || CANVAS_WIDTH}
                height={element.height || CANVAS_HEIGHT}
                fill={element.fill || 'rgba(0,0,0,0.3)'}
                opacity={element.opacity || 1}
            />
        );
    };

    // Render the canvas
    return (
        <div
            className="pin-canvas-wrapper"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                background: 'repeating-conic-gradient(#1a1a2e 0% 25%, #16162a 0% 50%) 50% / 20px 20px',
                borderRadius: '8px',
                minHeight: '100%',
            }}
        >
            <div
                className="pin-canvas-container"
                style={{
                    width: CANVAS_WIDTH * actualScale,
                    height: CANVAS_HEIGHT * actualScale,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
                }}
            >
                <Stage
                    ref={stageRef}
                    width={CANVAS_WIDTH * actualScale}
                    height={CANVAS_HEIGHT * actualScale}
                    scaleX={actualScale}
                    scaleY={actualScale}
                    onClick={(e) => {
                        // Deselect when clicking empty area
                        if (e.target === e.target.getStage()) {
                            setSelectedId(null);
                            onElementSelect?.(null);
                        }
                    }}
                >
                    <Layer>
                        {/* Background */}
                        <Rect
                            x={0}
                            y={0}
                            width={CANVAS_WIDTH}
                            height={CANVAS_HEIGHT}
                            fill={template?.background_color || '#1a1a2e'}
                        />

                        {/* Grid overlay */}
                        {renderGrid()}

                        {/* Smart Guides overlay */}
                        {renderSmartGuides()}

                        {/* Render all elements */}
                        {elements.map(renderElement)}

                        {/* Transformer for selection */}
                        {editable && (
                            <Transformer
                                ref={transformerRef}
                                boundBoxFunc={(oldBox, newBox) => {
                                    // Limit minimum size
                                    if (newBox.width < 20 || newBox.height < 20) {
                                        return oldBox;
                                    }
                                    return newBox;
                                }}
                                anchorFill="#6366f1"
                                anchorStroke="#4f46e5"
                                anchorSize={10}
                                anchorCornerRadius={2}
                                borderStroke="#6366f1"
                                borderStrokeWidth={2}
                                rotateAnchorOffset={30}
                                enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
                            />
                        )}
                    </Layer>
                </Stage>
            </div>
        </div>
    );
};

// Export both the component and utility to set images
export { PinCanvas, CANVAS_WIDTH, CANVAS_HEIGHT, GRID_SIZE };
export default PinCanvas;
