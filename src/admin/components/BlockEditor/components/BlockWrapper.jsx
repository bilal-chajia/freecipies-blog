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

import { forwardRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

const BlockWrapper = forwardRef(({
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

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
    }, []);

    const handleClick = useCallback((e) => {
        // Prevent triggering on inner element clicks if already selected
        if (e.target === e.currentTarget || !isSelected) {
            onClick?.();
        }
    }, [isSelected, onClick]);

    const handleKeyDown = useCallback((e) => {
        // Select block on Enter or Space
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
        }
    }, [onClick]);

    // Determine if toolbar should be visible
    const showToolbar = isSelected || (showToolbarOnHover && isHovered);

    return (
        <div
            ref={ref}
            role="document"
            tabIndex={0}
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
                'relative outline-none',
                'transition-shadow duration-[var(--wp-transition-duration)] ease-[var(--wp-transition-timing)]',

                className
            )}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            {...props}
        >
            {/* Block Toolbar - appears above the block when selected */}
            <AnimatePresence>
                {showToolbar && toolbar && (
                    <div className="wp-block-toolbar-wrap" onClick={(e) => e.stopPropagation()}>
                        <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                            className="wp-block-toolbar"
                        >
                            {toolbar}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Block Content */}
            <div className="wp-block__content">
                {children}
            </div>
        </div>
    );
});

BlockWrapper.displayName = 'BlockWrapper';

export default BlockWrapper;

/**
 * Hook to generate block wrapper props
 * Similar to WordPress useBlockProps()
 * 
 * @param {Object} options
 * @param {string} options.blockType
 * @param {string} options.blockId
 * @param {boolean} options.isSelected
 * @param {string} [options.className]
 * @returns {Object} Props to spread on the block wrapper
 */
export function useBlockWrapperProps({
    blockType,
    blockId,
    isSelected = false,
    className = '',
}) {
    return {
        role: 'document',
        tabIndex: 0,
        'aria-label': `Block: ${blockType}`,
        'data-block': blockId,
        'data-block-type': blockType,
        'data-selected': isSelected,
        className: cn(
            'wp-block',
            'block-editor-block-list__block',
            isSelected && 'is-selected',
            className
        ),
    };
}
