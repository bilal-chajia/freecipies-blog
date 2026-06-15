/**
 * Homepage Layout Component
 * 
 * 2-panel WordPress Gutenberg-style layout for Homepage configuration
 * Uses the SAME CSS classes as SettingsLayout for design consistency
 */

import { motion, AnimatePresence } from 'motion/react';
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
    Mail,
    Search,
    BookOpen,
    UserRound,
    HelpCircle,
} from 'lucide-react';

// Navigation items for Homepage sections
const homepageSections = [
    { id: 'hero', label: 'Hero', icon: LayoutPanelLeft },
    { id: 'featured', label: 'Featured', icon: Star },
    { id: 'categories', label: 'Categories', icon: Grid },
    { id: 'collections', label: 'Collections', icon: BookOpen },
    { id: 'latest', label: 'Latest', icon: Newspaper },
    { id: 'about', label: 'Author', icon: UserRound },
    { id: 'newsletter', label: 'Newsletter', icon: Mail },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
    { id: 'seo', label: 'SEO', icon: Search },
];

// Fixed header height to ensure alignment
const HEADER_HEIGHT = 'h-10';

interface SectionStatusItem {
    key: string;
    label: string;
    enabled: boolean;
}

interface HomepageLayoutProps {
    children: React.ReactNode;
    activeSection?: string;
    sectionStatus?: SectionStatusItem[];
    headerTabs?: React.ReactNode;
    onSave: () => void;
    onReset?: () => void;
    onPreview?: () => void;
    saving?: boolean;
    saveDisabled?: boolean;
    saveLabel?: string;
    hasChanges?: boolean;
}

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
}: HomepageLayoutProps) {
    const navigate = useNavigate();
    const { section = 'hero' } = useParams();
    const currentSection = activeSection || section;

    const handleSectionClick = (sectionId: string) => {
        navigate(`/homepage/${sectionId}`);
    };

    const activeSections = sectionStatus.filter(s => s.enabled).length;
    const totalSections = sectionStatus.length;

    return (
        <div className="wp-gutenberg-layout flex h-full w-full overflow-hidden relative">
            {/* Left Panel: Navigation */}
            <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                style={{ width: '220px' }}
                className="wp-block-inserter w-[220px] h-full min-h-0 overflow-hidden bg-[var(--wp-inserter-bg)] border-r border-[var(--wp-inserter-border)] flex flex-col flex-shrink-0"
            >
                {/* Left Panel Header */}
                <div className={cn(HEADER_HEIGHT, 'flex items-center justify-between px-2.5 border-b border-border flex-shrink-0')}>
                    <div className="flex items-center gap-2">
                        <Home className="size-4 text-primary" />
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
                            const is_active = currentSection === item.id;
                            const status = sectionStatus.find(s => s.key === item.id);

                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => handleSectionClick(item.id)}
                                    className={cn(
                                        'structure-item group relative overflow-hidden transition-colors',
                                        is_active ? 'text-foreground font-medium' : 'text-muted-foreground'
                                    )}
                                >
                                    {is_active && (
                                        <motion.div
                                            layoutId="homepage-active-tab"
                                            className="absolute inset-0 bg-[var(--primary-muted)] rounded-md z-0"
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                    <div className="flex items-center gap-2 w-full relative z-10 min-w-0">
                                        <Icon
                                            className={cn(
                                                'structure-item-icon transition-all duration-200 group-hover:scale-110 shrink-0',
                                                is_active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                                            )}
                                        />
                                        <span
                                            className={cn(
                                                'structure-item-label transition-transform duration-200 group-hover:translate-x-0.5',
                                                is_active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground'
                                            )}
                                        >
                                            {item.label}
                                        </span>
                                        {status && (
                                            <span className={cn(
                                                'ml-auto w-1.5 h-1.5 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-110',
                                                status.enabled ? 'bg-green-500' : 'bg-muted-foreground/30'
                                            )} />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </ScrollArea>
            </motion.div>

            {/* Right Panel: Content */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-[var(--wp-canvas-bg)]">
                {/* Right Panel Header - tabs left, buttons right */}
                <div className={cn(HEADER_HEIGHT, 'flex items-center justify-between px-2.5 border-b border-border flex-shrink-0')}>
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
                                <Eye className="size-3" />
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
                                <RefreshCw className="size-3" />
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
                                <Zap className="size-3 animate-spin" />
                            ) : (
                                <Save className="size-3" />
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
