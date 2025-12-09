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
    allowImageDrag = false,
    onImageOffsetChange = null,
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
        const getProxiedUrl = (url) => {
            if (!url || url.startsWith('data:') || url.startsWith('/')) return url;
            try {
                const urlObj = new URL(url);
                // Check if it's already using our proxy to avoid double proxying
                if (url.includes('/api/proxy-image')) return url;
                if (urlObj.hostname === window.location.hostname || urlObj.hostname === 'localhost') return url;
                return `/api/proxy-image?url=${encodeURIComponent(url)}`;
            } catch { return url; }
        };

        // Load element specific images
        elements.forEach(el => {
            if (el.type === 'imageSlot') {
                // Check for custom image from articleData first
                const customUrl = articleData?.customImages?.[el.id];
                const rawUrl = customUrl || el.imageUrl;
                const imageUrl = getProxiedUrl(rawUrl);

                // Only load if URL present and specific slot image not already loaded
                // Note: we track loaded state by the raw URL or ID to prevent needless reloads,
                // but we might need to be careful if user changes URL.
                // Current logic checks specific slot ID.

                if (imageUrl) {
                    // Check if we need to reload (new URL or not loaded yet)
                    const currentImg = loadedImages[el.id];
                    // transform current src back to raw? hard.
                    // Instead, just load if not present.

                    if (!currentImg) {
                        const img = new window.Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            setLoadedImages(prev => ({ ...prev, [el.id]: img }));
                        };
                        img.onerror = () => {
                            // If proxy fails, try direct (fallback, though unlikely to work for CORS)
                            if (imageUrl.includes('/api/proxy-image')) {
                                img.src = rawUrl;
                            }
                        };
                        img.src = imageUrl;
                    }

                    // If custom URL provided and different from what we might have (this logic is a bit tricky with proxy)
                    // Let's rely on the dependency array [elements, articleData] + key check
                    if (customUrl) {
                        // Check if we already loaded this specific custom URL
                        // We can attach a dataset/custom prop to the Image object to track origin?
                        // Or just compare src. 
                        // Proxied src starts with /api...
                        if (currentImg && !currentImg.src.includes(encodeURIComponent(customUrl)) && currentImg.src !== customUrl) {
                            const img = new window.Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => {
                                setLoadedImages(prev => ({ ...prev, [el.id]: img }));
                            };
                            img.src = imageUrl;
                        }
                    }
                }
            }
        });

        // Load article main image
        if (articleData?.image && !loadedImages['article_main']) {
            const rawUrl = articleData.image;
            const imageUrl = getProxiedUrl(rawUrl);

            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                setLoadedImages(prev => ({ ...prev, 'article_main': img }));
            };
            img.src = imageUrl;
        }
    }, [elements, loadedImages, articleData]);

    // Update transformer when selection changes
    useEffect(() => {
        if (transformerRef.current && stageRef.current) {
            const stage = stageRef.current;
            if (selectedId) {
                const selectedNode = stage.findOne(`#${selectedId}`);
                if (selectedNode) {
                    // Find the element to check its type
                    const element = elements.find(el => el.id === selectedId);

                    // Enable all anchors for all elements
                    transformerRef.current.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']);

                    // Lock aspect ratio for imageSlot elements
                    if (element?.type === 'imageSlot') {
                        transformerRef.current.keepRatio(true);
                    } else {
                        transformerRef.current.keepRatio(false);
                    }

                    transformerRef.current.nodes([selectedNode]);
                    transformerRef.current.getLayer().batchDraw();
                }
            } else {
                transformerRef.current.nodes([]);
                transformerRef.current.getLayer().batchDraw();
            }
        }
    }, [selectedId, elements]);

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
        let displayText = replaceVariables(element.content);

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
                    fontStyle: `${element.fontWeight || 'normal'} ${element.fontStyle || 'normal'}`,
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

        // Render Text directly - zone is resizable, uses auto-fit or stored fontSize
        return (
            <Text
                key={element.id}
                id={element.id}
                x={element.x}
                y={element.y}
                text={displayText || 'Text'}
                width={width}
                height={height}
                fontSize={fontSize}
                fontFamily={element.fontFamily || 'Inter, sans-serif'}
                fontStyle={`${element.fontWeight || 'normal'} ${element.fontStyle || 'normal'}`}
                fill={element.color || '#ffffff'}
                align={element.textAlign || 'center'}
                verticalAlign="middle"
                letterSpacing={element.letterSpacing || 0}
                lineHeight={lineHeight}
                textDecoration={element.textDecoration || ''}
                shadowColor={element.shadow?.color}
                shadowBlur={element.shadow?.blur || 0}
                shadowOffsetX={element.shadow?.offsetX || 0}
                shadowOffsetY={element.shadow?.offsetY || 0}
                wrap="word"
                ellipsis={false}
                draggable={editable}
                rotation={element.rotation || 0}
                onClick={(e) => handleSelect(element.id, e)}
                onTap={(e) => handleSelect(element.id, e)}
                onDragMove={handleDragMove}
                onDragEnd={(e) => handleDragEnd(element.id, e)}
                onTransform={(e) => {
                    // User is resizing the text zone
                    // Just reset scale and apply to width/height
                    const node = e.target;
                    const scaleX = node.scaleX();
                    const scaleY = node.scaleY();

                    node.setAttrs({
                        width: Math.max(50, node.width() * scaleX),
                        height: Math.max(30, node.height() * scaleY),
                        scaleX: 1,
                        scaleY: 1,
                    });
                }}
                onTransformEnd={(e) => {
                    // Save zone dimensions to state
                    // fontSize remains user-controlled via the properties panel
                    const node = e.target;
                    handleElementChange(element.id, {
                        x: node.x(),
                        y: node.y(),
                        width: Math.round(node.width()),
                        height: Math.round(node.height()),
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
