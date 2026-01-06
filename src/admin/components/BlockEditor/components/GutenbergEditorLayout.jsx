/**
 * Gutenberg Editor Layout
 * 
 * 3-panel WordPress Block Editor-style layout:
 * - Left: Block Inserter (collapsible)
 * - Center: Content Canvas
 * - Right: Settings Sidebar (collapsible)
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, PanelRight, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { useIsMobile } from '@/hooks/use-mobile';
import BlockInserter from './BlockInserter';
import SettingsSidebar from './SettingsSidebar';

/**
 * GutenbergEditorLayout - Main 3-panel layout component
 */
export default function GutenbergEditorLayout({
    // Content
    children,
    contentType = 'article',

    // Block inserter
    onInsertBlock,
    defaultInserterOpen = false,

    // Settings sidebar
    documentSettings,
    blockSettings,
    selectedBlock,
    defaultSidebarOpen = true,

    // Canvas styling
    canvasClassName,

    className,
}) {
    const [inserterOpen, setInserterOpen] = useState(defaultInserterOpen);
    const [sidebarOpen, setSidebarOpen] = useState(defaultSidebarOpen);
    const [sidebarTab, setSidebarTab] = useState('document');
    const isMobile = useIsMobile();

    // Auto-close sidebars on mobile
    useEffect(() => {
        if (isMobile) {
            setInserterOpen(false);
            setSidebarOpen(false);
        }
    }, [isMobile]);

    // Auto-open sidebar when a block is selected
    useEffect(() => {
        if (selectedBlock) {
            setSidebarOpen(true);
            setSidebarTab('block');
        }
    }, [selectedBlock?.id]);

    const toggleInserter = useCallback(() => {
        setInserterOpen(prev => !prev);
    }, []);

    const toggleSidebar = useCallback(() => {
        setSidebarOpen(prev => !prev);
    }, []);

    const handleInsertBlock = useCallback((blockType) => {
        onInsertBlock?.(blockType);
        // Optionally close inserter after inserting
        // setInserterOpen(false);
    }, [onInsertBlock]);

    return (
        <div className={cn(
            'wp-gutenberg-layout',
            'flex h-full w-full overflow-hidden relative',
            'bg-[var(--wp-canvas-bg)]',
            className
        )}>
            {/* Mobile Overlay - closes panels when clicked */}
            <AnimatePresence>
                {isMobile && (inserterOpen || sidebarOpen) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 z-40"
                        onClick={() => {
                            setInserterOpen(false);
                            setSidebarOpen(false);
                        }}
                    />
                )}
            </AnimatePresence>

            {/* Toggle buttons when panels are closed */}
            {contentType !== 'menu' && (
                <div className={cn(
                    'absolute top-2 left-2 z-30',
                    'flex items-center gap-1',
                    inserterOpen && 'hidden'
                )}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={toggleInserter}
                            >
                                <Plus className="w-4 h-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                            Toggle block inserter
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}

            <div className={cn(
                'absolute top-2 right-2 z-30',
                'flex items-center gap-1',
                sidebarOpen && 'hidden'
            )}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={toggleSidebar}
                        >
                            <PanelRight className="w-4 h-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                        Toggle settings sidebar
                    </TooltipContent>
                </Tooltip>
            </div>

            {/* Left Panel: Block Inserter */}
            <AnimatePresence>
                {inserterOpen && (
                    <BlockInserter
                        isOpen={inserterOpen}
                        onClose={toggleInserter}
                        onInsertBlock={handleInsertBlock}
                        contentType={contentType}
                    />
                )}
            </AnimatePresence>

            {/* Center: Content Canvas */}
            <div className={cn(
                'wp-content-canvas',
                'flex-1 min-w-0 overflow-y-auto overflow-x-hidden',
                'transition-all duration-200'
            )}>
                <div className={cn(
                    'wp-canvas-inner',
                    'max-w-4xl mx-auto py-8 px-6',
                    canvasClassName
                )}>
                    {children}
                </div>
            </div>

            {/* Right Panel: Settings Sidebar */}
            <AnimatePresence>
                {sidebarOpen && (
                    <SettingsSidebar
                        isOpen={sidebarOpen}
                        onClose={toggleSidebar}
                        activeTab={sidebarTab}
                        onTabChange={setSidebarTab}
                        documentSettings={documentSettings}
                        blockSettings={blockSettings}
                        selectedBlock={selectedBlock}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Content Canvas component for use within the layout
 * Provides proper styling for the central content area
 */
export function ContentCanvas({ children, className }) {
    return (
        <div className={cn(
            'wp-canvas-content',
            'relative',
            className
        )}>
            {children}
        </div>
    );
}

/**
 * Hook to manage Gutenberg layout state
 */
export function useGutenbergLayout() {
    const [inserterOpen, setInserterOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [sidebarTab, setSidebarTab] = useState('document');
    const [selectedBlock, setSelectedBlock] = useState(null);

    return {
        inserterOpen,
        setInserterOpen,
        toggleInserter: () => setInserterOpen(prev => !prev),

        sidebarOpen,
        setSidebarOpen,
        toggleSidebar: () => setSidebarOpen(prev => !prev),

        sidebarTab,
        setSidebarTab,

        selectedBlock,
        setSelectedBlock,
    };
}
