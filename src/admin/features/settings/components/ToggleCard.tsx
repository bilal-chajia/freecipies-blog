import * as React from 'react';
import { useId } from 'react';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import { cn } from '@/lib/utils';

/**
 * ToggleCard - OpenAI-style compact toggle row
 * Flat design with subtle hover states
 */

interface ToggleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  iconColor?: string;
  description?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleCard({
  id,
  label,
  icon: Icon,
  iconColor = 'text-muted-foreground',
  description,
  checked,
  onCheckedChange,
  disabled = false,
  className,
  ...props
}: ToggleCardProps) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const descriptionId = `${fieldId}-description`;

  return (
    <div
      className={cn(
        "flex items-center justify-between py-2.5 px-3 -mx-3",
        "rounded-md transition-colors hover:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      role="group"
      aria-labelledby={`${fieldId}-label`}
      {...props}
    >
      <div className="space-y-0.5 pr-4 flex-1">
        <div className="flex items-center gap-1.5">
          {Icon && (
            <Icon className={cn("size-3.5", iconColor)} aria-hidden={true} />
          )}
          <Label
            id={`${fieldId}-label`}
            htmlFor={fieldId}
            className="text-sm font-medium cursor-pointer"
          >
            {label}
          </Label>
        </div>
        {description && (
          <p
            id={descriptionId}
            className="text-xs text-muted-foreground/70"
          >
            {description}
          </p>
        )}
      </div>
      <Switch
        id={fieldId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        aria-describedby={description ? descriptionId : undefined}
      />
    </div>
  );
}

export { ToggleCard };
