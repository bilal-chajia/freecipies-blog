import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_STATE } from '../constants';

/**
 * Custom hook for managing image editor history (undo/redo functionality)
 * @param {Object} initialState - The initial state snapshot
 * @returns {Object} History management functions and state
 */
export const useImageHistory = (currentStateGetter) => {
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Save state to history
    const saveToHistory = useCallback(() => {
        const snapshot = currentStateGetter();
        setHistory(prev => {
            const newHistory = prev.slice(0, historyIndex + 1);
            return [...newHistory, snapshot];
        });
        setHistoryIndex(prev => prev + 1);
    }, [currentStateGetter, historyIndex]);

    // Initialize history
    const initializeHistory = useCallback(() => {
        if (history.length === 0) {
            const initial = currentStateGetter();
            setHistory([initial]);
            setHistoryIndex(0);
        }
    }, [history.length, currentStateGetter]);

    // Get previous state for undo
    const getPreviousState = useCallback(() => {
        if (historyIndex > 0) {
            return history[historyIndex - 1];
        }
        return null;
    }, [history, historyIndex]);

    // Get next state for redo
    const getNextState = useCallback(() => {
        if (historyIndex < history.length - 1) {
            return history[historyIndex + 1];
        }
        return null;
    }, [history, historyIndex]);

    // Move history index back (for undo)
    const decrementHistoryIndex = useCallback(() => {
        setHistoryIndex(prev => prev - 1);
    }, []);

    // Move history index forward (for redo)
    const incrementHistoryIndex = useCallback(() => {
        setHistoryIndex(prev => prev + 1);
    }, []);

    // Check if undo is available
    const canUndo = historyIndex > 0;

    // Check if redo is available
    const canRedo = historyIndex < history.length - 1;

    return {
        saveToHistory,
        initializeHistory,
        getPreviousState,
        getNextState,
        decrementHistoryIndex,
        incrementHistoryIndex,
        canUndo,
        canRedo,
        historyIndex
    };
};

export default useImageHistory;
