/**
 * Settings Sidebar Component
 * 
 * Right panel in the WordPress Block Editor layout.
 * Provides document-level settings and block-specific settings.
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs';
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
    activeTab = 'document',
    onTabChange,
    documentSettings,
    blockSettings,
    selectedBlock,
    className,
}) {
    const [tab, setTab] = useState(activeTab);

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
                'w-[320px] h-full',
                'bg-[var(--wp-sidebar-bg)] border-l border-[var(--wp-sidebar-border)]',
                'flex flex-col',
                className
            )}
        >
            {/* Header with tabs */}
            <div className="flex items-center justify-between px-1 border-b border-border">
                <Tabs value={tab} onValueChange={handleTabChange} className="flex-1">
                    <TabsList className="w-full h-12 bg-transparent rounded-none p-0">
                        <TabsTrigger
                            value="document"
                            className={cn(
                                'flex-1 h-12 rounded-none border-b-2 border-transparent',
                                'data-[state=active]:border-primary data-[state=active]:bg-transparent',
                                'data-[state=active]:shadow-none'
                            )}
                        >
                            <FileText className="w-4 h-4 mr-1.5" />
                            Document
                        </TabsTrigger>
                        <TabsTrigger
                            value="block"
                            disabled={!selectedBlock}
                            className={cn(
                                'flex-1 h-12 rounded-none border-b-2 border-transparent',
                                'data-[state=active]:border-primary data-[state=active]:bg-transparent',
                                'data-[state=active]:shadow-none'
                            )}
                        >
                            <Settings className="w-4 h-4 mr-1.5" />
                            Block
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                {onClose && (
                    <button
                        type="button"
                        onClick={onClose}
                        className={cn(
                            'flex items-center justify-center',
                            'w-7 h-7 mr-2 rounded-sm',
                            'text-muted-foreground hover:text-foreground',
                            'hover:bg-muted'
                        )}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <AnimatePresence mode="wait">
                    {tab === 'document' && (
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

                    {tab === 'block' && (
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
                </AnimatePresence>
            </ScrollArea>
        </motion.div>
    );
}

// Export the section component for use in settings
export { SidebarSection };
