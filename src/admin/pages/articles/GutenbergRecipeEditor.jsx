/**
 * Gutenberg Recipe Editor
 * 
 * WordPress Block Editor-style recipe editor with 3-panel layout.
 * Includes recipe-specific data (ingredients, instructions) in the main canvas.
 * 
 * Layout:
 * - Left: Block Inserter (collapsible)
 * - Center: Content Canvas (title, headline, recipe builder, blocks)
 * - Right: Settings Sidebar (Document/Block tabs)
 */

import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Eye, Save, Loader2, Plus, PanelRight, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { Label } from '@/ui/label';

// Hooks
import { useContentEditor } from './shared';

// New Gutenberg components
import {
    BlockInserter,
    SettingsSidebar,
    DocumentSettings,
    BlockSettings,
} from '../../components/BlockEditor/components';
import { TitleInput, HeadlineInput, ContentTypeBadge } from '../../components/BlockEditor/components/GutenbergEditorMain';

// Existing components
import BlockEditor from '../../components/BlockEditor';
import RecipeBuilder from '../../components/RecipeBuilder';
import MediaDialog from '../../components/MediaDialog';
import ArticlePreview from '../../components/ArticlePreview';
import EditorTopbar from '../../components/EditorTopbar';
import Editor from '@monaco-editor/react';

// ... imports

