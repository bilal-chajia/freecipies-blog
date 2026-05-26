/**
 * Settings Sidebar Component
 * 
 * Right panel in the Block Editor layout.
 * Provides document-level settings and block-specific settings.
 * Modernized to subscribe to the Zustand store, support glassmorphism,
 * and provide buttery-smooth tab/accordion transitions.
 */

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PanelRightClose, Sparkles, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/scroll-area';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from '@/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useBlockEditorStore } from '../store/blockEditorStore';

type SettingsTab = 'document' | 'block' | 'ai';

type SidebarSelectedBlock = {
    id?: string | null;
    type?: string;
};

type RightPanelProps = {
    isOpen?: boolean;
    onClose?: () => void;
    activeTab?: SettingsTab;
    onTabChange?: (tab: SettingsTab) => void;
    documentSettings?: ReactNode;
    blockSettings?: ReactNode;
    aiSettings?: ReactNode;
    selectedBlock?: SidebarSelectedBlock | null;
    className?: string;
};

/**
 * Collapsible Section Component with smooth height animations
 */
function SidebarSection({ title, defaultOpen = true, children }: {
    title: ReactNode;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className={cn(
                'flex items-center justify-between w-full',
                'px-4 py-3 text-xs font-bold uppercase tracking-wider text-foreground/70 select-none',
                'hover:bg-muted/40 transition-colors duration-200',
                'border-b border-border/60'
            )}>
                {title}
                <ChevronDown className={cn(
                    'w-3.5 h-3.5 text-muted-foreground transition-transform duration-300',
                    isOpen && 'rotate-180'
                )} />
            </CollapsibleTrigger>
            <CollapsibleContent forceMount asChild>
                <motion.div
                    initial={defaultOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                    animate={isOpen ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] }}
                    className="overflow-hidden"
                >
                    <div className="p-4 border-b border-border/60 bg-muted/5">
                        {children}
                    </div>
                </motion.div>
            </CollapsibleContent>
        </Collapsible>
    );
}

/**
 * Right Panel
 */
