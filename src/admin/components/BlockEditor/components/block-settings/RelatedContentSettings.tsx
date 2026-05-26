import { useEffect, useMemo, useState } from 'react';
import { Image, Plus } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { articlesAPI } from '../../../../services/api';
import { getImageSlot } from '@shared/utils';
import { getBestVariantUrl } from '@shared/types/images';
import { parseJsonArray, clampNumber } from './helpers';

type RelatedType = 'recipe' | 'article' | 'roundup';

type RelatedMode = 'manual' | 'auto';

type RelatedLayout = 'grid' | 'carousel' | 'list';

type RelatedItem = {
    id: string | number;
    slug?: string;
    headline?: string;
    label?: string;
    categoryName?: string | null;
    categoryColor?: string | null;
    thumbnail?: NonNullable<ReturnType<typeof getImageSlot>>;
    total_time?: number;
    difficulty?: string;
    reading_time?: number;
    item_count?: number;
};

type SearchResultItem = RelatedItem & {
    imagesJson?: string | null;
    categoryLabel?: string | null;
    category?: {
        label?: string | null;
        color?: string | null;
    } | null;
    totalTimeMinutes?: number;
    difficultyLabel?: string;
    readingTimeMinutes?: number;
    roundupJson?: string | { items?: unknown[] } | null;
};

type RelatedBlockProps = {
    title?: string;
    layout?: RelatedLayout;
    mode?: RelatedMode;
    limit?: number | string;
    recipesJson?: string;
    articlesJson?: string;
    roundupsJson?: string;
};

type RelatedSelectedBlock = {
    id: string;
    props: RelatedBlockProps;
};

type RelatedContext = {
    categorySlug?: string;
    tagSlugs?: string[];
    currentSlug?: string;
};

type RelatedContentSettingsProps = {
    selectedBlock: RelatedSelectedBlock;
    relatedContext?: RelatedContext | null;
    updateProps: (updates: Partial<RelatedBlockProps>) => void;
};

const RELATED_TYPE_LABELS: Record<RelatedType, string> = {
    recipe: 'Recipe',
    article: 'Article',
    roundup: 'Roundup',
};

