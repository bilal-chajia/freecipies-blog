import { useState } from 'react';
import { ArrowLeft, Eye, Save, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/ui/button.jsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip.jsx';
import MediaDialog from '@/components/MediaDialog';
import ArticlePreview from '@/components/ArticlePreview';
import EditorTopbar from '@/components/EditorTopbar';

/**
 * Shared layout wrapper for content editors
 * Provides header with topbar, 2-column layout, media dialog, and preview panel
 */
export default function EditorLayout({
    title,
    subtitle,
    backPath,
    loading,
    mainContent,
    sidebarContent,
    mediaDialogOpen,
    setMediaDialogOpen,
    handleMediaSelect,
    navigate,
    // Preview props
    formData,
    contentJson,
    recipeJson,
    roundupJson,
    imagesData,
    categories,
    authors,
    // Topbar props
    onInputChange,
    onSave,
    saving,
    isEditMode,
}) {
    const [previewOpen, setPreviewOpen] = useState(false);
    const hasSidebar = sidebarContent !== null && sidebarContent !== undefined;

    return (
        <AnimatePresence mode="wait">
            {loading ? (
                <motion.div
                    key="loading"
                    className="flex items-center justify-center h-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                        <Loader2 className="h-12 w-12 text-primary" />
                    </motion.div>
                </motion.div>
            ) : (

                <motion.div
                    key="content"
                    className="h-full flex flex-col"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Header */}
                    <motion.div
                        className="flex items-center justify-between px-6 py-3 border-b bg-background"
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <div className="flex items-center gap-4">
                            <motion.div
                                whileHover={{ scale: 1.05, x: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(backPath)}
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </Button>
                            </motion.div>
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <h2 className="text-xl font-bold">{title}</h2>
                                <p className="text-xs text-muted-foreground">{subtitle}</p>
                            </motion.div>
                        </div>

                        {/* Topbar - Publishing & Organization Controls */}
                        <EditorTopbar
                            formData={formData}
                            onInputChange={onInputChange}
                            categories={categories}
                            authors={authors}
                        />

                        <motion.div
                            className="flex gap-2 ml-3"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <motion.div
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => setPreviewOpen(true)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </motion.div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Preview article</p>
                                </TooltipContent>
                            </Tooltip>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button
                                    onClick={onSave}
                                    disabled={saving}
                                    size="sm"
                                    className="h-8 gap-1.5"
                                >
                                    <AnimatePresence mode="wait">
                                        {saving ? (
                                            <motion.div
                                                key="saving"
                                                initial={{ opacity: 0, rotate: 0 }}
                                                animate={{ opacity: 1, rotate: 360 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" } }}
                                            >
                                                <Loader2 className="h-3.5 w-3.5" />
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="save"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                            >
                                                <Save className="h-3.5 w-3.5" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Publish')}
                                </Button>
                            </motion.div>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Button variant="outline" size="sm" className="h-8" onClick={() => navigate(backPath)}>
                                    Cancel
                                </Button>
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* Main Layout: 2 columns */}
                    <div className="editor-grid flex-1 min-h-0 grid grid-cols-12 overflow-visible">
                        {/* Main Content Area */}
                        <motion.div
                            className={`editor-main-column overflow-y-auto overflow-x-visible ${hasSidebar ? 'col-span-8 border-r' : 'col-span-12'}`}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            {mainContent}
                        </motion.div>

                        {/* Sidebar */}
                        {hasSidebar && (
                            <motion.div
                                className="editor-sidebar-column col-span-4 overflow-y-auto bg-muted/30"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.4, delay: 0.3 }}
                            >
                                {sidebarContent}
                            </motion.div>
                        )}
                    </div>

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
                        roundupJson={roundupJson}
                        imagesData={imagesData}
                        categories={categories}
                        authors={authors}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
}
