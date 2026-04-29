/**
 * useMenuEditor - Custom hook for menu CRUD operations
 * 
 * Centralizes all state management and handlers for:
 * - Menu items (add, update, delete, reorder)
 * - Columns (add, update, delete, reorder)
 * - Links (add, update, delete, reorder)
 * - Selection state
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
    useSensors,
    useSensor,
    PointerSensor,
    KeyboardSensor,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';

export function useMenuEditor(formData, handleInputChange, activeTab) {
    const [selectedItemId, setSelectedItemId] = useState(null);
    const [openSections, setOpenSections] = useState({ general: true, mega: true, featured: false });

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Derive menu key and items from active tab
    const menuKey = activeTab === 'header' ? 'headerMenu' : 'footerMenu';
    const items = formData[menuKey] || [];

    // Reset selection when tab changes
    useEffect(() => {
        setSelectedItemId(null);
    }, [activeTab]);

    // Get selected item
    const selectedItem = useMemo(() => {
        return items.find(item => item.id === selectedItemId) || null;
    }, [items, selectedItemId]);

    // Update items helper
    const updateItems = useCallback((newItems) => {
        handleInputChange(menuKey, newItems);
    }, [handleInputChange, menuKey]);

    // ========================================
    // Item Operations
    // ========================================

    const handleUpdateItem = useCallback((key, value) => {
        if (!selectedItemId) return;
        const newItems = items.map(item =>
            item.id === selectedItemId ? { ...item, [key]: value } : item
        );
        updateItems(newItems);
    }, [items, selectedItemId, updateItems]);

    const handleAddItem = useCallback(() => {
        const newItem = {
            id: `menu-${Date.now()}`,
            label: 'New Item',
            type: 'link',
            url: '#',
            columns: [],
            featured: { enabled: false },
        };
        updateItems([...items, newItem]);
        setSelectedItemId(newItem.id);
    }, [items, updateItems]);

    const handleDeleteItem = useCallback((id, e) => {
        if (e) {
            e.stopPropagation();
        }
        updateItems(items.filter(item => item.id !== id));
        if (selectedItemId === id) {
            setSelectedItemId(null);
        }
    }, [items, selectedItemId, updateItems]);

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            const oldIndex = items.findIndex(i => i.id === active.id);
            const newIndex = items.findIndex(i => i.id === over.id);
            updateItems(arrayMove(items, oldIndex, newIndex));
        }
    }, [items, updateItems]);

    // ========================================
    // Column Operations
    // ========================================

    const handleAddColumn = useCallback(() => {
        if (!selectedItem) return;
        const newColumn = { id: `col-${Date.now()}`, title: 'New Column', links: [] };
        handleUpdateItem('columns', [...(selectedItem.columns || []), newColumn]);
    }, [selectedItem, handleUpdateItem]);

    const handleUpdateColumn = useCallback((colId, updates) => {
        if (!selectedItem) return;
        // Handle both index-based and id-based updates
        const newColumns = selectedItem.columns?.map((col, index) => {
            if (typeof colId === 'number' ? index === colId : col.id === colId) {
                return { ...col, ...updates };
            }
            return col;
        });
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleDeleteColumn = useCallback((colId) => {
        if (!selectedItem) return;
        // Handle both index-based and id-based deletes
        const newColumns = typeof colId === 'number'
            ? selectedItem.columns?.filter((_, index) => index !== colId)
            : selectedItem.columns?.filter(col => col.id !== colId);
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleReorderColumns = useCallback((event) => {
        if (!selectedItem) return;
        const { active, over } = event;
        if (active.id !== over?.id) {
            const columns = selectedItem.columns || [];
            const oldIndex = columns.findIndex(c => c.id === active.id);
            const newIndex = columns.findIndex(c => c.id === over.id);
            handleUpdateItem('columns', arrayMove(columns, oldIndex, newIndex));
        }
    }, [selectedItem, handleUpdateItem]);

    // ========================================
    // Link Operations
    // ========================================

    const handleAddLink = useCallback((colIndex) => {
        if (!selectedItem) return;
        const newLink = { id: `link-${Date.now()}`, label: 'New Link', url: '#' };
        const newColumns = selectedItem.columns?.map((col, idx) =>
            idx === colIndex ? { ...col, links: [...(col.links || []), newLink] } : col
        );
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleUpdateLink = useCallback((colIndex, linkIndex, updates) => {
        if (!selectedItem) return;
        const newColumns = selectedItem.columns?.map((col, cIdx) => {
            if (cIdx !== colIndex) return col;
            const newLinks = col.links?.map((link, lIdx) =>
                lIdx === linkIndex ? { ...link, ...updates } : link
            );
            return { ...col, links: newLinks };
        });
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleDeleteLink = useCallback((colIndex, linkIndex) => {
        if (!selectedItem) return;
        const newColumns = selectedItem.columns?.map((col, cIdx) => {
            if (cIdx !== colIndex) return col;
            return { ...col, links: col.links?.filter((_, lIdx) => lIdx !== linkIndex) };
        });
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleReorderLinks = useCallback((colIndex, event) => {
        if (!selectedItem) return;
        const { active, over } = event;
        if (active.id !== over?.id) {
            const column = selectedItem.columns?.[colIndex];
            if (!column) return;
            const oldIndex = column.links?.findIndex(l => l.id === active.id);
            const newIndex = column.links?.findIndex(l => l.id === over.id);
            const newLinks = arrayMove(column.links, oldIndex, newIndex);
            const newColumns = selectedItem.columns?.map((col, idx) =>
                idx === colIndex ? { ...col, links: newLinks } : col
            );
            handleUpdateItem('columns', newColumns);
        }
    }, [selectedItem, handleUpdateItem]);

    // ========================================
    // Section Toggle
    // ========================================

    const toggleSection = useCallback((section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    }, []);

    return {
        // State
        items,
        selectedItem,
        selectedItemId,
        setSelectedItemId,
        openSections,
        sensors,
        menuKey,

        // Item operations
        handleAddItem,
        handleUpdateItem,
        handleDeleteItem,
        handleDragEnd,

        // Column operations
        handleAddColumn,
        handleUpdateColumn,
        handleDeleteColumn,
        handleReorderColumns,

        // Link operations
        handleAddLink,
        handleUpdateLink,
        handleDeleteLink,
        handleReorderLinks,

        // Section toggle
        toggleSection,
    };
}

export default useMenuEditor;
