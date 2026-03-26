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

export default RecipeSettingsSidebar;

