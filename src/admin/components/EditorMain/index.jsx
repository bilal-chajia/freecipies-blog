import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { motion, AnimatePresence } from 'framer-motion';
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

// Animation variants
const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
        }
    },
    exit: {
        opacity: 0,
        y: -10,
        transition: { duration: 0.2 }
    }
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
        },
    },
};

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
    relatedContext,
}) {
    return (
        <motion.main
            className="space-y-8 px-4 py-6 w-full max-w-none pb-20"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Type Selector */}
            <motion.div
                className="flex items-center gap-4"
                variants={sectionVariants}
            >
                <motion.div
                    className="flex-1"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    <Select
                        value={formData.type}
                        onValueChange={(value) => onInputChange('type', value)}
                    >
                        <SelectTrigger className="w-48 h-8 font-medium">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="article">📝 Article</SelectItem>
                            <SelectItem value="recipe">🍳 Recipe</SelectItem>
                            <SelectItem value="roundup">📚 Roundup</SelectItem>
                        </SelectContent>
                    </Select>
                </motion.div>
            </motion.div>

            {/* Title */}
            <motion.div
                className="space-y-3"
                variants={sectionVariants}
            >
                <motion.div
                    initial={{ opacity: 0.5 }}
                    whileFocus={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                    <Input
                        value={formData.label}
                        onChange={(e) => onInputChange('label', e.target.value)}
                        placeholder="Article title..."
                        className="text-5xl font-bold border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 h-auto leading-tight"
                    />
                </motion.div>
            </motion.div>

            {/* Headline */}
            <motion.div
                className="space-y-3"
                variants={sectionVariants}
            >
                <Input
                    value={formData.headline}
                    onChange={(e) => onInputChange('headline', e.target.value)}
                    placeholder="Add a compelling headline..."
                    className="text-2xl text-muted-foreground border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto"
                />
            </motion.div>

            <motion.hr
                className="border-t-2 my-8"
                variants={sectionVariants}
            />

            {/* Block Editor / Content */}
            <motion.div
                className="space-y-3"
                variants={sectionVariants}
            >
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Content</Label>
                    <div className="flex items-center gap-2">
                        {jsonErrors.content && (
                            <motion.span
                                className="text-sm text-destructive font-medium"
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                            >
                                {jsonErrors.content}
                            </motion.span>
                        )}
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUseVisualEditor(!useVisualEditor)}
                                className="gap-1.5 text-xs h-8"
                            >
                                <Code className="h-3.5 w-3.5" />
                                {useVisualEditor ? 'JSON Mode' : 'Visual Mode'}
                            </Button>
                        </motion.div>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {useVisualEditor ? (
                        <motion.div
                            key="visual"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            <BlockEditor
                                value={contentJson}
                                onChange={(value) => {
                                    setContentJson(value);
                                    validateJSON('content', value);
                                }}
                                placeholder="Start writing your article content..."
                                context={relatedContext}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="json"
                            className="border rounded-lg overflow-hidden shadow-sm"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
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
                        </motion.div>
                    )}
                </AnimatePresence>
                <p className="text-xs text-muted-foreground mt-2">
                    {useVisualEditor
                        ? 'Use the toolbar to add paragraphs, headings, images and more'
                        : 'Edit the raw JSON content directly'}
                </p>
            </motion.div>

            {/* Recipe Builder (conditional) */}
            <AnimatePresence>
                {formData.type === 'recipe' && (
                    <motion.div
                        className="space-y-3 pt-8 border-t-2"
                        initial={{ opacity: 0, height: 0, y: 20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Recipe Data</Label>
                            {jsonErrors.recipe && (
                                <motion.span
                                    className="text-sm text-destructive font-medium"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    {jsonErrors.recipe}
                                </motion.span>
                            )}
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-muted/50 p-6 shadow-sm">
                            <RecipeBuilder
                                value={recipeJson}
                                onChange={(newValue) => {
                                    setRecipeJson(newValue);
                                    validateJSON('recipe', newValue);
                                }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Include ingredients, instructions, nutrition, prep time, etc.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Roundup Builder (conditional) */}
            <AnimatePresence>
                {formData.type === 'roundup' && (
                    <motion.div
                        className="space-y-3 pt-8 border-t-2"
                        initial={{ opacity: 0, height: 0, y: 20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -20 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                    >
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">Roundup Items</Label>
                            {jsonErrors.roundup && (
                                <motion.span
                                    className="text-sm text-destructive font-medium"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    {jsonErrors.roundup}
                                </motion.span>
                            )}
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-muted/50 p-6 shadow-sm">
                            <RoundupBuilder
                                value={roundupJson}
                                onChange={(newValue) => {
                                    setRoundupJson(newValue);
                                    validateJSON('roundup', newValue);
                                }}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Add recipes and articles to your curated list
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAQs (optional, collapsible) */}
            <motion.div
                className="space-y-3 pt-8 border-t-2"
                variants={sectionVariants}
            >
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">FAQs (Optional)</Label>
                    {jsonErrors.faqs && (
                        <motion.span
                            className="text-sm text-destructive font-medium"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {jsonErrors.faqs}
                        </motion.span>
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
            </motion.div>
        </motion.main>
    );
}
