import { useState, useEffect } from 'react';
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Code, Eye, Sparkles, Loader2, Timer, Wrench, Zap, X, Star } from "lucide-react";
import { equipmentAPI } from '@/services/api';
import { Badge } from '@/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/ui/select";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/ui/collapsible";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/ui/dialog";
import { articlesAPI } from '@/services/api';
import { migrateRecipeJson } from '@modules/articles/types/recipes.types';
import type {
    AggregateRating,
    DietType,
    IngredientGroup,
    IngredientItem,
    InstructionSection,
    InstructionStep,
    NutritionInfo,
    RecipeJson,
} from '@modules/articles/types/recipes.types';

type EditableInstructionStep = InstructionStep & { _timerManual?: boolean };
type EditableInstructionSection = Omit<InstructionSection, 'steps'> & { steps: EditableInstructionStep[] };
type EditableRecipeJson = Omit<RecipeJson, 'instructions'> & { instructions: EditableInstructionSection[] };
type RecipeBuilderProps = {
    value?: string;
    onChange: (value: string) => void;
};
type RecipeField = keyof EditableRecipeJson;
type MoveDirection = 'up' | 'down';
type NutritionField = keyof NutritionInfo;
type RatingField = keyof AggregateRating;

/**
 * Default recipe matching the unified RecipeJson schema.
 * Imported from recipes.types.ts as the single source of truth.
 * 
 * Note: We can't import TS types in JSX, so we replicate the default here.
 * If DEFAULT_RECIPE_JSON changes in recipes.types.ts, update this too.
 * 
 * @see recipes.types.ts DEFAULT_RECIPE_JSON
 */
const defaultRecipe: EditableRecipeJson = {
    // Time (minutes) — null = not set
    prep: null,
    cook: null,
    total: null,
    // Yield & Servings
    servings: null,
    recipeYield: null,
    // Classification
    recipeCategory: null,
    recipeCuisine: null,
    difficulty: null,
    cookingMethod: null,
    estimatedCost: null,
    keywords: [],
    suitableForDiet: [],
    // Structured content — user adds groups as needed
    ingredients: [],
    instructions: [],
    tips: [],
    // Nutrition — null = not yet provided
    nutrition: null,
    // Social proof — null = no ratings yet
    aggregateRating: null,
    // Equipment & Video
    equipment: [],
    video: null,
};

/**
 * Migrate legacy recipe data to the current RecipeJson format.
 * Mirrors migrateRecipeJson() from recipes.types.ts but for JS runtime.
 * 
 * Handles: flat string ingredients, old `group` key, ISO time strings,
 * old field names (course→recipeCategory, cuisine→recipeCuisine).
 */
function migrateRecipeData(parsed: Record<string, unknown>): EditableRecipeJson {
    return migrateRecipeJson(parsed as Parameters<typeof migrateRecipeJson>[0]) as EditableRecipeJson;
}