export default function RightPanel({
    isOpen: _isOpen,
    onClose,
    activeTab,
    onTabChange,
    documentSettings,
    blockSettings,
    aiSettings,
    selectedBlock: _propSelectedBlock,
    className,
}: RightPanelProps) {
    // Connect to global Zustand store
    const storeState = useBlockEditorStore();
    const isOpen = _isOpen ?? storeState.sidebarOpen;
    const sidebarTab = storeState.sidebarTab;
    const setSidebarTab = storeState.setSidebarTab;
    const selectedBlock = _propSelectedBlock ?? storeState.selectedBlock;

    const resolvedTab = activeTab ?? sidebarTab;
    const lastSelectedIdRef = useRef<string | null>(null);

    useEffect(() => {
        const selectedId = selectedBlock?.id || null;
        if (!selectedId) {
            lastSelectedIdRef.current = null;
            return;
        }
        if (lastSelectedIdRef.current === selectedId) return;
        lastSelectedIdRef.current = selectedId;
        
        // Auto switch tab to block when a block is clicked/selected
        if (resolvedTab !== 'block') {
            if (onTabChange) onTabChange('block');
            else setSidebarTab('block');
        }
    }, [selectedBlock?.id, resolvedTab, onTabChange, setSidebarTab]);

    const handleTabChange = (value: SettingsTab) => {
        if (onTabChange) onTabChange(value);
        else setSidebarTab(value);
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
                'wp-settings-sidebar relative h-full min-h-0 overflow-hidden flex flex-col',
                'w-[320px] bg-background/80 backdrop-blur-md border-l border-border/80 shadow-2xl',
                className
            )}
        >
            {/* Header with tabs */}
            <div className="h-11 border-b border-border/50 bg-background/60">
                <div className="relative flex h-full items-center w-full px-2">
                    {/* Close button — absolute left */}
                    {onClose && (
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute left-2 group flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-200 cursor-pointer shrink-0"
                        >
                            <PanelRightClose className="w-4 h-4 transition-all duration-200 group-hover:text-primary group-hover:scale-110" />
                        </button>
                    )}

                    {/* Tabs — centered */}
                    <div className="flex h-full items-center justify-center flex-1 gap-1">
                        {/* Post/Document tab */}
                        {documentSettings && (
                            <button
                                type="button"
                                className={cn(
                                    'relative flex h-11 items-center gap-1.5 px-3 text-xs font-semibold transition-all duration-200 shrink-0',
                                    resolvedTab === 'document' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                )}
                                onClick={() => handleTabChange('document')}
                            >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                Post
                                {resolvedTab === 'document' && (
                                    <motion.span
                                        layoutId="right-panel-tab-indicator"
                                        className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        )}

                        {/* Block/Settings tab */}
                        {(blockSettings !== undefined || selectedBlock) && (
                            <button
                                type="button"
                                disabled={!selectedBlock}
                                className={cn(
                                    'relative flex h-11 items-center gap-1.5 px-3 text-xs font-semibold transition-all duration-200 shrink-0',
                                    resolvedTab === 'block' ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                                    !selectedBlock && 'opacity-40 cursor-not-allowed'
                                )}
                                onClick={() => {
                                    if (!selectedBlock) return;
                                    handleTabChange('block');
                                }}
                            >
                                <Settings className="w-3.5 h-3.5 shrink-0" />
                                {documentSettings ? 'Block' : 'Settings'}
                                {resolvedTab === 'block' && selectedBlock && (
                                    <motion.span
                                        layoutId="right-panel-tab-indicator"
                                        className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        )}

                        {/* AI tab */}
                        {aiSettings && (
                            <button
                                type="button"
                                className={cn(
                                    'relative flex h-11 items-center gap-1.5 px-3 text-xs font-semibold transition-all duration-200 shrink-0',
                                    resolvedTab === 'ai' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                                )}
                                onClick={() => handleTabChange('ai')}
                            >
                                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                AI
                                {resolvedTab === 'ai' && (
                                    <motion.span
                                        layoutId="right-panel-tab-indicator"
                                        className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full"
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                    />
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content with fluid fade & scale transitions */}
            <ScrollArea className="flex-1 min-h-0 select-none">
                <AnimatePresence mode="wait">
                    {resolvedTab === 'document' && (
                        <motion.div
                            key="document"
                            initial={{ opacity: 0, y: 4, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.99 }}
                            transition={{ duration: 0.15 }}
                            className="w-full max-w-[320px] overflow-x-hidden"
                        >
                            {documentSettings || (
                                <div className="p-4 text-xs text-muted-foreground font-medium text-center py-12 animate-pulse">
                                    Document settings will appear here.
                                </div>
                            )}
                        </motion.div>
                    )}

                    {resolvedTab === 'block' && (
                        <motion.div
                            key="block"
                            initial={{ opacity: 0, y: 4, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.99 }}
                            transition={{ duration: 0.15 }}
                            className="w-full max-w-[320px] overflow-x-hidden"
                        >
                            {selectedBlock ? (
                                blockSettings || (
                                    <div className="p-4 text-xs text-muted-foreground font-medium text-center py-12 animate-pulse">
                                        No settings defined for {selectedBlock.type}.
                                    </div>
                                )
                            ) : (
                                <div className="p-4 text-xs text-muted-foreground font-medium text-center py-12">
                                    Select a block to inspect properties.
                                </div>
                            )}
                        </motion.div>
                    )}

                    {resolvedTab === 'ai' && aiSettings && (
                        <motion.div
                            key="ai"
                            initial={{ opacity: 0, y: 4, scale: 0.99 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.99 }}
                            transition={{ duration: 0.15 }}
                            className="w-full max-w-[320px] overflow-x-hidden"
                        >
                            {aiSettings}
                        </motion.div>
                    )}
                </AnimatePresence>
            </ScrollArea>
        </motion.div>
    );
}

export { SidebarSection };
