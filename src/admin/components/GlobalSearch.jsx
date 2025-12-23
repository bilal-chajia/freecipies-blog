import React, { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/ui/command.jsx';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Tags,
  Image,
  Settings,
  Home,
  Pin,
  LayoutTemplate,
  Users,
  Sparkles,
} from 'lucide-react';

const GlobalSearch = ({ open, onOpenChange }) => {
  const navigate = useNavigate();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e) => {
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || e.key === '/') {
        e.preventDefault();
        onOpenChange?.(true);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [onOpenChange]);

  const runCommand = useCallback((command) => {
    onOpenChange?.(false);
    command();
  }, [onOpenChange]);

  const navigationItems = [
    { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { title: 'Homepage', icon: Home, path: '/homepage' },
    { title: 'Articles', icon: FileText, path: '/articles' },
    { title: 'Categories', icon: FolderOpen, path: '/categories' },
    { title: 'Tags', icon: Tags, path: '/tags' },
    { title: 'Authors', icon: Users, path: '/authors' },
    { title: 'Media Library', icon: Image, path: '/media' },
    { title: 'Pinterest Boards', icon: Pin, path: '/pinterest' },
    { title: 'Templates', icon: LayoutTemplate, path: '/templates' },
  ];

  const settingsItems = [
    { title: 'General Settings', path: '/settings/general' },
    { title: 'SEO Settings', path: '/settings/seo' },
    { title: 'Email Settings', path: '/settings/email' },
    { title: 'Social Settings', path: '/settings/social' },
    { title: 'Content Settings', path: '/settings/content' },
    { title: 'Ads Settings', path: '/settings/ads' },
    { title: 'Appearance Settings', path: '/settings/appearance' },
    { title: 'Advanced Settings', path: '/settings/advanced' },
  ];

  const quickActions = [
    { title: 'New Article', icon: FileText, path: '/articles/new' },
    { title: 'New Category', icon: FolderOpen, path: '/categories/new' },
    { title: 'Upload Media', icon: Image, path: '/media' },
  ];

  return (
    <CommandDialog 
      open={open} 
      onOpenChange={onOpenChange}
      title="Global Search"
      description="Search commands and navigate quickly"
    >
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Quick Actions">
          {quickActions.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => navigate(item.path))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3" />
              </span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => navigate(item.path))}
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Settings">
          {settingsItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => runCommand(() => navigate(item.path))}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};

export default GlobalSearch;

