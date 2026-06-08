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
import { Button } from '@/ui/button';
import { ScrollArea } from '@/ui/scroll-area';
import type { MenuLocation } from '@modules/menus/types/menus.types';

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
import type { MenuSettingsProps } from './types/menu-editor.types';

// Tab configurations
export const menuSettingsTabs: Array<{ value: MenuLocation; label: string; icon: typeof Menu }> = [
    { value: 'header', label: 'Header Menu', icon: Menu },
    { value: 'footer', label: 'Footer Menu', icon: Menu },
    { value: 'mobile', label: 'Mobile Menu', icon: Menu },
    { value: 'sidebar', label: 'Sidebar Menu', icon: Menu },
];

// ============================================
// MAIN COMPONENT
// ============================================
function isMenuLocation(value: string | undefined): value is MenuLocation {
    return value === 'header' || value === 'footer' || value === 'mobile' || value === 'sidebar';
}

export default function MenuSettings({ formData, handleInputChange, activeSection, setHeaderActions }: MenuSettingsProps) {
    // Sync activeTab with activeSection from parent
    const [activeTab, setActiveTab] = React.useState<MenuLocation>(isMenuLocation(activeSection) ? activeSection : 'header');

    // Sync when activeSection changes
    useEffect(() => {
        if (isMenuLocation(activeSection)) {
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
            documentSettings={null}
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
            canvasClassName=""
            className=""
        >
            {/* Canvas Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-gray-100 px-6 py-3 -mx-6 -mt-6 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                            <Menu className="size-4 text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900">
                                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Menu
                            </h2>
                            <p className="text-xs text-gray-500">
                                {items.length} {items.length === 1 ? 'item' : 'items'}
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={handleAddItem}
                        size="sm"
                        className="gap-2 bg-primary hover:bg-primary/90 text-white"
                    >
                        <Plus className="size-4" />
                        Add Item
                    </Button>
                </div>
            </div>

            {/* Menu Items List */}
            <ScrollArea className="flex-1">
                <div className="space-y-3 pb-8">
                    {items.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                                <Menu className="size-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No menu items yet</h3>
                            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                                Start building your {activeTab} navigation by adding menu items
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
