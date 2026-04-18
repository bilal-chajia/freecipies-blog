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
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Eye, Save, Loader2, Menu, Settings, LayoutTemplate, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

// Hooks
import { useContentEditor, useEditorViewportLock, useGutenbergCanvasHandlers } from './shared';

// New Gutenberg components
import {
    BlockInserter,
    SettingsSidebar,
    DocumentSettings,
    BlockSettings,
} from '@/components/BlockEditor/components';
import GutenbergEditorMain, { TitleInput } from '@/components/BlockEditor/components/GutenbergEditorMain';
import AISettings from '@/components/BlockEditor/components/AISettings';
import { insertBlockFromInserter } from '@/components/BlockEditor/utils/insert-block';

// Existing components
import MediaDialog from '@/components/MediaDialog';
import ArticlePreview from '@/components/ArticlePreview';

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
        faqsJson,
        setFaqsJson,
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
    const canvasWidthClass = (!sidebarOpen && !inserterOpen)
        ? 'max-w-6xl'
        : (!sidebarOpen || !inserterOpen ? 'max-w-5xl' : 'max-w-4xl');
    const {
        selectedBlock,
        setSelectedBlock,
        structureItems,
        activeBlockId,
        forceSelectBlockId,
        handleClearForceSelect,
        handleStructureUpdate,
        handleSelectStructureBlock,
        handleReorderBlock,
        handleBlockAction,
        handleConvertBlock,
    } = useGutenbergCanvasHandlers(editorInstance, { smoothScrollOnSelect: true });

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
        insertBlockFromInserter(editorInstance, blockType);
    }, [editorInstance]);

    // Handle AI-generated content
    const handleAIContentGenerated = useCallback((aiContent) => {
        if (!aiContent) return;

        // Update form fields if provided
        if (aiContent.label) {
            handleInputChange('label', aiContent.label);
        }
        if (aiContent.headline) {
            handleInputChange('headline', aiContent.headline);
        }
        if (aiContent.shortDescription) {
            handleInputChange('shortDescription', aiContent.shortDescription);
        }
        if (aiContent.metaTitle) {
            handleInputChange('metaTitle', aiContent.metaTitle);
        }
        if (aiContent.metaDescription) {
            handleInputChange('metaDescription', aiContent.metaDescription);
        }

        // Update recipe data if provided
        if (aiContent.recipe) {
            setRecipeJson(aiContent.recipe);
        }

        // Insert blocks if provided
        if (aiContent.blocks && Array.isArray(aiContent.blocks) && editorInstance) {
            // Clear existing content and insert new blocks
            const currentBlocks = editorInstance.document;
            if (currentBlocks.length > 0) {
                editorInstance.replaceBlocks(currentBlocks, aiContent.blocks);
            } else {
                editorInstance.insertBlocks(aiContent.blocks);
            }
        }
    }, [handleInputChange, setRecipeJson, editorInstance]);

    useEditorViewportLock();

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
        <div className="flex-1 min-h-0 flex flex-col">
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
                        <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
                            {title}
                        </Badge>
                    </div>
                </div>

                <div className="flex-1 flex justify-center px-4 min-w-0">
                    <TitleInput
                        value={formData.label}
                        onChange={(value) => handleInputChange('label', value)}
                        placeholder="Add title"
                        containerClassName="w-full max-w-[520px]"
                        className="text-lg md:text-xl font-semibold"
                    />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <div className="flex bg-muted/50 p-0.5 rounded-lg border">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('visual')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'visual'
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <LayoutTemplate className="h-3.5 w-3.5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>Visual Editor</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('json')}
                                    className={`p-1.5 rounded-md transition-all ${viewMode === 'json'
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    <Code className="h-3.5 w-3.5" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent>JSON Data</TooltipContent>
                        </Tooltip>
                    </div>
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
            <div className="flex-1 flex overflow-hidden min-h-0 relative">
                {!inserterOpen && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-2 z-20 h-8 w-8"
                        onClick={() => setInserterOpen(true)}
                    >
                        <Menu className="w-4 h-4" />
                    </Button>
                )}
                {!sidebarOpen && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-2 z-20 h-8 w-8"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Settings className="w-4 h-4" />
                    </Button>
                )}
                {/* Left: Block Inserter */}
                <AnimatePresence>
                    {inserterOpen && (
                        <BlockInserter
                            isOpen={inserterOpen}
                            onClose={() => setInserterOpen(false)}
                            onInsertBlock={handleInsertBlock}
                            contentType="recipe"
                            structureItems={structureItems}
                            activeBlockId={activeBlockId}
                            onSelectBlock={handleSelectStructureBlock}
                            onReorderBlock={handleReorderBlock}
                            onBlockAction={handleBlockAction}
                            onConvertBlock={handleConvertBlock}
                        />
                    )}
                </AnimatePresence>

                {/* Center: Content Canvas */}
                <main className={cn(
                    'flex-1 overflow-y-auto overflow-x-hidden min-h-0 gutenberg-canvas-scroll',
                    'bg-[var(--wp-canvas-bg)]'
                )}>
                    <div className={cn(
                        'mx-auto py-8 px-6 w-full',
                        canvasWidthClass
                    )}>
                        <GutenbergEditorMain
                            formData={formData}
                            onInputChange={handleInputChange}
                            contentJson={contentJson}
                            setContentJson={setContentJson}
                            validateJSON={validateJSON}
                            relatedContext={relatedContext}
                            onEditorReady={setEditorInstance}
                            viewMode={viewMode}
                            contentType="recipe"
                            placeholder="Add additional content..."
                            sidebarOpen={sidebarOpen}
                            onStructureUpdate={handleStructureUpdate}
                            onSelectedBlockChange={setSelectedBlock}
                            forceSelectBlockId={forceSelectBlockId}
                            onForceSelectHandled={handleClearForceSelect}
                            blockEditorProps={{
                                recipe: recipeJson,
                                onRecipeChange: (newValue) => {
                                    const nextValue = newValue ?? '';
                                    setRecipeJson(nextValue);
                                    validateJSON('recipe', nextValue);
                                },
                                faqs: faqsJson,
                                onFaqsChange: (newValue) => {
                                    const nextValue = Array.isArray(newValue)
                                        ? JSON.stringify(newValue, null, 2)
                                        : (newValue ?? '[]');
                                    setFaqsJson(nextValue);
                                    validateJSON('faqs', nextValue);
                                },
                            }}
                        />
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
                                    relatedContext={relatedContext}
                                    recipeData={recipeJson}
                                    onRecipeChange={(newValue) => {
                                        const nextValue = newValue ?? '';
                                        setRecipeJson(nextValue);
                                        validateJSON('recipe', nextValue);
                                    }}
                                />
                            }
                            aiSettings={
                                <AISettings
                                    contentType="recipe"
                                    onContentGenerated={handleAIContentGenerated}
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
