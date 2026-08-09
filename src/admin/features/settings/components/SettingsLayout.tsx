/**
 * Settings Layout Component
 *
 * 2-panel WordPress Gutenberg-style layout for Settings
 * Uses the SAME CSS classes as BlockInserter to ensure design consistency
 */

import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/scroll-area';
import { Button } from '@/ui/button';
import { Save, RefreshCw, Zap, Settings } from 'lucide-react';
import {
  Globe,
  Search,
  Mail,
  Share2,
  FileText,
  Monitor,
  Laptop,
  ShieldCheck,
  Image,
  Menu,
  Sparkles,
  LayoutGrid,
} from 'lucide-react';

// Navigation items for Settings tabs
const settingsTabs = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'content', label: 'Content', icon: FileText },
  { id: 'category', label: 'Category Pages', icon: LayoutGrid },
  { id: 'menus', label: 'Menus', icon: Menu },
  { id: 'ads', label: 'Ads', icon: Monitor },
  { id: 'appearance', label: 'Appearance', icon: Laptop },
  { id: 'advanced', label: 'Advanced', icon: ShieldCheck },
  { id: 'media', label: 'Media & Uploads', icon: Image },
  { id: 'ai', label: 'AI Settings', icon: Sparkles },
];

// Fixed header height to ensure alignment
const HEADER_HEIGHT = 'h-10';

interface SettingsLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  headerTabs?: React.ReactNode;
  onSave?: () => void;
  saving?: boolean;
  saveDisabled?: boolean;
  saveLabel?: string;
  showResetButton?: boolean;
  onReset?: () => void;
  hasChanges?: boolean;
  headerActions?: React.ReactNode;
}

/**
 * SettingsLayout - 2-panel layout using Gutenberg design tokens
 */
export default function SettingsLayout({
  children,
  activeTab,
  headerTabs,
  onSave,
  saving = false,
  saveDisabled = false,
  saveLabel = 'Save',
  showResetButton = false,
  onReset,
  hasChanges = true,
  headerActions,
}: SettingsLayoutProps) {
  const navigate = useNavigate();
  const { tab = 'general' } = useParams();
  const currentTab = activeTab || tab;

  const handleTabClick = (tabId: string) => {
    navigate(`/settings/${tabId}`);
  };

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
            <Settings className="size-4 text-primary" />
            <span className="text-sm font-semibold">Settings</span>
          </div>
        </div>

        {/* Nav Items */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="structure-panel-list">
            {settingsTabs.map((item) => {
              const Icon = item.icon;
              const is_active = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={cn(
                    'structure-item group relative overflow-hidden transition-colors',
                    is_active ? 'text-foreground font-medium' : 'text-muted-foreground'
                  )}
                >
                  {is_active && (
                    <motion.div
                      layoutId="settings-active-tab"
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
          {/* Tabs on the left */}
          <div className="flex-1">
            {headerTabs}
          </div>

          {/* Buttons on the right */}
          <div className="flex items-center gap-2">
            {/* Custom Header Actions */}
            {headerActions}

            {showResetButton && (
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
              key={currentTab}
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

export { settingsTabs };
