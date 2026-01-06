/**
 * Homepage Layout Component
 * 
 * 2-panel WordPress Gutenberg-style layout for Homepage configuration
 * Uses the SAME CSS classes as SettingsLayout for design consistency
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/scroll-area';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Save, RefreshCw, Zap, Eye, Home } from 'lucide-react';
import {
    LayoutPanelLeft,
    Star,
    Grid,
    Newspaper,
    Sparkles,
    Mail,
    AppWindow,
    Search,
} from 'lucide-react';

// Navigation items for Homepage sections
const homepageSections = [
    { id: 'hero', label: 'Hero', icon: LayoutPanelLeft },
    { id: 'featured', label: 'Featured', icon: Star },
    { id: 'categories', label: 'Categories', icon: Grid },
    { id: 'latest', label: 'Latest', icon: Newspaper },
    { id: 'popular', label: 'Popular', icon: Sparkles },
    { id: 'newsletter', label: 'Newsletter', icon: Mail },
    { id: 'banners', label: 'Banners', icon: AppWindow },
    { id: 'seo', label: 'SEO', icon: Search },
];

// Fixed header height to ensure alignment
const HEADER_HEIGHT = 'h-[41px]';

/**
 * HomepageLayout - 2-panel layout using Gutenberg design tokens
 */
export default function HomepageLayout({
    children,
    activeSection,
    sectionStatus = [],
    headerTabs,
    onSave,
    onReset,
    onPreview,
    saving = false,
    saveDisabled = false,
    saveLabel = 'Publish',
    hasChanges = true,
}) {
    const navigate = useNavigate();
    const { section = 'hero' } = useParams();
    const currentSection = activeSection || section;

    const handleSectionClick = (sectionId) => {
        navigate(`/homepage/${sectionId}`);
    };

    const activeSections = sectionStatus.filter(s => s.enabled).length;
    const totalSections = sectionStatus.length;

    return (
        <div className="wp-gutenberg-layout flex h-full w-full overflow-hidden relative">
            {/* Left Panel: Navigation */}
            <motion.div
                initial={{ x: -280, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -280, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="wp-block-inserter w-[280px] h-full min-h-0 overflow-hidden bg-[var(--wp-inserter-bg)] border-r border-[var(--wp-inserter-border)] flex flex-col flex-shrink-0"
            >
                {/* Left Panel Header */}
                <div className={cn(HEADER_HEIGHT, 'flex items-center justify-between px-[10px] border-b border-[#e5e7eb] flex-shrink-0')}>
                    <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-primary" />
                        <span className="text-sm font-semibold">Homepage</span>
                    </div>
                    {totalSections > 0 && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 font-medium">
                            {activeSections}/{totalSections}
                        </Badge>
                    )}
                </div>

                {/* Nav Items */}
                <ScrollArea className="flex-1 min-h-0">
                    <div className="structure-panel-list">
                        {homepageSections.map((item) => {
                            const Icon = item.icon;
                            const isActive = currentSection === item.id;
                            const status = sectionStatus.find(s => s.key === item.id);

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSectionClick(item.id)}
                                    className={cn('structure-item', isActive && 'is-active')}
                                >
                                    <Icon className="structure-item-icon" />
                                    <span className="structure-item-label">{item.label}</span>
                                    {status && (
                                        <span className={cn(
                                            'ml-auto w-1.5 h-1.5 rounded-full',
                                            status.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                                        )} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </motion.div>

            {/* Right Panel: Content */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[var(--wp-canvas-bg)]">
                {/* Right Panel Header - tabs left, buttons right */}
                <div className={cn(HEADER_HEIGHT, 'flex items-center justify-between px-[10px] border-b border-[#e5e7eb] flex-shrink-0')}>
                    {/* Tabs or sub-navigation on the left */}
                    <div className="flex-1">
                        {headerTabs}
                    </div>

                    {/* Buttons on the right */}
                    <div className="flex items-center gap-2">
                        {onPreview && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onPreview}
                                className="h-7 px-3 gap-1.5 text-xs rounded-md"
                            >
                                <Eye className="w-3 h-3" />
                                Preview
                            </Button>
                        )}
                        {onReset && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onReset}
                                disabled={saving}
                                className="h-7 px-3 gap-1.5 text-xs rounded-md"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Reset
                            </Button>
                        )}
                        <Button
                            size="sm"
                            onClick={onSave}
                            disabled={saving || saveDisabled || !hasChanges}
                            className="h-7 px-3 gap-1.5 text-xs rounded-md"
                        >
                            {saving ? (
                                <Zap className="w-3 h-3 animate-spin" />
                            ) : (
                                <Save className="w-3 h-3" />
                            )}
                            {saving ? 'Saving...' : saveLabel}
                        </Button>
                    </div>
                </div>

                {/* Content Area */}
                <ScrollArea className="flex-1 min-h-0">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSection}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                            className="p-6"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </ScrollArea>
            </div>
        </div>
    );
}

export { homepageSections };
