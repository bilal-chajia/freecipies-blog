import { useState, useCallback } from 'react';
import { SNAP_THRESHOLD } from '../utils/canvasConstants';

/**
 * useSmartGuides - Custom hook for Canva-style smart alignment guides
 * 
 * Features:
 * - Grid snapping when grid is visible
 * - Smart guides to canvas edges and center
 * - Visual guide lines during drag
 * 
 * @param {Object} options - Configuration
 * @param {boolean} options.showGrid - Whether grid snapping is enabled
 * @param {number} options.canvasWidth - Dynamic canvas width
 * @param {number} options.canvasHeight - Dynamic canvas height
 * @param {Function} options.onElementChange - Callback when element position changes
 * @returns {Object} - Guide state and drag handlers
 */
const useSmartGuides = ({ showGrid = false, canvasWidth = 1000, canvasHeight = 1500, onElementChange }) => {
    // Active guide lines to render
    const [guides, setGuides] = useState([]);

    // Dynamic grid size: divide canvas into 20 columns (matches renderGrid)
    const gridSize = canvasWidth / 20;

    /**
     * Snap value to grid
     */
    const snapToGrid = useCallback((value) => {
        if (!showGrid) return value;
        return Math.round(value / gridSize) * gridSize;
    }, [showGrid, gridSize]);

    /**
     * Get line guide stops (canvas edges and center)
     * Can be extended to include other element edges
     */
    const getLineGuideStops = useCallback((skipShape) => {
        return {
            vertical: [0, canvasWidth / 2, canvasWidth],
            horizontal: [0, canvasHeight / 2, canvasHeight],
        };
    }, [canvasWidth, canvasHeight]);

    /**
     * Get object snapping edges for a Konva node
     */
    const getObjectSnappingEdges = useCallback((node) => {
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
    }, []);

    /**
     * Handle drag move with smart guides
     * Snaps to grid AND canvas guides during drag
     */
    const handleDragMove = useCallback((e) => {
        const node = e.target;

        // Clear previous guides
        setGuides([]);

        // Apply grid snapping first if enabled
        if (showGrid) {
            node.position({
                x: snapToGrid(node.x()),
                y: snapToGrid(node.y()),
            });
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
    }, [showGrid, snapToGrid, getLineGuideStops, getObjectSnappingEdges]);

    /**
     * Handle drag end - clear guides and save position
     */
    const handleDragEnd = useCallback((id, e) => {
        // Clear guides
        setGuides([]);

        // Save final position
        onElementChange?.(id, {
            x: e.target.x(),
            y: e.target.y(),
        });
    }, [onElementChange]);

    /**
     * Clear all guides (useful for external cleanup)
     */
    const clearGuides = useCallback(() => {
        setGuides([]);
    }, []);

    return {
        guides,
        handleDragMove,
        handleDragEnd,
        handleTransformMove: useCallback((e) => {
            const node = e.target;

            // Get the bounding box of the transformed element
            const boundBox = node.getClientRect();

            // Calculate actual position and size after transform
            const x = node.x();
            const y = node.y();
            const width = node.width() * node.scaleX();
            const height = node.height() * node.scaleY();

            const newGuides = [];
            const guideLines = {
                vertical: [0, canvasWidth / 2, canvasWidth],
                horizontal: [0, canvasHeight / 2, canvasHeight],
            };

            // Check all edges of the element for snapping
            const elementEdges = {
                vertical: [x, x + width / 2, x + width],
                horizontal: [y, y + height / 2, y + height],
            };

            // Find vertical guides (X axis)
            elementEdges.vertical.forEach((edge) => {
                guideLines.vertical.forEach((line) => {
                    if (Math.abs(edge - line) < SNAP_THRESHOLD) {
                        newGuides.push({
                            orientation: 'V',
                            lineGuide: line,
                        });
                    }
                });
            });

            // Find horizontal guides (Y axis)
            elementEdges.horizontal.forEach((edge) => {
                guideLines.horizontal.forEach((line) => {
                    if (Math.abs(edge - line) < SNAP_THRESHOLD) {
                        newGuides.push({
                            orientation: 'H',
                            lineGuide: line,
                        });
                    }
                });
            });

            setGuides(newGuides);
        }, [canvasWidth, canvasHeight]),
        clearGuides,
        snapToGrid,
    };
};

export default useSmartGuides;
