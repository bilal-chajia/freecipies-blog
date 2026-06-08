import type { ReactNode } from 'react';
import type { DragEndEvent, SensorDescriptor, SensorOptions } from '@dnd-kit/core';
import type {
  MenuColumn,
  MenuDocument,
  MenuFeaturedItem,
  MenuItem,
  MenuLocation,
  MenuTarget,
} from '@modules/menus/types/menus.types';

export type {
  MenuColumn,
  MenuDocument,
  MenuFeaturedItem,
  MenuItem,
  MenuLocation,
  MenuTarget,
};

export type MenuKey = `menu_${MenuLocation}`;

export type MenuFormData = Partial<Record<MenuKey, MenuDocument>> & Record<string, unknown>;

export type MenuInputChangeHandler = (field: string, value: unknown) => void;

export type MenuSensors = SensorDescriptor<SensorOptions>[];

export type MenuItemUpdateKey = keyof MenuItem;
export type MenuItemUpdateValue<K extends MenuItemUpdateKey = MenuItemUpdateKey> = MenuItem[K];

export type MenuItemUpdateHandler = <K extends MenuItemUpdateKey>(
  key: K,
  value: MenuItemUpdateValue<K>,
) => void;

export type MenuColumnUpdate = Partial<MenuColumn>;
export type MenuLinkUpdate = Partial<MenuItem>;

export interface UseMenuEditorResult {
  items: MenuItem[];
  selectedItem: MenuItem | null;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  openSections: Record<string, boolean>;
  sensors: MenuSensors;
  menuKey: MenuKey;
  handleAddItem: () => void;
  handleUpdateItem: MenuItemUpdateHandler;
  handleDeleteItem: (id: string, event?: { stopPropagation: () => void }) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleAddColumn: () => void;
  handleUpdateColumn: (columnIdOrIndex: string | number, updates: MenuColumnUpdate) => void;
  handleDeleteColumn: (columnIdOrIndex: string | number) => void;
  handleReorderColumns: (event: DragEndEvent) => void;
  handleAddLink: (columnIndex: number) => void;
  handleUpdateLink: (columnIndex: number, linkIndex: number, updates: MenuLinkUpdate) => void;
  handleDeleteLink: (columnIndex: number, linkIndex: number) => void;
  handleReorderLinks: (columnIndex: number, event: DragEndEvent) => void;
  toggleSection: (section: string) => void;
}

export interface MenuSettingsProps {
  formData: MenuFormData;
  handleInputChange: MenuInputChangeHandler;
  activeSection?: string;
  setHeaderActions?: (actions: ReactNode | null) => void;
}

export interface MenuItemInspectorProps {
  item: MenuItem | null;
  handleUpdate: MenuItemUpdateHandler;
  sensors: MenuSensors;
  handleAddColumn: () => void;
  handleReorderColumns: (event: DragEndEvent) => void;
  handleUpdateColumn: (columnIdOrIndex: string | number, updates: MenuColumnUpdate) => void;
  handleDeleteColumn: (columnIdOrIndex: string | number) => void;
  handleAddLink: (columnIndex: number) => void;
  handleUpdateLink: (columnIndex: number, linkIndex: number, updates: MenuLinkUpdate) => void;
  handleDeleteLink: (columnIndex: number, linkIndex: number) => void;
  handleReorderLinks: (columnIndex: number, event: DragEndEvent) => void;
}

export interface SortableColumnCardProps {
  column: MenuColumn;
  colIndex: number;
  onUpdateColumn: (columnIdOrIndex: string | number, updates: MenuColumnUpdate) => void;
  onDeleteColumn: (columnIdOrIndex: string | number) => void;
  onAddLink: (columnIndex: number) => void;
  onUpdateLink: (columnIndex: number, linkIndex: number, updates: MenuLinkUpdate) => void;
  onDeleteLink: (columnIndex: number, linkIndex: number) => void;
  onReorderLinks: (columnIndex: number, event: DragEndEvent) => void;
  sensors: MenuSensors;
}

export interface SortableLinkRowProps {
  link: MenuItem;
  colIndex: number;
  linkIndex: number;
  onUpdateLink: (columnIndex: number, linkIndex: number, updates: MenuLinkUpdate) => void;
  onDeleteLink: (columnIndex: number, linkIndex: number) => void;
}

export interface SortableMenuItemRowProps {
  item: MenuItem;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

export interface MegaMenuPreviewProps {
  items: MenuItem[];
  setHeaderActions?: (actions: ReactNode | null) => void;
}

