import { Line } from 'react-konva';
import React from 'react';
import { GRID_SIZE } from './canvasConstants';

/**
 * Snap a value to the nearest grid point
 * @param {number} value - The value to snap
 * @param {number} gridSize - The grid size (default from constants)
 * @returns {number} - The snapped value
 */
export const snapToGrid = (value, gridSize = GRID_SIZE) => {
    return Math.round(value / gridSize) * gridSize;
};

/**
 * Snap position to grid
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} gridSize - Grid size
 * @returns {{x: number, y: number}} - Snapped coordinates
 */
export const snapPositionToGrid = (x, y, gridSize = GRID_SIZE) => ({
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
});

/**
 * Generate vertical grid lines for the canvas
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} gridSize - Grid cell size
 * @returns {Array} - Array of line configurations
 */
export const generateVerticalGridLines = (canvasWidth, canvasHeight, gridSize = GRID_SIZE) => {
    const lines = [];
    for (let x = 0; x <= canvasWidth; x += gridSize) {
        lines.push({
            key: `v-${x}`,
            points: [x, 0, x, canvasHeight],
            stroke: '#2a2a4a',
            strokeWidth: 1,
            opacity: x % (gridSize * 4) === 0 ? 0.3 : 0.15,
        });
    }
    return lines;
};

/**
 * Generate horizontal grid lines for the canvas
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} gridSize - Grid cell size
 * @returns {Array} - Array of line configurations
 */
export const generateHorizontalGridLines = (canvasWidth, canvasHeight, gridSize = GRID_SIZE) => {
    const lines = [];
    for (let y = 0; y <= canvasHeight; y += gridSize) {
        lines.push({
            key: `h-${y}`,
            points: [0, y, canvasWidth, y],
            stroke: '#2a2a4a',
            strokeWidth: 1,
            opacity: y % (gridSize * 4) === 0 ? 0.3 : 0.15,
        });
    }
    return lines;
};

/**
 * Generate all grid lines
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @param {number} gridSize - Grid cell size
 * @returns {Array} - Combined array of all grid lines
 */
export const generateGridLines = (canvasWidth, canvasHeight, gridSize = GRID_SIZE) => {
    return [
        ...generateVerticalGridLines(canvasWidth, canvasHeight, gridSize),
        ...generateHorizontalGridLines(canvasWidth, canvasHeight, gridSize),
    ];
};

/**
 * Check if a position is near a snap line
 * @param {number} value - Current value
 * @param {number} snapValue - Value to snap to
 * @param {number} threshold - Snap threshold
 * @returns {boolean} - Whether the position should snap
 */
export const isNearSnapLine = (value, snapValue, threshold = 5) => {
    return Math.abs(value - snapValue) < threshold;
};

/**
 * Get snap points from canvas edges
 * @param {number} canvasWidth - Canvas width
 * @param {number} canvasHeight - Canvas height
 * @returns {{vertical: number[], horizontal: number[]}} - Edge snap points
 */
export const getCanvasEdgeSnapPoints = (canvasWidth, canvasHeight) => ({
    vertical: [0, canvasWidth / 2, canvasWidth],
    horizontal: [0, canvasHeight / 2, canvasHeight],
});
