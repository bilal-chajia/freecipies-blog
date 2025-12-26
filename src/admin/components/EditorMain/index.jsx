import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select.jsx';
import BlockEditor from '../BlockEditor';
import RecipeBuilder from '../RecipeBuilder';
import RoundupBuilder from '../RoundupBuilder';
import { Code } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import Editor from '@monaco-editor/react';

export default function EditorMain({
    formData,
    onInputChange,
    contentJson,
    setContentJson,
    recipeJson,
    setRecipeJson,
    roundupJson,
    setRoundupJson,
    faqsJson,
    setFaqsJson,
    jsonErrors,
    validateJSON,
    useVisualEditor,
    setUseVisualEditor,
    isValidJSON,
}) {
    return (
        <main className="space-y-8 p-8 max-w-4xl mx-auto pb-20">
            {/* Type Selector */}
            <div className="flex items-center gap-4">
                <div className="flex-1">
                    <Select
                        value={formData.type}
                        onValueChange={(value) => onInputChange('type', value)}
                    >
                        <SelectTrigger className="w-48 h-10 font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="article">📝 Article</SelectItem>
                            <SelectItem value="recipe">🍳 Recipe</SelectItem>
                            <SelectItem value="roundup">📚 Roundup</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Title */}
            <div className="space-y-3">
                <Input
                    value={formData.label}
                    onChange={(e) => onInputChange('label', e.target.value)}
                    placeholder="Article title..."
                    className="text-5xl font-bold border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 h-auto leading-tight"
                />
            </div>

            {/* Headline */}
            <div className="space-y-3">
                <Input
                    value={formData.headline}
                    onChange={(e) => onInputChange('headline', e.target.value)}
                    placeholder="Add a compelling headline..."
                    className="text-2xl text-muted-foreground border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto"
                />
            </div>

            <hr className="border-t-2 my-8" />

            {/* Block Editor / Content */}
            <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Content</Label>
                    <div className="flex items-center gap-2">
                        {jsonErrors.content && (
                            <span className="text-sm text-destructive font-medium">{jsonErrors.content}</span>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUseVisualEditor(!useVisualEditor)}
                            className="gap-1.5 text-xs h-8"
                        >
                            <Code className="h-3.5 w-3.5" />
                            {useVisualEditor ? 'JSON Mode' : 'Visual Mode'}
                        </Button>
                    </div>
                </div>

                {useVisualEditor ? (
                    <BlockEditor
                        value={contentJson}
                        onChange={(value) => {
                            setContentJson(value);
                            validateJSON('content', value);
                        }}
                        placeholder="Start writing your article content..."
                    />
                ) : (
                    <div className="border rounded-lg overflow-hidden shadow-sm">
                        <Editor
                            height="500px"
                            language="json"
                            theme="vs-dark"
                            value={contentJson}
                            onChange={(value) => {
                                setContentJson(value);
                                validateJSON('content', value);
                            }}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true,
                            }}
                        />
                    </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                    {useVisualEditor
                        ? 'Use the toolbar to add paragraphs, headings, images and more'
                        : 'Edit the raw JSON content directly'}
                </p>
            </div>

            {/* Recipe Builder (conditional) */}
            {formData.type === 'recipe' && (
                <div className="space-y-3 pt-8 border-t-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Recipe Data</Label>
                        {jsonErrors.recipe && (
                            <span className="text-sm text-destructive font-medium">{jsonErrors.recipe}</span>
                        )}
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-muted/50 p-6 shadow-sm">
                        <RecipeBuilder
                            value={recipeJson}
                            onChange={(newValue) => {
                                setRecipeJson(newValue);
                                if (isValidJSON(newValue)) {
                                    const newErrors = { ...jsonErrors };
                                    delete newErrors.recipe;
                                }
                            }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Include ingredients, instructions, nutrition, prep time, etc.
                    </p>
                </div>
            )}

            {/* Roundup Builder (conditional) */}
            {formData.type === 'roundup' && (
                <div className="space-y-3 pt-8 border-t-2">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold">Roundup Items</Label>
                        {jsonErrors.roundup && (
                            <span className="text-sm text-destructive font-medium">{jsonErrors.roundup}</span>
                        )}
                    </div>
                    <div className="border rounded-lg overflow-hidden bg-muted/50 p-6 shadow-sm">
                        <RoundupBuilder
                            value={roundupJson}
                            onChange={(newValue) => {
                                setRoundupJson(newValue);
                                if (isValidJSON(newValue)) {
                                    const newErrors = { ...jsonErrors };
                                    delete newErrors.roundup;
                                }
                            }}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Add recipes and articles to your curated list
                    </p>
                </div>
            )}

            {/* FAQs (optional, collapsible) */}
            <div className="space-y-3 pt-8 border-t-2">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">FAQs (Optional)</Label>
                    {jsonErrors.faqs && (
                        <span className="text-sm text-destructive font-medium">{jsonErrors.faqs}</span>
                    )}
                </div>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                    <Editor
                        height="220px"
                        language="json"
                        theme="vs-dark"
                        value={faqsJson}
                        onChange={(value) => {
                            setFaqsJson(value);
                            validateJSON('faqs', value);
                        }}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                        }}
                    />
                </div>
                <p className="text-xs text-muted-foreground italic">
                    💡 Legacy FAQ JSON (use FAQ block in content instead for better editing)
                </p>
            </div>
        </main>
    );
}
