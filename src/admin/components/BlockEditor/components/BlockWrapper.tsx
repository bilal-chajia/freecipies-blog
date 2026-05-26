/**
 * BlockWrapper Component
 * 
 * Reusable wrapper for all blocks providing WordPress-like:
 * - Selected state with blue outline
 * - Hover state with light border
 * - Block toolbar positioning slot
 * - Drag handle integration
 * - Accessibility attributes
 * 
 * Based on WordPress Block Editor design patterns:
 * https://developer.wordpress.org/block-editor/getting-started/fundamentals/block-wrapper/
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useBlockEditorStore } from '../store/blockEditorStore';

/**
 * @typedef {Object} BlockWrapperProps
 * @property {boolean} isSelected - Whether the block is currently selected
 * @property {React.ReactNode} [toolbar] - Block toolbar content (shown when selected)
 * @property {React.ReactNode} children - Block content
 * @property {string} [className] - Additional CSS classes
 * @property {string} [blockType] - Block type identifier for data attributes
 * @property {string} [blockId] - Unique block ID
 * @property {string} [ariaLabel] - Accessible label for the block
 * @property {() => void} [onClick] - Click handler to select the block
 * @property {boolean} [showToolbarOnHover] - Show toolbar on hover (default: false)
 */

interface BlockWrapperProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'> {
    isSelected?: boolean;
    toolbar?: ReactNode;
    children: ReactNode;
    blockType?: string;
    blockId?: string;
    ariaLabel?: string;
    showToolbarOnHover?: boolean;
    onClick?: (event: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
}

const EMPTY_ERRORS: string[] = [];

const BlockWrapper = forwardRef<HTMLDivElement, BlockWrapperProps>(({
    isSelected = false,
    toolbar,
    children,
    className,
    blockType = 'block',
    blockId,
    ariaLabel,
    onClick,
    showToolbarOnHover = false,
    ...props
}, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const shouldReduceMotion = useReducedMotion();
    const localRef = useRef<HTMLDivElement>(null);
    const [toolbarBelow, setToolbarBelow] = useState(false);
    const errors = useBlockEditorStore((state) => state.blockErrors[blockId || ''] || EMPTY_ERRORS);

    useImperativeHandle(ref, () => localRef.current!);

    useEffect(() => {
        if (!localRef.current) return;
        const rect = localRef.current.getBoundingClientRect();
        setToolbarBelow(rect.top < 60);
    }, [isSelected]);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    const handleClick = useCallback((_event: MouseEvent<HTMLDivElement>) => {
        // Always trigger selection on click to ensure focus is restored
        // particularly for custom blocks where focus might be lost but state is still 'selected'
        onClick?.(_event);
    }, [onClick]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest('input, textarea, button, a, [contenteditable="true"]')) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.(e);
        }
    }, [onClick]);

    // Determine if toolbar should be visible
    const showToolbar = isSelected || (showToolbarOnHover && isHovered);

    return (
        <div
            ref={localRef}
            role="document"
            tabIndex={-1}
            aria-label={ariaLabel || `Block: ${blockType}`}
            data-block={blockId}
            data-block-type={blockType}
            data-selected={isSelected}
            className={cn(
                // Base WordPress block classes
                'wp-block',
                'wp-block--custom',
                'block-editor-block-list__block',

                // Selection state
                isSelected && 'is-selected',

                // Custom wrapper styles
                'relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                'transition-shadow duration-[var(--wp-transition-duration)] ease-[var(--wp-transition-timing)]',

                className
            )}
            onClick={(e) => {
                if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.blockSurface === 'true') {
                    handleClick(e);
                }
            }}
            onKeyDown={handleKeyDown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            {/* Block Toolbar - appears above the block when selected */}
            <AnimatePresence>
                {showToolbar && toolbar && (
                    <div
                        className="wp-block-toolbar-wrap"
                        style={{
                            top: toolbarBelow
                                ? 'calc(100% + var(--wp-toolbar-gap))'
                                : undefined,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: shouldReduceMotion ? 0 : 0.12, ease: 'easeOut' }}
                            className="wp-block-toolbar"
                        >
                            {toolbar}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Block Content */}
            <div data-block-surface="true" className="wp-block__content">
                {children}
                {errors.length > 0 && (
                    <div className="mt-2 text-[11px] text-destructive bg-destructive/5 border border-destructive/10 p-2 rounded-md flex flex-col gap-1 select-none">
                        {errors.map((err, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 font-medium">
                                <span className="w-1 h-1 bg-destructive rounded-full shrink-0" />
                                {err}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
});

BlockWrapper.displayName = 'BlockWrapper';

export default BlockWrapper;
