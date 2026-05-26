/**
 * MenuItemInspector - Right sidebar inspector for menu item settings
 * 
 * Features:
 * - General settings (label, type, link)
 * - Mega menu structure (columns with drag-and-drop)
 * - Featured content slot configuration
 */

import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { ChangeEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import { Textarea } from '@/ui/textarea';
import { cn } from '@/lib/utils';
import { SidebarSection } from '@/components/BlockEditor/components/RightPanel';
import { ArticlePicker, LinkSelector } from '@/components/pickers';
import type { ArticlePickerValue } from '@/components/pickers';
import { resolveVariantUrl } from '@shared/types/images';
import SortableColumnCard from './SortableColumnCard';
import type {
    MenuItem,
    MenuFeaturedItem,
    MenuItemInspectorProps,
    MenuTarget,
} from '../../types/menu-editor.types';

const mapFeaturedItemToPickerValue = (featuredItem?: MenuFeaturedItem): ArticlePickerValue | null => {
    if (!featuredItem) return null;
    return {
        articleId: featuredItem.target.id || '',
        title: featuredItem.label,
        url: featuredItem.target.href,
        image: resolveVariantUrl(featuredItem.image?.variants?.xs) || '',
        description: featuredItem.description || '',
    };
};

const getTargetHref = (item: MenuItem) => item.target?.href || '#';
const updateTargetHref = (item: MenuItem, href: string): MenuTarget => ({
    ...(item.target || {}),
    type: href?.startsWith('http') ? 'external_url' : 'internal_route',
    href,
});

const createFeaturedItem = (): MenuFeaturedItem => ({
    id: `featured-${Date.now()}`,
    type: 'featured_item',
    label: 'Featured',
    description: '',
    target: { type: 'internal_route', href: '#' },
});

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
}: MenuItemInspectorProps) => {
    if (!item) return null;

    return (
        <div className="space-y-0">
            {/* 1. General Settings Panel */}
            <SidebarSection title="General" defaultOpen={true}>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Navigation Label</Label>
                        <Input
                            type="text"
                            value={item.label}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => handleUpdate('label', e.target.value)}
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
                                url={getTargetHref(item)}
                                onUrlChange={(url: string) => handleUpdate('target', updateTargetHref(item, url))}
                                onLabelChange={(label: string) => handleUpdate('label', label)}
                                currentLabel={item.label}
                            />
                        </div>
                    )}

                    <div className="pt-2 space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-normal text-foreground">Open in new tab</Label>
                            <Switch
                                checked={item.open_in_new_tab || false}
                                className="scale-90"
                                onCheckedChange={(checked: boolean) => handleUpdate('open_in_new_tab', checked)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-normal text-foreground">Highlight</Label>
                            <Switch
                                checked={item.highlight}
                                className="scale-90"
                                onCheckedChange={(checked: boolean) => handleUpdate('highlight', checked)}
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
                            <SortableContext items={(item.columns || []).map((column) => column.id)} strategy={verticalListSortingStrategy}>
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
                            <Label className="text-sm font-medium">Enable Featured Items</Label>
                            <Switch
                                checked={(item.featured_items || []).length > 0}
                                onCheckedChange={(checked: boolean) => handleUpdate('featured_items', checked ? [createFeaturedItem()] : [])}
                                className="scale-90"
                            />
                        </div>

                        {(item.featured_items || []).length > 0 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="space-y-1">
                                    <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Target Article</Label>
                                    <ArticlePicker
                                        value={mapFeaturedItemToPickerValue(item.featured_items?.[0])}
                                        onChange={(article: ArticlePickerValue | null) => {
                                            const featured = item.featured_items?.[0] || createFeaturedItem();
                                            if (article) {
                                                const { articleId, title, url, description } = article;
                                                handleUpdate('featured_items', [{
                                                    ...featured,
                                                    id: featured.id || `featured-${Date.now()}`,
                                                    type: 'featured_item',
                                                    label: title || featured.label || 'Featured',
                                                    target: {
                                                        type: 'article',
                                                        id: typeof articleId === 'string' ? parseInt(articleId, 10) || undefined : articleId,
                                                        href: url || featured.target?.href || '#',
                                                        snapshot: { title: title || featured.label || 'Featured' },
                                                    },
                                                    description: description || featured.description,
                                                }]);
                                            } else {
                                                handleUpdate('featured_items', []);
                                            }
                                        }}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Custom Title</Label>
                                    <Input
                                        type="text"
                                        value={item.featured_items?.[0]?.label || ''}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleUpdate('featured_items', [{ ...(item.featured_items?.[0] || createFeaturedItem()), label: e.target.value }])}
                                        placeholder="Override default title"
                                        className="h-8 rounded-sm border-input text-sm"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="uppercase text-[11px] font-semibold text-muted-foreground mb-1 block">Description</Label>
                                    <Textarea
                                        value={item.featured_items?.[0]?.description || ''}
                                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => handleUpdate('featured_items', [{ ...(item.featured_items?.[0] || createFeaturedItem()), description: e.target.value }])}
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
