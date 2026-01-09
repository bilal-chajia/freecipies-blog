/**
 * Settings Sidebar Component
 * 
 * Right panel in the WordPress Block Editor layout.
 * Provides document-level settings and block-specific settings.
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/ui/collapsible';
import { ChevronDown } from 'lucide-react';

/**
 * Collapsible Section Component for sidebar panels
 */
function SidebarSection({ title, defaultOpen = true, children }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className={cn(
                'flex items-center justify-between w-full',
                'px-4 py-3 text-sm font-semibold',
                'hover:bg-muted/50 transition-colors',
                'border-b border-border'
            )}>
                {title}
                <ChevronDown className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180'
                )} />
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="p-4 border-b border-border">
                    {children}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

/**
 * Settings Sidebar Panel
 */
export default function SettingsSidebar({
    isOpen = true,
    onClose,
    activeTab,
    onTabChange,
    documentSettings,
    blockSettings,
    aiSettings,
    selectedBlock,
    className,
}) {
    const [tab, setTab] = useState(activeTab ?? 'document');
    const resolvedTab = activeTab ?? tab;
    const lastSelectedIdRef = useRef(null);

    useEffect(() => {
        if (activeTab !== undefined && activeTab !== tab) {
            setTab(activeTab);
        }
    }, [activeTab, tab]);

    useEffect(() => {
        const selectedId = selectedBlock?.id || null;
        if (!selectedId) {
            lastSelectedIdRef.current = null;
            return;
        }
        if (lastSelectedIdRef.current === selectedId) return;
        lastSelectedIdRef.current = selectedId;
        if (activeTab !== undefined) {
            if (activeTab !== 'block') onTabChange?.('block');
            return;
        }
        if (tab !== 'block') setTab('block');
    }, [selectedBlock?.id, activeTab, tab, onTabChange]);

    const handleTabChange = (value) => {
        setTab(value);
        onTabChange?.(value);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
                'wp-settings-sidebar',
                'w-[320px] h-full min-h-0 overflow-hidden',
                'bg-[var(--wp-sidebar-bg)] border-l border-[var(--wp-sidebar-border)]',
                'flex flex-col',
                className
            )}
        >
            {/* Header with tabs */}
            <div className="structure-panel-header">
                <div className="structure-tabs justify-between w-full">
                    <div className="flex items-center gap-1">
                        {/* Only show Post tab if documentSettings is provided */}
                        {documentSettings && (
                            <button
                                type="button"
                                className={cn('structure-tab', resolvedTab === 'document' && 'is-active')}
                                onClick={() => handleTabChange('document')}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                Post
                            </button>
                        )}
                        {/* Only show Block tab if there's potential for block settings */}
                        {(blockSettings !== undefined || selectedBlock) && (
                            <button
                                type="button"
                                disabled={!selectedBlock}
                                className={cn(
                                    'structure-tab',
                                    resolvedTab === 'block' && 'is-active',
                                    !selectedBlock && 'opacity-50 cursor-not-allowed'
                                )}
                                onClick={() => {
                                    if (!selectedBlock) return;
                                    handleTabChange('block');
                                }}
                            >
                                <Settings className="w-3.5 h-3.5" />
                                {documentSettings ? 'Block' : 'Settings'}
                            </button>
                        )}
                        {/* AI tab */}
                        {aiSettings && (
                            <button
                                type="button"
                                className={cn('structure-tab', resolvedTab === 'ai' && 'is-active')}
                                onClick={() => handleTabChange('ai')}
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                AI
                            </button>
                        )}
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="structure-close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 min-h-0">
                <AnimatePresence mode="wait">
                    {resolvedTab === 'document' && (
                        <motion.div
                            key="document"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            {documentSettings || (
                                <div className="p-4 text-sm text-muted-foreground">
                                    Document settings will appear here.
                                </div>
                            )}
                        </motion.div>
                    )}

                    {resolvedTab === 'block' && (
                        <motion.div
                            key="block"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            {selectedBlock ? (
                                blockSettings || (
                                    <div className="p-4 text-sm text-muted-foreground">
                                        Block settings for {selectedBlock.type} will appear here.
                                    </div>
                                )
                            ) : (
                                <div className="p-4 text-sm text-muted-foreground">
                                    Select a block to see its settings.
                                </div>
                            )}
                        </motion.div>
                    )}

                    {resolvedTab === 'ai' && aiSettings && (
                        <motion.div
                            key="ai"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            {aiSettings}
                        </motion.div>
                    )}
                </AnimatePresence>
            </ScrollArea>
        </motion.div>
    );
}

// Export the section component for use in settings
export { SidebarSection };
