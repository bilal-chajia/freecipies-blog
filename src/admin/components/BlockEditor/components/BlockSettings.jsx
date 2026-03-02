import { useEffect, useMemo, useState } from 'react';
import { Image, Plus, Settings, Type, AlignLeft, AlignCenter, AlignRight, Trash2, Upload, FolderOpen, Wrench, Zap, X, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from './DocumentSettings';
import { articlesAPI, equipmentAPI } from '../../../services/api';
import MediaDialog from '@/components/MediaDialog';
import ImageUploader from '@/components/ImageUploader';
import { getImageSlot } from '@shared/utils';
import { getBestVariantUrl, parseVariantsJson, getVariantMap } from '@shared/types/images';
import { Badge } from '@/ui/badge';
import { Checkbox } from '@/ui/checkbox';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/ui/collapsible';

const DIET_OPTIONS = [
    { value: 'VeganDiet', label: 'Vegan' },
    { value: 'VegetarianDiet', label: 'Vegetarian' },
    { value: 'GlutenFreeDiet', label: 'Gluten-Free' },
    { value: 'DiabeticDiet', label: 'Diabetic' },
    { value: 'LowCalorieDiet', label: 'Low Calorie' },
    { value: 'LowFatDiet', label: 'Low Fat' },
    { value: 'LowSaltDiet', label: 'Low Salt' },
    { value: 'LowLactoseDiet', label: 'Low Lactose' },
    { value: 'KosherDiet', label: 'Kosher' },
    { value: 'HalalDiet', label: 'Halal' },
];

/**
 * Block Settings Component
 * 
 * Renders settings for the currently selected block.
 * Updates the block using the editor instance.
 */
const RELATED_TYPE_LABELS = {
    recipe: 'Recipe',
    article: 'Article',
    roundup: 'Roundup',
};

const parseJsonArray = (value) => {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const clampNumber = (value, min, max, fallback) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
};

function RelatedContentSettings({
    selectedBlock,
    relatedContext,
    updateProps,
}) {
    const [activeType, setActiveType] = useState('recipe');
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [limitError, setLimitError] = useState('');

    const { categorySlug, tagSlugs, currentSlug } = relatedContext || {};
    const mode = selectedBlock.props.mode || 'manual';
    const limitValue = clampNumber(selectedBlock.props.limit ?? 4, 1, 20, 4);

    const itemsByType = useMemo(() => ({
        recipe: parseJsonArray(selectedBlock.props.recipesJson),
        article: parseJsonArray(selectedBlock.props.articlesJson),
        roundup: parseJsonArray(selectedBlock.props.roundupsJson),
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
                    status: 'online',
                    limit: 8,
                });
                const data = response.data?.data || response.data || [];
                if (isActive) {
                    setResults(Array.isArray(data) ? data : []);
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

    const buildRelatedItem = (item, type) => {
        const headline = item.headline || item.label || item.slug || '';
        const relatedItem = {
            id: item.id,
            slug: item.slug,
            headline,
            categoryName: item.categoryLabel || item.categoryName || item.category?.label || null,
            categoryColor: item.categoryColor || item.category?.color || null,
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

    const setItemsForType = (type, items) => {
        const nextJson = JSON.stringify(items || []);
        if (type === 'recipe') {
            updateProps({ recipesJson: nextJson });
        } else if (type === 'article') {
            updateProps({ articlesJson: nextJson });
        } else {
            updateProps({ roundupsJson: nextJson });
        }
    };

    const addItem = (item) => {
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

    const removeItem = (type, id) => {
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
            const collected = [];
            const seen = new Set();

            for (const tag of tagList) {
                if (collected.length >= limitValue) break;
                const response = await articlesAPI.getAll({
                    type: activeType,
                    status: 'online',
                    limit: limitValue + 2,
                    tag,
                });
                const data = response.data?.data || response.data || [];
                const items = Array.isArray(data) ? data : [];
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
                    status: 'online',
                    limit: limitValue + 4,
                    category: categorySlug,
                });
                const data = response.data?.data || response.data || [];
                const items = Array.isArray(data) ? data : [];
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

    const getThumbnailUrl = (item) => {
        if (!item) return '';
        const slot = getImageSlot(item.imagesJson, 'thumbnail')
            || getImageSlot(item.imagesJson, 'cover');
        return getBestVariantUrl(slot) || slot?.url || '';
    };

    return (
        <div className="space-y-4">
            <div className="structure-item">
                <span className="structure-item-label">Title</span>
                <div className="ml-auto w-[170px]">
                    <Input
                        className="h-8 text-sm w-full"
                        value={selectedBlock.props.title || ''}
                        onChange={(e) => updateProps({ title: e.target.value })}
                        placeholder="You might like"
                    />
                </div>
            </div>
            <div className="structure-item">
                <span className="structure-item-label">Layout</span>
                <div className="ml-auto w-[170px]">
                    <Select
                        value={selectedBlock.props.layout || 'grid'}
                        onValueChange={(val) => updateProps({ layout: val })}
                    >
                        <SelectTrigger className="h-8 text-sm w-full">
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
            <div className="structure-item">
                <span className="structure-item-label">Mode</span>
                <div className="ml-auto w-[170px]">
                    <Select
                        value={mode}
                        onValueChange={(val) => updateProps({ mode: val })}
                    >
                        <SelectTrigger className="h-8 text-sm w-full">
                            <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="auto">Auto</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="structure-item">
                <span className="structure-item-label">Max items</span>
                <div className="ml-auto w-[170px]">
                    <Input
                        className="h-8 text-sm w-full"
                        type="number"
                        min="1"
                        max="20"
                        value={limitValue}
                        onChange={(e) => updateProps({ limit: clampNumber(e.target.value, 1, 20, 4) })}
                    />
                </div>
            </div>

            <div className="structure-item items-center">
                <span className="structure-item-label">Type</span>
                <div className="ml-auto flex flex-nowrap justify-end gap-1.5">
                    {Object.keys(RELATED_TYPE_LABELS).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => setActiveType(type)}
                            className={`px-2.5 py-1 text-xs rounded-full border ${activeType === type
                                ? 'bg-gray-900 text-white border-gray-900'
                                : 'bg-white text-gray-600 border-gray-200'
                                }`}
                        >
                            {RELATED_TYPE_LABELS[type]}
                        </button>
                    ))}
                </div>
            </div>

            {mode === 'manual' ? (
                <div className="structure-item">
                    <span className="structure-item-label">Search</span>
                    <div className="ml-auto w-[170px]">
                        <Input
                            className="h-8 text-sm w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Search ${RELATED_TYPE_LABELS[activeType].toLowerCase()}s...`}
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-2 text-xs text-muted-foreground break-words">
                    <div className="structure-item flex-col items-start">
                        <span className="structure-item-label">Auto</span>
                        <div className="w-full text-xs text-muted-foreground">
                            Category: {categorySlug || 'none'} · Tags: {Array.isArray(tagSlugs) && tagSlugs.length
                                ? tagSlugs.join(', ')
                                : 'none'}
                        </div>
                    </div>
                    <Button variant="secondary" size="sm" className="w-full" onClick={runAutoSuggestions}>
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

/**
 * RecipeSettingsSidebar
 * Renders recipe metadata fields in the sidebar when the mainRecipe block is selected.
 * Uses RecipeDataContext to read/write recipe data in sync with the inline block.
 */
function RecipeSettingsSidebar({ recipe, setRecipe }) {
    const [nutritionOpen, setNutritionOpen] = useState(false);
    const [equipmentOpen, setEquipmentOpen] = useState(false);
    const [equipmentDetecting, setEquipmentDetecting] = useState(false);
    const [detectionResult, setDetectionResult] = useState(null);
    const [detectedItemsToSelect, setDetectedItemsToSelect] = useState(null);
    const [selectedNewIds, setSelectedNewIds] = useState(new Set());

    // Parse recipe data
    const data = useMemo(() => {
        if (!recipe) return {};
        if (typeof recipe === 'string') {
            try { return JSON.parse(recipe); } catch { return {}; }
        }
        return recipe;
    }, [recipe]);

    const updateField = (field, value) => {
        const newData = { ...data, [field]: value };
        setRecipe(typeof recipe === 'string' ? JSON.stringify(newData, null, 2) : newData);
    };

    const updateNumberField = (field, val) => {
        const num = val === '' ? null : parseInt(val);
        updateField(field, isNaN(num) ? null : num);
    };

    const updateNutrition = (field, val) => {
        const num = val === '' ? undefined : parseFloat(val);
        const newNutrition = { ...(data.nutrition || {}), [field]: isNaN(num) ? undefined : num };
        updateField('nutrition', newNutrition);
    };

    const toggleDiet = (diet) => {
        const current = data.suitableForDiet || [];
        const updated = current.includes(diet)
            ? current.filter(d => d !== diet)
            : [...current, diet];
        updateField('suitableForDiet', updated);
    };

    if (!recipe && !setRecipe) return null;

    return (
        <>
            {/* Time & Servings */}
            <SettingsSection title="Time & Servings" icon={Settings} defaultOpen>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Prep (min)</Label>
                        <Input
                            type="number"
                            value={data.prep ?? ''}
                            onChange={(e) => updateNumberField('prep', e.target.value)}
                            placeholder="15"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Cook (min)</Label>
                        <Input
                            type="number"
                            value={data.cook ?? ''}
                            onChange={(e) => updateNumberField('cook', e.target.value)}
                            placeholder="30"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Total (min)</Label>
                        <Input
                            type="number"
                            value={data.total ?? ''}
                            onChange={(e) => updateNumberField('total', e.target.value)}
                            placeholder="45"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Servings</Label>
                        <Input
                            type="number"
                            value={data.servings ?? ''}
                            onChange={(e) => updateNumberField('servings', e.target.value)}
                            placeholder="4"
                            className="h-8 text-sm"
                        />
                    </div>
                </div>
                <div className="space-y-1 mt-3">
                    <Label className="text-xs">Yield</Label>
                    <Input
                        value={data.recipeYield || ''}
                        onChange={(e) => updateField('recipeYield', e.target.value)}
                        placeholder="12 cookies"
                        className="h-8 text-sm"
                    />
                </div>
            </SettingsSection>

            {/* Classification */}
            <SettingsSection title="Classification" icon={Settings} defaultOpen>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Category</Label>
                        <Input
                            value={data.recipeCategory || ''}
                            onChange={(e) => updateField('recipeCategory', e.target.value)}
                            placeholder="Dessert"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Cuisine</Label>
                        <Input
                            value={data.recipeCuisine || ''}
                            onChange={(e) => updateField('recipeCuisine', e.target.value)}
                            placeholder="Italian"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Method</Label>
                        <Input
                            value={data.cookingMethod || ''}
                            onChange={(e) => updateField('cookingMethod', e.target.value)}
                            placeholder="Baking"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Difficulty</Label>
                        <Select
                            value={data.difficulty || 'Medium'}
                            onValueChange={(value) => updateField('difficulty', value)}
                        >
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Easy">Easy</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Hard">Hard</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Estimated Cost</Label>
                        <Input
                            value={data.estimatedCost || ''}
                            onChange={(e) => updateField('estimatedCost', e.target.value)}
                            placeholder="$10-15"
                            className="h-8 text-sm"
                        />
                    </div>
                </div>
            </SettingsSection>

            {/* Diet Labels */}
            <SettingsSection title="Diet Labels" icon={Settings}>
                <div className="flex flex-wrap gap-1.5">
                    {DIET_OPTIONS.map(diet => (
                        <Button
                            key={diet.value}
                            variant={data.suitableForDiet?.includes(diet.value) ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs px-2"
                            onClick={() => toggleDiet(diet.value)}
                        >
                            {diet.label}
                        </Button>
                    ))}
                </div>
            </SettingsSection>

            {/* Nutrition */}
            <SettingsSection title="Nutrition" icon={Settings}>
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { key: 'calories', label: 'Calories', ph: '320' },
                        { key: 'fatContent', label: 'Fat (g)', ph: '15' },
                        { key: 'saturatedFatContent', label: 'Sat. Fat (g)', ph: '3' },
                        { key: 'carbohydrateContent', label: 'Carbs (g)', ph: '40' },
                        { key: 'sugarContent', label: 'Sugar (g)', ph: '12' },
                        { key: 'fiberContent', label: 'Fiber (g)', ph: '2' },
                        { key: 'proteinContent', label: 'Protein (g)', ph: '4' },
                        { key: 'sodiumContent', label: 'Sodium (mg)', ph: '220' },
                        { key: 'cholesterolContent', label: 'Chol. (mg)', ph: '25' },
                    ].map(({ key, label, ph }) => (
                        <div key={key} className="space-y-1">
                            <Label className="text-xs">{label}</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.[key] ?? ''}
                                onChange={(e) => updateNutrition(key, e.target.value)}
                                placeholder={ph}
                                className="h-8 text-sm"
                            />
                        </div>
                    ))}
                </div>
                <div className="space-y-1 mt-3">
                    <Label className="text-xs">Serving Size</Label>
                    <Input
                        value={data.nutrition?.servingSize ?? ''}
                        onChange={(e) => {
                            const newNutrition = { ...(data.nutrition || {}), servingSize: e.target.value };
                            updateField('nutrition', newNutrition);
                        }}
                        placeholder="1 serving (150g)"
                        className="h-8 text-sm"
                    />
                </div>
            </SettingsSection>

            {/* Equipment */}
            <SettingsSection title="Equipment" icon={Wrench}>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs h-7 flex-1"
                            disabled={equipmentDetecting}
                            onClick={async () => {
                                setEquipmentDetecting(true);
                                setDetectionResult(null);
                                setDetectedItemsToSelect(null);
                                try {
                                    const allText = (data.instructions || []).map(section =>
                                        (section.steps || []).map(s => s.text || '').join(' ')
                                    ).join(' ');
                                    if (!allText.trim()) {
                                        setDetectionResult({ found: 0, added: 0, matches: [] });
                                        return;
                                    }
                                    const res = await equipmentAPI.match(allText);
                                    const matched = res.data?.data || res.data || [];
                                    const existingNames = new Set((data.equipment || []).map(e => e.name.toLowerCase()));
                                    const newItems = matched
                                        .filter(m => !existingNames.has(m.name.toLowerCase()))
                                        .map(m => ({
                                            id: m.id,
                                            name: m.name,
                                            required: true,
                                            notes: '',
                                            affiliateUrl: m.affiliateUrl || m.affiliate_url || '',
                                            matchedBy: m.matchedBy,
                                            confidence: m.confidence,
                                        }));

                                    if (newItems.length > 0) {
                                        // Show selection UI instead of adding directly
                                        setDetectedItemsToSelect(newItems);
                                        // Select all by default
                                        setSelectedNewIds(new Set(newItems.map((_, i) => i)));
                                    } else {
                                        // Fallback if no NEW items were found
                                        setDetectionResult({
                                            found: matched.length,
                                            added: 0,
                                            matches: matched.slice(0, 8),
                                        });
                                    }
                                } catch (err) {
                                    console.error('Equipment detection failed:', err);
                                    setDetectionResult({ found: 0, added: 0, matches: [], error: true });
                                } finally {
                                    setEquipmentDetecting(false);
                                }
                            }}
                        >
                            {equipmentDetecting ? <Loader2 className="size-3 animate-spin" /> : <Zap className="size-3" />}
                            Auto-detect
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs h-7"
                            onClick={() => {
                                updateField('equipment', [...(data.equipment || []), { name: '', required: true, notes: '', affiliateUrl: '' }]);
                            }}
                        >
                            <Plus className="size-3" /> Add
                        </Button>
                    </div>

                    {/* Manual Selection UI for Auto-Detected Items */}
                    {detectedItemsToSelect && (
                        <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-foreground">
                                    Select equipment to add ({detectedItemsToSelect.length})
                                </p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px] px-2"
                                    onClick={() => {
                                        if (selectedNewIds.size === detectedItemsToSelect.length) {
                                            setSelectedNewIds(new Set());
                                        } else {
                                            setSelectedNewIds(new Set(detectedItemsToSelect.map((_, i) => i)));
                                        }
                                    }}
                                >
                                    {selectedNewIds.size === detectedItemsToSelect.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                                {detectedItemsToSelect.map((item, i) => (
                                    <div key={i} className="flex items-center space-x-2 bg-background p-2 rounded border">
                                        <Checkbox
                                            id={`detect-${i}`}
                                            checked={selectedNewIds.has(i)}
                                            onCheckedChange={(checked) => {
                                                const next = new Set(selectedNewIds);
                                                if (checked) next.add(i);
                                                else next.delete(i);
                                                setSelectedNewIds(next);
                                            }}
                                        />
                                        <label htmlFor={`detect-${i}`} className="flex-1 text-xs cursor-pointer flex items-center gap-1.5">
                                            {item.name}
                                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-auto">
                                                {item.matchedBy === 'name' ? '🟢' : item.matchedBy === 'keyword' ? '🟡' : '🔵'} {item.matchedBy}
                                            </Badge>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className="flex items-center gap-2 pt-1 border-t border-primary/10">
                                <Button
                                    size="sm"
                                    className="h-7 text-xs flex-1"
                                    disabled={selectedNewIds.size === 0}
                                    onClick={() => {
                                        const selectedItems = detectedItemsToSelect
                                            .filter((_, i) => selectedNewIds.has(i))
                                            .map(item => ({
                                                name: item.name,
                                                required: item.required,
                                                notes: item.notes,
                                                affiliateUrl: item.affiliateUrl
                                            }));
                                        updateField('equipment', [...(data.equipment || []), ...selectedItems]);
                                        setDetectionResult({
                                            found: detectedItemsToSelect.length,
                                            added: selectedItems.length,
                                            matches: detectedItemsToSelect.slice(0, 8)
                                        });
                                        setDetectedItemsToSelect(null);
                                    }}
                                >
                                    Add Selected ({selectedNewIds.size})
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setDetectedItemsToSelect(null)}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Detection results (shows after Add Selected, or if 0 found) */}
                    {!detectedItemsToSelect && detectionResult && !detectionResult.error && (
                        <div className="bg-muted/50 border rounded-md p-2.5 space-y-2">
                            <p className="text-xs text-muted-foreground">
                                Found <strong>{detectionResult.found}</strong> match{detectionResult.found !== 1 ? 'es' : ''}
                                {detectionResult.added > 0 && <>, <strong className="text-primary">{detectionResult.added} new</strong> added</>}
                                {detectionResult.added === 0 && detectionResult.found > 0 && <span> (all already listed)</span>}
                            </p>
                            {detectionResult.matches?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {detectionResult.matches.map((m, i) => (
                                        <Badge key={i} variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                                            <span>{m.matchedBy === 'name' ? '🟢' : m.matchedBy === 'keyword' ? '🟡' : '🔵'}</span>
                                            {m.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {detectionResult?.error && (
                        <p className="text-xs text-destructive">Detection failed. Check console.</p>
                    )}

                    {(data.equipment || []).map((item, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            <Input
                                value={item.name}
                                onChange={(e) => {
                                    const updated = [...(data.equipment || [])];
                                    updated[index] = { ...item, name: e.target.value };
                                    updateField('equipment', updated);
                                }}
                                placeholder="Name"
                                className="h-7 text-xs flex-1"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive hover:bg-destructive/10 shrink-0"
                                onClick={() => {
                                    const updated = (data.equipment || []).filter((_, i) => i !== index);
                                    updateField('equipment', updated);
                                }}
                            >
                                <X className="size-3" />
                            </Button>
                        </div>
                    ))}
                    {(data.equipment || []).length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                            No equipment yet.
                        </p>
                    )}
                </div>
            </SettingsSection>
        </>
    );
}

export default function BlockSettings({ editor, selectedBlock: initialSelectedBlock, relatedContext, recipeData, onRecipeChange }) {
    const [, setBlockVersion] = useState(0);
    const [imageDialogOpen, setImageDialogOpen] = useState(false);
    const [imageUploaderOpen, setImageUploaderOpen] = useState(false);

    useEffect(() => {
        if (!editor || !initialSelectedBlock?.id) return undefined;
        const handleChange = () => {
            setBlockVersion((prev) => prev + 1);
        };
        const unsubscribe = editor.onEditorContentChange(handleChange);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor, initialSelectedBlock?.id]);

    const selectedBlock = initialSelectedBlock
        ? (editor?.getBlock(initialSelectedBlock.id) ?? initialSelectedBlock)
        : null;

    useEffect(() => {
        setImageDialogOpen(false);
        setImageUploaderOpen(false);
    }, [selectedBlock?.id]);

    if (!selectedBlock) return null;

    const updateBlock = (updates) => {
        if (!editor || !selectedBlock) return;
        const currentBlock = editor.getBlock(selectedBlock.id) || selectedBlock;
        // Always preserve the block type to prevent BlockNote from replacing
        // content:'none' custom blocks (e.g. relatedContent) with a default heading.
        editor.updateBlock(currentBlock, { type: currentBlock.type, ...updates });
        setBlockVersion((prev) => prev + 1);
    };

    const updateProps = (props) => {
        const currentBlock = editor?.getBlock(selectedBlock.id) || selectedBlock;
        updateBlock({ type: currentBlock.type, props: { ...currentBlock.props, ...props } });
    };

    const handleImageReplaceSelect = (item) => {
        if (!item || selectedBlock.type !== 'customImage') return;
        const parsed = parseVariantsJson(item);
        const variants = getVariantMap(parsed);
        const url = variants.md?.url || variants.sm?.url || variants.lg?.url || item.url || '';
        const bestVariant = variants.md || variants.lg || variants.original;

        updateProps({
            url,
            mediaId: item.id?.toString() || '',
            alt: item.altText || item.alt_text || item.name || '',
            credit: item.credit || item.credit_text || '',
            width: bestVariant?.width || selectedBlock.props.width || 512,
            height: bestVariant?.height || selectedBlock.props.height || 0,
            variantsJson: JSON.stringify(variants),
        });
        setImageDialogOpen(false);
    };

    const handleImageUploadComplete = (data) => {
        if (!data || selectedBlock.type !== 'customImage') return;
        const variants = data.variants || {};
        const url = variants.md?.url || variants.sm?.url || variants.lg?.url || data.url;
        const bestVariant = variants.md || variants.lg || variants.original;

        updateProps({
            url,
            mediaId: data.id?.toString() || '',
            alt: data.altText || '',
            credit: data.credit || '',
            width: bestVariant?.width || data.width || selectedBlock.props.width || 512,
            height: bestVariant?.height || data.height || selectedBlock.props.height || 0,
            variantsJson: JSON.stringify(variants),
        });
        setImageUploaderOpen(false);
    };

    const deleteBlock = () => {
        if (!editor || !selectedBlock) return;
        editor.removeBlocks([selectedBlock]);
        setBlockVersion((prev) => prev + 1);
    };

    const faqItems = selectedBlock.type === 'faqSection'
        ? parseJsonArray(selectedBlock.props.items)
        : [];
    const tableHeaders = selectedBlock.type === 'simpleTable'
        ? parseJsonArray(selectedBlock.props.headersJson)
        : [];
    const tableRows = selectedBlock.type === 'simpleTable'
        ? parseJsonArray(selectedBlock.props.rowsJson)
        : [];
    const handledTypes = new Set([
        'heading',
        'paragraph',
        'customImage',
        'alert',
        'divider',
        'faqSection',
        'beforeAfter',
        'simpleTable',
        'video',
        'recipeEmbed',
        'relatedContent',
        'featuredImage',
        'title',
        'headline',
        'mainRecipe',
        'roundupList',
    ]);
    const hasTextAlignment = typeof selectedBlock.props?.textAlignment === 'string';
    const isHandled = handledTypes.has(selectedBlock.type);

    // Render varied settings based on block type
    return (
        <div className="divide-y divide-border">
            {/* Common Settings */}
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Type</span>
                    <span className="text-sm font-semibold capitalize">{selectedBlock.type}</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">ID</span>
                    <span className="text-xs font-mono text-muted-foreground truncate max-w-[150px]" title={selectedBlock.id}>
                        {selectedBlock.id}
                    </span>
                </div>
            </div>

            {/* Type Specific Settings */}
            {selectedBlock.type === 'heading' && (
                <SettingsSection title="Heading Settings" icon={Type} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Level</Label>
                            <Select
                                value={selectedBlock.props.level?.toString()}
                                onValueChange={(val) => updateProps({ level: parseInt(val, 10) })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2">H2</SelectItem>
                                    <SelectItem value="3">H3</SelectItem>
                                    <SelectItem value="4">H4</SelectItem>
                                    <SelectItem value="5">H5</SelectItem>
                                    <SelectItem value="6">H6</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Alignment</Label>
                            <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                                {['left', 'center', 'right'].map((align) => (
                                    <Button
                                        key={align}
                                        variant={selectedBlock.props.textAlignment === align ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="flex-1 h-7 text-xs"
                                        onClick={() => updateProps({ textAlignment: align })}
                                    >
                                        {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                        {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                        {align === 'right' && <AlignRight className="w-3 h-3" />}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'paragraph' && (
                <SettingsSection title="Text Settings" icon={Type} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Alignment</Label>
                            <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                                {['left', 'center', 'right'].map((align) => (
                                    <Button
                                        key={align}
                                        variant={selectedBlock.props.textAlignment === align ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="flex-1 h-7 text-xs"
                                        onClick={() => updateProps({ textAlignment: align })}
                                    >
                                        {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                        {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                        {align === 'right' && <AlignRight className="w-3 h-3" />}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'customImage' && (
                <SettingsSection title="Image Settings" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Replace image</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onClick={() => setImageDialogOpen(true)}
                                >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                    Media Library
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onClick={() => setImageUploaderOpen(true)}
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Width</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.width || '100%'}
                                onChange={(e) => updateProps({ width: e.target.value })}
                                placeholder="100%"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Alignment</Label>
                            <Select
                                value={selectedBlock.props.alignment || 'center'}
                                onValueChange={(val) => updateProps({ alignment: val })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Select alignment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Caption</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.caption || ''}
                                onChange={(e) => updateProps({ caption: e.target.value })}
                                placeholder="Image caption"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Alt Text</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.alt || ''}
                                onChange={(e) => updateProps({ alt: e.target.value })}
                                placeholder="Describe the image"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Credit</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.credit || ''}
                                onChange={(e) => updateProps({ credit: e.target.value })}
                                placeholder="Photo credit"
                            />
                        </div>
                    </div>
                    <MediaDialog
                        open={imageDialogOpen}
                        onOpenChange={setImageDialogOpen}
                        onSelect={handleImageReplaceSelect}
                    />
                    <ImageUploader
                        open={imageUploaderOpen}
                        onOpenChange={setImageUploaderOpen}
                        onUploadComplete={handleImageUploadComplete}
                    />
                </SettingsSection>
            )}

            {selectedBlock.type === 'alert' && (
                <SettingsSection title="Alert Settings" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Type</Label>
                            <Select
                                value={selectedBlock.props.type}
                                onValueChange={(val) => updateProps({ type: val })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tip">Tip</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="note">Note</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Alignment</Label>
                            <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                                {['left', 'center', 'right'].map((align) => (
                                    <Button
                                        key={align}
                                        variant={selectedBlock.props.textAlignment === align ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="flex-1 h-7 text-xs"
                                        onClick={() => updateProps({ textAlignment: align })}
                                    >
                                        {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                        {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                        {align === 'right' && <AlignRight className="w-3 h-3" />}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Text Color</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.textColor || ''}
                                onChange={(e) => updateProps({ textColor: e.target.value })}
                                placeholder="#111827"
                            />
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'divider' && (
                <SettingsSection title="Divider Settings" icon={Settings} defaultOpen>
                    <div className="space-y-2">
                        <Label className="text-xs">Style</Label>
                        <Select
                            value={selectedBlock.props.style || 'solid'}
                            onValueChange={(val) => updateProps({ style: val })}
                        >
                            <SelectTrigger className="h-8 text-sm w-full">
                                <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="solid">Solid</SelectItem>
                                <SelectItem value="dashed">Dashed</SelectItem>
                                <SelectItem value="dotted">Dotted</SelectItem>
                                <SelectItem value="double">Double</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'faqSection' && (
                <SettingsSection title="FAQ Settings" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Title</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.title || ''}
                                onChange={(e) => updateProps({ title: e.target.value })}
                                placeholder="FAQ title"
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Questions</span>
                            <span>{faqItems.length}</span>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'beforeAfter' && (
                <SettingsSection title="Before / After" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Layout</Label>
                            <Select
                                value={selectedBlock.props.layout || 'slider'}
                                onValueChange={(val) => updateProps({ layout: val })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Select layout" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="slider">Slider</SelectItem>
                                    <SelectItem value="side_by_side">Side by side</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Before image</span>
                            <span>{selectedBlock.props.beforeJson ? 'Set' : 'Empty'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>After image</span>
                            <span>{selectedBlock.props.afterJson ? 'Set' : 'Empty'}</span>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'simpleTable' && (
                <SettingsSection title="Table Settings" icon={Settings} defaultOpen>
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                            <span>Columns</span>
                            <span>{tableHeaders.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Rows</span>
                            <span>{tableRows.length}</span>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'video' && (
                <SettingsSection title="Video Settings" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">URL</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.url || ''}
                                onChange={(e) => updateProps({ url: e.target.value })}
                                placeholder="https://"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Aspect Ratio</Label>
                            <Select
                                value={selectedBlock.props.aspectRatio || '16:9'}
                                onValueChange={(val) => updateProps({ aspectRatio: val })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Select ratio" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="16:9">16:9</SelectItem>
                                    <SelectItem value="4:3">4:3</SelectItem>
                                    <SelectItem value="1:1">1:1</SelectItem>
                                    <SelectItem value="9:16">9:16</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Provider</span>
                            <span>{selectedBlock.props.provider || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Video ID</span>
                            <span>{selectedBlock.props.videoId || '-'}</span>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'recipeEmbed' && (
                <SettingsSection title="Recipe Card" icon={Settings} defaultOpen>
                    <div className="space-y-3 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                            <span>Headline</span>
                            <span className="truncate max-w-[160px]" title={selectedBlock.props.headline || ''}>
                                {selectedBlock.props.headline || '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Slug</span>
                            <span className="truncate max-w-[160px]" title={selectedBlock.props.slug || ''}>
                                {selectedBlock.props.slug || '-'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Total Time</span>
                            <span>{selectedBlock.props.totalTime || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Difficulty</span>
                            <span>{selectedBlock.props.difficulty || '-'}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                            Use the toolbar to change the recipe.
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'relatedContent' && (
                <SettingsSection title="Related Content" icon={Settings} defaultOpen>
                    <RelatedContentSettings
                        selectedBlock={selectedBlock}
                        relatedContext={relatedContext}
                        updateProps={updateProps}
                    />
                </SettingsSection>
            )}

            {selectedBlock.type === 'featuredImage' && (
                <SettingsSection title="Featured Image" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Alt Text</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.imageAlt || ''}
                                onChange={(e) => updateProps({ imageAlt: e.target.value })}
                                placeholder="Describe the image"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs">Focal X</Label>
                                <Input
                                    className="h-8 text-sm w-full"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={selectedBlock.props.focalX ?? 50}
                                    onChange={(e) => updateProps({ focalX: clampNumber(e.target.value, 0, 100, 50) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Focal Y</Label>
                                <Input
                                    className="h-8 text-sm w-full"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={selectedBlock.props.focalY ?? 50}
                                    onChange={(e) => updateProps({ focalY: clampNumber(e.target.value, 0, 100, 50) })}
                                />
                            </div>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'title' && (
                <SettingsSection title="Title" icon={Type} defaultOpen>
                    <div className="space-y-2">
                        <Label className="text-xs">Value</Label>
                        <Input
                            className="h-8 text-sm w-full"
                            value={selectedBlock.props.value || ''}
                            onChange={(e) => updateProps({ value: e.target.value })}
                            placeholder="Add title"
                        />
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'headline' && (
                <SettingsSection title="Headline" icon={Type} defaultOpen>
                    <div className="space-y-2">
                        <Label className="text-xs">Value</Label>
                        <Input
                            className="h-8 text-sm w-full"
                            value={selectedBlock.props.value || ''}
                            onChange={(e) => updateProps({ value: e.target.value })}
                            placeholder="Add headline"
                        />
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'mainRecipe' && (
                <RecipeSettingsSidebar recipe={recipeData} setRecipe={onRecipeChange} />
            )}

            {selectedBlock.type === 'roundupList' && (
                <SettingsSection title="Roundup Builder" icon={Settings} defaultOpen>
                    <div className="text-xs text-muted-foreground">
                        This block is managed by the roundup builder.
                    </div>
                </SettingsSection>
            )}

            {!isHandled && hasTextAlignment && (
                <SettingsSection title="Text Settings" icon={Type} defaultOpen>
                    <div className="space-y-2">
                        <Label className="text-xs">Alignment</Label>
                        <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                            {['left', 'center', 'right'].map((align) => (
                                <Button
                                    key={align}
                                    variant={selectedBlock.props.textAlignment === align ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="flex-1 h-7 text-xs"
                                    onClick={() => updateProps({ textAlignment: align })}
                                >
                                    {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                    {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                    {align === 'right' && <AlignRight className="w-3 h-3" />}
                                </Button>
                            ))}
                        </div>
                    </div>
                </SettingsSection>
            )}

            {!isHandled && !hasTextAlignment && (
                <SettingsSection title="Block Settings" icon={Settings} defaultOpen>
                    <div className="text-xs text-muted-foreground">
                        No settings available for this block type yet.
                    </div>
                </SettingsSection>
            )}

            {/* Actions */}
            <div className="p-4 pt-8">
                <Button
                    variant="destructive"
                    size="sm"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={deleteBlock}
                >
                    <Trash2 className="w-4 h-4" />
                    Delete Block
                </Button>
            </div>
        </div>
    );
}
