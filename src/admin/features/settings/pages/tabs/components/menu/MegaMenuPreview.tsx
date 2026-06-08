/**
 * MegaMenuPreview - Full-page preview modal for mega menu
 * 
 * Features:
 * - Simulated website header with navigation
 * - Animated mega menu dropdowns
 * - Featured content display
 * - Category/tag data enrichment from API
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/ui/button';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/ui/sheet';
import { cn } from '@/lib/utils';
import { toAdminImageUrl } from '@admin/utils/helpers';
import api from '@admin/services/api-client';
import { resolveVariantUrl } from '@shared/types/images';
import type { MegaMenuPreviewProps, MenuItem } from '../../types/menu-editor.types';

interface MetadataItem {
    id?: number;
    slug?: string;
    label?: string;
    name?: string;
    color?: string;
    parent_id?: number | null;
    depth?: number;
    images_json?: string | Record<string, unknown> | null;
    style_json?: string | Record<string, unknown> | null;
}

type EnrichedMetadata = MetadataItem & {
    type: 'category' | 'tag';
    color: string;
    thumbnail?: string;
    iconSvg?: string | null;
};

function parseRecord(value: unknown): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {};
        } catch {
            return {};
        }
    }
    return typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function optionalString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

const MegaMenuPreview = ({ items, setHeaderActions }: MegaMenuPreviewProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeItem, setActiveItem] = useState<string | null>(null);
    const [dbData, setDbData] = useState<{ categories: MetadataItem[]; tags: MetadataItem[] }>({ categories: [], tags: [] });

    // Register header button
    useEffect(() => {
        if (setHeaderActions) {
            setHeaderActions(
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(true)}
                    className="h-8 px-3 gap-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                    title="Preview Menu"
                >
                    <Eye className="size-4" />
                    Preview
                </Button>
            );
        }
        return () => {
            if (setHeaderActions) setHeaderActions(null);
        };
    }, [setHeaderActions, items.length]);

    // Fetch Categories and Tags for rich preview
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                try {
                    const [catsRes, tagsRes] = await Promise.all([
                        api.get('/categories', { params: { limit: 100 } }),
                        api.get('/tags', { params: { limit: 100 } })
                    ]);
                    const cats: unknown = catsRes.data;
                    const tags: unknown = tagsRes.data;
                    setDbData({
                        categories: Array.isArray(cats) ? cats : parseRecord(cats).data as MetadataItem[] || [],
                        tags: Array.isArray(tags) ? tags : parseRecord(tags).data as MetadataItem[] || []
                    });
                } catch (err) {
                    console.error("Failed to fetch menu metadata", err);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    // Helper: Enrich link with DB data and Hierarchy
    const getHref = (item: MenuItem | null | undefined) => item?.target?.href || '#';

    const getEnrichedData = (url: string): EnrichedMetadata | null => {
        if (!url) return null;

        // Check Categories
        if (url.includes('/categories/')) {
            const slug = url.split('/categories/')[1];
            const cat = dbData.categories.find((category) => category.slug === slug);
            if (cat) {
                const images = parseRecord(cat.images_json);
                return {
                    type: 'category',
                    ...cat,
                    color: cat.color || '#ff6b35',
                    thumbnail: optionalString(images.thumbnail) || optionalString(images.hero),
                };
            }
        }

        // Check Tags
        if (url.includes('/tags/')) {
            const slug = url.split('/tags/')[1];
            const tag = dbData.tags.find((tag) => tag.slug === slug);
            if (tag) {
                const styles = parseRecord(tag.style_json);
                return {
                    type: 'tag',
                    ...tag,
                    color: optionalString(styles.color) || '#3b82f6',
                    iconSvg: null,
                };
            }
        }

        return null;
    };

    if (!isOpen) return null;

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetContent side="right" className="w-full sm:max-w-[calc(100vw-100px)] lg:max-w-7xl p-0 flex flex-col">
                {/* Header */}
                <SheetHeader className="px-6 py-4 border-b bg-background shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <SheetTitle>Menu Preview</SheetTitle>
                            <SheetDescription>
                                Preview how your navigation will appear on the site
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                {/* Preview Content */}
                <div className="flex-1 overflow-y-auto bg-background">
                    {/* Simulated Website */}
                    <div className="min-h-full">
                        {/* Simulated Header */}
                        <header className="bg-background/90 backdrop-blur-md sticky top-0 z-50 border-b border-border/50">
                            <div className="max-w-7xl mx-auto px-6 py-4">
                                <div className="flex items-center gap-8">
                                    {/* Logo */}
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="size-10 rounded-xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                                            <Star className="size-6 text-primary-foreground" />
                                        </div>
                                        <span className="font-bold text-xl text-foreground tracking-tight">Recipies SaaS</span>
                                    </div>

                                    {/* Navigation */}
                                    <nav className="flex items-center gap-1">
                                        {items.filter((item) => item.is_enabled !== false).map((item) => (
                                            <div
                                                key={item.id}
                                                className="relative group"
                                                onMouseEnter={() => setActiveItem(item.type === 'mega' ? item.id : null)}
                                                onMouseLeave={() => setActiveItem(null)}
                                            >
                                                <button
                                                    className={cn(
                                                        'relative px-4 py-2.5 text-sm font-medium rounded-full transition-colors z-10',
                                                        activeItem === item.id ? 'text-primary' : 'text-muted-foreground hover:text-primary'
                                                    )}
                                                >
                                                    {/* Animated Pill Background */}
                                                    {activeItem === item.id && (
                                                        <motion.div
                                                            layoutId="nav-pill"
                                                            className="absolute inset-0 bg-primary/10 rounded-full -z-10"
                                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                        />
                                                    )}

                                                    <span className="relative z-10 flex items-center gap-1">
                                                        {item.label}
                                                        {item.type === 'mega' && (
                                                            <ChevronDown className={cn(
                                                                "size-4 transition-transform duration-300",
                                                                activeItem === item.id && "rotate-180"
                                                            )} />
                                                        )}
                                                    </span>
                                                </button>

                                                {/* Mega Dropdown */}
                                                <AnimatePresence>
                                                    {activeItem === item.id && item.type === 'mega' && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.96, y: 10 }}
                                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                                            exit={{ opacity: 0, scale: 0.96, y: 8 }}
                                                            transition={{ type: "spring", duration: 0.4, bounce: 0 }}
                                                            className="absolute top-full left-0 mt-4 min-w-175 max-w-[90vw] bg-popover/95 backdrop-blur-xl rounded-3xl shadow-xl border border-border p-1 z-50 overflow-hidden"
                                                            style={{ transformOrigin: "top left" }}
                                                            onMouseEnter={() => setActiveItem(item.id)}
                                                            onMouseLeave={() => setActiveItem(null)}
                                                        >
                                                            <div className="flex bg-linear-to-br from-background to-muted/30 p-6 rounded-[20px]">
                                                                {/* Columns */}
                                                                <div
                                                                    className="flex-1 grid gap-8 p-2"
                                                                    style={{
                                                                        gridTemplateColumns: `repeat(${Math.min(item.columns?.length || 1, 3)}, minmax(200px, 1fr))`
                                                                    }}
                                                                >
                                                                    {item.columns?.map((col, idx) => (
                                                                        <div key={col.id} className="min-w-37.5">
                                                                            <h4 className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-4 pb-2 border-b border-primary/20">
                                                                                <span className="text-base">{['🥗', '🍰', '🥩', '🍹'][idx % 4]}</span>
                                                                                {col.title || 'Category'}
                                                                            </h4>
                                                                            <ul className="space-y-0.5">
                                                                                {(col.items || []).map((link, linkIdx) => {
                                                                                    const meta = getEnrichedData(getHref(link));
                                                                                    const links = col.items || [];
                                                                                    const prevLink = linkIdx > 0 ? links[linkIdx - 1] : null;
                                                                                    const prevMeta = getEnrichedData(getHref(prevLink));
                                                                                    const metaDepth = meta?.depth ?? 0;
                                                                                    const prevMetaDepth = prevMeta?.depth ?? 0;
                                                                                    const isNested = (meta?.type === 'category' && prevMeta?.type === 'category' && meta?.parent_id === prevMeta?.id)
                                                                                        || (metaDepth > 0 && !!prevMeta && metaDepth > prevMetaDepth);

                                                                                    return (
                                                                                        <li key={link.id} className={cn("relative group/link", isNested && "pl-5")}>
                                                                                            {isNested && (
                                                                                                <div className="absolute left-1.5 top-0 bottom-1/2 w-2.5 border-l border-b border-gray-200 rounded-bl-lg -z-10" />
                                                                                            )}

                                                                                            <a href="#" className="flex items-center w-full py-1.5 px-2 rounded-lg hover:bg-orange-50/50 transition-colors">
                                                                                                <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground group-hover/link:text-primary flex-1">
                                                                                                    {meta?.thumbnail ? (
                                                                                                        <div className="size-6 rounded-md overflow-hidden bg-muted shadow-sm shrink-0 group-hover/link:scale-110 transition-transform">
                                                                                                            <img src={meta.thumbnail} alt="" className="w-full h-full object-cover" />
                                                                                                        </div>
                                                                                                    ) : meta?.iconSvg ? (
                                                                                                        <div
                                                                                                            className="size-5 text-muted-foreground group-hover/link:text-primary transition-colors"
                                                                                                            dangerouslySetInnerHTML={{ __html: meta.iconSvg }}
                                                                                                        />
                                                                                                    ) : meta?.color ? (
                                                                                                        <span
                                                                                                            className="w-2 h-2 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                                                                                                            style={{ backgroundColor: meta.color }}
                                                                                                        />
                                                                                                    ) : (
                                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover/link:bg-[#ff6b35] transition-colors" />
                                                                                                    )}
                                                                                                    <span className="truncate">{link.label}</span>
                                                                                                </div>
                                                                                                <ChevronRight className="size-3.5 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-primary" />
                                                                                            </a>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                                {(!col.items || col.items.length === 0) && (
                                                                                    <li className="text-sm text-muted-foreground italic py-1 px-2">No links yet</li>
                                                                                )}
                                                                            </ul>
                                                                        </div>
                                                                    ))}
                                                                    {(!item.columns || item.columns.length === 0) && (
                                                                        <div className="text-sm text-muted-foreground italic p-4">No columns configured</div>
                                                                    )}
                                                                </div>

                                                                {/* Featured Section */}
                                                                {(item.featured_items || []).length > 0 && (
                                                                    <div className="w-70 shrink-0 pl-8 border-l border-border">
                                                                        {(() => {
                                                                            const featured = item.featured_items?.[0];
                                                                            if (!featured) return null;
                                                                            const image_url = toAdminImageUrl(resolveVariantUrl(featured.image?.variants?.sm) || resolveVariantUrl(featured.image?.variants?.xs));
                                                                            return (
                                                                        <div className="group/card relative h-full rounded-2xl overflow-hidden bg-card shadow-sm hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer border border-border ring-1 ring-border/50">
                                                                            {image_url ? (
                                                                                <div className="relative h-40 overflow-hidden">
                                                                                    <div className="absolute top-3 left-3 bg-background/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full text-primary shadow-sm z-10">
                                                                                        NEW RECIPE
                                                                                    </div>
                                                                                    <img
                                                                                        src={image_url}
                                                                                        alt=""
                                                                                        className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-700 ease-out"
                                                                                    />
                                                                                    <div className="absolute inset-0 bg-linear-to-t from-foreground/10 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="h-40 flex items-center justify-center bg-linear-to-br from-primary/5 to-primary/10">
                                                                                    <Star className="size-12 text-primary/20" />
                                                                                </div>
                                                                            )}
                                                                            <div className="p-5">
                                                                                <h3 className="font-serif text-lg font-bold text-card-foreground mb-2 leading-tight group-hover/card:text-primary transition-colors">
                                                                                    {featured.label || 'Featured Recipe'}
                                                                                </h3>
                                                                                {featured.description && (
                                                                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                                                                                        {featured.description}
                                                                                    </p>
                                                                                )}
                                                                                <div className="mt-4 flex items-center text-xs font-semibold text-primary">
                                                                                    Read More <span className="ml-1 group-hover/card:translate-x-1 transition-transform">→</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        ))}
                                    </nav>
                                </div>
                            </div>
                        </header>

                        {/* Page Content Placeholder */}
                        <div className="max-w-7xl mx-auto px-6 py-12">
                            <div className="bg-white rounded-2xl shadow-sm p-8 mb-6">
                                <p className="text-center text-lg text-muted-foreground">
                                    Hover over the menu items above to preview mega menu dropdowns
                                </p>
                            </div>

                            {/* Placeholder cards */}
                            <div className="grid grid-cols-3 gap-6">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                        <div className="h-40 bg-linear-to-br from-muted to-muted/50" />
                                        <div className="p-4">
                                            <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-muted/50 rounded w-1/2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default MegaMenuPreview;
