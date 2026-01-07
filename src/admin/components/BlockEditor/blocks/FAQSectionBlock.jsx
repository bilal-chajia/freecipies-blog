/**
 * Custom Block: FAQ Section
 * 
 * Expandable FAQ items with question/answer pairs.
 * 
 * REFACTORED for WordPress Block Editor design:
 * - Collapsed preview showing FAQ count when unselected
 * - Expanded editing mode when selected
 * - Proper block toolbar
 * - Clean visual states
 * 
 * Based on WordPress Block Editor design:
 * https://developer.wordpress.org/block-editor/
 */

import { createReactBlockSpec } from '@blocknote/react';
import {
    HelpCircle,
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    GripVertical
} from 'lucide-react';
import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import BlockToolbar, { ToolbarButton, ToolbarSeparator } from '../components/BlockToolbar';
import BlockWrapper from '../components/BlockWrapper';
import { useBlockSelection } from '../selection-context';

// HTML escape for safe rendering
const escapeHtml = (value) => (
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
);

const sanitizeHref = (href) => {
    if (!href) return '';
    if (href.startsWith('/') || href.startsWith('#')) return href;
    try {
        const url = new URL(href);
        if (['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)) {
            return href;
        }
    } catch {
        return '';
    }
    return '';
};

const renderInlineMarkdown = (text) => {
    const source = String(text || '');
    if (!source) return { __html: '' };
    const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;
    let html = '';

    while ((match = pattern.exec(source)) !== null) {
        if (match.index > lastIndex) {
            html += escapeHtml(source.slice(lastIndex, match.index));
        }
        const label = escapeHtml(match[1]);
        const href = sanitizeHref(match[2].trim());
        if (href) {
            html += `<a href="${escapeHtml(href)}">${label}</a>`;
        } else {
            html += label;
        }
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < source.length) {
        html += escapeHtml(source.slice(lastIndex));
    }

    return { __html: html.replace(/\n/g, '<br />') };
};

export const FAQSectionBlock = createReactBlockSpec(
    {
        type: 'faqSection',
        propSchema: {
            title: { default: 'Frequently Asked Questions' },
            items: { default: '[]' },
        },
        content: 'none',
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const items = (() => {
                try {
                    return JSON.parse(block.props.items || '[]');
                } catch {
                    return [];
                }
            })();

            const { isSelected, selectBlock } = useBlockSelection(block.id);
            const [expanded, setExpanded] = useState({});
            const [editing, setEditing] = useState({});
            const answerRefs = useRef({});

            const updateItems = (newItems) => {
                editor.updateBlock(block, {
                    type: 'faqSection',
                    props: { ...block.props, items: JSON.stringify(newItems) },
                });
            };

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

            const addItem = () => {
                updateItems([...items, { q: '', a: '' }]);
                setExpanded({ ...expanded, [items.length]: true });
                setEditing((prev) => ({ ...prev, [items.length]: true }));
                requestAnimationFrame(() => {
                    const textarea = answerRefs.current[items.length];
                    if (textarea) textarea.focus();
                });
            };

            const removeItem = (idx) => {
                updateItems(items.filter((_, i) => i !== idx));
                setEditing((prev) => {
                    const next = { ...prev };
                    delete next[idx];
                    return next;
                });
            };

            const updateItem = (idx, field, value) => {
                const newItems = [...items];
                newItems[idx] = { ...newItems[idx], [field]: value };
                updateItems(newItems);
            };

            const toggleExpand = (idx) => {
                setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
            };

            const startEditing = (idx) => {
                setEditing((prev) => ({ ...prev, [idx]: true }));
                requestAnimationFrame(() => {
                    const textarea = answerRefs.current[idx];
                    if (textarea) textarea.focus();
                });
            };

            const stopEditing = (idx) => {
                setEditing((prev) => ({ ...prev, [idx]: false }));
            };

            const toolbar = (
                <BlockToolbar
                    blockIcon={HelpCircle}
                    blockLabel="FAQ Section"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    showMoreMenu={false}
                >
                    <span className="px-2 text-xs text-muted-foreground">
                        {items.length} {items.length === 1 ? 'question' : 'questions'}
                    </span>
                    <ToolbarSeparator />
                    <ToolbarButton
                        icon={Plus}
                        label="Add question"
                        onClick={addItem}
                    />
                </BlockToolbar>
            );

            return (
                <BlockWrapper
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    onFocus={selectBlock}
                    onPointerDownCapture={selectBlock}
                    blockType="faq"
                    blockId={block.id}
                    className="my-6"
                >
                    {/* Header */}
                    <div className="bg-muted/50 p-4 border-b">
                        <input
                            type="text"
                            value={block.props.title}
                            onChange={(e) => editor.updateBlock(block, {
                                type: 'faqSection',
                                props: { ...block.props, title: e.target.value }
                            })}
                            className={cn(
                                'text-lg font-semibold w-full',
                                'bg-transparent border-none p-0',
                                'focus:outline-none focus:ring-0',
                                'placeholder:text-muted-foreground/50'
                            )}
                            placeholder="FAQ Section Title"
                        />
                    </div>

                    {/* FAQ Items */}
                    <div className="divide-y">
                        {items.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No questions yet</p>
                                {isSelected && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={addItem}
                                        className="mt-3 gap-1"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add first question
                                    </Button>
                                )}
                            </div>
                        ) : (
                            items.map((item, idx) => (
                                <div key={idx} className="p-4 group">
                                    <div className="flex items-start gap-2">
                                        {/* Drag handle - only when selected */}
                                        {isSelected && (
                                            <div className="mt-1 text-muted-foreground/50 cursor-grab">
                                                <GripVertical className="w-4 h-4" />
                                            </div>
                                        )}

                                        {/* Expand toggle */}
                                        <button
                                            onClick={() => toggleExpand(idx)}
                                            className="mt-1 text-muted-foreground hover:text-foreground"
                                        >
                                            {expanded[idx]
                                                ? <ChevronDown className="w-4 h-4" />
                                                : <ChevronRight className="w-4 h-4" />
                                            }
                                        </button>

                                        {/* Question/Answer */}
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <input
                                                type="text"
                                                value={item.q}
                                                onChange={(e) => updateItem(idx, 'q', e.target.value)}
                                                placeholder="Question"
                                                className={cn(
                                                    'w-full font-medium text-sm',
                                                    'bg-transparent border-none p-0',
                                                    'focus:outline-none focus:ring-0',
                                                    'placeholder:text-muted-foreground/50'
                                                )}
                                            />

                                            <AnimatePresence>
                                                {expanded[idx] && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.15 }}
                                                    >
                                                        {editing[idx] ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-end">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => stopEditing(idx)}
                                                                        className="text-xs text-primary hover:underline"
                                                                    >
                                                                        Done
                                                                    </button>
                                                                </div>
                                                                <textarea
                                                                    ref={(node) => {
                                                                        if (node) {
                                                                            answerRefs.current[idx] = node;
                                                                        } else {
                                                                            delete answerRefs.current[idx];
                                                                        }
                                                                    }}
                                                                    value={item.a}
                                                                    onChange={(e) => updateItem(idx, 'a', e.target.value)}
                                                                    placeholder="Answer (supports [text](url) for links)"
                                                                    className={cn(
                                                                        'w-full text-sm text-muted-foreground',
                                                                        'bg-muted/50 border border-input rounded-md',
                                                                        'p-2 resize-y min-h-[80px]',
                                                                        'focus:outline-none focus:ring-2 focus:ring-ring'
                                                                    )}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                role="button"
                                                                tabIndex={0}
                                                                onClick={() => startEditing(idx)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                        e.preventDefault();
                                                                        startEditing(idx);
                                                                    }
                                                                }}
                                                                className={cn(
                                                                    'text-sm text-muted-foreground',
                                                                    'cursor-pointer hover:bg-muted/50 rounded p-1 -m-1',
                                                                    '[&_a]:text-primary [&_a]:underline'
                                                                )}
                                                                dangerouslySetInnerHTML={
                                                                    renderInlineMarkdown(item.a || 'Click to add an answer...')
                                                                }
                                                            />
                                                        )}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {/* Delete button */}
                                        {isSelected && (
                                            <button
                                                onClick={() => removeItem(idx)}
                                                className={cn(
                                                    'text-muted-foreground/50',
                                                    'hover:text-destructive',
                                                    'opacity-0 group-hover:opacity-100',
                                                    'transition-opacity'
                                                )}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add button footer - only when selected and has items */}
                    {isSelected && items.length > 0 && (
                        <button
                            onClick={addItem}
                            className={cn(
                                'w-full p-3 text-sm text-center',
                                'text-primary hover:bg-primary/5',
                                'transition-colors flex items-center justify-center gap-2',
                                'border-t'
                            )}
                        >
                            <Plus className="w-4 h-4" /> Add Question
                        </button>
                    )}
                </BlockWrapper>
            );
        },
    }
);

export default FAQSectionBlock;




