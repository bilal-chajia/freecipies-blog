import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const defaultRecipe = {
    prepTime: '',
    cookTime: '',
    totalTime: '',
    servings: '',
    calories: '',
    cuisine: '',
    course: '',
    difficulty: 'Medium',
    rating: 0,
    // Grouped format to match RecipeLayout expectations
    ingredients: [{ group: 'Main Ingredients', items: [''] }],
    instructions: [{ group: 'Steps', steps: [''] }],
    nutrition: {},
};

export default function RecipeBuilder({ value, onChange }) {
    const [data, setData] = useState(defaultRecipe);

    useEffect(() => {
        try {
            if (value && value !== '{}') {
                const parsed = JSON.parse(value);
                // Ensure arrays exist with proper structure
                let ingredients = parsed.ingredients || [];
                let instructions = parsed.instructions || [];

                // Convert flat format to grouped if necessary
                if (ingredients.length > 0 && typeof ingredients[0] === 'string') {
                    // Old flat format - convert to grouped
                    ingredients = [{ group: 'Main Ingredients', items: ingredients }];
                }
                if (instructions.length > 0 && instructions[0].text !== undefined) {
                    // Old format with { text: '...' } - convert to grouped steps
                    instructions = [{ group: 'Steps', steps: instructions.map(i => i.text || i) }];
                }

                setData({
                    ...defaultRecipe,
                    ...parsed,
                    ingredients: ingredients.length > 0 ? ingredients : defaultRecipe.ingredients,
                    instructions: instructions.length > 0 ? instructions : defaultRecipe.instructions,
                });
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

    // --- Ingredients (working with first group for simplicity) ---
    const getIngredientItems = () => data.ingredients[0]?.items || [];

    const addIngredient = () => {
        const newIngredients = [...data.ingredients];
        if (newIngredients[0]) {
            newIngredients[0] = { ...newIngredients[0], items: [...(newIngredients[0].items || []), ''] };
        }
        updateData({ ingredients: newIngredients });
    };

    const removeIngredient = (index) => {
        const newIngredients = [...data.ingredients];
        if (newIngredients[0]) {
            newIngredients[0] = {
                ...newIngredients[0],
                items: newIngredients[0].items.filter((_, i) => i !== index)
            };
        }
        updateData({ ingredients: newIngredients });
    };

    const updateIngredient = (index, val) => {
        const newIngredients = [...data.ingredients];
        if (newIngredients[0]) {
            const newItems = [...(newIngredients[0].items || [])];
            newItems[index] = val;
            newIngredients[0] = { ...newIngredients[0], items: newItems };
        }
        updateData({ ingredients: newIngredients });
    };

    const moveIngredient = (index, direction) => {
        const items = getIngredientItems();
        if (direction === 'up' && index > 0) {
            const newItems = [...items];
            [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
            const newIngredients = [...data.ingredients];
            newIngredients[0] = { ...newIngredients[0], items: newItems };
            updateData({ ingredients: newIngredients });
        } else if (direction === 'down' && index < items.length - 1) {
            const newItems = [...items];
            [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
            const newIngredients = [...data.ingredients];
            newIngredients[0] = { ...newIngredients[0], items: newItems };
            updateData({ ingredients: newIngredients });
        }
    };

    // --- Instructions (working with first group for simplicity) ---
    const getInstructionSteps = () => data.instructions[0]?.steps || [];

    const addInstruction = () => {
        const newInstructions = [...data.instructions];
        if (newInstructions[0]) {
            newInstructions[0] = { ...newInstructions[0], steps: [...(newInstructions[0].steps || []), ''] };
        }
        updateData({ instructions: newInstructions });
    };

    const removeInstruction = (index) => {
        const newInstructions = [...data.instructions];
        if (newInstructions[0]) {
            newInstructions[0] = {
                ...newInstructions[0],
                steps: newInstructions[0].steps.filter((_, i) => i !== index)
            };
        }
        updateData({ instructions: newInstructions });
    };

    const updateInstruction = (index, val) => {
        const newInstructions = [...data.instructions];
        if (newInstructions[0]) {
            const newSteps = [...(newInstructions[0].steps || [])];
            newSteps[index] = val;
            newInstructions[0] = { ...newInstructions[0], steps: newSteps };
        }
        updateData({ instructions: newInstructions });
    };

    const moveInstruction = (index, direction) => {
        const steps = getInstructionSteps();
        if (direction === 'up' && index > 0) {
            const newSteps = [...steps];
            [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
            const newInstructions = [...data.instructions];
            newInstructions[0] = { ...newInstructions[0], steps: newSteps };
            updateData({ instructions: newInstructions });
        } else if (direction === 'down' && index < steps.length - 1) {
            const newSteps = [...steps];
            [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
            const newInstructions = [...data.instructions];
            newInstructions[0] = { ...newInstructions[0], steps: newSteps };
            updateData({ instructions: newInstructions });
        }
    };

    return (
        <div className="space-y-8">
            {/* Meta Data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-card">
                <div className="space-y-2">
                    <Label>Prep Time</Label>
                    <Input
                        value={data.prepTime}
                        onChange={(e) => handleInputChange('prepTime', e.target.value)}
                        placeholder="e.g. 15 mins"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Cook Time</Label>
                    <Input
                        value={data.cookTime}
                        onChange={(e) => handleInputChange('cookTime', e.target.value)}
                        placeholder="e.g. 30 mins"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Total Time</Label>
                    <Input
                        value={data.totalTime}
                        onChange={(e) => handleInputChange('totalTime', e.target.value)}
                        placeholder="e.g. 45 mins"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Servings</Label>
                    <Input
                        value={data.servings}
                        onChange={(e) => handleInputChange('servings', e.target.value)}
                        placeholder="e.g. 4 people"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Calories</Label>
                    <Input
                        value={data.calories}
                        onChange={(e) => handleInputChange('calories', e.target.value)}
                        placeholder="e.g. 500 kcal"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Cuisine</Label>
                    <Input
                        value={data.cuisine}
                        onChange={(e) => handleInputChange('cuisine', e.target.value)}
                        placeholder="e.g. Italian"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Course</Label>
                    <Input
                        value={data.course}
                        onChange={(e) => handleInputChange('course', e.target.value)}
                        placeholder="e.g. Dinner"
                    />
                </div>
                <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                        value={data.difficulty}
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

            {/* Ingredients */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Ingredients</h3>
                    <Button onClick={addIngredient} size="sm" variant="outline" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Ingredient
                    </Button>
                </div>
                <div className="space-y-2">
                    {getIngredientItems().length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No ingredients added.</p>
                    )}
                    {getIngredientItems().map((ing, index) => (
                        <div key={index} className="flex gap-2">
                            <div className="flex flex-col gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveIngredient(index, 'up')} disabled={index === 0}>
                                    <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveIngredient(index, 'down')} disabled={index === getIngredientItems().length - 1}>
                                    <ArrowDown className="w-3 h-3" />
                                </Button>
                            </div>
                            <Input
                                value={ing}
                                onChange={(e) => updateIngredient(index, e.target.value)}
                                placeholder="e.g. 2 cups Flour"
                            />
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeIngredient(index)}
                                className="text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Instructions</h3>
                    <Button onClick={addInstruction} size="sm" variant="outline" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Step
                    </Button>
                </div>
                <div className="space-y-4">
                    {getInstructionSteps().length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No instructions added.</p>
                    )}
                    {getInstructionSteps().map((step, index) => (
                        <div key={index} className="flex gap-2 items-start p-4 border rounded-md bg-accent/20">
                            <div className="flex flex-col gap-1 mt-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold mb-2">
                                    {index + 1}
                                </span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveInstruction(index, 'up')} disabled={index === 0}>
                                    <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveInstruction(index, 'down')} disabled={index === getInstructionSteps().length - 1}>
                                    <ArrowDown className="w-3 h-3" />
                                </Button>
                            </div>
                            <div className="flex-1 space-y-2">
                                <Textarea
                                    value={step}
                                    onChange={(e) => updateInstruction(index, e.target.value)}
                                    placeholder={`Step ${index + 1} description...`}
                                    rows={2}
                                />
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeInstruction(index)}
                                className="text-destructive hover:bg-destructive/10 mt-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