export default function GutenbergRecipeEditor() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [editorInstance, setEditorInstance] = useState(null);
    const [viewMode, setViewMode] = useState('visual');

    // Editor state from shared hook
    const editor = useContentEditor({
        slug,
        contentType: 'recipe',
    });

    const {
        loading,
        saving,
        isEditMode,
        formData,
        imagesData,
        categories,
        authors,
        tags,
        contentJson,
        setContentJson,
        recipeJson,
        setRecipeJson,
        jsonErrors,
        validateJSON,
        mediaDialogOpen,
        setMediaDialogOpen,
        handleMediaSelect,
        handleImageRemove,
        handleInputChange,
        handleSave,
        openMediaDialog,
    } = editor;

    // Layout state
    const [inserterOpen, setInserterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [selectedBlock, setSelectedBlock] = useState(null);

    // Related content context
    const categorySlug = categories.find((c) => c.id === formData.categoryId)?.slug || null;
    const tagSlugs = tags
        .filter((t) => formData.selectedTags?.includes(t.id))
        .map((t) => t.slug);
    const relatedContext = {
        categorySlug,
        tagSlugs,
        currentSlug: formData.slug,
    };

    // Title
    const title = isEditMode ? 'Edit Recipe' : 'New Recipe';

    // Handle block insertion from inserter
    const handleInsertBlock = useCallback((blockType) => {
        console.log('Insert block:', blockType);
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                    <Loader2 className="h-12 w-12 text-primary" />
                </motion.div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <header className={cn(
                'flex items-center justify-between',
                'px-4 py-2 border-b bg-background',
                'shrink-0'
            )}>
                {/* Left: Back + Title */}
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/recipes')}
                        className="h-8 w-8"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-sm font-semibold">{title}</h1>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {formData.label || 'Untitled Recipe'}
                        </p>
                    </div>
                </div>

                {/* Center: Topbar controls */}
                <EditorTopbar
                    formData={formData}
                    onInputChange={handleInputChange}
                    categories={categories}
                    authors={authors}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                />

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    {/* Toggle Inserter */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={inserterOpen ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setInserterOpen(!inserterOpen)}
                                className="h-8 w-8"
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle block inserter</TooltipContent>
                    </Tooltip>

                    {/* Toggle Sidebar */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant={sidebarOpen ? "secondary" : "ghost"}
                                size="icon"
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="h-8 w-8"
                            >
                                <PanelRight className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Toggle settings</TooltipContent>
                    </Tooltip>

                    <div className="w-px h-6 bg-border mx-1" />

                    {/* Preview */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setPreviewOpen(true)}
                                className="h-8 w-8"
                            >
                                <Eye className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Preview</TooltipContent>
                    </Tooltip>

                    {/* Save */}
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                        className="h-8 gap-1.5"
                    >
                        {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Save className="h-3.5 w-3.5" />
                        )}
                        {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Publish')}
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => navigate('/recipes')}
                    >
                        Cancel
                    </Button>
                </div>
            </header>

            {/* Main 3-Panel Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Block Inserter */}
                <AnimatePresence>
                    {inserterOpen && (
                        <BlockInserter
                            isOpen={inserterOpen}
                            onClose={() => setInserterOpen(false)}
                            onInsertBlock={handleInsertBlock}
                            contentType="recipe"
                        />
                    )}
                </AnimatePresence>

                {/* Center: Content Canvas */}
                <main className={cn(
                    'flex-1 overflow-y-auto overflow-x-hidden',
                    'bg-[var(--wp-canvas-bg)]'
                )}>
                    <div className="max-w-3xl mx-auto py-8 px-6">
                        {/* Content Type Badge */}
                        <div className="mb-6">
                            <ContentTypeBadge type="recipe" />
                        </div>

                        {/* Title */}
                        <TitleInput
                            value={formData.label}
                            onChange={(value) => handleInputChange('label', value)}
                            placeholder="Recipe title"
                        />

                        {/* Headline */}
                        <HeadlineInput
                            value={formData.headline}
                            onChange={(value) => handleInputChange('headline', value)}
                            placeholder="A delicious description..."
                        />

                        {/* Separator */}
                        <div className="my-8 border-t border-border" />

                        {/* Editor Canvas */}
                        <div className="min-h-[500px]">
                            {viewMode === 'json' ? (
                                <div className="h-[70vh] border rounded-md overflow-hidden bg-[#1e1e1e]">
                                    <Editor
                                        height="100%"
                                        defaultLanguage="json"
                                        value={JSON.stringify(contentJson, null, 2)}
                                        onChange={(value) => {
                                            try {
                                                const parsed = JSON.parse(value);
                                                setContentJson(parsed);
                                                validateJSON?.('content', parsed);
                                            } catch (e) {
                                                // Invalid JSON, ignore or show error
                                            }
                                        }}
                                        theme="vs-dark"
                                        options={{
                                            minimap: { enabled: false },
                                            fontSize: 14,
                                            wordWrap: 'on',
                                        }}
                                    />
                                </div>
                            ) : (
                                <BlockEditor
                                    value={contentJson}
                                    onChange={(value) => {
                                        try {
                                            const parsed = JSON.parse(value);
                                            setContentJson(parsed);
                                            validateJSON?.('content', parsed);
                                        } catch { setContentJson(value); }
                                    }}
                                    onEditorReady={setEditorInstance}
                                    contentType="recipe"
                                    recipe={recipeJson}
                                    onRecipeChange={(newValue) => {
                                        try {
                                            const parsed = JSON.parse(newValue);
                                            setRecipeJson(parsed);
                                            validateJSON('recipe', parsed);
                                        } catch { setRecipeJson(newValue); }
                                    }}
                                    placeholder="Add additional content..."
                                    context={relatedContext}
                                />
                            )}
                        </div>
                    </div>
                </main>

                {/* Right: Settings Sidebar */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <SettingsSidebar
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            selectedBlock={selectedBlock}
                            documentSettings={
                                <DocumentSettings
                                    formData={formData}
                                    onInputChange={handleInputChange}
                                    imagesData={imagesData}
                                    onImageRemove={handleImageRemove}
                                    onMediaDialogOpen={openMediaDialog}
                                    tags={tags}
                                    categories={categories}
                                    authors={authors}
                                    isEditMode={isEditMode}
                                />
                            }
                            blockSettings={
                                <BlockSettings
                                    editor={editorInstance}
                                    selectedBlock={selectedBlock}
                                />
                            }
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Dialogs */}
            <MediaDialog
                open={mediaDialogOpen}
                onOpenChange={setMediaDialogOpen}
                onSelect={handleMediaSelect}
            />

            <ArticlePreview
                open={previewOpen}
                onOpenChange={setPreviewOpen}
                formData={formData}
                contentJson={contentJson}
                recipeJson={recipeJson}
                imagesData={imagesData}
                categories={categories}
                authors={authors}
            />
        </div>
    );
}
