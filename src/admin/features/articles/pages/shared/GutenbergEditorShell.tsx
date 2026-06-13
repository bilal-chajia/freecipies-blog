import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { ChevronRight, Eye, Save, Loader2, LayoutTemplate, Code, PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
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
import EditorStats from '@/components/BlockEditor/components/EditorStats';
import { insertBlockFromInserter } from '@/components/BlockEditor/utils/insert-block';
import { useBlockEditorStore } from '@/components/BlockEditor/store/blockEditorStore';

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
        content_json,
        setContentJson,
        recipe_json,
        setRecipeJson,
        roundup_json,
        setRoundupJson,
        faqs_json,
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

    // Layout state (Zustand store)
    const {
        inserterOpen,
        sidebarOpen,
        setInserterOpen,
        setSidebarOpen,
    } = useBlockEditorStore();
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
        (categories.find((c) => c.id === formData.category_id)?.slug as string | undefined) || null,
        [categories, formData.category_id]
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

    const sectionLabel = contentType === 'recipe'
        ? 'Recipes'
        : contentType === 'roundup'
            ? 'Roundups'
            : 'Blog Posts';

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
        if (aiContent.short_description) {
            handleInputChange('short_description', aiContent.short_description);
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
                <LoadingState variant="editor" />
            </div>
        );
    }

    return (
        <div className="flex-1 min-h-0 flex flex-col">
            {/* Header */}
            <header className={cn(
                'flex items-center justify-between',
                'h-14 px-4 border-b bg-background',
                'shrink-0'
            )}>
                <nav className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Dashboard
                    </button>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                    <button
                        type="button"
                        onClick={() => navigate(backPath)}
                        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {sectionLabel}
                    </button>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                    <TitleInput
                        value={formData.label}
                        onChange={(value) => handleInputChange('label', value)}
                        placeholder="Add title"
                        containerClassName="min-w-0 flex-1 max-w-[560px]"
                        className="truncate !text-sm !font-semibold !leading-6"
                    />
                </nav>

                {/* Right: Actions */}
                <div className="ml-4 flex shrink-0 items-center gap-2">
                    {/* Autosave Status — Dot only */}
                    <div className="flex items-center justify-center w-8 h-8 select-none" title={saving ? 'Sauvegarde...' : 'Brouillon synchronisé'}>
                        <span className="relative flex h-2 w-2">
                            {saving ? (
                                <>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                </>
                            ) : (
                                <>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </>
                            )}
                        </span>
                    </div>

                    {/* View Modes */}
                    <div className="flex items-center gap-1 border-r border-border/60 pr-2 mr-1">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={viewMode === 'visual' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('visual')}
                                    className={cn("h-8 w-8 rounded-md", viewMode === 'visual' && "text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary")}
                                >
                                    <LayoutTemplate className="w-4 h-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Visual Editor</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant={viewMode === 'json' ? 'secondary' : 'ghost'}
                                    size="icon"
                                    onClick={() => setViewMode('json')}
                                    className={cn("h-8 w-8 rounded-md", viewMode === 'json' && "text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary")}
                                >
                                    <Code className="w-4 h-4" />
                                </Button>
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
                        onClick={() => handleSave(editorInstance)}
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
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "absolute left-3 top-[10px] z-30 h-9 w-9",
                                    "rounded-xl bg-background/85 backdrop-blur-md shadow-sm",
                                    "hover:bg-background hover:text-primary hover:shadow-md hover:scale-105 active:scale-95",
                                    "transition-all duration-200 ease-out"
                                )}
                                onClick={() => setInserterOpen(true)}
                            >
                                <PanelLeftOpen className="h-4.5 w-4.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Show structure panel</TooltipContent>
                    </Tooltip>
                )}
                {!sidebarOpen && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "absolute right-3 top-[10px] z-30 h-9 w-9",
                                    "rounded-xl bg-background/85 backdrop-blur-md shadow-sm",
                                    "hover:bg-background hover:text-primary hover:shadow-md hover:scale-105 active:scale-95",
                                    "transition-all duration-200 ease-out"
                                )}
                                onClick={() => setSidebarOpen(true)}
                            >
                                <PanelRightOpen className="h-4.5 w-4.5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">Show settings panel</TooltipContent>
                    </Tooltip>
                )}
                {/* Left Panel */}
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
                    'flex-1 min-h-0 flex flex-col overflow-hidden',
                    'bg-slate-50/40 bg-[radial-gradient(var(--editor-grid-dot)_1px,transparent_1px)] [background-size:16px_16px] dark:bg-background'
                )}>
                    <div className="flex h-11 shrink-0 items-center justify-center border-b border-border/60 bg-background/80 px-4">
                        <EditorStats editor={editorInstance} className="shrink-0" />
                    </div>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden gutenberg-canvas-scroll">
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
                                        content_json={content_json}
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
                                            // roundup_json stays for hydration/display; the
                                            // sidebar (BlockSettings) now writes it directly,
                                            // so the editor no longer emits onRoundupChange.
                                            roundup_json,
                                            faqs_json,
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
                                    content_json={content_json}
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
                                                recipe_json,
                                                onRecipeChange: (newValue: any) => {
                                                    const nextValue = newValue ?? '';
                                                    setRecipeJson(nextValue);
                                                    validateJSON('recipe', nextValue);
                                                },
                                                faqs_json,
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
                                                faqs_json,
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
                    </div>
                </main>

                {/* Right Panel */}
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
                                    imagesData={imagesData}
                                    onImagesChange={(next) => setImagesData(next as Record<string, unknown>)}
                                    recipeData={contentType === 'recipe' ? recipe_json : undefined}
                                    onRecipeChange={
                                        contentType === 'recipe'
                                            ? (newValue: any) => {
                                                const nextValue = newValue ?? '';
                                                setRecipeJson(nextValue);
                                                validateJSON('recipe', nextValue);
                                            }
                                            : undefined
                                    }
                                    roundupData={contentType === 'roundup' ? roundup_json : undefined}
                                    onRoundupChange={
                                        contentType === 'roundup'
                                            ? (newValue: string) => {
                                                const nextValue = newValue ?? '';
                                                setRoundupJson(nextValue);
                                                validateJSON('roundup', nextValue);
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
                content_json={content_json}
                recipe_json={contentType === 'recipe' ? recipe_json : undefined}
                roundup_json={contentType === 'roundup' ? roundup_json : undefined}
                imagesData={imagesData as any}
                categories={categories}
                authors={authors}
            />
        </div>
    );
}
