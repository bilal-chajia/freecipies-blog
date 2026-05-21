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
import type { DragEndEvent } from '@dnd-kit/core';
import type {
    MenuColumn,
    MenuDocument,
    MenuFormData,
    MenuInputChangeHandler,
    MenuItem,
    MenuItemUpdateKey,
    MenuItemUpdateValue,
    MenuKey,
    MenuLinkUpdate,
    MenuLocation,
    UseMenuEditorResult,
} from '../types/menu-editor.types';

function emptyMenuDocument(location: MenuLocation): MenuDocument {
    return {
        location,
        is_enabled: true,
        fallback_to: location === 'mobile' ? 'header' : null,
        items: [],
    };
}

function createMenuItem(): MenuItem {
    return {
        id: `menu-${Date.now()}`,
        label: 'New Item',
        type: 'link',
        is_enabled: true,
        visibility: 'all',
        highlight: false,
        target: {
            type: 'internal_route',
            href: '#',
        },
        columns: [],
        featured_items: [],
    };
}

function createMenuColumn(): MenuColumn {
    return { id: `col-${Date.now()}`, title: 'New Column', items: [] };
}

function createMenuLink(): MenuItem {
    return {
        id: `link-${Date.now()}`,
        label: 'New Link',
        type: 'link',
        is_enabled: true,
        visibility: 'all',
        highlight: false,
        target: {
            type: 'internal_route',
            href: '#',
        },
    };
}

export function useMenuEditor(
    formData: MenuFormData,
    handleInputChange: MenuInputChangeHandler,
    activeTab: MenuLocation,
): UseMenuEditorResult {
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [openSections, setOpenSections] = useState<Record<string, boolean>>({ general: true, mega: true, featured: false });

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const menuKey: MenuKey = `menu_${activeTab}`;
    const document = formData[menuKey] || emptyMenuDocument(activeTab);
    const items = document.items || [];

    // Reset selection when tab changes
    useEffect(() => {
        setSelectedItemId(null);
    }, [activeTab]);

    // Get selected item
    const selectedItem = useMemo(() => {
        return items.find((item) => item.id === selectedItemId) || null;
    }, [items, selectedItemId]);

    // Update items helper
    const updateDocument = useCallback((updates: Partial<MenuDocument>) => {
        handleInputChange(menuKey, {
            ...document,
            location: activeTab,
            ...(activeTab === 'mobile' ? { fallback_to: document.fallback_to ?? 'header' } : { fallback_to: null }),
            ...updates,
        });
    }, [activeTab, document, handleInputChange, menuKey]);

    const updateItems = useCallback((newItems: MenuItem[]) => {
        updateDocument({ items: newItems });
    }, [updateDocument]);

    // ========================================
    // Item Operations
    // ========================================

    const handleUpdateItem = useCallback(<K extends MenuItemUpdateKey>(key: K, value: MenuItemUpdateValue<K>) => {
        if (!selectedItemId) return;
        const newItems = items.map((item) =>
            item.id === selectedItemId ? { ...item, [key]: value } : item
        );
        updateItems(newItems);
    }, [items, selectedItemId, updateItems]);

    const handleAddItem = useCallback(() => {
        const newItem = createMenuItem();
        updateItems([...items, newItem]);
        setSelectedItemId(newItem.id);
    }, [items, updateItems]);

    const handleDeleteItem = useCallback((id: string, e?: { stopPropagation: () => void }) => {
        if (e) {
            e.stopPropagation();
        }
        updateItems(items.filter((item) => item.id !== id));
        if (selectedItemId === id) {
            setSelectedItemId(null);
        }
    }, [items, selectedItemId, updateItems]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return;
            updateItems(arrayMove(items, oldIndex, newIndex));
        }
    }, [items, updateItems]);

    // ========================================
    // Column Operations
    // ========================================

    const handleAddColumn = useCallback(() => {
        if (!selectedItem) return;
        const newColumn = createMenuColumn();
        handleUpdateItem('columns', [...(selectedItem.columns || []), newColumn]);
    }, [selectedItem, handleUpdateItem]);

    const handleUpdateColumn = useCallback((colId: string | number, updates: Partial<MenuColumn>) => {
        if (!selectedItem) return;
        // Handle both index-based and id-based updates
        const newColumns = (selectedItem.columns || []).map((col, index) => {
            if (typeof colId === 'number' ? index === colId : col.id === colId) {
                return { ...col, ...updates };
            }
            return col;
        });
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleDeleteColumn = useCallback((colId: string | number) => {
        if (!selectedItem) return;
        // Handle both index-based and id-based deletes
        const newColumns = typeof colId === 'number'
            ? (selectedItem.columns || []).filter((_, index) => index !== colId)
            : (selectedItem.columns || []).filter((col) => col.id !== colId);
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleReorderColumns = useCallback((event: DragEndEvent) => {
        if (!selectedItem) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const columns = selectedItem.columns || [];
            const oldIndex = columns.findIndex((column) => column.id === active.id);
            const newIndex = columns.findIndex((column) => column.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return;
            handleUpdateItem('columns', arrayMove(columns, oldIndex, newIndex));
        }
    }, [selectedItem, handleUpdateItem]);

    // ========================================
    // Link Operations
    // ========================================

    const handleAddLink = useCallback((colIndex: number) => {
        if (!selectedItem) return;
        const newLink = createMenuLink();
        const newColumns = (selectedItem.columns || []).map((col, idx) =>
            idx === colIndex ? { ...col, items: [...(col.items || []), newLink] } : col
        );
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleUpdateLink = useCallback((colIndex: number, linkIndex: number, updates: MenuLinkUpdate) => {
        if (!selectedItem) return;
        const newColumns = (selectedItem.columns || []).map((col, cIdx) => {
            if (cIdx !== colIndex) return col;
            const newLinks = (col.items || [])?.map((link, lIdx) =>
                lIdx === linkIndex ? { ...link, ...updates } : link
            );
            return { ...col, items: newLinks };
        });
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleDeleteLink = useCallback((colIndex: number, linkIndex: number) => {
        if (!selectedItem) return;
        const newColumns = (selectedItem.columns || []).map((col, cIdx) => {
            if (cIdx !== colIndex) return col;
            return { ...col, items: (col.items || [])?.filter((_, lIdx) => lIdx !== linkIndex) };
        });
        handleUpdateItem('columns', newColumns);
    }, [selectedItem, handleUpdateItem]);

    const handleReorderLinks = useCallback((colIndex: number, event: DragEndEvent) => {
        if (!selectedItem) return;
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const column = selectedItem.columns?.[colIndex];
            if (!column) return;
            const columnItems = column.items || [];
            const oldIndex = columnItems.findIndex((link) => link.id === active.id);
            const newIndex = columnItems.findIndex((link) => link.id === over.id);
            if (oldIndex < 0 || newIndex < 0) return;
            const newLinks = arrayMove(columnItems, oldIndex, newIndex);
            const newColumns = (selectedItem.columns || []).map((col, idx) =>
                idx === colIndex ? { ...col, items: newLinks } : col
            );
            handleUpdateItem('columns', newColumns);
        }
    }, [selectedItem, handleUpdateItem]);

    // ========================================
    // Section Toggle
    // ========================================

    const toggleSection = useCallback((section: string) => {
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
