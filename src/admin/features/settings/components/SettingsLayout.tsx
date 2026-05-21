/**
 * Settings Layout Component
 *
 * 2-panel WordPress Gutenberg-style layout for Settings
 * Uses the SAME CSS classes as BlockInserter to ensure design consistency
 */

import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/ui/scroll-area';
import { Button } from '@/ui/button';
import { Save, RefreshCw, Zap } from 'lucide-react';
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
} from 'lucide-react';

// Navigation items for Settings tabs
const settingsTabs = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'seo', label: 'SEO', icon: Search },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'social', label: 'Social', icon: Share2 },
  { id: 'content', label: 'Content', icon: FileText },
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
        initial={{ x: -200, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -200, opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        style={{ width: '200px' }}
        className="wp-block-inserter h-full min-h-0 overflow-hidden bg-[var(--wp-inserter-bg)] border-r border-[var(--wp-inserter-border)] flex flex-col flex-shrink-0"
      >
        {/* Left Panel Header - FIXED HEIGHT */}
        <div className={cn(HEADER_HEIGHT, 'flex items-center px-2.5 border-b border-border flex-shrink-0')}>
          <span className="text-sm font-semibold">Settings</span>
        </div>

        {/* Nav Items */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="structure-panel-list">
            {settingsTabs.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={cn('structure-item', isActive && 'is-active')}
                >
                  <Icon className="structure-item-icon" />
                  <span className="structure-item-label">{item.label}</span>
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
