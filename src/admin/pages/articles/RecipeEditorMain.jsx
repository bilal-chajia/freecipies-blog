import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import BlockEditor from '../../components/BlockEditor';
import RecipeBuilder from '../../components/RecipeBuilder';
import ExcerptsSection from '../../components/EditorSidebar/ExcerptsSection';
import MediaSection from '../../components/EditorSidebar/MediaSection';
import SEOSection from '../../components/EditorSidebar/SEOSection';
import TagsSection from '../../components/EditorSidebar/TagsSection';
import { Code } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.jsx';
import Editor from '@monaco-editor/react';

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
}) {
    return (
        <main className="space-y-8 p-8 w-full max-w-none pb-20">
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

            <Tabs defaultValue="content" className="space-y-4">
                <TabsList className="w-full h-auto flex flex-wrap items-end justify-start gap-6 rounded-none bg-transparent p-0 border-b border-border/60">
                    <TabsTrigger
                        value="content"
                        className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                    >
                        Additional Content
                    </TabsTrigger>
                    <TabsTrigger
                        value="recipe"
                        className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                    >
                        Recipe Data
                    </TabsTrigger>
                    <TabsTrigger
                        value="faqs"
                        className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                    >
                        FAQs
                    </TabsTrigger>
                    <TabsTrigger
                        value="tags"
                        className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                    >
                        Tags
                    </TabsTrigger>
                    <TabsTrigger
                        value="media"
                        className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                    >
                        Media
                    </TabsTrigger>
                    <TabsTrigger
                        value="seo"
                        className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                    >
                        SEO
                    </TabsTrigger>
                    <TabsTrigger
                        value="excerpts"
                        className="h-9 rounded-none border-b-2 border-transparent px-1 pb-2 text-sm font-semibold text-muted-foreground data-[state=active]:border-foreground data-[state=active]:text-foreground"
                    >
                        Excerpts
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-3 pt-2">
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
                </TabsContent>

                <TabsContent value="recipe" className="space-y-3 pt-2">
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
                </TabsContent>

                <TabsContent value="faqs" className="space-y-3 pt-2">
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
                </TabsContent>

                <TabsContent value="tags" className="space-y-3 pt-2">
                    <TagsSection
                        formData={formData}
                        onInputChange={onInputChange}
                        tags={tags}
                    />
                </TabsContent>

                <TabsContent value="media" className="space-y-3 pt-2">
                    <MediaSection
                        formData={formData}
                        imagesData={imagesData}
                        onInputChange={onInputChange}
                        onImageRemove={onImageRemove}
                        onMediaDialogOpen={onMediaDialogOpen}
                    />
                </TabsContent>

                <TabsContent value="seo" className="space-y-3 pt-2">
                    <SEOSection
                        formData={formData}
                        onInputChange={onInputChange}
                        isEditMode={isEditMode}
                    />
                </TabsContent>

                <TabsContent value="excerpts" className="space-y-3 pt-2">
                    <ExcerptsSection
                        formData={formData}
                        onInputChange={onInputChange}
                    />
                </TabsContent>
            </Tabs>
        </main>
    );
}
