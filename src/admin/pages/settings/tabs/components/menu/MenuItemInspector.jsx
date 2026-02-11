/**
 * MenuItemInspector - Right sidebar inspector for menu item settings
 * 
 * Features:
 * - General settings (label, type, link)
 * - Mega menu structure (columns with drag-and-drop)
 * - Featured content slot configuration
 */

import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Label } from '@/ui/label.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { cn } from '@/lib/utils';
import { SidebarSection } from '@/components/BlockEditor/components/SettingsSidebar';
import { ImagePickerField, ArticlePicker, LinkSelector } from '@/components/pickers';
import SortableColumnCard from './SortableColumnCard';

const MenuItemInspector = ({
    item,
    handleUpdate,
    sensors,
    handleAddColumn,
    handleReorderColumns,
    handleUpdateColumn,
    handleDeleteColumn,
    handleAddLink,
    handleUpdateLink,
    handleDeleteLink,
    handleReorderLinks
}) => {
    if (!item) return null;

    return (
        <div className="space-y-0">
            {/* 1. General Settings Panel */}
            <SidebarSection title="General" defaultOpen={true}>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Navigation Label</Label>
                        <Input
                            value={item.label}
                            onChange={(e) => handleUpdate('label', e.target.value)}
                            className="h-8 rounded-sm border-input focus:border-ring focus:ring-ring/20"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Type</Label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleUpdate('type', 'link')}
                                className={cn(
                                    "flex-1 py-1 px-2 text-xs border rounded-sm transition-all",
                                    item.type === 'link'
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-muted-foreground border-input hover:border-primary"
                                )}
                            >
                                Simple Link
                            </button>
                            <button
                                onClick={() => handleUpdate('type', 'mega')}
                                className={cn(
                                    "flex-1 py-1 px-2 text-xs border rounded-sm transition-all",
                                    item.type === 'mega'
                                        ? "bg-primary text-primary-foreground border-primary"
                                        : "bg-background text-muted-foreground border-input hover:border-primary"
                                )}
                            >
                                Mega Menu
                            </button>
                        </div>
                    </div>

                    {item.type === 'link' && (
                        <div className="space-y-1">
                            <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Link</Label>
                            <LinkSelector
                                url={item.url}
                                onUrlChange={(url) => handleUpdate('url', url)}
                                onLabelChange={(label) => handleUpdate('label', label)}
                                currentLabel={item.label}
                            />
                        </div>
                    )}

                    <div className="pt-2 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-normal text-foreground">Open in new tab</Label>
                            <Switch
                                checked={item.openInNewTab}
                                onCheckedChange={(checked) => handleUpdate('openInNewTab', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-normal text-foreground">Highlight</Label>
                            <Switch
                                checked={item.highlight}
                                onCheckedChange={(checked) => handleUpdate('highlight', checked)}
                            />
                        </div>
                    </div>
                </div>
            </SidebarSection>

            {/* 2. Mega Menu Structure Panel */}
            {item.type === 'mega' && (
                <SidebarSection title="Menu Structure">
                    <div className="space-y-4">
                        <div className="flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddColumn}
                                className="h-7 text-xs gap-1.5"
                            >
                                <Plus className="size-3" />
                                Add Column
                            </Button>
                        </div>

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleReorderColumns}
                        >
                            <SortableContext items={(item.columns || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-3">
                                    {item.columns?.map((col, index) => (
                                        <SortableColumnCard
                                            key={col.id}
                                            column={col}
                                            colIndex={index}
                                            onUpdateColumn={handleUpdateColumn}
                                            onDeleteColumn={handleDeleteColumn}
                                            onAddLink={handleAddLink}
                                            onUpdateLink={handleUpdateLink}
                                            onDeleteLink={handleDeleteLink}
                                            onReorderLinks={handleReorderLinks}
                                            sensors={sensors}
                                        />
                                    ))}
                                    {(!item.columns || item.columns.length === 0) && (
                                        <div className="text-center py-4 bg-muted/30 border border-dashed border-border rounded-sm text-muted-foreground text-sm">
                                            No columns yet.
                                        </div>
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                </SidebarSection>
            )}

            {/* 3. Featured Slot Panel */}
            {item.type === 'mega' && (
                <SidebarSection title="Featured Content">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-medium">Enable Featured Slot</Label>
                            <Switch
                                checked={item.featured?.enabled || false}
                                onCheckedChange={(checked) => handleUpdate('featured', { ...item.featured, enabled: checked })}
                                className="scale-90"
                            />
                        </div>

                        {item.featured?.enabled && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1">
                                    <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Article</Label>
                                    <ArticlePicker
                                        value={item.featured}
                                        onChange={(article) => {
                                            if (article) {
                                                const { articleId, title, url, image, description } = article;
                                                handleUpdate('featured', {
                                                    ...item.featured,
                                                    articleId,
                                                    title: title || item.featured?.title,
                                                    url: url || item.featured?.url,
                                                    image: image || item.featured?.image,
                                                    description: description || item.featured?.description
                                                });
                                            } else {
                                                handleUpdate('featured', { ...item.featured, articleId: null });
                                            }
                                        }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Custom Title</Label>
                                    <Input
                                        value={item.featured.title || ''}
                                        onChange={(e) => handleUpdate('featured', { ...item.featured, title: e.target.value })}
                                        placeholder="Override default title"
                                        className="h-8 rounded-sm border-input text-sm"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Custom Image</Label>
                                    <ImagePickerField
                                        value={item.featured.image || ''}
                                        onChange={(url) => handleUpdate('featured', { ...item.featured, image: url })}
                                        placeholder="Override default image"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Description</Label>
                                    <Textarea
                                        value={item.featured.description || ''}
                                        onChange={(e) => handleUpdate('featured', { ...item.featured, description: e.target.value })}
                                        rows={3}
                                        className="resize-none rounded-sm border-input text-sm min-h-16"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </SidebarSection>
            )}
        </div>
    );
};

export default MenuItemInspector;
