/**
 * Custom Block: FAQ Section
 * 
 * Expandable FAQ items.
 */

import { createReactBlockSpec } from '@blocknote/react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useRef, useState } from 'react';

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
            items: { default: '[]' }, // Storing complex data as string due to prop limitations
        },
        content: 'none',
    },
    {
        render: (props) => {
            const items = (() => {
                try {
                    return JSON.parse(props.block.props.items || '[]');
                } catch {
                    return [];
                }
            })();

            const [expanded, setExpanded] = useState({});
            const [editing, setEditing] = useState({});
            const answerRefs = useRef({});

            const updateItems = (newItems) => {
                props.editor.updateBlock(props.block, {
                    type: 'faqSection',
                    props: { ...props.block.props, items: JSON.stringify(newItems) },
                });
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

            return (
                <div className="my-6 border rounded-lg overflow-hidden bg-white shadow-sm w-full">
                    <div className="bg-gray-50 p-4 border-b">
                        <input
                            type="text"
                            value={props.block.props.title}
                            onChange={(e) => props.editor.updateBlock(props.block, { props: { ...props.block.props, title: e.target.value } })}
                            className="text-lg font-semibold bg-transparent border-none p-0 focus:ring-0 w-full"
                            placeholder="FAQ Section Title"
                        />
                    </div>
                    <div className="divide-y">
                        {items.map((item, idx) => (
                            <div key={idx} className="p-4 group">
                                <div className="flex items-start gap-2">
                                    <button onClick={() => toggleExpand(idx)} className="mt-1 text-gray-400 hover:text-gray-600">
                                        {expanded[idx] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                    </button>
                                    <div className="flex-1 space-y-2">
                                        <input
                                            type="text"
                                            value={item.q}
                                            onChange={(e) => updateItem(idx, 'q', e.target.value)}
                                            placeholder="Question"
                                            className="w-full font-medium text-sm bg-transparent border-none focus:ring-0 p-0 placeholder:text-gray-300"
                                        />
                                        {expanded[idx] && editing[idx] && (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        type="button"
                                                        onClick={() => stopEditing(idx)}
                                                        className="text-xs text-gray-500 hover:text-gray-700"
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
                                                    data-faq-answer="true"
                                                    value={item.a}
                                                    onChange={(e) => updateItem(idx, 'a', e.target.value)}
                                                    placeholder="Answer"
                                                    className="w-full text-sm text-gray-600 bg-transparent border-none focus:ring-0 p-0 resize-y min-h-[80px]"
                                                />
                                            </div>
                                        )}
                                        {expanded[idx] && !editing[idx] && (
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => startEditing(idx)}
                                                onKeyDown={(event) => {
                                                    if (event.key === 'Enter' || event.key === ' ') {
                                                        event.preventDefault();
                                                        startEditing(idx);
                                                    }
                                                }}
                                                className="text-xs text-gray-500 [&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2"
                                                dangerouslySetInnerHTML={renderInlineMarkdown(item.a || 'Click to add an answer')}
                                            />
                                        )}
                                    </div>
                                    <button
                                        onClick={() => removeItem(idx)}
                                        className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={addItem}
                        className="w-full p-3 text-sm text-center text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 border-t"
                    >
                        <Plus className="w-4 h-4" /> Add Question
                    </button>
                </div>
            );
        },
    }
);