// Diet options from Schema.org
const dietOptions: Array<{ value: DietType; label: string }> = [
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

export default function RecipeBuilder({ value, onChange }: RecipeBuilderProps) {
    const [data, setData] = useState<EditableRecipeJson>(defaultRecipe);
    const [nutritionOpen, setNutritionOpen] = useState(false);
    const [tipsOpen, setTipsOpen] = useState(false);
    const [equipmentOpen, setEquipmentOpen] = useState(false);
    const [equipmentCatalog, setEquipmentCatalog] = useState<unknown[]>([]);
    const [equipmentDetecting, setEquipmentDetecting] = useState(false);
    const [detectedEquipment, setDetectedEquipment] = useState<unknown[]>([]);
    const [jsonError, setJsonError] = useState('');
    const [jsonMode, setJsonMode] = useState(false);
    const [jsonEditValue, setJsonEditValue] = useState('');

    // AI Generation state
    const [aiDialogOpen, setAiDialogOpen] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    // AI Generate Handler
    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) {
            setAiError('Please enter a recipe description');
            return;
        }
        setAiLoading(true);
        setAiError('');
        try {
            const response = await fetch('/api/admin/ai/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: localStorage.getItem('admin_token') ? `Bearer ${localStorage.getItem('admin_token')}` : '',
                },
                body: JSON.stringify({
                    prompt: `Generate a complete recipe for: ${aiPrompt}. Include ingredients with amounts and units, step-by-step instructions, prep time, cook time, servings, difficulty, and nutrition facts.`,
                    contentType: 'recipe',
                }),
            });
            const result = await response.json();
            if (result.success && result.data?.content) {
                const generated = result.data.content;
                // Merge AI-generated content with existing structure
                const newData = {
                    ...defaultRecipe,
                    ...generated,
                    ingredients: generated.ingredients || defaultRecipe.ingredients,
                    instructions: generated.instructions || defaultRecipe.instructions,
                };
                setData(newData);
                onChange(JSON.stringify(newData, null, 2));
                setAiDialogOpen(false);
                setAiPrompt('');
            } else {
                setAiError(result.error || 'Failed to generate recipe');
            }
        } catch (err) {
            setAiError('Network error: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setAiLoading(false);
        }
    };

    useEffect(() => {
        try {
            if (value && value !== '{}') {
                const parsed = JSON.parse(value) as Record<string, unknown>;
                // Use migration logic to normalize legacy data formats
                const migratedData = migrateRecipeData(parsed);
                setData(migratedData);
            }
        } catch (e) {
            console.error("RecipeBuilder: Invalid JSON", e);
        }
    }, [value]);

    const updateData = (updates: Partial<EditableRecipeJson>) => {
        const newData = { ...data, ...updates };
        setData(newData);
        onChange(JSON.stringify(newData, null, 2));
    };

    const handleInputChange = (field: RecipeField, val: EditableRecipeJson[RecipeField]) => {
        updateData({ [field]: val });
    };

    const handleNumberChange = (field: RecipeField, val: string) => {
        const num = val === '' ? null : parseInt(val);
        updateData({ [field]: num === null || Number.isNaN(num) ? null : num } as Partial<EditableRecipeJson>);
    };

    // --- Ingredients ---
    const getIngredientItems = (groupIndex = 0) => data.ingredients[groupIndex]?.items || [];

    const addIngredient = (groupIndex = 0) => {
        const newIngredients = [...data.ingredients];
        if (newIngredients[groupIndex]) {
            newIngredients[groupIndex] = {
                ...newIngredients[groupIndex],
                items: [...(newIngredients[groupIndex].items || []), { name: '', amount: 0, unit: '' }]
            };
        }
        updateData({ ingredients: newIngredients });
    };

    const removeIngredient = (groupIndex: number, itemIndex: number) => {
        const newIngredients = [...data.ingredients];
        if (newIngredients[groupIndex]) {
            newIngredients[groupIndex] = {
                ...newIngredients[groupIndex],
                items: newIngredients[groupIndex].items.filter((_, i) => i !== itemIndex)
            };
        }
        updateData({ ingredients: newIngredients });
    };

    const updateIngredient = (groupIndex: number, itemIndex: number, field: keyof IngredientItem, val: IngredientItem[keyof IngredientItem]) => {
        const newIngredients = [...data.ingredients];
        if (newIngredients[groupIndex]) {
            const newItems = [...(newIngredients[groupIndex].items || [])];
            newItems[itemIndex] = { ...newItems[itemIndex], [field]: val };
            newIngredients[groupIndex] = { ...newIngredients[groupIndex], items: newItems };
        }
        updateData({ ingredients: newIngredients });
    };

    const moveIngredient = (groupIndex: number, itemIndex: number, direction: MoveDirection) => {
        const items = getIngredientItems(groupIndex);
        const newIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
        if (newIndex < 0 || newIndex >= items.length) return;

        const newItems = [...items];
        [newItems[itemIndex], newItems[newIndex]] = [newItems[newIndex], newItems[itemIndex]];
        const newIngredients = [...data.ingredients];
        newIngredients[groupIndex] = { ...newIngredients[groupIndex], items: newItems };
        updateData({ ingredients: newIngredients });
    };

    // --- Instructions ---
    const getInstructionSteps = (sectionIndex = 0) => data.instructions[sectionIndex]?.steps || [];

    const addInstruction = (sectionIndex = 0) => {
        const newInstructions = [...data.instructions];
        if (newInstructions[sectionIndex]) {
            newInstructions[sectionIndex] = {
                ...newInstructions[sectionIndex],
                steps: [...(newInstructions[sectionIndex].steps || []), { text: '' }]
            };
        }
        updateData({ instructions: newInstructions });
    };

    const removeInstruction = (sectionIndex: number, stepIndex: number) => {
        const newInstructions = [...data.instructions];
        if (newInstructions[sectionIndex]) {
            newInstructions[sectionIndex] = {
                ...newInstructions[sectionIndex],
                steps: newInstructions[sectionIndex].steps.filter((_, i) => i !== stepIndex)
            };
        }
        updateData({ instructions: newInstructions });
    };

    // Parse timer (minutes) from instruction text — EN + FR, ranges, combined h+m, seconds
    const parseTimerFromText = (text: string): number | null => {
        if (!text) return null;
        const t = text.toLowerCase();

        // 1. Combined hours + minutes: "1 hour 30 minutes", "1h30", "1 h 30 min", "1 heure 30 minutes"
        const combined = t.match(/(\d+)\s*(?:hours?|hrs?|h|heures?)\s*(?:and\s*|et\s*)?(\d+)\s*(?:minutes?|mins?|m(?:in)?)?/i);
        if (combined) return parseInt(combined[1]) * 60 + parseInt(combined[2]);

        // 2. Range with unit: "10-15 minutes", "10 to 15 min", "10 à 15 minutes"
        const range = t.match(/(\d+)\s*(?:-|to|à|a)\s*(\d+)\s*(minutes?|mins?|hours?|hrs?|heures?|seconds?|secs?|secondes?)/i);
        if (range) {
            const avg = Math.round((parseInt(range[1]) + parseInt(range[2])) / 2);
            if (range[3].match(/hours?|hrs?|heures?/i)) return avg * 60;
            if (range[3].match(/seconds?|secs?|secondes?/i)) return Math.max(1, Math.round(avg / 60));
            return avg;
        }

        // 3. "for X unit" / "pendant X unit" / "during X unit" / "environ X unit"
        const forPattern = t.match(/(?:for|pendant|during|environ|about|approximately|around)\s*(\d+)\s*(minutes?|mins?|hours?|hrs?|heures?|seconds?|secs?|secondes?)/i);
        if (forPattern) {
            let mins = parseInt(forPattern[1]);
            if (forPattern[2].match(/hours?|hrs?|heures?/i)) return mins * 60;
            if (forPattern[2].match(/seconds?|secs?|secondes?/i)) return Math.max(1, Math.round(mins / 60));
            return mins;
        }

        // 4. Standalone "X hours" / "X heures"
        const hours = t.match(/(\d+)\s*(?:hours?|hrs?|heures?)\b/i);
        if (hours) return parseInt(hours[1]) * 60;

        // 5. Standalone "X minutes" / "X mins"
        const mins = t.match(/(\d+)\s*(?:minutes?|mins?)\b/i);
        if (mins) return parseInt(mins[1]);

        // 6. Standalone "X seconds" / "X secs"
        const secs = t.match(/(\d+)\s*(?:seconds?|secs?|secondes?)\b/i);
        if (secs) return Math.max(1, Math.round(parseInt(secs[1]) / 60));

        // 7. Shorthand "30m", "1h", "90s"
        const shorthand = t.match(/\b(\d+)\s*(h|m|s)\b/i);
        if (shorthand) {
            const v = parseInt(shorthand[1]);
            if (shorthand[2] === 'h') return v * 60;
            if (shorthand[2] === 's') return Math.max(1, Math.round(v / 60));
            return v;
        }

        return null;
    };

    const updateInstruction = (sectionIndex: number, stepIndex: number, field: keyof EditableInstructionStep, val: EditableInstructionStep[keyof EditableInstructionStep]) => {
        const newInstructions = [...data.instructions];
        if (newInstructions[sectionIndex]) {
            const newSteps = [...(newInstructions[sectionIndex].steps || [])];
            const step = { ...newSteps[stepIndex], [field]: val };

            // Auto-extract timer when text changes (unless user manually set timer)
            if (field === 'text') {
                const extracted = parseTimerFromText(typeof val === 'string' ? val : '');
                if (extracted) step.timer = extracted;
                else if (!step._timerManual) step.timer = undefined;
            }

            // Mark manual timer edits
            if (field === 'timer') {
                step._timerManual = val != null && val !== '';
            }

            newSteps[stepIndex] = step;
            newInstructions[sectionIndex] = { ...newInstructions[sectionIndex], steps: newSteps };
        }
        updateData({ instructions: newInstructions });
    };

    const moveInstruction = (sectionIndex: number, stepIndex: number, direction: MoveDirection) => {
        const steps = getInstructionSteps(sectionIndex);
        const newIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
        if (newIndex < 0 || newIndex >= steps.length) return;

        const newSteps = [...steps];
        [newSteps[stepIndex], newSteps[newIndex]] = [newSteps[newIndex], newSteps[stepIndex]];
        const newInstructions = [...data.instructions];
        newInstructions[sectionIndex] = { ...newInstructions[sectionIndex], steps: newSteps };
        updateData({ instructions: newInstructions });
    };

    // --- Tips ---
    const addTip = () => {
        updateData({ tips: [...(data.tips || []), ''] });
    };

    const removeTip = (index: number) => {
        updateData({ tips: data.tips.filter((_, i) => i !== index) });
    };

    const updateTip = (index: number, val: string) => {
        const newTips = [...data.tips];
        newTips[index] = val;
        updateData({ tips: newTips });
    };

    // --- Nutrition ---
    const updateNutrition = (field: NutritionField, val: string) => {
        const num = val === '' ? undefined : parseFloat(val);
        updateData({
            nutrition: {
                ...data.nutrition,
                [field]: num === undefined || Number.isNaN(num) ? undefined : num
            }
        });
    };

    // --- Rating ---
    const handleRatingChange = (field: RatingField, val: string) => {
        const num = val === '' ? 0 : parseFloat(val);
        const currentRating = data.aggregateRating || { ratingValue: 5, ratingCount: 1 };
        updateData({
            aggregateRating: {
                ...currentRating,
                [field]: isNaN(num) ? 0 : num
            }
        });
    };

    // --- Diet ---
    const toggleDiet = (diet: DietType) => {
        const current = data.suitableForDiet || [];
        const updated = current.includes(diet)
            ? current.filter(d => d !== diet)
            : [...current, diet];
        updateData({ suitableForDiet: updated });
    };

    return (
        <div className="space-y-6">
            {/* Header with Mode Toggle */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recipe Details</h3>
                <div className="flex items-center gap-2">
                    {/* AI Generate Button */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-7 text-primary border-primary/20 hover:bg-primary/10"
                        onClick={() => setAiDialogOpen(true)}
                    >
                        <Sparkles className="size-3.5" /> Generate with AI
                    </Button>
                    {/* Mode Toggle */}
                    <div className="flex p-1 bg-muted rounded-lg">
                        <Button
                            variant={!jsonMode ? "default" : "ghost"}
                            size="sm"
                            className="gap-1.5 h-7"
                            onClick={() => setJsonMode(false)}
                        >
                            <Eye className="size-3.5" /> Visual
                        </Button>
                        <Button
                            variant={jsonMode ? "default" : "ghost"}
                            size="sm"
                            className="gap-1.5 h-7"
                            onClick={() => {
                                setJsonEditValue(JSON.stringify(data, null, 2));
                                setJsonMode(true);
                            }}
                        >
                            <Code className="size-3.5" /> JSON
                        </Button>
                    </div>
                </div>
            </div>

            {/* AI Generation Dialog */}
            <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="size-5 text-primary" />
                            Generate Recipe with AI
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="ai-prompt">Describe your recipe</Label>
                            <Textarea
                                id="ai-prompt"
                                placeholder="e.g., A healthy vegetarian pasta with spinach and sun-dried tomatoes, ready in 30 minutes"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                rows={3}
                            />
                        </div>
                        {aiError && (
                            <p className="text-sm text-destructive">{aiError}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAiDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAIGenerate}
                            disabled={aiLoading}
                            className="gap-2"
                        >
                            {aiLoading ? (
                                <><Loader2 className="size-4 animate-spin" /> Generating...</>
                            ) : (
                                <><Sparkles className="size-4" /> Generate</>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* JSON Mode Editor */}
            {jsonMode ? (
                <div className="space-y-3">
                    <Textarea
                        value={jsonEditValue}
                        onChange={(e) => setJsonEditValue(e.target.value)}
                        className="font-mono text-sm min-h-[500px] resize-y"
                        placeholder="Edit recipe JSON directly..."
                    />
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setJsonEditValue(JSON.stringify(data, null, 2));
                            }}
                        >
                            Reset
                        </Button>
                        <Button
                            onClick={() => {
                                try {
                                const parsed = JSON.parse(jsonEditValue) as Record<string, unknown>;
                                const migrated = migrateRecipeData(parsed);
                                setData(migrated);
                                onChange(JSON.stringify(migrated, null, 2));
                                setJsonError('');
                            } catch (e) {
                                setJsonError('Invalid JSON: ' + (e instanceof Error ? e.message : 'Unknown error'));
                                }
                            }}
                        >
                            Apply Changes
                        </Button>
                    </div>
                    {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
                </div>
            ) : (
                <>

                    {/* Compact metadata summary */}
                    {!jsonMode && (
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {data.prep != null && <span>⏱️ Prep: {data.prep}m</span>}
                            {data.cook != null && <span>🍳 Cook: {data.cook}m</span>}
                            {data.total != null && <span>⏰ Total: {data.total}m</span>}
                            {data.servings != null && <span>🍽️ {data.servings} servings</span>}
                            {data.difficulty && <span>📊 {data.difficulty}</span>}
                            {data.recipeCuisine && <span>🌍 {data.recipeCuisine}</span>}
                            {(!data.prep && !data.cook && !data.servings && !data.difficulty) && (
                                <span className="italic">Select this block to configure recipe details in the sidebar →</span>
                            )}
                        </div>
                    )}

                    {/* Rating & Social Proof */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-primary/5 border border-primary/10 rounded-xl">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 text-primary">
                                <Star className="size-4 fill-primary" /> Recipe Rating (0-5)
                            </Label>
                            <div className="flex items-center gap-3">
                                <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="5"
                                    value={data.aggregateRating?.ratingValue ?? ''}
                                    onChange={(e) => handleRatingChange('ratingValue', e.target.value)}
                                    placeholder="4.8"
                                    className="w-24 font-bold text-lg"
                                />
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-primary" 
                                        style={{ width: `${(data.aggregateRating?.ratingValue || 0) * 20}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Total Votes / Reviews</Label>
                            <Input
                                type="number"
                                min="0"
                                value={data.aggregateRating?.ratingCount ?? ''}
                                onChange={(e) => handleRatingChange('ratingCount', e.target.value)}
                                placeholder="24"
                                className="font-mono"
                            />
                        </div>
                    </div>

                    {/* Ingredients - Multi-Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Ingredients</h3>
                            <Button
                                onClick={() => {
                                    const newIngredients = [...data.ingredients, { group_title: `Group ${data.ingredients.length + 1}`, items: [] }];
                                    updateData({ ingredients: newIngredients });
                                }}
                                size="sm"
                                variant="outline"
                                className="gap-2"
                            >
                                <Plus className="size-4" /> Add Section
                            </Button>
                        </div>

                        {data.ingredients.map((group, groupIndex) => (
                            <div key={groupIndex} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={group.group_title || ''}
                                        onChange={(e) => {
                                            const newIngredients = [...data.ingredients];
                                            newIngredients[groupIndex] = { ...newIngredients[groupIndex], group_title: e.target.value };
                                            updateData({ ingredients: newIngredients });
                                        }}
                                        placeholder="Section title (e.g., For the Dough)"
                                        className="font-semibold"
                                    />
                                    <Button onClick={() => addIngredient(groupIndex)} size="sm" variant="outline">
                                        <Plus className="size-4" />
                                    </Button>
                                    {data.ingredients.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                updateData({ ingredients: data.ingredients.filter((_, i) => i !== groupIndex) });
                                            }}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-2 pl-2">
                                    {(group.items || []).map((ing, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <div className="flex flex-col gap-1">
                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveIngredient(groupIndex, index, 'up')} disabled={index === 0}>
                                                    <ArrowUp className="size-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveIngredient(groupIndex, index, 'down')} disabled={index === (group.items?.length || 1) - 1}>
                                                    <ArrowDown className="size-3" />
                                                </Button>
                                            </div>
                                            <Input
                                                type="number"
                                                value={ing.amount || ''}
                                                onChange={(e) => updateIngredient(groupIndex, index, 'amount', parseFloat(e.target.value) || 0)}
                                                placeholder="2"
                                                className="w-20"
                                            />
                                            <Input
                                                value={ing.unit || ''}
                                                onChange={(e) => updateIngredient(groupIndex, index, 'unit', e.target.value)}
                                                placeholder="cups"
                                                className="w-24"
                                            />
                                            <Input
                                                value={ing.name || ''}
                                                onChange={(e) => updateIngredient(groupIndex, index, 'name', e.target.value)}
                                                placeholder="all-purpose flour"
                                                className="flex-1"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeIngredient(groupIndex, index)}
                                                className="text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(group.items || []).length === 0 && (
                                        <p className="text-sm text-muted-foreground italic">No ingredients in this section.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Instructions - Multi-Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Instructions</h3>
                            <Button
                                onClick={() => {
                                    const newInstructions = [...data.instructions, { section_title: `Section ${data.instructions.length + 1}`, steps: [] }];
                                    updateData({ instructions: newInstructions });
                                }}
                                size="sm"
                                variant="outline"
                                className="gap-2"
                            >
                                <Plus className="size-4" /> Add Section
                            </Button>
                        </div>

                        {data.instructions.map((section, sectionIndex) => (
                            <div key={sectionIndex} className="border rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Input
                                        value={section.section_title || ''}
                                        onChange={(e) => {
                                            const newInstructions = [...data.instructions];
                                            newInstructions[sectionIndex] = { ...newInstructions[sectionIndex], section_title: e.target.value };
                                            updateData({ instructions: newInstructions });
                                        }}
                                        placeholder="Section title (e.g., Prepare the Dough)"
                                        className="font-semibold"
                                    />
                                    <Button onClick={() => addInstruction(sectionIndex)} size="sm" variant="outline">
                                        <Plus className="size-4" />
                                    </Button>
                                    {data.instructions.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                updateData({ instructions: data.instructions.filter((_, i) => i !== sectionIndex) });
                                            }}
                                            className="text-destructive"
                                        >
                                            <Trash2 className="size-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-3 pl-2">
                                    {(section.steps || []).map((step, stepIndex) => (
                                        <div key={stepIndex} className="flex gap-2 items-center p-3 border rounded-md bg-accent/20">
                                            <div className="flex flex-col items-center gap-1">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveInstruction(sectionIndex, stepIndex, 'up')} disabled={stepIndex === 0}>
                                                    <ArrowUp className="size-3" />
                                                </Button>
                                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                                                    {stepIndex + 1}
                                                </span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveInstruction(sectionIndex, stepIndex, 'down')} disabled={stepIndex === (section.steps?.length || 1) - 1}>
                                                    <ArrowDown className="size-3" />
                                                </Button>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Textarea
                                                    value={step.text || ''}
                                                    onChange={(e) => updateInstruction(sectionIndex, stepIndex, 'text', e.target.value)}
                                                    placeholder={`Step ${stepIndex + 1} description...`}
                                                    rows={2}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <Timer className="size-4 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        value={step.timer ?? ''}
                                                        onChange={(e) => updateInstruction(sectionIndex, stepIndex, 'timer', e.target.value ? parseInt(e.target.value) : null)}
                                                        placeholder="Timer (min)"
                                                        className="w-32 h-8 text-sm"
                                                    />
                                                    <span className="text-xs text-muted-foreground">min</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeInstruction(sectionIndex, stepIndex)}
                                                className="text-destructive hover:bg-destructive/10 mt-1"
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(section.steps || []).length === 0 && (
                                        <p className="text-sm text-muted-foreground italic">No steps in this section.</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tips (Collapsible) */}
                    <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" className="w-full justify-between p-4 border rounded-lg">
                                <span className="font-semibold">Chef's Tips ({data.tips?.length || 0})</span>
                                {tipsOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-4 pt-4">
                            <div className="flex justify-end">
                                <Button onClick={addTip} size="sm" variant="outline" className="gap-2">
                                    <Plus className="size-4" /> Add Tip
                                </Button>
                            </div>
                            {(data.tips || []).map((tip, index) => (
                                <div key={index} className="flex gap-2">
                                    <Textarea
                                        value={tip}
                                        onChange={(e) => updateTip(index, e.target.value)}
                                        placeholder="Pro tip..."
                                        rows={2}
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeTip(index)}
                                        className="text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            ))}
                        </CollapsibleContent>
                    </Collapsible>




                </>
            )}
        </div>
    );
}
