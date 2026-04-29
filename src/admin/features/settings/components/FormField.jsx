import React, { useId } from 'react';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { cn } from '@/lib/utils';

/**
 * FormField - OpenAI-style compact form field
 * Minimal design with smaller inputs and tighter spacing
 */
const FormField = React.forwardRef(({
  id,
  label,
  icon: Icon,
  required = false,
  description,
  value,
  onChange,
  type = 'text',
  placeholder,
  multiline = false,
  rows = 3,
  className,
  inputClassName,
  min,
  max,
  suffix,
  badge,
  ...props
}, ref) => {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const descriptionId = `${fieldId}-description`;

  const inputStyles = cn(
    "h-8",
    suffix && "pr-14",
    inputClassName
  );

  const textareaStyles = cn(
    "resize-none",
    inputClassName
  );

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      <div className="flex items-center justify-between">
        <Label
          htmlFor={fieldId}
          className="text-xs font-medium text-foreground/80 flex items-center gap-1.5"
        >
          {Icon && <Icon className="w-3 h-3 text-muted-foreground" aria-hidden="true" />}
          {label}
          {required && (
            <span className="text-destructive" aria-label="required">*</span>
          )}
        </Label>
        {badge && (
          <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {badge}
          </span>
        )}
      </div>

      <div className="relative">
        {multiline ? (
          <Textarea
            ref={ref}
            id={fieldId}
            value={value}
            onChange={onChange}
            rows={rows}
            placeholder={placeholder}
            className={textareaStyles}
            aria-describedby={description ? descriptionId : undefined}
            aria-required={required}
          />
        ) : (
          <Input
            ref={ref}
            id={fieldId}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className={inputStyles}
            min={min}
            max={max}
            aria-describedby={description ? descriptionId : undefined}
            aria-required={required}
          />
        )}
        {suffix && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground"
            aria-hidden="true"
          >
            {suffix}
          </div>
        )}
      </div>

      {description && (
        <p
          id={descriptionId}
          className="text-[11px] text-muted-foreground/70"
        >
          {description}
        </p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export { FormField };
