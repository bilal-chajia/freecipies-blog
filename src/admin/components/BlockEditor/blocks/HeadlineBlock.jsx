/**
 * HeadlineBlock Component
 * 
 * Secondary headline/subtitle block below the title.
 * Features:
 * - Medium typography (1.25rem)
 * - Muted color
 * - Inline editing
 * - Optional - can be removed
 * 
 * Based on WordPress Block Editor design patterns:
 * https://developer.wordpress.org/block-editor/
 */

import { useCallback, useRef } from 'react';
import { createReactBlockSpec } from '@blocknote/react';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';

/**
 * HeadlineInput - Standalone component for use outside BlockNote
 */
export function HeadlineInput({
    value = '',
    onChange,
    placeholder = 'Add a tagline or headline...',
    className,
    disabled = false,
}) {
    const inputRef = useRef(null);

    const handleChange = useCallback((e) => {
        onChange?.(e.target.value);
    }, [onChange]);

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
                'wp-block-headline',
                'w-full bg-transparent border-none',
                'font-[var(--wp-editor-font-family)]',
                'text-[var(--wp-headline-font-size)]',
                'font-[var(--wp-headline-font-weight)]',
                'text-[var(--wp-headline-color)]',
                'leading-[1.4]',
                'placeholder:text-[var(--wp-placeholder-text)] placeholder:opacity-60',
                'focus:outline-none focus:ring-0',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                className
            )}
            aria-label="Post headline"
        />
    );
}

/**
 * HeadlineBlock for BlockNote integration
 */
export const HeadlineBlock = createReactBlockSpec(
    {
        type: 'headline',
        propSchema: {
            value: { default: '' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const value = block.props.value || '';
            const { isSelected, selectBlock } = useBlockSelection(block.id);

            const moveBlockUp = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksUp();
                requestAnimationFrame(() => selectBlock());
            };

            const moveBlockDown = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksDown();
                requestAnimationFrame(() => selectBlock());
            };

            const sideMenu = editor.extensions?.sideMenu;
            const handleDragStart = (event) => {
                sideMenu?.blockDragStart?.(event, block);
            };
            const handleDragEnd = () => {
                sideMenu?.blockDragEnd?.();
            };

            const toolbar = (
                <BlockToolbar
                    blockIcon={FileText}
                    blockLabel="Headline"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    showMoreMenu={false}
                />
            );

            const handleChange = (newValue) => {
                editor.updateBlock(block, {
                    type: 'headline',
                    props: { ...block.props, value: newValue },
                });
            };

            return (
                <BlockWrapper
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    onFocus={selectBlock}
                    onPointerDownCapture={selectBlock}
                    blockType="headline"
                    blockId={block.id}
                    className="mb-6"
                >
                    <HeadlineInput
                        value={value}
                        onChange={handleChange}
                        placeholder="Add a tagline or headline..."
                    />
                </BlockWrapper>
            );
        },
    }
);

export default HeadlineInput;




