import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card.jsx';
import { cn } from '@/lib/utils';

/**
 * SettingsSection - OpenAI-style settings section wrapper
 * Minimal, clean design with subtle borders and compact spacing
 */
const SettingsSection = React.forwardRef(({ 
  icon: Icon,
  title,
  description,
  children,
  className,
  headerAction,
  ...props
}, ref) => {
  return (
    <Card 
      ref={ref}
      className={cn(
        "border border-border/60 shadow-none bg-card/50 rounded-lg overflow-hidden",
        className
      )}
      {...props}
    >
      <CardHeader className="px-4 py-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <Icon className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            )}
            <div>
              <CardTitle className="text-sm font-semibold">{title}</CardTitle>
              {description && (
                <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
              )}
            </div>
          </div>
          {headerAction && (
            <div className="flex items-center gap-2">
              {headerAction}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        {children}
      </CardContent>
    </Card>
  );
});

SettingsSection.displayName = 'SettingsSection';

export { SettingsSection };
