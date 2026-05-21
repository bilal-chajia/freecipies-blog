import { GRID_SIZE } from './canvasConstants';

interface GridLineConfig {
    key: string;
    points: [number, number, number, number];
    stroke: string;
    strokeWidth: number;
    opacity: number;
}

interface SnapPoints {
    vertical: number[];
    horizontal: number[];
}

/**
 * Snap a value to the nearest grid point
 * @param value - The value to snap
 * @param gridSize - The grid size (default from constants)
 * @returns The snapped value
 */
export const snapToGrid = (value: number, gridSize = GRID_SIZE): number => {
    return Math.round(value / gridSize) * gridSize;
};

/**
 * Snap position to grid
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param gridSize - Grid size
 * @returns Snapped coordinates
 */
export const snapPositionToGrid = (x: number, y: number, gridSize = GRID_SIZE): { x: number; y: number } => ({
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
});

/**
 * Generate vertical grid lines for the canvas
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param gridSize - Grid cell size
 * @returns Array of line configurations
 */
export const generateVerticalGridLines = (canvasWidth: number, canvasHeight: number, gridSize = GRID_SIZE): GridLineConfig[] => {
    const lines: GridLineConfig[] = [];
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
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param gridSize - Grid cell size
 * @returns Array of line configurations
 */
export const generateHorizontalGridLines = (canvasWidth: number, canvasHeight: number, gridSize = GRID_SIZE): GridLineConfig[] => {
    const lines: GridLineConfig[] = [];
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
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @param gridSize - Grid cell size
 * @returns Combined array of all grid lines
 */
export const generateGridLines = (canvasWidth: number, canvasHeight: number, gridSize = GRID_SIZE): GridLineConfig[] => {
    return [
        ...generateVerticalGridLines(canvasWidth, canvasHeight, gridSize),
        ...generateHorizontalGridLines(canvasWidth, canvasHeight, gridSize),
    ];
};

/**
 * Check if a position is near a snap line
 * @param value - Current value
 * @param snapValue - Value to snap to
 * @param threshold - Snap threshold
 * @returns Whether the position should snap
 */
export const isNearSnapLine = (value: number, snapValue: number, threshold = 5): boolean => {
    return Math.abs(value - snapValue) < threshold;
};

/**
 * Get snap points from canvas edges
 * @param canvasWidth - Canvas width
 * @param canvasHeight - Canvas height
 * @returns Edge snap points
 */
export const getCanvasEdgeSnapPoints = (canvasWidth: number, canvasHeight: number): SnapPoints => ({
    vertical: [0, canvasWidth / 2, canvasWidth],
    horizontal: [0, canvasHeight / 2, canvasHeight],
});
