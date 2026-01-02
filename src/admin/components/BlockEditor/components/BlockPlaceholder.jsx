/**
 * BlockPlaceholder Component
 * 
 * Reusable placeholder component for blocks requiring setup/configuration.
 * Implements WordPress Block Editor placeholder design patterns:
 * https://developer.wordpress.org/block-editor/how-to-guides/block-tutorial/block-design/#placeholders
 * 
 * Features:
 * - Grey background to indicate setup state
 * - Icon + label + instructions
 * - Action buttons for initial configuration
 * - Transition animation to live preview
 */

import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';

/**
 * @typedef {Object} BlockPlaceholderProps
 * @property {React.ComponentType} icon - Icon component to display
 * @property {string} label - Block type label
 * @property {string} [instructions] - Helper text explaining what to do
 * @property {React.ReactNode} [children] - Custom content (inputs, buttons, etc.)
 * @property {string} [className] - Additional CSS classes
 * @property {boolean} [withIllustration] - Show larger illustration style
 */

const BlockPlaceholder = forwardRef(({
    icon: Icon,
    label,
    instructions,
    children,
    className,
    withIllustration = false,
    ...props
}, ref) => {
    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
                'wp-block-placeholder',
                'flex flex-col items-center justify-center gap-3',
                'p-8 bg-[var(--wp-placeholder-bg)]',
                'border border-dashed border-[var(--wp-placeholder-border)]',
                'rounded text-center',
                withIllustration && 'py-12',
                className
            )}
            {...props}
        >
            {/* Icon */}
            {Icon && (
                <div className={cn(
                    'wp-block-placeholder__icon',
                    'flex items-center justify-center',
                    'text-[var(--wp-placeholder-icon)]',
                    withIllustration ? 'w-16 h-16' : 'w-10 h-10'
                )}>
                    <Icon className={withIllustration ? 'w-12 h-12' : 'w-8 h-8'} />
                </div>
            )}

            {/* Label */}
            {label && (
                <div className={cn(
                    'wp-block-placeholder__label',
                    'text-sm font-medium text-foreground'
                )}>
                    {label}
                </div>
            )}

            {/* Instructions */}
            {instructions && (
                <div className={cn(
                    'wp-block-placeholder__instructions',
                    'text-xs text-[var(--wp-placeholder-text)]',
                    'max-w-xs'
                )}>
                    {instructions}
                </div>
            )}

            {/* Custom content (buttons, inputs, etc.) */}
            {children && (
                <div className="wp-block-placeholder__content mt-2">
                    {children}
                </div>
            )}
        </motion.div>
    );
});

BlockPlaceholder.displayName = 'BlockPlaceholder';

/**
 * Placeholder button - styled for placeholder context
 */
export function PlaceholderButton({
    icon: Icon,
    children,
    variant = 'secondary',
    size = 'sm',
    className,
    ...props
}) {
    return (
        <Button
            variant={variant}
            size={size}
            className={cn(
                'gap-2',
                className
            )}
            {...props}
        >
            {Icon && <Icon className="w-4 h-4" />}
            {children}
        </Button>
    );
}

/**
 * Placeholder input wrapper - for URL inputs, etc.
 */
export function PlaceholderInput({
    icon: Icon,
    placeholder,
    value,
    onChange,
    onSubmit,
    buttonLabel = 'Add',
    className,
    ...props
}) {
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && onSubmit) {
            e.preventDefault();
            onSubmit();
        }
    };

    return (
        <div className={cn(
            'flex items-center gap-2 w-full max-w-md',
            className
        )}>
            {Icon && (
                <div className="flex-shrink-0 text-[var(--wp-placeholder-icon)]">
                    <Icon className="w-5 h-5" />
                </div>
            )}
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                    'flex-1 h-9 px-3',
                    'bg-background border border-input rounded-md',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
                )}
                {...props}
            />
            {onSubmit && (
                <Button
                    size="sm"
                    onClick={onSubmit}
                    disabled={!value}
                >
                    {buttonLabel}
                </Button>
            )}
        </div>
    );
}

/**
 * Placeholder with media upload actions
 */
export function MediaPlaceholder({
    icon: Icon,
    label,
    instructions,
    onUpload,
    onMediaLibrary,
    onUrlInput,
    accept = 'image/*',
    className,
}) {
    return (
        <BlockPlaceholder
            icon={Icon}
            label={label}
            instructions={instructions}
            className={className}
        >
            <div className="flex items-center gap-2 flex-wrap justify-center">
                {onUpload && (
                    <PlaceholderButton
                        variant="default"
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = accept;
                            input.onchange = (e) => {
                                const file = e.target.files?.[0];
                                if (file) onUpload(file);
                            };
                            input.click();
                        }}
                    >
                        Upload
                    </PlaceholderButton>
                )}

                {onMediaLibrary && (
                    <PlaceholderButton
                        variant="secondary"
                        onClick={onMediaLibrary}
                    >
                        Media Library
                    </PlaceholderButton>
                )}

                {onUrlInput && (
                    <PlaceholderButton
                        variant="ghost"
                        onClick={onUrlInput}
                    >
                        Insert from URL
                    </PlaceholderButton>
                )}
            </div>
        </BlockPlaceholder>
    );
}

/**
 * Placeholder with URL embed input
 */
export function EmbedPlaceholder({
    icon: Icon,
    label,
    instructions,
    placeholder = 'Enter URL to embed...',
    value,
    onChange,
    onEmbed,
    className,
}) {
    return (
        <BlockPlaceholder
            icon={Icon}
            label={label}
            instructions={instructions}
            className={className}
        >
            <PlaceholderInput
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                onSubmit={onEmbed}
                buttonLabel="Embed"
            />
        </BlockPlaceholder>
    );
}

export default BlockPlaceholder;
