/**
 * MenuSettings - Navigation Menu Management
 * 
 * Professional mega menu editor with:
 * - Header/Footer menu switching
 * - Drag-and-drop menu item reordering
 * - Multi-column mega menu structure
 * - Featured content slots
 * - Live preview
 * 
 * Refactored to use modular components and custom hook.
 */

import React, { useEffect, useMemo } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Menu, Plus } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { ScrollArea } from '@/ui/scroll-area.jsx';

// Layout components
import GutenbergEditorLayout from '@/components/BlockEditor/components/GutenbergEditorLayout';

// Menu-specific components
import {
    SortableMenuItemRow,
    MenuItemInspector,
    MegaMenuPreview,
} from './components/menu';

// Custom hook
import { useMenuEditor } from './hooks/useMenuEditor';

// Tab configurations
export const menuSettingsTabs = [
    { value: 'header', label: 'Header Menu', icon: Menu },
    { value: 'footer', label: 'Footer Menu', icon: Menu },
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function MenuSettings({ formData, handleInputChange, activeSection, setHeaderActions }) {
    // Sync activeTab with activeSection from parent
    const [activeTab, setActiveTab] = React.useState(activeSection === 'footer' ? 'footer' : 'header');

    // Sync when activeSection changes
    useEffect(() => {
        if (activeSection === 'footer' || activeSection === 'header') {
            setActiveTab(activeSection);
        }
    }, [activeSection]);

    // Use custom hook for all menu operations
    const {
        items,
        selectedItem,
        selectedItemId,
        setSelectedItemId,
        sensors,
        handleAddItem,
        handleUpdateItem,
        handleDeleteItem,
        handleDragEnd,
        handleAddColumn,
        handleUpdateColumn,
        handleDeleteColumn,
        handleReorderColumns,
        handleAddLink,
        handleUpdateLink,
        handleDeleteLink,
        handleReorderLinks,
    } = useMenuEditor(formData, handleInputChange, activeTab);

    // Memoize item IDs for SortableContext
    const itemIds = useMemo(() => items.map(item => item.id), [items]);

    return (
        <GutenbergEditorLayout
            contentType="menu"
            defaultSidebarOpen={false}
            blockSettings={
                selectedItem ? (
                    <MenuItemInspector
                        item={selectedItem}
                        handleUpdate={handleUpdateItem}
                        sensors={sensors}
                        handleAddColumn={handleAddColumn}
                        handleReorderColumns={handleReorderColumns}
                        handleUpdateColumn={handleUpdateColumn}
                        handleDeleteColumn={handleDeleteColumn}
                        handleAddLink={handleAddLink}
                        handleUpdateLink={handleUpdateLink}
                        handleDeleteLink={handleDeleteLink}
                        handleReorderLinks={handleReorderLinks}
                    />
                ) : null
            }
            selectedBlock={selectedItem}
            onInsertBlock={handleAddItem}
        >
            {/* Canvas Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-gray-100 px-6 py-3 -mx-6 -mt-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#f7931e] flex items-center justify-center shadow-sm">
                            <Menu className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">
                                {activeTab === 'header' ? 'Header Menu' : 'Footer Menu'}
                            </h2>
                            <p className="text-xs text-gray-500">
                                {items.length} {items.length === 1 ? 'item' : 'items'}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleAddItem}
                        size="sm"
                        className="gap-2 bg-[#2271b1] hover:bg-[#135e96] text-white"
                    >
                        <Plus className="w-4 h-4" />
                        Add Item
                    </Button>
                </div>
            </div>

            {/* Menu Items List */}
            <ScrollArea className="flex-1">
                <div className="space-y-3 pb-8">
                    {items.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                <Menu className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No menu items yet</h3>
                            <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                                Start building your {activeTab === 'header' ? 'header' : 'footer'} navigation by adding menu items
                            </p>
                            <Button onClick={handleAddItem} className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add Your First Item
                            </Button>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                                {items.map((item) => (
                                    <SortableMenuItemRow
                                        key={item.id}
                                        item={item}
                                        isSelected={selectedItemId === item.id}
                                        onClick={() => setSelectedItemId(item.id)}
                                        onDelete={(e) => handleDeleteItem(item.id, e)}
                                    />
                                ))}
                            </SortableContext>
                        </DndContext>
                    )}
                </div>
            </ScrollArea>

            {/* Preview Component */}
            <MegaMenuPreview items={items} setHeaderActions={setHeaderActions} />
        </GutenbergEditorLayout>
    );
}
