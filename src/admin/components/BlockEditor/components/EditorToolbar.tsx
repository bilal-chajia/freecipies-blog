import React, { useEffect, useRef, useState } from 'react';
import {
    Plus,
    Image as ImageIcon,
    Video,
    List,
    ListOrdered,
    Heading2,
    Heading3,
    Link as LinkIcon,
    AlertTriangle,
    HelpCircle,
    Utensils,
    LayoutGrid,
    Table,
    Minus,
    SplitSquareVertical,
    ListTree
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { findMarkdownLinkRange } from '../utils/inlineContent';
import { safeInsertBlock } from '../utils/insert-block';
import type { BlockNoteEditor } from '@blocknote/core';

interface EditorToolbarProps {
    editor: BlockNoteEditor<any, any, any> | null;
    structureOpen: boolean;
    onToggleStructurePanel: () => void;
}

/**
 * Editor Toolbar Component
 * 
 * Floating toolbar for the BlockEditor.
 */
const EditorToolbar: React.FC<EditorToolbarProps> = ({ 
    editor, 
    structureOpen, 
    onToggleStructurePanel 
}) => {
    if (!editor) return null;

    const selectionRef = useRef({ text: '', url: '' });
    const faqLinkTargetRef = useRef<HTMLTextAreaElement | null>(null);
    const faqSelectionRef = useRef({ start: 0, end: 0 });
    const [faqLinkOpen, setFaqLinkOpen] = useState(false);
    const [faqLinkUrl, setFaqLinkUrl] = useState('');
    const [faqLinkHasMatch, setFaqLinkHasMatch] = useState(false);

    useEffect(() => {
        if (!editor) return undefined;
        const updateSelection = () => {
            selectionRef.current = {
                text: editor.getSelectedText() || '',
                url: editor.getSelectedLinkUrl() || '',
            };
        };
        updateSelection();
        const unsubscribe = editor.onSelectionChange(updateSelection);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor]);

    const insertBlock = (type: string, props: Record<string, any> = {}) => {
        if (!editor) return;
        safeInsertBlock(editor, type, props);
    };

    const applyFaqLink = () => {
        const textarea = faqLinkTargetRef.current;
        if (!textarea) return;
        const currentValue = textarea.value || '';
        const { start, end } = faqSelectionRef.current;
        const url = faqLinkUrl.trim();
        if (!url) return;
        const selectedText = currentValue.slice(start, end);
        const linkText = selectedText || url;
        const linkMarkdown = `[${linkText}](${url})`;
        const nextValue =
            currentValue.slice(0, start) +
            linkMarkdown +
            currentValue.slice(end);
        
        textarea.value = nextValue;
        
        // Dispatch input event for React to pick up changes
        if (typeof window !== 'undefined') {
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        requestAnimationFrame(() => {
            const caretPos = start + linkMarkdown.length;
            textarea.focus();
            textarea.setSelectionRange(caretPos, caretPos);
        });
        setFaqLinkOpen(false);
    };

    const removeFaqLink = () => {
        const textarea = faqLinkTargetRef.current;
        if (!textarea) return;
        const currentValue = textarea.value || '';
        const { start, end } = faqSelectionRef.current;
        const match = findMarkdownLinkRange(currentValue, start, end);
        if (!match) return;
        const nextValue =
            currentValue.slice(0, match.start) +
            match.label +
            currentValue.slice(match.end);
        
        textarea.value = nextValue;
        
        if (typeof window !== 'undefined') {
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        requestAnimationFrame(() => {
            const caretPos = match.start + match.label.length;
            textarea.focus();
            textarea.setSelectionRange(caretPos, caretPos);
        });
        setFaqLinkOpen(false);
    };

    return (
        <div className="border-b bg-muted print:hidden">
            <div className="flex items-center gap-1 p-2 flex-wrap">
                <button
                    type="button"
                    onClick={onToggleStructurePanel}
                    className={`p-1.5 hover:bg-muted/80 rounded-sm ${structureOpen ? 'bg-muted/80 text-foreground' : 'text-muted-foreground'}`}
                    title="List View / Outline"
                >
                    <ListTree className="size-4" />
                </button>
                <button type="button" onClick={() => insertBlock('heading', { level: 2 })} className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground" title="Heading 2"><Heading2 className="size-4" /></button>
                <button type="button" onClick={() => insertBlock('heading', { level: 3 })} className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground" title="Heading 3"><Heading3 className="size-4" /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button type="button" onClick={() => insertBlock('bulletListItem')} className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground" title="Bullet List"><List className="size-4" /></button>
                <button type="button" onClick={() => insertBlock('numberedListItem')} className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground" title="Numbered List"><ListOrdered className="size-4" /></button>
                <button
                    type="button"
                    onMouseDown={(event) => {
                        event.preventDefault();
                    }}
                    onClick={() => {
                        if (typeof document === 'undefined') return;
                        
                        const activeElement = document.activeElement;
                        if (activeElement instanceof HTMLTextAreaElement && activeElement.dataset.faqAnswer === 'true') {
                            const currentValue = activeElement.value || '';
                            const selectionStart = activeElement.selectionStart ?? currentValue.length;
                            const selectionEnd = activeElement.selectionEnd ?? selectionStart;
                            faqLinkTargetRef.current = activeElement;
                            faqSelectionRef.current = { start: selectionStart, end: selectionEnd };
                            setFaqLinkHasMatch(!!findMarkdownLinkRange(currentValue, selectionStart, selectionEnd));
                            setFaqLinkUrl('https://');
                            setFaqLinkOpen(true);
                            return;
                        }
                        
                        const selectedText = selectionRef.current.text || editor.getSelectedText();
                        if (!selectedText) {
                            if (typeof window !== 'undefined') {
                                window.alert('Select text before adding a link.');
                            }
                            return;
                        }
                        
                        const existingUrl = selectionRef.current.url || editor.getSelectedLinkUrl();
                        if (typeof window !== 'undefined') {
                            const url = window.prompt('Enter URL', existingUrl || 'https://');
                            if (!url) return;
                            editor.createLink(url, selectedText);
                            editor.focus();
                        }
                    }}
                    className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground"
                    title="Link"
                >
                    <LinkIcon className="size-4" />
                </button>
                <div className="w-px h-4 bg-border mx-1" />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground inline-flex items-center gap-1"
                            title="Insert block"
                        >
                            <Plus className="size-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Insert</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuItem className="" inset={undefined} onClick={() => insertBlock('customImage')}>
                            <ImageIcon className="size-4 mr-2" /> Image
                        </DropdownMenuItem>
                        <DropdownMenuItem className="" inset={undefined} onClick={() => insertBlock('video')}>
                            <Video className="size-4 mr-2" /> Video
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="" />
                        <DropdownMenuItem className="" inset={undefined} onClick={() => insertBlock('alert', { type: 'tip' })}>
                            <AlertTriangle className="size-4 mr-2 text-amber-500" /> Alert / Tip
                        </DropdownMenuItem>
                        <DropdownMenuItem className="" inset={undefined} onClick={() => insertBlock('faqSection')}>
                            <HelpCircle className="size-4 mr-2 text-blue-500" /> FAQ Section
                        </DropdownMenuItem>
                        <DropdownMenuItem className="" inset={undefined} onClick={() => insertBlock('recipeEmbed')}>
                            <Utensils className="size-4 mr-2 text-emerald-500" /> Embed Recipe
                        </DropdownMenuItem>
                        <DropdownMenuItem className="" inset={undefined} onClick={() => insertBlock('relatedContent')}>
                            <LayoutGrid className="size-4 mr-2 text-indigo-500" /> Related Content
                        </DropdownMenuItem>
                        <DropdownMenuItem className="" inset={undefined} onClick={() => insertBlock('beforeAfter')}>
                            <SplitSquareVertical className="size-4 mr-2" /> Before / After
                        </DropdownMenuItem>
                        <DropdownMenuItem className="" inset={undefined} onClick={() => insertBlock('simpleTable')}>
                            <Table className="size-4 mr-2" /> Table
                        </DropdownMenuItem>
                        <DropdownMenuItem className="" inset={undefined} onClick={() => insertBlock('divider')}>
                            <Minus className="size-4 mr-2" /> Divider
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {faqLinkOpen && (
                <div className="px-2 pb-2">
                    <div className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 shadow-sm">
                        <LinkIcon className="size-4 text-muted-foreground/60" />
                        <input
                            type="url"
                            value={faqLinkUrl}
                            onChange={(event) => setFaqLinkUrl(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    applyFaqLink();
                                }
                                if (event.key === 'Escape') {
                                    event.preventDefault();
                                    setFaqLinkOpen(false);
                                }
                            }}
                            className="flex-1 text-sm outline-none bg-transparent"
                            placeholder="https://"
                            autoFocus
                        />
                        <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => setFaqLinkOpen(false)}
                        >
                            Cancel
                        </button>
                        {faqLinkHasMatch && (
                            <button
                                type="button"
                                className="text-xs text-muted-foreground hover:text-foreground"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={removeFaqLink}
                            >
                                Remove
                            </button>
                        )}
                        <button
                            type="button"
                            className="rounded-sm px-2 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={applyFaqLink}
                        >
                            Apply
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditorToolbar;
