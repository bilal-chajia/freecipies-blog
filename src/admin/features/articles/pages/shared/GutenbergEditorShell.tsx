import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Eye, Save, Loader2, Menu, Settings, LayoutTemplate, Code } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Label } from '@/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

// Hooks
import { useContentEditor } from './useContentEditor';
import { useGutenbergCanvasHandlers } from './useGutenbergCanvasHandlers';
import { useEditorViewportLock } from './useEditorViewportLock';

// Gutenberg components
import {
    LeftPanel,
    RightPanel,
    DocumentSettings,
    BlockSettings,
} from '@/components/BlockEditor/components';
import AISettings from '@/components/BlockEditor/components/AISettings';
import GutenbergEditorMain, { TitleInput } from '@/components/BlockEditor/components/GutenbergEditorMain';
import { insertBlockFromInserter } from '@/components/BlockEditor/utils/insert-block';

// Existing components
import { MediaDialog } from '@admin/features/media/components';
import ArticlePreview from '@admin/features/articles/components/ArticlePreview';

interface GutenbergEditorShellProps {
    slug?: string;
    contentType: 'article' | 'recipe' | 'roundup';
    backPath: string;
    titleLabel: string;
}

export function GutenbergEditorShell({
    slug,
    contentType,
    backPath,
    titleLabel,
}: GutenbergEditorShellProps) {
    const navigate = useNavigate();
    const [editorInstance, setEditorInstance] = useState<any | null>(null);
    const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');

    // Editor state from shared hook
    const editor = useContentEditor({
        slug,
        contentType,
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
        roundupJson,
        setRoundupJson,
        faqsJson,
        setFaqsJson,
        jsonErrors,
        validateJSON,
        setImagesData,
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
    const categorySlug = useMemo(() => 
        (categories.find((c) => c.id === formData.categoryId)?.slug as string | undefined) || null,
        [categories, formData.categoryId]
    );

    const tagSlugs = useMemo(() => 
        tags
            .filter((t) => formData.selectedTags?.includes(t.id))
            .map((t) => t.slug as string),
        [tags, formData.selectedTags]
    );

    const relatedContext = useMemo(() => ({
        categorySlug,
        tagSlugs,
        currentSlug: formData.slug,
    }), [categorySlug, tagSlugs, formData.slug]);

    // Page title
    const title = isEditMode ? `Edit ${titleLabel}` : `New ${titleLabel}`;

    // Handle block insertion from inserter
    const handleInsertBlock = useCallback((blockType: any) => {
        insertBlockFromInserter(editorInstance, blockType);
    }, [editorInstance]);

    // Handle AI-generated content (only for recipes)
    const handleAIContentGenerated = useCallback((aiContent: any) => {
        if (!aiContent) return;

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

        if (aiContent.recipe) {
            setRecipeJson(aiContent.recipe);
        }

        if (aiContent.blocks && Array.isArray(aiContent.blocks) && editorInstance) {
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
                        onClick={() => navigate(backPath)}
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
                        onClick={() => navigate(backPath)}
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
                        <LeftPanel
                            isOpen={inserterOpen}
                            onClose={() => setInserterOpen(false)}
                            onInsertBlock={handleInsertBlock}
                            contentType={contentType}
                            structureItems={structureItems as any}
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
                        {contentType === 'roundup' ? (
                            <div className="mb-8">
                                <Label className="text-lg font-semibold mb-4 block">Introduction</Label>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Set the stage for your roundup with an introduction.
                                </p>
                                <GutenbergEditorMain
                                    formData={formData as any}
                                    onInputChange={(field, value) => handleInputChange(field as any, value)}
                                    contentJson={contentJson}
                                    setContentJson={setContentJson}
                                    validateJSON={validateJSON}
                                    relatedContext={relatedContext}
                                    onEditorReady={setEditorInstance}
                                    viewMode={viewMode}
                                    contentType="roundup"
                                    placeholder="Introduce your roundup..."
                                    jsonHeight="50vh"
                                    sidebarOpen={sidebarOpen}
                                    onStructureUpdate={handleStructureUpdate as any}
                                    onSelectedBlockChange={setSelectedBlock as any}
                                    forceSelectBlockId={forceSelectBlockId}
                                    onForceSelectHandled={handleClearForceSelect}
                                    blockEditorProps={{
                                        roundupJson,
                                        onRoundupChange: (newValue: any) => {
                                            const nextValue = newValue ?? '';
                                            setRoundupJson(nextValue);
                                            validateJSON('roundup', nextValue);
                                        },
                                        faqsJson,
                                        onFaqsChange: (newValue: any) => {
                                            const nextValue = Array.isArray(newValue)
                                                ? JSON.stringify(newValue, null, 2)
                                                : (newValue ?? '[]');
                                            setFaqsJson(nextValue);
                                            validateJSON('faqs', nextValue);
                                        },
                                        imagesData,
                                        onImagesChange: setImagesData,
                                    }}
                                />
                            </div>
                        ) : (
                            <GutenbergEditorMain
                                formData={formData as any}
                                onInputChange={(field, value) => handleInputChange(field as any, value)}
                                contentJson={contentJson}
                                setContentJson={setContentJson}
                                validateJSON={validateJSON}
                                relatedContext={relatedContext}
                                onEditorReady={setEditorInstance}
                                viewMode={viewMode}
                                contentType={contentType}
                                placeholder={contentType === 'recipe' ? "Add additional content..." : "Start writing your article..."}
                                sidebarOpen={sidebarOpen}
                                onStructureUpdate={handleStructureUpdate as any}
                                onSelectedBlockChange={setSelectedBlock as any}
                                forceSelectBlockId={forceSelectBlockId}
                                onForceSelectHandled={handleClearForceSelect}
                                blockEditorProps={
                                    contentType === 'recipe'
                                        ? {
                                            recipeJson,
                                            onRecipeChange: (newValue: any) => {
                                                const nextValue = newValue ?? '';
                                                setRecipeJson(nextValue);
                                                validateJSON('recipe', nextValue);
                                            },
                                            faqsJson,
                                            onFaqsChange: (newValue: any) => {
                                                const nextValue = Array.isArray(newValue)
                                                    ? JSON.stringify(newValue, null, 2)
                                                    : (newValue ?? '[]');
                                                setFaqsJson(nextValue);
                                                validateJSON('faqs', nextValue);
                                            },
                                            imagesData,
                                            onImagesChange: setImagesData,
                                        }
                                        : {
                                            faqsJson,
                                            onFaqsChange: (newValue: any) => {
                                                const nextValue = Array.isArray(newValue)
                                                    ? JSON.stringify(newValue, null, 2)
                                                    : (newValue ?? '[]');
                                                setFaqsJson(nextValue);
                                                validateJSON('faqs', nextValue);
                                            },
                                            imagesData,
                                            onImagesChange: setImagesData,
                                        }
                                }
                            />
                        )}
                    </div>
                </main>

                {/* Right: Settings Sidebar */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <RightPanel
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            selectedBlock={selectedBlock}
                            documentSettings={
                                <DocumentSettings
                                    formData={formData as any}
                                    onInputChange={(field, value) => handleInputChange(field as any, value)}
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
                                    recipeData={contentType === 'recipe' ? recipeJson : undefined}
                                    onRecipeChange={
                                        contentType === 'recipe'
                                            ? (newValue: any) => {
                                                const nextValue = newValue ?? '';
                                                setRecipeJson(nextValue);
                                                validateJSON('recipe', nextValue);
                                            }
                                            : undefined
                                    }
                                />
                            }
                            aiSettings={
                                contentType === 'recipe' ? (
                                    <AISettings
                                        contentType="recipe"
                                        onContentGenerated={handleAIContentGenerated}
                                    />
                                ) : undefined
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
                formData={formData as any}
                contentJson={contentJson}
                recipeJson={contentType === 'recipe' ? recipeJson : undefined}
                roundupJson={contentType === 'roundup' ? roundupJson : undefined}
                imagesData={imagesData as any}
                categories={categories}
                authors={authors}
            />
        </div>
    );
}
