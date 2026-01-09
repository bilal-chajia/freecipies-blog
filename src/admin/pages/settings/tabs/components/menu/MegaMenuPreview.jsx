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
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/ui/sheet.jsx';
import { cn } from '@/lib/utils';

const MegaMenuPreview = ({ items, setHeaderActions }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeItem, setActiveItem] = useState(null);
    const [dbData, setDbData] = useState({ categories: [], tags: [] });

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
                    <Eye className="w-4 h-4" />
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
                        fetch('/api/categories?limit=100'),
                        fetch('/api/tags?limit=100')
                    ]);
                    const cats = await catsRes.json();
                    const tags = await tagsRes.json();
                    setDbData({
                        categories: Array.isArray(cats) ? cats : (cats.data || []),
                        tags: Array.isArray(tags) ? tags : (tags.data || [])
                    });
                } catch (err) {
                    console.error("Failed to fetch menu metadata", err);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    // Helper: Enrich link with DB data and Hierarchy
    const getEnrichedData = (url) => {
        if (!url) return null;

        // Check Categories
        if (url.includes('/categories/')) {
            const slug = url.split('/categories/')[1];
            const cat = dbData.categories.find(c => c.slug === slug);
            if (cat) {
                let images = {};
                try { images = JSON.parse(cat.imagesJson || '{}'); } catch (e) { }
                return { type: 'category', ...cat, color: cat.color || '#ff6b35', thumbnail: images.thumbnail || images.cover };
            }
        }

        // Check Tags
        if (url.includes('/tags/')) {
            const slug = url.split('/tags/')[1];
            const tag = dbData.tags.find(t => t.slug === slug);
            if (tag) {
                let styles = {};
                try { styles = typeof tag.styleJson === 'string' ? JSON.parse(tag.styleJson) : tag.styleJson; } catch (e) { }
                return { type: 'tag', ...tag, color: styles?.color || '#3b82f6', iconSvg: null };
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
                <div className="flex-1 overflow-y-auto bg-[#faf7f4]">
                    {/* Simulated Website */}
                    <div className="min-h-full">
                        {/* Simulated Header */}
                        <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100/50">
                            <div className="max-w-7xl mx-auto px-6 py-4">
                                <div className="flex items-center gap-8">
                                    {/* Logo */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#f7931e] flex items-center justify-center shadow-lg shadow-orange-500/20">
                                            <Star className="w-6 h-6 text-white" />
                                        </div>
                                        <span className="font-bold text-xl text-[#2a2a2a] tracking-tight">Recipies SaaS</span>
                                    </div>

                                    {/* Navigation */}
                                    <nav className="flex items-center gap-1">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="relative group"
                                                onMouseEnter={() => setActiveItem(item.type === 'mega' ? item.id : null)}
                                                onMouseLeave={() => setActiveItem(null)}
                                            >
                                                <button
                                                    className={cn(
                                                        'relative px-4 py-2.5 text-sm font-medium rounded-full transition-colors z-10',
                                                        activeItem === item.id ? 'text-[#ff6b35]' : 'text-gray-600 hover:text-[#ff6b35]'
                                                    )}
                                                >
                                                    {/* Animated Pill Background */}
                                                    {activeItem === item.id && (
                                                        <motion.div
                                                            layoutId="nav-pill"
                                                            className="absolute inset-0 bg-orange-50 rounded-full -z-10"
                                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                                        />
                                                    )}

                                                    <span className="relative z-10 flex items-center gap-1">
                                                        {item.label}
                                                        {item.type === 'mega' && (
                                                            <ChevronDown className={cn(
                                                                "w-4 h-4 transition-transform duration-300",
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
                                                            className="absolute top-full left-0 mt-4 min-w-[700px] max-w-[90vw] bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1),0_0_0_1px_rgba(0,0,0,0.03)] border border-white/40 p-1 z-50 overflow-hidden"
                                                            style={{ transformOrigin: "top left" }}
                                                            onMouseEnter={() => setActiveItem(item.id)}
                                                            onMouseLeave={() => setActiveItem(null)}
                                                        >
                                                            <div className="flex bg-gradient-to-br from-white to-gray-50/50 p-6 rounded-[20px]">
                                                                {/* Columns */}
                                                                <div
                                                                    className="flex-1 grid gap-8 p-2"
                                                                    style={{
                                                                        gridTemplateColumns: `repeat(${Math.min(item.columns?.length || 1, 3)}, minmax(200px, 1fr))`
                                                                    }}
                                                                >
                                                                    {item.columns?.map((col, idx) => (
                                                                        <div key={col.id} className="min-w-[150px]">
                                                                            <h4 className="flex items-center gap-2 text-xs font-bold text-[#ff6b35] uppercase tracking-wider mb-4 pb-2 border-b border-orange-100/60">
                                                                                <span className="text-base">{['🥗', '🍰', '🥩', '🍹'][idx % 4]}</span>
                                                                                {col.title || 'Category'}
                                                                            </h4>
                                                                            <ul className="space-y-0.5">
                                                                                {col.links?.map((link, linkIdx) => {
                                                                                    const meta = getEnrichedData(link.url);
                                                                                    const prevLink = linkIdx > 0 ? col.links[linkIdx - 1] : null;
                                                                                    const prevMeta = getEnrichedData(prevLink?.url);
                                                                                    const isNested = (meta?.type === 'category' && prevMeta?.type === 'category' && meta?.parentId === prevMeta?.id)
                                                                                        || (meta?.depth > 0 && prevMeta && meta.depth > prevMeta.depth);

                                                                                    return (
                                                                                        <li key={link.id} className={cn("relative group/link", isNested && "pl-5")}>
                                                                                            {isNested && (
                                                                                                <div className="absolute left-1.5 top-0 bottom-1/2 w-2.5 border-l border-b border-gray-200 rounded-bl-lg -z-10" />
                                                                                            )}

                                                                                            <a href="#" className="flex items-center w-full py-1.5 px-2 rounded-lg hover:bg-orange-50/50 transition-colors">
                                                                                                <div className="flex items-center gap-2.5 text-sm font-medium text-gray-600 group-hover/link:text-[#ff6b35] flex-1">
                                                                                                    {meta?.thumbnail ? (
                                                                                                        <div className="w-6 h-6 rounded-md overflow-hidden bg-gray-100 shadow-sm flex-shrink-0 group-hover/link:scale-110 transition-transform">
                                                                                                            <img src={meta.thumbnail} alt="" className="w-full h-full object-cover" />
                                                                                                        </div>
                                                                                                    ) : meta?.iconSvg ? (
                                                                                                        <div
                                                                                                            className="w-5 h-5 text-gray-400 group-hover/link:text-[#ff6b35] transition-colors"
                                                                                                            dangerouslySetInnerHTML={{ __html: meta.iconSvg }}
                                                                                                        />
                                                                                                    ) : meta?.color ? (
                                                                                                        <span
                                                                                                            className="w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-white shadow-sm"
                                                                                                            style={{ backgroundColor: meta.color }}
                                                                                                        />
                                                                                                    ) : (
                                                                                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 group-hover/link:bg-[#ff6b35] transition-colors" />
                                                                                                    )}
                                                                                                    <span className="truncate">{link.label}</span>
                                                                                                </div>
                                                                                                <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover/link:opacity-100 group-hover/link:translate-x-0 transition-all text-[#ff6b35]" />
                                                                                            </a>
                                                                                        </li>
                                                                                    );
                                                                                })}
                                                                                {(!col.links || col.links.length === 0) && (
                                                                                    <li className="text-sm text-gray-400 italic py-1 px-2">No links yet</li>
                                                                                )}
                                                                            </ul>
                                                                        </div>
                                                                    ))}
                                                                    {(!item.columns || item.columns.length === 0) && (
                                                                        <div className="text-sm text-gray-400 italic p-4">No columns configured</div>
                                                                    )}
                                                                </div>

                                                                {/* Featured Section */}
                                                                {item.featured?.enabled && (
                                                                    <div className="w-[280px] flex-shrink-0 pl-8 border-l border-gray-100">
                                                                        <div className="group/card relative h-full rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 cursor-pointer border border-gray-100 ring-1 ring-black/5">
                                                                            {item.featured.image ? (
                                                                                <div className="relative h-40 overflow-hidden">
                                                                                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur text-[10px] font-bold px-2 py-1 rounded-full text-[#ff6b35] shadow-sm z-10">
                                                                                        NEW RECIPE
                                                                                    </div>
                                                                                    <img
                                                                                        src={item.featured.image}
                                                                                        alt=""
                                                                                        className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-700 ease-out"
                                                                                    />
                                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
                                                                                </div>
                                                                            ) : (
                                                                                <div className="h-40 flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100/50">
                                                                                    <Star className="w-12 h-12 text-[#ff6b35]/20" />
                                                                                </div>
                                                                            )}
                                                                            <div className="p-5">
                                                                                <h3 className="font-serif text-lg font-bold text-gray-900 mb-2 leading-tight group-hover/card:text-[#ff6b35] transition-colors">
                                                                                    {item.featured.title || 'Featured Recipe'}
                                                                                </h3>
                                                                                {item.featured.description && (
                                                                                    <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">
                                                                                        {item.featured.description}
                                                                                    </p>
                                                                                )}
                                                                                <div className="mt-4 flex items-center text-xs font-semibold text-[#ff6b35]">
                                                                                    Read More <span className="ml-1 group-hover/card:translate-x-1 transition-transform">→</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
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
                                <p className="text-center text-lg text-gray-500">
                                    Hover over the menu items above to preview mega menu dropdowns
                                </p>
                            </div>

                            {/* Placeholder cards */}
                            <div className="grid grid-cols-3 gap-6">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                        <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-50" />
                                        <div className="p-4">
                                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                            <div className="h-3 bg-gray-100 rounded w-1/2" />
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
