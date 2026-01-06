import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import BlockEditor from '@/components/BlockEditor';
import RecipeBuilder from '@/components/RecipeBuilder';
import ExcerptsSection from '@/components/EditorSidebar/ExcerptsSection';
import MediaSection from '@/components/EditorSidebar/MediaSection';
import SEOSection from '@/components/EditorSidebar/SEOSection';
import TagsSection from '@/components/EditorSidebar/TagsSection';
import { Code } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import Editor from '@monaco-editor/react';

// Animation variants for tab content
const tabContentVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
};

/**
 * Main content area for Recipe Editor
 * Focused on recipe-specific fields without type selector
 */
export default function RecipeEditorMain({
    formData,
    onInputChange,
    contentJson,
    setContentJson,
    imagesData,
    onImageRemove,
    onMediaDialogOpen,
    tags,
    recipeJson,
    setRecipeJson,
    faqsJson,
    setFaqsJson,
    jsonErrors,
    validateJSON,
    useVisualEditor,
    setUseVisualEditor,
    isValidJSON,
    isEditMode,
    relatedContext,
}) {
    const tabTriggerClass = "h-10 px-4 pb-2 text-sm font-medium text-muted-foreground !bg-transparent !rounded-none border-b-2 border-transparent transition-colors hover:text-foreground data-[state=active]:text-foreground data-[state=active]:!border-b-2 data-[state=active]:!border-b-primary";

    return (
        <main className="space-y-8 px-4 py-6 w-full max-w-none pb-20">
            {/* Title */}
            <div className="space-y-3">
                <Input
                    value={formData.label}
                    onChange={(e) => onInputChange('label', e.target.value)}
                    placeholder="Recipe title..."
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

            <Tabs defaultValue="recipe" className="space-y-6">
                <TabsList className="w-full h-auto flex items-center justify-start gap-0 rounded-none bg-transparent p-0 border-b border-border">
                    <TabsTrigger
                        value="content"
                        className={tabTriggerClass}
                    >
                        Additional Content
                    </TabsTrigger>
                    <TabsTrigger
                        value="recipe"
                        className={tabTriggerClass}
                    >
                        Recipe Data
                    </TabsTrigger>
                    <TabsTrigger
                        value="faqs"
                        className={tabTriggerClass}
                    >
                        FAQs
                    </TabsTrigger>
                    <TabsTrigger
                        value="tags"
                        className={tabTriggerClass}
                    >
                        Tags
                    </TabsTrigger>
                    <TabsTrigger
                        value="media"
                        className={tabTriggerClass}
                    >
                        Media
                    </TabsTrigger>
                    <TabsTrigger
                        value="seo"
                        className={tabTriggerClass}
                    >
                        SEO
                    </TabsTrigger>
                    <TabsTrigger
                        value="excerpts"
                        className={tabTriggerClass}
                    >
                        Excerpts
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-3 pt-2" asChild>
                    <motion.div
                        variants={tabContentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <Label className="text-base font-semibold">Additional Content (Optional)</Label>
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
                                placeholder="Add intro text, tips, or extra content..."
                                context={relatedContext}
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
                    </motion.div>
                </TabsContent>

                <TabsContent value="recipe" className="space-y-3 pt-2" asChild>
                    <motion.div
                        variants={tabContentVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                    >
                        {jsonErrors.recipe && (
                            <span className="text-sm text-destructive font-medium">{jsonErrors.recipe}</span>
                        )}
                        <div className="border rounded-lg overflow-hidden bg-muted/50 p-6 shadow-sm">
                            <RecipeBuilder
                                value={recipeJson}
                                onChange={(newValue) => {
                                    setRecipeJson(newValue);
                                    validateJSON('recipe', newValue);
                                }}
                            />
                        </div>
                    </motion.div>
                </TabsContent>

                <TabsContent value="faqs" className="space-y-3 pt-2" asChild>
                    <motion.div
                        variants={tabContentVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="flex items-center justify-between">
                            <Label className="text-base font-semibold">FAQs (Optional)</Label>
                            {jsonErrors.faqs && (
                                <span className="text-sm text-destructive font-medium">{jsonErrors.faqs}</span>
                            )}
                        </div>
                        <div className="border rounded-lg overflow-hidden shadow-sm">
                            <Editor
                                height="300px"
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
                            Add FAQs for SEO schema (or use FAQ block in content)
                        </p>
                    </motion.div>
                </TabsContent>

                <TabsContent value="tags" className="space-y-3 pt-2" asChild>
                    <motion.div
                        variants={tabContentVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <TagsSection
                            formData={formData}
                            onInputChange={onInputChange}
                            tags={tags}
                        />
                    </motion.div>
                </TabsContent>

                <TabsContent value="media" className="space-y-3 pt-2" asChild>
                    <motion.div
                        variants={tabContentVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <MediaSection
                            formData={formData}
                            imagesData={imagesData}
                            onInputChange={onInputChange}
                            onImageRemove={onImageRemove}
                            onMediaDialogOpen={onMediaDialogOpen}
                        />
                    </motion.div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-3 pt-2" asChild>
                    <motion.div
                        variants={tabContentVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <SEOSection
                            formData={formData}
                            onInputChange={onInputChange}
                            isEditMode={isEditMode}
                        />
                    </motion.div>
                </TabsContent>

                <TabsContent value="excerpts" className="space-y-3 pt-2" asChild>
                    <motion.div
                        variants={tabContentVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <ExcerptsSection
                            formData={formData}
                            onInputChange={onInputChange}
                        />
                    </motion.div>
                </TabsContent>
            </Tabs>
        </main>
    );
}
