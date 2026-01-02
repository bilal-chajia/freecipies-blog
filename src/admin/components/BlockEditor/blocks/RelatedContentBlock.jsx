/**
 * Custom Block: Related Content
 *
 * Curate related recipes, articles, or roundups to show inside content_json.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, Loader2, Plus, Search, X } from 'lucide-react';
import { articlesAPI } from '../../../services/api';
import { getImageSlot } from '@shared/utils';
import { getBestVariantUrl, getSrcSet } from '@shared/types/images';
import { useRelatedContentContext } from '../related-content-context';

const parseList = (value) => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const toJson = (value) => JSON.stringify(value || []);

const TYPE_LABELS = {
    recipe: 'Recipe',
    article: 'Article',
    roundup: 'Roundup',
};

const GROUP_LABELS = {
    recipe: 'Recipes',
    article: 'Articles',
    roundup: 'Roundups',
};

export const RelatedContentBlock = createReactBlockSpec(
    {
        type: 'relatedContent',
        propSchema: {
            title: { default: '' },
            layout: { default: 'grid', values: ['grid', 'carousel', 'list'] },
            mode: { default: 'manual', values: ['manual', 'auto'] },
            limit: { default: 4 },
            recipesJson: { default: '[]' },
            articlesJson: { default: '[]' },
            roundupsJson: { default: '[]' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { categorySlug, tagSlugs, currentSlug } = useRelatedContentContext();
            const [activeType, setActiveType] = useState('recipe');
            const [searchTerm, setSearchTerm] = useState('');
            const [results, setResults] = useState([]);
            const [loading, setLoading] = useState(false);
            const [error, setError] = useState('');
            const [limitError, setLimitError] = useState('');
            const [isEditing, setIsEditing] = useState(false);
            const [draftTitle, setDraftTitle] = useState('');
            const [draftLayout, setDraftLayout] = useState('grid');
            const [draftMode, setDraftMode] = useState('manual');
            const [draftLimit, setDraftLimit] = useState(4);
            const [draftRecipes, setDraftRecipes] = useState([]);
            const [draftArticles, setDraftArticles] = useState([]);
            const [draftRoundups, setDraftRoundups] = useState([]);
            const didAutoOpen = useRef(false);

            const clampLimit = (value) => {
                const raw = Number.parseInt(value, 10);
                if (!Number.isFinite(raw)) return 4;
                return Math.min(Math.max(raw, 1), 20);
            };

            const savedLimitValue = clampLimit(props.block.props.limit);
            const savedLayout = props.block.props.layout || 'grid';
            const savedTitle = props.block.props.title || '';
            const savedMode = props.block.props.mode || 'manual';

            const savedRecipes = useMemo(
                () => parseList(props.block.props.recipesJson),
                [props.block.props.recipesJson]
            );
            const savedArticles = useMemo(
                () => parseList(props.block.props.articlesJson),
                [props.block.props.articlesJson]
            );
            const savedRoundups = useMemo(
                () => parseList(props.block.props.roundupsJson),
                [props.block.props.roundupsJson]
            );

            const draftItemsByType = {
                recipe: draftRecipes,
                article: draftArticles,
                roundup: draftRoundups,
            };

            const draftActiveItems = draftItemsByType[activeType] || [];
            const draftLimitValue = clampLimit(draftLimit);

            const savedGroups = useMemo(() => {
                const withType = (items, type) => (Array.isArray(items)
                    ? items.map((item) => ({ ...item, __type: type }))
                    : []);
                return [
                    { type: 'recipe', label: GROUP_LABELS.recipe, items: withType(savedRecipes, 'recipe') },
                    { type: 'article', label: GROUP_LABELS.article, items: withType(savedArticles, 'article') },
                    { type: 'roundup', label: GROUP_LABELS.roundup, items: withType(savedRoundups, 'roundup') },
                ].filter((group) => group.items.length > 0);
            }, [savedRecipes, savedArticles, savedRoundups]);

            const draftGroups = useMemo(() => {
                const withType = (items, type) => (Array.isArray(items)
                    ? items.map((item) => ({ ...item, __type: type }))
                    : []);
                return [
                    { type: 'recipe', label: GROUP_LABELS.recipe, items: withType(draftRecipes, 'recipe') },
                    { type: 'article', label: GROUP_LABELS.article, items: withType(draftArticles, 'article') },
                    { type: 'roundup', label: GROUP_LABELS.roundup, items: withType(draftRoundups, 'roundup') },
                ].filter((group) => group.items.length > 0);
            }, [draftRecipes, draftArticles, draftRoundups]);

            const savedTotalSelected = savedRecipes.length + savedArticles.length + savedRoundups.length;
            const draftTotalSelected = draftRecipes.length + draftArticles.length + draftRoundups.length;

            const updateBlockProps = (updates) => {
                props.editor.updateBlock(props.block, {
                    type: 'relatedContent',
                    props: { ...props.block.props, ...updates },
                });
            };

            const updateDraftItems = (type, nextItems) => {
                if (type === 'recipe') {
                    setDraftRecipes(nextItems);
                } else if (type === 'article') {
                    setDraftArticles(nextItems);
                } else {
                    setDraftRoundups(nextItems);
                }
            };

            const resetDraftFromProps = () => {
                setDraftTitle(savedTitle);
                setDraftLayout(savedLayout);
                setDraftMode(savedMode);
                setDraftLimit(savedLimitValue);
                setDraftRecipes(savedRecipes);
                setDraftArticles(savedArticles);
                setDraftRoundups(savedRoundups);
                setLimitError('');
                setError('');
                setResults([]);
                setSearchTerm('');
            };

            useEffect(() => {
                if (!isEditing) resetDraftFromProps();
            }, [
                isEditing,
                savedTitle,
                savedLayout,
                savedMode,
                savedLimitValue,
                savedRecipes,
                savedArticles,
                savedRoundups,
            ]);

            useEffect(() => {
                if (!isEditing && !didAutoOpen.current && savedTotalSelected === 0) {
                    didAutoOpen.current = true;
                    setIsEditing(true);
                }
            }, [isEditing, savedTotalSelected]);

            const handleCancel = () => {
                resetDraftFromProps();
                setIsEditing(false);
            };

            const handleSave = () => {
                updateBlockProps({
                    title: draftTitle,
                    layout: draftLayout,
                    mode: draftMode,
                    limit: draftLimitValue,
                    recipesJson: toJson(draftRecipes),
                    articlesJson: toJson(draftArticles),
                    roundupsJson: toJson(draftRoundups),
                });
                setIsEditing(false);
            };

            const buildRelatedItem = (item, type) => {
                const headline = item.headline || item.label || item.slug || '';
                const relatedItem = {
                    id: item.id,
                    slug: item.slug,
                    headline,
                };

                const thumbnail = getImageSlot(item.imagesJson, 'thumbnail')
                    || getImageSlot(item.imagesJson, 'cover');
                if (thumbnail && thumbnail.variants && Object.keys(thumbnail.variants).length > 0) {
                    relatedItem.thumbnail = thumbnail;
                }

                if (type === 'recipe') {
                    if (typeof item.totalTimeMinutes === 'number') {
                        relatedItem.total_time = item.totalTimeMinutes;
                    }
                    if (item.difficultyLabel) {
                        relatedItem.difficulty = item.difficultyLabel;
                    }
                }

                if (type === 'article') {
                    if (typeof item.readingTimeMinutes === 'number') {
                        relatedItem.reading_time = item.readingTimeMinutes;
                    }
                }

                if (type === 'roundup') {
                    const roundupJson = typeof item.roundupJson === 'string'
                        ? (() => {
                            try {
                                return JSON.parse(item.roundupJson);
                            } catch {
                                return null;
                            }
                        })()
                        : item.roundupJson;
                    const count = Array.isArray(roundupJson?.items)
                        ? roundupJson.items.length
                        : undefined;
                    if (typeof count === 'number') {
                        relatedItem.item_count = count;
                    }
                }

                return relatedItem;
            };

            const addItem = (item) => {
                if (!item?.id) return;
                if (draftActiveItems.some((existing) => existing.id === item.id)) return;
                if (draftActiveItems.length >= draftLimitValue) {
                    setLimitError(`Limit reached (${draftLimitValue}).`);
                    return;
                }
                setLimitError('');
                const nextItems = [...draftActiveItems, buildRelatedItem(item, activeType)];
                updateDraftItems(activeType, nextItems);
            };

            const removeItemByType = (type, id) => {
                const nextItems = (draftItemsByType[type] || []).filter((item) => item.id !== id);
                setLimitError('');
                updateDraftItems(type, nextItems);
            };

            useEffect(() => {
                if (!isEditing || draftMode !== 'manual') return undefined;
                const term = searchTerm.trim();
                if (term.length < 2) {
                    setResults([]);
                    setError('');
                    return undefined;
                }

                let isActive = true;
                const timeout = setTimeout(async () => {
                    setLoading(true);
                    setError('');
                    try {
                        const response = await articlesAPI.getAll({
                            search: term,
                            type: activeType,
                            status: 'online',
                            limit: 8,
                        });
                        const data = response.data?.data || response.data || [];
                        if (isActive) {
                            setResults(Array.isArray(data) ? data : []);
                        }
                    } catch (err) {
                        if (isActive) {
                            setResults([]);
                            setError('Search failed');
                        }
                    } finally {
                        if (isActive) setLoading(false);
                    }
                }, 300);

                return () => {
                    isActive = false;
                    clearTimeout(timeout);
                };
            }, [searchTerm, activeType, draftMode, isEditing]);

            const runAutoSuggestions = async () => {
                if (!isEditing || draftMode !== 'auto') return;
                const tagList = Array.isArray(tagSlugs) ? tagSlugs : [];
                if (!categorySlug && tagList.length === 0) {
                    setError('Set a category or tag to auto-select related content.');
                    setResults([]);
                    return;
                }

                setLoading(true);
                setError('');
                try {
                    const collected = [];
                    const seen = new Set();

                    for (const tag of tagList) {
                        if (collected.length >= draftLimitValue) break;
                        const response = await articlesAPI.getAll({
                            type: activeType,
                            status: 'online',
                            limit: draftLimitValue + 2,
                            tag,
                        });
                        const data = response.data?.data || response.data || [];
                        const items = Array.isArray(data) ? data : [];
                        for (const item of items) {
                            if (item?.slug === currentSlug) continue;
                            if (!item?.id || seen.has(item.id)) continue;
                            seen.add(item.id);
                            collected.push(item);
                            if (collected.length >= draftLimitValue) break;
                        }
                    }

                    if (collected.length < draftLimitValue && categorySlug) {
                        const response = await articlesAPI.getAll({
                            type: activeType,
                            status: 'online',
                            limit: draftLimitValue + 4,
                            category: categorySlug,
                        });
                        const data = response.data?.data || response.data || [];
                        const items = Array.isArray(data) ? data : [];
                        for (const item of items) {
                            if (item?.slug === currentSlug) continue;
                            if (!item?.id || seen.has(item.id)) continue;
                            seen.add(item.id);
                            collected.push(item);
                            if (collected.length >= draftLimitValue) break;
                        }
                    }

                    const nextResults = collected.slice(0, draftLimitValue + 4);
                    setResults(nextResults);
                } catch (err) {
                    setError('Auto selection failed.');
                    setResults([]);
                } finally {
                    setLoading(false);
                }
            };

            useEffect(() => {
                if (!isEditing || draftMode !== 'auto') return;
                runAutoSuggestions();
            }, [draftMode, activeType, categorySlug, (tagSlugs || []).join('|'), draftLimitValue, currentSlug, isEditing]);

            const resolveThumbnail = (slot) => {
                if (!slot) return { url: '', srcSet: '', style: undefined };
                const url = getBestVariantUrl(slot) || slot.url || '';
                const srcSet = getSrcSet(slot) || '';
                const style = {};
                if (slot.focal_point) {
                    style.objectPosition = `${slot.focal_point.x}% ${slot.focal_point.y}%`;
                }
                if (slot.aspectRatio) {
                    style.aspectRatio = slot.aspectRatio.includes(':')
                        ? slot.aspectRatio.replace(':', ' / ')
                        : slot.aspectRatio;
                }
                return { url, srcSet, style: Object.keys(style).length ? style : undefined };
            };

            const buildMeta = (item, itemType = activeType) => {
                if (itemType === 'recipe') {
                    const meta = [];
                    if (typeof item.total_time === 'number') meta.push(`${item.total_time} min`);
                    if (item.difficulty) meta.push(String(item.difficulty));
                    return meta.join(' | ');
                }
                if (itemType === 'article') {
                    if (typeof item.reading_time === 'number') return `${item.reading_time} min read`;
                }
                if (itemType === 'roundup') {
                    if (typeof item.item_count === 'number') return `${item.item_count} items`;
                }
                return '';
            };

            const getLayoutClasses = (layoutValue) => {
                if (layoutValue === 'list') {
                    return {
                        listClass: 'grid grid-cols-1 gap-3',
                        cardClass: 'flex items-center gap-3',
                        mediaClass: 'w-24 h-24 flex-shrink-0',
                        isCarousel: false,
                    };
                }
                if (layoutValue === 'carousel') {
                    return {
                        listClass: 'grid grid-flow-col auto-cols-[minmax(220px,260px)] gap-4 overflow-x-auto pb-2 snap-x snap-mandatory',
                        cardClass: 'flex flex-col gap-3',
                        mediaClass: 'w-full aspect-[4/3]',
                        isCarousel: true,
                    };
                }
                return {
                    listClass: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4',
                    cardClass: 'flex flex-col gap-3',
                    mediaClass: 'w-full aspect-[4/3]',
                    isCarousel: false,
                };
            };

            const renderPreviewCards = (groupsList, layoutValue, showActions = false, onRemove) => {
                const { listClass, cardClass, mediaClass, isCarousel } = getLayoutClasses(layoutValue);
                return groupsList.map((group) => (
                    <div key={group.type} className="space-y-2">
                        {groupsList.length > 1 && (
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                                {group.label}
                            </div>
                        )}
                        <div className={listClass}>
                            {group.items.map((item) => {
                                const { url, srcSet, style } = resolveThumbnail(item.thumbnail);
                                const meta = buildMeta(item, item.__type);
                                return (
                                    <div
                                        key={item.id}
                                        className={`relative border border-gray-200 rounded-xl bg-white p-3 shadow-sm transition ${cardClass} ${isCarousel ? 'snap-start' : ''}`}
                                    >
                                        {showActions && (
                                            <button
                                                type="button"
                                                onClick={() => onRemove?.(item.__type, item.id)}
                                                className="absolute top-2 right-2 rounded-full bg-white/90 border border-gray-200 p-1 text-gray-400 hover:text-red-500"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                        <div className={`overflow-hidden rounded-lg bg-gray-100 ${mediaClass}`}>
                                            {url ? (
                                                <img
                                                    src={url}
                                                    alt={item.headline || ''}
                                                    srcSet={srcSet || undefined}
                                                    sizes={layoutValue === 'list' ? '120px' : '(max-width: 768px) 100vw, 260px'}
                                                    loading="lazy"
                                                    className="w-full h-full object-cover"
                                                    style={style}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                                                {group.label}
                                            </div>
                                            <div className="text-sm font-semibold text-gray-900 line-clamp-2">
                                                {item.headline}
                                            </div>
                                            {meta && (
                                                <div className="text-xs text-gray-500">{meta}</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ));
            };

            const showNoResults = isEditing && !loading && !error && results.length === 0 && (
                (draftMode === 'manual' && searchTerm.trim().length >= 2)
                || (draftMode === 'auto' && (categorySlug || (tagSlugs && tagSlugs.length > 0)))
            );
            const emptyMessage = draftMode === 'manual' ? 'No matches found.' : 'No suggestions found.';
            const savedTitleValue = savedTitle.trim();
            const draftTitleValue = draftTitle.trim();

            return (
                <>
                    <div className="border border-gray-200 rounded-lg p-4 my-2 bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4 text-gray-500" />
                                <h4 className="font-medium text-sm text-gray-700">Related Content</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    resetDraftFromProps();
                                    setIsEditing(true);
                                }}
                                className="text-xs font-semibold text-primary hover:underline"
                            >
                                Edit
                            </button>
                        </div>

                        {savedTotalSelected === 0 ? (
                            <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm text-gray-500 flex flex-col gap-3">
                                <span>No related content selected yet.</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetDraftFromProps();
                                        setIsEditing(true);
                                    }}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                                >
                                    Configure related content
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {savedTitleValue && (
                                    <div className="text-base font-semibold text-gray-900">{savedTitleValue}</div>
                                )}
                                {renderPreviewCards(savedGroups, savedLayout, false, null)}
                            </div>
                        )}
                    </div>

                    {isEditing && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8 overflow-y-auto">
                            <div className="w-full max-w-5xl bg-white rounded-xl shadow-xl border border-gray-200">
                                <div className="flex items-center justify-between border-b px-5 py-4">
                                    <div className="flex items-center gap-2">
                                        <LayoutGrid className="w-4 h-4 text-gray-500" />
                                        <h4 className="font-medium text-sm text-gray-700">Configure Related Content</h4>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCancel}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500">Title</label>
                                            <input
                                                type="text"
                                                value={draftTitle}
                                                onChange={(e) => setDraftTitle(e.target.value)}
                                                placeholder="You may also like"
                                                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500">Layout</label>
                                            <select
                                                value={draftLayout}
                                                onChange={(e) => setDraftLayout(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="grid">Grid</option>
                                                <option value="carousel">Carousel</option>
                                                <option value="list">List</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500">Selection Mode</label>
                                            <select
                                                value={draftMode}
                                                onChange={(e) => setDraftMode(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                            >
                                                <option value="manual">Manual</option>
                                                <option value="auto">Auto (category/tags)</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-gray-500">Max items</label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="20"
                                                value={draftLimitValue}
                                                onChange={(e) => {
                                                    const next = Number.parseInt(e.target.value, 10);
                                                    setDraftLimit(Number.isFinite(next) ? Math.min(Math.max(next, 1), 20) : 1);
                                                }}
                                                className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        {Object.keys(TYPE_LABELS).map((type) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setActiveType(type)}
                                                className={`px-3 py-1 text-xs rounded-full border ${activeType === type
                                                        ? 'bg-gray-900 text-white border-gray-900'
                                                        : 'bg-white text-gray-600 border-gray-200'
                                                    }`}
                                            >
                                                {TYPE_LABELS[type]}
                                            </button>
                                        ))}
                                    </div>

                                    {draftMode === 'manual' ? (
                                        <div className="relative">
                                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder={`Search ${TYPE_LABELS[activeType].toLowerCase()}s...`}
                                                className="w-full pl-9 pr-4 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-md border px-3 py-2 text-xs text-gray-600 bg-gray-50">
                                            Auto selection uses category `{categorySlug || 'none'}` and tags {tagSlugs?.length ? tagSlugs.join(', ') : 'none'}.
                                            <button
                                                type="button"
                                                onClick={runAutoSuggestions}
                                                className="ml-2 text-primary hover:underline"
                                            >
                                                Refresh
                                            </button>
                                        </div>
                                    )}

                                    {loading && (
                                        <div className="flex justify-center p-3">
                                            <Loader2 className="animate-spin h-5 w-5 text-primary" />
                                        </div>
                                    )}

                                    {error && (
                                        <div className="text-xs text-red-500">{error}</div>
                                    )}

                                    {limitError && (
                                        <div className="text-xs text-amber-600">{limitError}</div>
                                    )}

                                    {!loading && !error && results.length > 0 && (
                                        <ul className="text-sm border rounded-md divide-y max-h-48 overflow-y-auto">
                                            {results.map((item) => {
                                                const slot = getImageSlot(item.imagesJson, 'thumbnail')
                                                    || getImageSlot(item.imagesJson, 'cover');
                                                const { url, style } = resolveThumbnail(slot);
                                                const isSelected = draftActiveItems.some((existing) => existing.id === item.id);
                                                return (
                                                    <li
                                                        key={item.id}
                                                        className="p-2 flex items-center justify-between gap-3 hover:bg-gray-50"
                                                    >
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-8 h-8 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                                                                {url ? (
                                                                    <img src={url} alt="" className="w-full h-full object-cover" style={style} />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gray-200" />
                                                                )}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium truncate">{item.headline || item.label || item.slug}</div>
                                                                <div className="text-xs text-gray-500 truncate">/{item.slug}</div>
                                                            </div>
                                                        </div>
                                                        {isSelected ? (
                                                            <span className="text-xs text-gray-400">Added</span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => addItem(item)}
                                                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                                Add
                                                            </button>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}

                                    {showNoResults && (
                                        <div className="text-xs text-gray-400">{emptyMessage}</div>
                                    )}

                                    <div className="space-y-3">
                                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                                            Preview ({draftTotalSelected} selected)
                                        </div>
                                        {draftTitleValue && (
                                            <div className="text-base font-semibold text-gray-900">{draftTitleValue}</div>
                                        )}
                                        {draftGroups.length === 0 ? (
                                            <div className="text-xs text-gray-400">No items selected.</div>
                                        ) : (
                                            renderPreviewCards(draftGroups, draftLayout, true, removeItemByType)
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between border-t pt-4">
                                        <div className="text-xs text-gray-500">
                                            Selected {draftTotalSelected} / {draftLimitValue}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleCancel}
                                                className="px-3 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleSave}
                                                className="px-3 py-2 text-xs font-semibold text-white bg-gray-900 border border-gray-900 rounded-md hover:bg-gray-800"
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            );
        },
    }
);
