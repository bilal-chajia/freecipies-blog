import { useMemo, useState } from 'react';
import { Settings, Wrench, Zap, Loader2, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from '../DocumentSettings';
import { equipmentAPI } from '../../../../services/api';
import { Badge } from '@/ui/badge';
import { Checkbox } from '@/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/collapsible';
import type {
    DietType,
    DifficultyLevel,
    CostLevel,
    InstructionSection,
    NutritionInfo,
    RecipeJson,
    RecipeVideo,
} from '@modules/articles/types/recipes.types';

type SidebarEquipmentItem = {
    id?: string | number;
    name: string;
    required?: boolean;
    notes?: string;
    affiliateUrl?: string;
    affiliate_url?: string;
    matchedBy?: string;
    confidence?: number;
};

type SidebarRecipeJson = Omit<RecipeJson, 'equipment'> & {
    equipment: SidebarEquipmentItem[];
};

/** Numeric (flat) nutrition fields editable as plain number inputs. */
type NutritionNumberKey = Exclude<keyof NutritionInfo, 'basis' | 'status' | 'serving_size'>;

type DetectionResult = {
    found: number;
    added: number;
    matches: SidebarEquipmentItem[];
    error?: boolean;
};

type RecipeSettingsSidebarProps = {
    recipe?: string | SidebarRecipeJson | null;
    setRecipe?: (value: string | SidebarRecipeJson) => void;
};

const DIET_OPTIONS: Array<{ value: DietType; label: string }> = [
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
function RecipeSettingsSidebar({ recipe, setRecipe }: RecipeSettingsSidebarProps) {
    const [nutritionOpen, setNutritionOpen] = useState(false);
    const [equipmentOpen, setEquipmentOpen] = useState(false);
    const [equipmentDetecting, setEquipmentDetecting] = useState(false);
    const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
    const [detectedItemsToSelect, setDetectedItemsToSelect] = useState<SidebarEquipmentItem[] | null>(null);
    const [selectedNewIds, setSelectedNewIds] = useState<Set<number>>(new Set());
    const [keywordInput, setKeywordInput] = useState('');

    // Parse recipe data
    const data = useMemo<Partial<SidebarRecipeJson>>(() => {
        if (!recipe) return {};
        if (typeof recipe === 'string') {
            try { return JSON.parse(recipe) as Partial<SidebarRecipeJson>; } catch { return {}; }
        }
        return recipe;
    }, [recipe]);

    const updateField = <K extends keyof SidebarRecipeJson>(field: K, value: SidebarRecipeJson[K]) => {
        const newData = { ...data, [field]: value };
        setRecipe?.(typeof recipe === 'string' ? JSON.stringify(newData, null, 2) : newData as SidebarRecipeJson);
    };

    const updateNumberField = (field: keyof SidebarRecipeJson, val: string) => {
        const num = val === '' ? null : parseInt(val);
        updateField(field, (num === null || Number.isNaN(num) ? null : num) as SidebarRecipeJson[keyof SidebarRecipeJson]);
    };

    // Stamp the contract-required basis/status on every nutrition edit; the
    // save-time normalizer drops them again if no real data was entered.
    const setNutrition = (patch: Partial<NutritionInfo>) => {
        const base = (data.nutrition || {}) as Partial<NutritionInfo>;
        updateField('nutrition', { ...base, ...patch, basis: 'per_serving', status: 'validated' } as NutritionInfo);
    };

    const updateNutritionNumber = (field: NutritionNumberKey, val: string) => {
        const num = val === '' ? undefined : parseFloat(val);
        setNutrition({ [field]: num === undefined || Number.isNaN(num) ? undefined : num } as Partial<NutritionInfo>);
    };

    const updateServingSize = (key: 'label' | 'grams', val: string) => {
        const current = data.nutrition?.serving_size ?? { label: '', grams: 0 };
        const next = key === 'grams'
            ? { ...current, grams: val === '' ? 0 : (parseFloat(val) || 0) }
            : { ...current, label: val };
        setNutrition({ serving_size: next });
    };

    const addKeyword = () => {
        const v = keywordInput.trim().replace(/,+$/, '').trim();
        setKeywordInput('');
        if (!v) return;
        const current = data.keywords || [];
        if (current.includes(v)) return;
        updateField('keywords', [...current, v]);
    };

    const removeKeyword = (index: number) => {
        updateField('keywords', (data.keywords || []).filter((_, i) => i !== index));
    };

    const updateVideo = (field: keyof RecipeVideo, val: string) => {
        const current: RecipeVideo = data.video || { url: '', name: '', duration: '' };
        const next = { ...current, [field]: val };
        const isEmpty = !next.url && !next.name && !next.description && !next.thumbnailUrl && !next.duration && !next.uploadDate;
        updateField('video', isEmpty ? null : next);
    };

    const toggleDiet = (diet: DietType) => {
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
                            onValueChange={(value) => updateField('difficulty', value as DifficultyLevel)}
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
                        <Select
                            value={data.estimatedCost || ''}
                            onValueChange={(value) => updateField('estimatedCost', value as CostLevel)}
                        >
                            <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Select cost" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Budget">Budget</SelectItem>
                                <SelectItem value="Moderate">Moderate</SelectItem>
                                <SelectItem value="Premium">Premium</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Keywords</Label>
                        {(data.keywords || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                                {(data.keywords || []).map((kw, i) => (
                                    <Badge key={i} variant="secondary" className="gap-1 text-xs pr-1">
                                        {kw}
                                        <button
                                            type="button"
                                            className="hover:text-destructive"
                                            onClick={() => removeKeyword(i)}
                                            aria-label={`Remove ${kw}`}
                                        >
                                            <X className="size-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                        <Input
                            value={keywordInput}
                            onChange={(e) => setKeywordInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault();
                                    addKeyword();
                                }
                            }}
                            onBlur={addKeyword}
                            placeholder="Type a keyword, press Enter"
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
                {/* Serving basis */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Serving Size</Label>
                        <Input
                            value={data.nutrition?.serving_size?.label ?? ''}
                            onChange={(e) => updateServingSize('label', e.target.value)}
                            placeholder="1 bowl"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Grams</Label>
                        <Input
                            type="number"
                            value={data.nutrition?.serving_size?.grams ?? ''}
                            onChange={(e) => updateServingSize('grams', e.target.value)}
                            placeholder="320"
                            className="h-8 text-sm"
                        />
                    </div>
                </div>
                <div className="space-y-1 mt-3">
                    <Label className="text-xs">Servings per Recipe</Label>
                    <Input
                        type="number"
                        value={data.nutrition?.servings_per_recipe ?? ''}
                        onChange={(e) => updateNutritionNumber('servings_per_recipe', e.target.value)}
                        placeholder={data.servings ? String(data.servings) : '4'}
                        className="h-8 text-sm"
                    />
                </div>

                {/* Macros + micros */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                    {([
                        { key: 'calories', label: 'Calories', ph: '320' },
                        { key: 'total_fat_g', label: 'Fat (g)', ph: '15' },
                        { key: 'saturated_fat_g', label: 'Sat. Fat (g)', ph: '3' },
                        { key: 'trans_fat_g', label: 'Trans Fat (g)', ph: '0' },
                        { key: 'total_carbohydrate_g', label: 'Carbs (g)', ph: '40' },
                        { key: 'dietary_fiber_g', label: 'Fiber (g)', ph: '2' },
                        { key: 'total_sugars_g', label: 'Sugar (g)', ph: '12' },
                        { key: 'added_sugars_g', label: 'Added Sugar (g)', ph: '0' },
                        { key: 'protein_g', label: 'Protein (g)', ph: '4' },
                        { key: 'sodium_mg', label: 'Sodium (mg)', ph: '220' },
                        { key: 'cholesterol_mg', label: 'Chol. (mg)', ph: '25' },
                        { key: 'vitamin_d_mcg', label: 'Vit. D (mcg)', ph: '0' },
                        { key: 'calcium_mg', label: 'Calcium (mg)', ph: '120' },
                        { key: 'iron_mg', label: 'Iron (mg)', ph: '2' },
                        { key: 'potassium_mg', label: 'Potassium (mg)', ph: '510' },
                    ] as Array<{ key: NutritionNumberKey; label: string; ph: string }>).map(({ key, label, ph }) => (
                        <div key={key} className="space-y-1">
                            <Label className="text-xs">{label}</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.[key] ?? ''}
                                onChange={(e) => updateNutritionNumber(key, e.target.value)}
                                placeholder={ph}
                                className="h-8 text-sm"
                            />
                        </div>
                    ))}
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
                                    const allText = (data.instructions || []).map((section: InstructionSection) =>
                                        (section.steps || []).map((s) => s.text || '').join(' ')
                                    ).join(' ');
                                    if (!allText.trim()) {
                                        setDetectionResult({ found: 0, added: 0, matches: [] });
                                        return;
                                    }
                                    const res = await equipmentAPI.match(allText);
                                    const matched = (res.data?.data || res.data || []) as SidebarEquipmentItem[];
                                    const existingNames = new Set((data.equipment || []).map((e) => e.name.toLowerCase()));
                                    const newItems = matched
                                        .filter((m) => !existingNames.has(m.name.toLowerCase()))
                                        .map((m) => ({
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
                                        setSelectedNewIds(new Set(newItems.map((_item, i) => i)));
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
                                            setSelectedNewIds(new Set(detectedItemsToSelect.map((_item, i) => i)));
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
                                            .filter((_item, i) => selectedNewIds.has(i))
                                            .map((item) => ({
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

            {/* Video */}
            <SettingsSection title="Video" icon={Settings}>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Video URL</Label>
                        <Input
                            value={data.video?.url || ''}
                            onChange={(e) => updateVideo('url', e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Title</Label>
                        <Input
                            value={data.video?.name || ''}
                            onChange={(e) => updateVideo('name', e.target.value)}
                            placeholder="How to make..."
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                            value={data.video?.description || ''}
                            onChange={(e) => updateVideo('description', e.target.value)}
                            placeholder="Short video description"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Thumbnail URL</Label>
                        <Input
                            value={data.video?.thumbnailUrl || ''}
                            onChange={(e) => updateVideo('thumbnailUrl', e.target.value)}
                            placeholder="https://.../thumb.jpg"
                            className="h-8 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <Label className="text-xs">Duration (ISO-8601)</Label>
                            <Input
                                value={data.video?.duration || ''}
                                onChange={(e) => updateVideo('duration', e.target.value)}
                                placeholder="PT2M30S"
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Upload Date</Label>
                            <Input
                                type="date"
                                value={data.video?.uploadDate || ''}
                                onChange={(e) => updateVideo('uploadDate', e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                    </div>
                </div>
            </SettingsSection>
        </>
    );
}

export default RecipeSettingsSidebar;