function RelatedContentSettings({
    selectedBlock,
    relatedContext,
    updateProps,
}: RelatedContentSettingsProps) {
    const [activeType, setActiveType] = useState<RelatedType>('recipe');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [limitError, setLimitError] = useState('');

    const { categorySlug, tagSlugs, currentSlug } = relatedContext || {};
    const mode = selectedBlock.props.mode || 'manual';
    const limitValue = clampNumber(selectedBlock.props.limit ?? 4, 1, 20, 4);

    const itemsByType = useMemo<Record<RelatedType, RelatedItem[]>>(() => ({
        recipe: parseJsonArray(selectedBlock.props.recipesJson) as RelatedItem[],
        article: parseJsonArray(selectedBlock.props.articlesJson) as RelatedItem[],
        roundup: parseJsonArray(selectedBlock.props.roundupsJson) as RelatedItem[],
    }), [
        selectedBlock.props.recipesJson,
        selectedBlock.props.articlesJson,
        selectedBlock.props.roundupsJson,
    ]);

    const activeItems = itemsByType[activeType] || [];

    useEffect(() => {
        setActiveType('recipe');
        setSearchTerm('');
        setResults([]);
        setError('');
        setLimitError('');
    }, [selectedBlock.id]);

    useEffect(() => {
        if (mode !== 'manual') {
            setResults([]);
            setError('');
            return undefined;
        }
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
                    status: 'all',
                    limit: 8,
                });
                const data = response.data?.data || response.data || [];
                if (isActive) {
                    setResults(Array.isArray(data) ? data as SearchResultItem[] : []);
                }
            } catch {
                if (isActive) {
                    setResults([]);
                    setError('Search failed.');
                }
            } finally {
                if (isActive) setLoading(false);
            }
        }, 300);

        return () => {
            isActive = false;
            clearTimeout(timeout);
        };
    }, [searchTerm, activeType, mode]);

    const buildRelatedItem = (item: SearchResultItem, type: RelatedType): RelatedItem => {
        const headline = item.headline || item.label || item.slug || '';
        const relatedItem: RelatedItem = {
            id: item.id,
            slug: item.slug,
            headline,
            categoryName: item.categoryLabel || item.categoryName || item.category?.label || null,
            categoryColor: item.categoryColor || item.category?.color || null,
        };

        const thumbnail = getImageSlot(item.imagesJson, 'thumbnail')
                    || getImageSlot(item.imagesJson, 'hero');
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

    const setItemsForType = (type: RelatedType, items: RelatedItem[]) => {
        const nextJson = JSON.stringify(items || []);
        if (type === 'recipe') {
            updateProps({ recipesJson: nextJson });
        } else if (type === 'article') {
            updateProps({ articlesJson: nextJson });
        } else {
            updateProps({ roundupsJson: nextJson });
        }
    };

    const addItem = (item: SearchResultItem) => {
        if (!item?.id) return;
        if (activeItems.some((existing) => existing.id === item.id)) return;
        if (activeItems.length >= limitValue) {
            setLimitError(`Limit reached (${limitValue}).`);
            return;
        }
        setLimitError('');
        const nextItems = [...activeItems, buildRelatedItem(item, activeType)];
        setItemsForType(activeType, nextItems);
    };

    const removeItem = (type: RelatedType, id: string | number) => {
        const list = itemsByType[type] || [];
        const nextItems = list.filter((item) => item.id !== id);
        setLimitError('');
        setItemsForType(type, nextItems);
    };

    const runAutoSuggestions = async () => {
        if (mode !== 'auto') return;
        const tagList = Array.isArray(tagSlugs) ? tagSlugs : [];
        if (!categorySlug && tagList.length === 0) {
            setError('Set a category or tag to auto-select related content.');
            setResults([]);
            return;
        }

        setLoading(true);
        setError('');
        try {
            const collected: SearchResultItem[] = [];
            const seen = new Set<string | number>();

            for (const tag of tagList) {
                if (collected.length >= limitValue) break;
                const response = await articlesAPI.getAll({
                    type: activeType,
                    status: 'all',
                    limit: limitValue + 2,
                    tag,
                });
                const data = response.data?.data || response.data || [];
                const items = Array.isArray(data) ? data as SearchResultItem[] : [];
                for (const item of items) {
                    if (item?.slug === currentSlug) continue;
                    if (!item?.id || seen.has(item.id)) continue;
                    seen.add(item.id);
                    collected.push(item);
                    if (collected.length >= limitValue) break;
                }
            }

            if (collected.length < limitValue && categorySlug) {
                const response = await articlesAPI.getAll({
                    type: activeType,
                    status: 'all',
                    limit: limitValue + 4,
                    category: categorySlug,
                });
                const data = response.data?.data || response.data || [];
                const items = Array.isArray(data) ? data as SearchResultItem[] : [];
                for (const item of items) {
                    if (item?.slug === currentSlug) continue;
                    if (!item?.id || seen.has(item.id)) continue;
                    seen.add(item.id);
                    collected.push(item);
                    if (collected.length >= limitValue) break;
                }
            }

            setResults(collected.slice(0, limitValue + 4));
        } catch {
            setError('Auto selection failed.');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const getThumbnailUrl = (item: SearchResultItem) => {
        if (!item) return '';
        const slot = getImageSlot(item.imagesJson, 'thumbnail')
                    || getImageSlot(item.imagesJson, 'hero');
        return slot ? getBestVariantUrl(slot) || '' : '';
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between py-1 gap-2">
                <span className="text-xs font-medium text-muted-foreground select-none">Title</span>
                <div className="w-[170px] shrink-0">
                    <Input
                        className="h-8 text-xs w-full"
                        value={selectedBlock.props.title || ''}
                        onChange={(e) => updateProps({ title: e.target.value })}
                        placeholder="You might like"
                    />
                </div>
            </div>
            <div className="flex items-center justify-between py-1 gap-2">
                <span className="text-xs font-medium text-muted-foreground select-none">Layout</span>
                <div className="w-[170px] shrink-0">
                    <Select
                        value={selectedBlock.props.layout || 'grid'}
                        onValueChange={(val) => updateProps({ layout: val as RelatedLayout })}
                    >
                        <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="Select layout" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="grid">Grid</SelectItem>
                            <SelectItem value="carousel">Carousel</SelectItem>
                            <SelectItem value="list">List</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center justify-between py-1 gap-2">
                <span className="text-xs font-medium text-muted-foreground select-none">Mode</span>
                <div className="w-[170px] shrink-0">
                    <Select
                        value={mode}
                        onValueChange={(val) => updateProps({ mode: val as RelatedMode })}
                    >
                        <SelectTrigger className="h-8 text-xs w-full">
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex items-center justify-between py-1 gap-2">
                <span className="text-xs font-medium text-muted-foreground select-none">Max items</span>
                <div className="w-[170px] shrink-0">
                    <Input
                        className="h-8 text-xs w-full"
                        type="number"
                        min="1"
                        max="20"
                        value={limitValue}
                        onChange={(e) => updateProps({ limit: clampNumber(e.target.value, 1, 20, 4) })}
                    />
                </div>
            </div>

            <div className="flex items-center justify-between py-1 gap-2">
                <span className="text-xs font-medium text-muted-foreground select-none">Type</span>
                <div className="flex flex-nowrap justify-end gap-1.5 shrink-0">
                    {(Object.keys(RELATED_TYPE_LABELS) as RelatedType[]).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setActiveType(type)}
                            className={`px-2.5 py-1 text-xs rounded-full border cursor-pointer ${activeType === type
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-border hover:bg-muted/55'
                                }`}
                        >
                            {RELATED_TYPE_LABELS[type]}
                        </button>
                    ))}
                </div>
            </div>

            {mode === 'manual' ? (
                <div className="flex items-center justify-between py-1 gap-2">
                    <span className="text-xs font-medium text-muted-foreground select-none">Search</span>
                    <div className="w-[170px] shrink-0">
                        <Input
                            className="h-8 text-xs w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Search ${RELATED_TYPE_LABELS[activeType].toLowerCase()}s...`}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-2 text-xs text-muted-foreground break-words">
                    <div className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground select-none">Auto</span>
                        <div className="w-full text-xs text-muted-foreground">
                            Category: {categorySlug || 'none'} · Tags: {Array.isArray(tagSlugs) && tagSlugs.length
                                ? tagSlugs.join(', ')
                                : 'none'}
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" className="w-full cursor-pointer" onClick={runAutoSuggestions}>
                        Refresh suggestions
                    </Button>
                </div>
            )}

            {loading && (
                <div className="text-xs text-muted-foreground">Loading...</div>
            )}
            {error && (
                <div className="text-xs text-destructive">{error}</div>
            )}
            {limitError && (
                <div className="text-xs text-destructive">{limitError}</div>
            )}

            {results.length > 0 && (
                <div className="space-y-2">
                    <Label className="text-xs">Suggestions</Label>
                    <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                        {results.map((item) => {
                            const isSelected = activeItems.some((existing) => existing.id === item.id);
                            const thumb = getThumbnailUrl(item);
                            return (
                                <div
                                    key={item.id}
                                    className="p-2 flex items-center gap-2"
                                >
                                    <div className="w-7 h-7 rounded-md overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                                        {thumb ? (
                                            <img src={thumb} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <Image className="w-4 h-4 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1 text-sm font-medium leading-snug">
                                        {item.headline || item.label || item.slug}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={isSelected}
                                        onClick={() => addItem(item)}
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <Label className="text-xs">Selected ({activeItems.length})</Label>
                {activeItems.length === 0 ? (
                    <div className="text-xs text-muted-foreground">No items selected.</div>
                ) : (
                    <div className="border rounded-md divide-y">
                        {activeItems.map((item) => (
                            <div key={item.id} className="p-2 flex items-center gap-2 text-sm">
                                <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium leading-snug">{item.headline || item.slug}</div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeItem(activeType, item.id)}
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default RelatedContentSettings;
