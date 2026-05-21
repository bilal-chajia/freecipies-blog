/**
 * GutenbergTabs Component
 *
 * Tabs component styled to match Gutenberg editor panels.
 * Uses structure-tabs and structure-tab CSS classes.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface GutenbergTabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * GutenbergTabs - Container for tab navigation
 */
const GutenbergTabs = React.forwardRef<HTMLDivElement, GutenbergTabsProps>(({
  value,
  onValueChange,
  children,
  className,
  ...props
}, ref) => {
  return (
    <div ref={ref} className={cn('space-y-4', className)} {...props}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { value, onValueChange });
        }
        return child;
      })}
    </div>
  );
});
GutenbergTabs.displayName = 'GutenbergTabs';

interface GutenbergTabsListProps {
  children?: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

/**
 * GutenbergTabsList - The tab buttons container
 */
const GutenbergTabsList = React.forwardRef<HTMLDivElement, GutenbergTabsListProps>(({
  children,
  value,
  onValueChange,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('structure-tabs', className)}
      role="tablist"
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            currentValue: value,
            onValueChange
          });
        }
        return child;
      })}
    </div>
  );
});
GutenbergTabsList.displayName = 'GutenbergTabsList';

interface GutenbergTabsTriggerProps {
  value?: string;
  currentValue?: string;
  onValueChange?: (value: string) => void;
  children?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

/**
 * GutenbergTabsTrigger - Individual tab button
 */
const GutenbergTabsTrigger = React.forwardRef<HTMLButtonElement, GutenbergTabsTriggerProps>(({
  value,
  currentValue,
  onValueChange,
  children,
  icon: Icon,
  className,
  ...props
}, ref) => {
  const isActive = currentValue === value;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange?.(value ?? '')}
      className={cn('structure-tab', isActive && 'is-active', className)}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5 mr-1.5 inline-block" />}
      {children}
    </button>
  );
});
GutenbergTabsTrigger.displayName = 'GutenbergTabsTrigger';

interface GutenbergTabsContentProps {
  value?: string;
  children?: React.ReactNode;
  className?: string;
  currentValue?: string;
}

/**
 * GutenbergTabsContent - Content panel for each tab
 */
const GutenbergTabsContent = React.forwardRef<HTMLDivElement, GutenbergTabsContentProps>(({
  value,
  children,
  className,
  currentValue,
  ...props
}, ref) => {
  if (currentValue !== undefined && currentValue !== value) {
    return null;
  }

  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn('mt-0', className)}
      {...props}
    >
      {children}
    </div>
  );
});
GutenbergTabsContent.displayName = 'GutenbergTabsContent';

// Context-based version for proper value passing
interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const GutenbergTabsContext = React.createContext<TabsContextValue>({ value: '', onValueChange: () => { } });

interface GutenbergTabsProviderProps {
  value: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
}

const GutenbergTabsProvider = ({ value, onValueChange, children, className }: GutenbergTabsProviderProps) => {
  return (
    <GutenbergTabsContext.Provider value={{ value, onValueChange }}>
      <div className={cn('space-y-4', className)}>
        {children}
      </div>
    </GutenbergTabsContext.Provider>
  );
};

const useGutenbergTabs = () => React.useContext(GutenbergTabsContext);

// Simplified API components that use context
const TabsList = React.forwardRef<HTMLDivElement, Omit<GutenbergTabsListProps, 'value' | 'onValueChange'>>(({ children, className, ...props }, ref) => {
  const { value, onValueChange } = useGutenbergTabs();
  return (
    <div
      ref={ref}
      className={cn('structure-tabs', className)}
      role="tablist"
      {...props}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            currentValue: value,
            onValueChange
          });
        }
        return child;
      })}
    </div>
  );
});
TabsList.displayName = 'GutenbergTabsList';

const TabsTrigger = React.forwardRef<HTMLButtonElement, GutenbergTabsTriggerProps>(({
  value,
  currentValue,
  onValueChange,
  children,
  icon: Icon,
  className,
  ...props
}, ref) => {
  const isActive = currentValue === value;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange?.(value ?? '')}
      className={cn('structure-tab', isActive && 'is-active', className)}
      {...props}
    >
      {Icon && <Icon className="w-3.5 h-3.5 mr-1.5 inline-block" />}
      {children}
    </button>
  );
});
TabsTrigger.displayName = 'GutenbergTabsTrigger';

const TabsContent = React.forwardRef<HTMLDivElement, Omit<GutenbergTabsContentProps, 'currentValue'>>(({ value, children, className, ...props }, ref) => {
  const { value: activeValue } = useGutenbergTabs();

  if (activeValue !== value) {
    return null;
  }

  return (
    <div
      ref={ref}
      role="tabpanel"
      className={cn('mt-0', className)}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = 'GutenbergTabsContent';

export {
  GutenbergTabsProvider as GutenbergTabs,
  TabsList as GutenbergTabsList,
  TabsTrigger as GutenbergTabsTrigger,
  TabsContent as GutenbergTabsContent,
  useGutenbergTabs
};
