import { useState, useEffect } from 'react';
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, ChevronDown, ChevronRight } from "lucide-react";
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
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/ui/dialog";

// Default recipe matching schema.sql structure
const defaultRecipe = {
    // Time (minutes)
    prep: null,
    cook: null,
    total: null,
    // Servings
    servings: null,
    recipeYield: '',
    // Metadata
    recipeCategory: '',
    recipeCuisine: '',
    difficulty: 'Medium',
    cookingMethod: '',
    keywords: [],
    suitableForDiet: [],
    // Structured data
    ingredients: [{ group_title: 'Main Ingredients', items: [] }],
    instructions: [{ section_title: 'Steps', steps: [] }],
    tips: [],
    // Nutrition
    nutrition: {},
    // Rating
    aggregateRating: { ratingValue: null, ratingCount: 0 },
};

// Diet options from Schema.org
const dietOptions = [
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

export default function RecipeBuilder({ value, onChange }) {
    const [data, setData] = useState(defaultRecipe);
    const [nutritionOpen, setNutritionOpen] = useState(false);
    const [tipsOpen, setTipsOpen] = useState(false);
    const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
    const [jsonImportValue, setJsonImportValue] = useState('');
    const [jsonError, setJsonError] = useState('');

    useEffect(() => {
        try {
            if (value && value !== '{}') {
                const parsed = JSON.parse(value);
                // Migrate old format
                let ingredients = parsed.ingredients || [];
                let instructions = parsed.instructions || [];

                // Convert old flat format to grouped
                if (ingredients.length > 0 && typeof ingredients[0] === 'string') {
                    ingredients = [{ group_title: 'Main Ingredients', items: ingredients.map(text => ({ name: text, amount: 0, unit: '' })) }];
                } else if (ingredients.length > 0 && ingredients[0].group) {
                    // Old { group: '', items: [''] } format
                    ingredients = ingredients.map(g => ({
                        group_title: g.group || g.group_title || 'Ingredients',
                        items: (g.items || []).map(item =>
                            typeof item === 'string'
                                ? { name: item, amount: 0, unit: '' }
                                : item
                        )
                    }));
                }

                if (instructions.length > 0 && instructions[0].text !== undefined) {
                    instructions = [{ section_title: 'Steps', steps: instructions.map(i => ({ text: i.text || i })) }];
                } else if (instructions.length > 0 && instructions[0].group) {
                    // Old { group: '', steps: [''] } format
                    instructions = instructions.map(g => ({
                        section_title: g.group || g.section_title || 'Steps',
                        steps: (g.steps || []).map(step =>
                            typeof step === 'string'
                                ? { text: step }
                                : step
                        )
                    }));
                }

                // Migrate old time fields
                const migratedData = {
                    ...defaultRecipe,
                    ...parsed,
                    prep: parsed.prep ?? (parsed.prepTime ? parseInt(parsed.prepTime) : null),
                    cook: parsed.cook ?? (parsed.cookTime ? parseInt(parsed.cookTime) : null),
                    total: parsed.total ?? (parsed.totalTime ? parseInt(parsed.totalTime) : null),
                    servings: parsed.servings ? parseInt(parsed.servings) : null,
                    recipeCategory: parsed.recipeCategory || parsed.course || '',
                    recipeCuisine: parsed.recipeCuisine || parsed.cuisine || '',
                    ingredients: ingredients.length > 0 ? ingredients : defaultRecipe.ingredients,
                    instructions: instructions.length > 0 ? instructions : defaultRecipe.instructions,
                    tips: parsed.tips || [],
                    nutrition: parsed.nutrition || (parsed.calories ? { calories: parseInt(parsed.calories) } : {}),
                };

                setData(migratedData);
            }
        } catch (e) {
            console.error("RecipeBuilder: Invalid JSON", e);
        }
    }, []);

    const updateData = (updates) => {
        const newData = { ...data, ...updates };
        setData(newData);
        onChange(JSON.stringify(newData, null, 2));
    };

    const handleInputChange = (field, val) => {
        updateData({ [field]: val });
    };

    const handleNumberChange = (field, val) => {
        const num = val === '' ? null : parseInt(val);
        updateData({ [field]: isNaN(num) ? null : num });
    };

    // --- JSON Import ---
    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonImportValue);
            setJsonError('');
            // Merge with current data
            const merged = { ...data, ...parsed };
            setData(merged);
            onChange(JSON.stringify(merged, null, 2));
            setJsonDialogOpen(false);
            setJsonImportValue('');
        } catch (e) {
            setJsonError('Invalid JSON: ' + e.message);
        }
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

    const removeIngredient = (groupIndex, itemIndex) => {
        const newIngredients = [...data.ingredients];
        if (newIngredients[groupIndex]) {
            newIngredients[groupIndex] = {
                ...newIngredients[groupIndex],
                items: newIngredients[groupIndex].items.filter((_, i) => i !== itemIndex)
            };
        }
        updateData({ ingredients: newIngredients });
    };

    const updateIngredient = (groupIndex, itemIndex, field, val) => {
        const newIngredients = [...data.ingredients];
        if (newIngredients[groupIndex]) {
            const newItems = [...(newIngredients[groupIndex].items || [])];
            newItems[itemIndex] = { ...newItems[itemIndex], [field]: val };
            newIngredients[groupIndex] = { ...newIngredients[groupIndex], items: newItems };
        }
        updateData({ ingredients: newIngredients });
    };

    const moveIngredient = (groupIndex, itemIndex, direction) => {
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

    const removeInstruction = (sectionIndex, stepIndex) => {
        const newInstructions = [...data.instructions];
        if (newInstructions[sectionIndex]) {
            newInstructions[sectionIndex] = {
                ...newInstructions[sectionIndex],
                steps: newInstructions[sectionIndex].steps.filter((_, i) => i !== stepIndex)
            };
        }
        updateData({ instructions: newInstructions });
    };

    const updateInstruction = (sectionIndex, stepIndex, field, val) => {
        const newInstructions = [...data.instructions];
        if (newInstructions[sectionIndex]) {
            const newSteps = [...(newInstructions[sectionIndex].steps || [])];
            newSteps[stepIndex] = { ...newSteps[stepIndex], [field]: val };
            newInstructions[sectionIndex] = { ...newInstructions[sectionIndex], steps: newSteps };
        }
        updateData({ instructions: newInstructions });
    };

    const moveInstruction = (sectionIndex, stepIndex, direction) => {
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

    const removeTip = (index) => {
        updateData({ tips: data.tips.filter((_, i) => i !== index) });
    };

    const updateTip = (index, val) => {
        const newTips = [...data.tips];
        newTips[index] = val;
        updateData({ tips: newTips });
    };

    // --- Nutrition ---
    const updateNutrition = (field, val) => {
        const num = val === '' ? undefined : parseFloat(val);
        updateData({
            nutrition: {
                ...data.nutrition,
                [field]: isNaN(num) ? undefined : num
            }
        });
    };

    // --- Diet ---
    const toggleDiet = (diet) => {
        const current = data.suitableForDiet || [];
        const updated = current.includes(diet)
            ? current.filter(d => d !== diet)
            : [...current, diet];
        updateData({ suitableForDiet: updated });
    };

    return (
        <div className="space-y-6">
            {/* Header with JSON Import */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Recipe Details</h3>
                <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Upload className="w-4 h-4" /> Import JSON
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Import Recipe from JSON</DialogTitle>
                            <DialogDescription>
                                Paste recipe JSON to merge with current data
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex-1 overflow-hidden">
                            <Textarea
                                value={jsonImportValue}
                                onChange={(e) => setJsonImportValue(e.target.value)}
                                placeholder='{"prep": 15, "cook": 30, "ingredients": [...], "instructions": [...]}'
                                className="font-mono text-sm h-[50vh] resize-none"
                            />
                        </div>
                        {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setJsonDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleJsonImport}>Import</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Time & Servings */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border rounded-lg bg-card">
                <div className="space-y-2">
                    <Label>Prep (mins)</Label>
                    <Input
                        type="number"
                        value={data.prep ?? ''}
                        onChange={(e) => handleNumberChange('prep', e.target.value)}
                        placeholder="15"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Cook (mins)</Label>
                    <Input
                        type="number"
                        value={data.cook ?? ''}
                        onChange={(e) => handleNumberChange('cook', e.target.value)}
                        placeholder="30"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Total (mins)</Label>
                    <Input
                        type="number"
                        value={data.total ?? ''}
                        onChange={(e) => handleNumberChange('total', e.target.value)}
                        placeholder="45"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Servings</Label>
                    <Input
                        type="number"
                        value={data.servings ?? ''}
                        onChange={(e) => handleNumberChange('servings', e.target.value)}
                        placeholder="4"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Yield</Label>
                    <Input
                        value={data.recipeYield || ''}
                        onChange={(e) => handleInputChange('recipeYield', e.target.value)}
                        placeholder="12 cookies"
                    />
                </div>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-card">
                <div className="space-y-2">
                    <Label>Category</Label>
                    <Input
                        value={data.recipeCategory || ''}
                        onChange={(e) => handleInputChange('recipeCategory', e.target.value)}
                        placeholder="Dessert"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Cuisine</Label>
                    <Input
                        value={data.recipeCuisine || ''}
                        onChange={(e) => handleInputChange('recipeCuisine', e.target.value)}
                        placeholder="Italian"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Method</Label>
                    <Input
                        value={data.cookingMethod || ''}
                        onChange={(e) => handleInputChange('cookingMethod', e.target.value)}
                        placeholder="baking"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                        value={data.difficulty || 'Medium'}
                        onValueChange={(value) => handleInputChange('difficulty', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Easy">Easy</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Diet Labels */}
            <div className="p-4 border rounded-lg bg-card">
                <Label className="mb-2 block">Suitable For Diet</Label>
                <div className="flex flex-wrap gap-2">
                    {dietOptions.map(diet => (
                        <Button
                            key={diet.value}
                            variant={data.suitableForDiet?.includes(diet.value) ? "default" : "outline"}
                            size="sm"
                            onClick={() => toggleDiet(diet.value)}
                        >
                            {diet.label}
                        </Button>
                    ))}
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
                        <Plus className="w-4 h-4" /> Add Section
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
                                <Plus className="w-4 h-4" />
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
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <div className="space-y-2 pl-2">
                            {(group.items || []).map((ing, index) => (
                                <div key={index} className="flex gap-2 items-center">
                                    <div className="flex flex-col gap-1">
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveIngredient(groupIndex, index, 'up')} disabled={index === 0}>
                                            <ArrowUp className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => moveIngredient(groupIndex, index, 'down')} disabled={index === (group.items?.length || 1) - 1}>
                                            <ArrowDown className="w-3 h-3" />
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
                                        <Trash2 className="w-4 h-4" />
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
                        <Plus className="w-4 h-4" /> Add Section
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
                                <Plus className="w-4 h-4" />
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
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                        <div className="space-y-3 pl-2">
                            {(section.steps || []).map((step, stepIndex) => (
                                <div key={stepIndex} className="flex gap-2 items-start p-3 border rounded-md bg-accent/20">
                                    <div className="flex flex-col gap-1 mt-2">
                                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold mb-2">
                                            {stepIndex + 1}
                                        </span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveInstruction(sectionIndex, stepIndex, 'up')} disabled={stepIndex === 0}>
                                            <ArrowUp className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveInstruction(sectionIndex, stepIndex, 'down')} disabled={stepIndex === (section.steps?.length || 1) - 1}>
                                            <ArrowDown className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Textarea
                                            value={step.text || ''}
                                            onChange={(e) => updateInstruction(sectionIndex, stepIndex, 'text', e.target.value)}
                                            placeholder={`Step ${stepIndex + 1} description...`}
                                            rows={2}
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeInstruction(sectionIndex, stepIndex)}
                                        className="text-destructive hover:bg-destructive/10 mt-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
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
                        {tipsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                    <div className="flex justify-end">
                        <Button onClick={addTip} size="sm" variant="outline" className="gap-2">
                            <Plus className="w-4 h-4" /> Add Tip
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
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </CollapsibleContent>
            </Collapsible>

            {/* Nutrition (Collapsible) */}
            <Collapsible open={nutritionOpen} onOpenChange={setNutritionOpen}>
                <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-4 border rounded-lg">
                        <span className="font-semibold">Nutrition Information</span>
                        {nutritionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="p-4 border rounded-lg mt-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Calories (kcal)</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.calories ?? ''}
                                onChange={(e) => updateNutrition('calories', e.target.value)}
                                placeholder="320"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fat (g)</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.fatContent ?? ''}
                                onChange={(e) => updateNutrition('fatContent', e.target.value)}
                                placeholder="15"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Saturated Fat (g)</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.saturatedFatContent ?? ''}
                                onChange={(e) => updateNutrition('saturatedFatContent', e.target.value)}
                                placeholder="3"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Carbs (g)</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.carbohydrateContent ?? ''}
                                onChange={(e) => updateNutrition('carbohydrateContent', e.target.value)}
                                placeholder="40"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Sugar (g)</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.sugarContent ?? ''}
                                onChange={(e) => updateNutrition('sugarContent', e.target.value)}
                                placeholder="12"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Fiber (g)</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.fiberContent ?? ''}
                                onChange={(e) => updateNutrition('fiberContent', e.target.value)}
                                placeholder="2"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Protein (g)</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.proteinContent ?? ''}
                                onChange={(e) => updateNutrition('proteinContent', e.target.value)}
                                placeholder="4"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Sodium (mg)</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.sodiumContent ?? ''}
                                onChange={(e) => updateNutrition('sodiumContent', e.target.value)}
                                placeholder="220"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Cholesterol (mg)</Label>
                            <Input
                                type="number"
                                value={data.nutrition?.cholesterolContent ?? ''}
                                onChange={(e) => updateNutrition('cholesterolContent', e.target.value)}
                                placeholder="25"
                            />
                        </div>
                        <div className="space-y-2 col-span-2 md:col-span-3">
                            <Label>Serving Size</Label>
                            <Input
                                value={data.nutrition?.servingSize ?? ''}
                                onChange={(e) => updateData({ nutrition: { ...data.nutrition, servingSize: e.target.value } })}
                                placeholder="1 serving (150g)"
                            />
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

