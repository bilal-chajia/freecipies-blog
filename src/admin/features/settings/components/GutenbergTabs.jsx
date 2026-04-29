/**
 * GutenbergTabs Component
 * 
 * Tabs component styled to match Gutenberg editor panels.
 * Uses structure-tabs and structure-tab CSS classes.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * GutenbergTabs - Container for tab navigation
 */
const GutenbergTabs = React.forwardRef(({
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
                    return React.cloneElement(child, { value, onValueChange });
                }
                return child;
            })}
        </div>
    );
});
GutenbergTabs.displayName = 'GutenbergTabs';

/**
 * GutenbergTabsList - The tab buttons container
 */
const GutenbergTabsList = React.forwardRef(({
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
                    return React.cloneElement(child, {
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

/**
 * GutenbergTabsTrigger - Individual tab button
 */
const GutenbergTabsTrigger = React.forwardRef(({
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
            onClick={() => onValueChange?.(value)}
            className={cn('structure-tab', isActive && 'is-active', className)}
            {...props}
        >
            {Icon && <Icon className="w-3.5 h-3.5 mr-1.5 inline-block" />}
            {children}
        </button>
    );
});
GutenbergTabsTrigger.displayName = 'GutenbergTabsTrigger';

/**
 * GutenbergTabsContent - Content panel for each tab
 */
const GutenbergTabsContent = React.forwardRef(({
    value,
    children,
    className,
    ...props
}, ref) => {
    // value prop comes from context/parent, we check against our own value
    const parentValue = props.currentValue;

    // If this content's value doesn't match the active tab, don't render
    if (parentValue !== undefined && parentValue !== value) {
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
const GutenbergTabsContext = React.createContext({ value: '', onValueChange: () => { } });

const GutenbergTabsProvider = ({ value, onValueChange, children, className }) => {
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
const TabsList = React.forwardRef(({ children, className, ...props }, ref) => {
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
                    return React.cloneElement(child, {
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

const TabsTrigger = React.forwardRef(({
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
            onClick={() => onValueChange?.(value)}
            className={cn('structure-tab', isActive && 'is-active', className)}
            {...props}
        >
            {Icon && <Icon className="w-3.5 h-3.5 mr-1.5 inline-block" />}
            {children}
        </button>
    );
});
TabsTrigger.displayName = 'GutenbergTabsTrigger';

const TabsContent = React.forwardRef(({ value, children, className, ...props }, ref) => {
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
