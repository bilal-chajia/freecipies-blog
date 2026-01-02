/**
 * TitleBlock Component
 * 
 * Large inline-editable title block like WordPress post title.
 * Features:
 * - Large typography (2.5rem)
 * - Inline editing with contentEditable
 * - Auto-generates slug on first edit (optional)
 * - Placeholder text when empty
 * - Not deletable - always first block in canvas
 * 
 * Based on WordPress Block Editor design patterns:
 * https://developer.wordpress.org/block-editor/
 */

import { useCallback, useRef, useEffect } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { cn } from '@/lib/utils';

/**
 * Generate URL-friendly slug from title
 */
function generateSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * TitleBlock - Standalone component for use outside BlockNote
 */
export function TitleInput({
    value = '',
    onChange,
    onSlugGenerate,
    placeholder = 'Add title',
    className,
    disabled = false,
}) {
    const inputRef = useRef(null);
    const hasGeneratedSlug = useRef(false);

    const handleChange = useCallback((e) => {
        const newValue = e.target.value;
        onChange?.(newValue);

        // Generate slug on first meaningful edit
        if (!hasGeneratedSlug.current && newValue.length >= 3 && onSlugGenerate) {
            hasGeneratedSlug.current = true;
            onSlugGenerate(generateSlug(newValue));
        }
    }, [onChange, onSlugGenerate]);

    const handleKeyDown = useCallback((e) => {
        // Prevent Enter from creating new line - move to next field
        if (e.key === 'Enter') {
            e.preventDefault();
            // Find next focusable element
            const form = e.target.closest('form');
            if (form) {
                const elements = Array.from(form.querySelectorAll('input, textarea, [contenteditable]'));
                const currentIndex = elements.indexOf(e.target);
                if (currentIndex > -1 && currentIndex < elements.length - 1) {
                    elements[currentIndex + 1]?.focus();
                }
            }
        }
    }, []);

    return (
        <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
                'wp-block-post-title',
                'w-full bg-transparent border-none',
                'font-[var(--wp-editor-font-family)]',
                'text-[var(--wp-title-font-size)]',
                'font-[var(--wp-title-font-weight)]',
                'leading-[var(--wp-title-line-height)]',
                'placeholder:text-[var(--wp-placeholder-text)]',
                'focus:outline-none focus:ring-0',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                className
            )}
            aria-label="Post title"
        />
    );
}

/**
 * TitleBlock for BlockNote integration
 * (If we need it as a block type in the future)
 */
export const TitleBlock = createReactBlockSpec(
    {
        type: 'title',
        propSchema: {
            value: { default: '' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const value = block.props.value || '';

            const handleChange = (newValue) => {
                editor.updateBlock(block, {
                    type: 'title',
                    props: { ...block.props, value: newValue },
                });
            };

            return (
                <div className="mb-4">
                    <TitleInput
                        value={value}
                        onChange={handleChange}
                        placeholder="Add title"
                    />
                </div>
            );
        },
    }
);

export default TitleInput;
