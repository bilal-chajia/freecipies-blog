/**
 * BlockEditor Component
 * 
 * A visual block-based editor for article content.
 * Built on BlockNote for React with custom blocks.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockNoteViewWithPortal } from './BlockNoteViewWithPortal';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
    useCreateBlockNote,
} from '@blocknote/react';
import { schema } from './schema';
import '@blocknote/mantine/style.css';
import { cn } from '@/lib/utils';
import {
    Plus,
    Image as ImageIcon,
    Video,
    List,
    ListOrdered,
    Heading1,
    Heading2,
    Heading3,
    Heading4,
    Heading5,
    Heading6,
    Link as LinkIcon,
    Bold,
    Italic,
    Check,
    X,
    Pilcrow,
    Quote,
    ListTree,
    Minus,
    AlertTriangle,
    HelpCircle,
    Utensils,
    LayoutGrid,
    Table,
    FileText,
    SplitSquareVertical
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { RelatedContentProvider } from './related-content-context';
import { BlockSelectionProvider } from './selection-context';

// Utility imports
import { 
    MAX_STRUCTURE_LABEL, 
    CUSTOM_BLOCK_TYPES 
} from './utils/constants';
import {
    getInlineTextLength,
    truncateInlineContent,
    extractText,
    serializeInlineContent,
    parseInlineStyles,
    parseInlineMarkdown,
    findMarkdownLinkRange
} from './utils/inlineContent';
import {
    flattenBlocks,
    getBlockLabel,
    getBlockIcon,
    normalizeTipVariant,
    resolveCoverUrl,
    buildVideoUrl,
    truncateLabel
} from './utils/blockHelpers';
import {
    contentJsonToBlocks,
    blocksToContentJson
} from './utils/conversion';

import { RecipeDataContext } from './blocks/MainRecipeBlock';
import { RoundupDataContext } from './blocks/RoundupListBlock';
import { FAQDataContext } from './blocks/FAQSectionBlock';
// Custom slash menu items
const getCustomSlashMenuItems = (editor, options = {}) => {
    const {
        contentType = 'article',
        hasRecipeContext = false,
        hasRoundupContext = false,
    } = options;

    const safeInsert = (type, props = {}) => {
        const currentPos = editor.getTextCursorPosition();
        if (!currentPos) return;

        let targetId = currentPos.block.id;
        let placement = 'after';

        // Find root parent if nested, to ensure custom blocks are at root level
        let current = currentPos.block;
        while (current.parentId) {
            const parent = editor.getBlock(current.parentId);
            if (!parent) break;
            current = parent;
            targetId = current.id;
        }

        const inserted = editor.insertBlocks([{ type, props }], targetId, placement);
        if (inserted?.[0]?.id) {
            editor.setTextCursorPosition(inserted[0].id, 'start');
        }
        editor.focus();
    };

    const items = [
        {
            title: 'Alert Box',
            onItemClick: () =>
                safeInsert('alert', { type: 'warning' }),
            aliases: ['alert', 'tip', 'warning'],
            group: 'Food Blog',
            subtext: 'Insert a tip/warning box',
        },
        {
            title: 'Embed Recipe',
            onItemClick: () =>
                safeInsert('recipeEmbed'),
            aliases: ['recipe', 'embed', 'link'],
            group: 'Food Blog',
            subtext: 'Link to another recipe',
        },
        {
            title: 'Related Content',
            onItemClick: () =>
                safeInsert('relatedContent'),
            aliases: ['related', 'recommend'],
            group: 'Food Blog',
            subtext: 'Curate related recipes or articles',
        },
        {
            title: 'Before / After',
            onItemClick: () =>
                safeInsert('beforeAfter'),
            aliases: ['before', 'after', 'compare'],
            group: 'Food Blog',
            subtext: 'Compare two images',
        },
        {
            title: 'Table',
            onItemClick: () =>
                safeInsert('simpleTable'),
            aliases: ['table', 'grid', 'matrix'],
            group: 'Layout',
            subtext: 'Add a table',
        },
        {
            title: 'Divider',
            onItemClick: () =>
                safeInsert('divider'),
            aliases: ['divider', 'separator', 'line'],
            group: 'Layout',
            subtext: 'Add a horizontal divider',
        },
    ];

    if (contentType === 'recipe' && hasRecipeContext) {
        items.unshift({
            title: 'Recipe Details',
            onItemClick: () =>
                safeInsert('mainRecipe'),
            aliases: ['recipe', 'main', 'details'],
            group: 'Food Blog',
            subtext: 'The main recipe editor for this post',
        });
    }

    if (contentType === 'roundup' && hasRoundupContext) {
        items.unshift({
            title: 'Roundup List',
            onItemClick: () =>
                safeInsert('roundupList'),
            aliases: ['roundup', 'list', 'curated'],
            group: 'Food Blog',
            subtext: 'Manage the curated items list for this roundup',
        });
    }

    return [
        ...getDefaultReactSlashMenuItems(editor).filter((item) => item.title !== 'Table'),
        ...items,
    ];
};



/**
 * Editor Toolbar Component
 */
const EditorToolbar = ({ editor, structureOpen, onToggleStructurePanel }) => {
    if (!editor) return null;

    const selectionRef = useRef({ text: '', url: '' });
    const faqLinkTargetRef = useRef(null);
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

    const insertBlock = (type, props = {}) => {
        const currentPos = editor.getTextCursorPosition();
        if (!currentPos) return;

        let targetId = currentPos.block.id;
        let placement = 'after';

        // Find root parent if nested, to ensure custom blocks are at root level
        if (CUSTOM_BLOCK_TYPES.has(type)) {
            let current = currentPos.block;
            while (current.parentId) {
                const parent = editor.getBlock(current.parentId);
                if (!parent) break;
                current = parent;
                targetId = current.id;
            }
        }

        const inserted = editor.insertBlocks([{ type, props }], targetId, placement);
        if (inserted?.[0]?.id) {
            editor.setTextCursorPosition(inserted[0].id, 'start');
        }
        editor.focus();
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
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
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
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        requestAnimationFrame(() => {
            const caretPos = match.start + match.label.length;
            textarea.focus();
            textarea.setSelectionRange(caretPos, caretPos);
        });
        setFaqLinkOpen(false);
    };

    return (
        <div className="border-b bg-muted">
            <div className="flex items-center gap-1 p-2 flex-wrap">
                <button
                    type="button"
                    onClick={onToggleStructurePanel}
                    className={`p-1.5 hover:bg-muted/80 rounded-sm ${structureOpen ? 'bg-muted/80 text-foreground' : 'text-muted-foreground'}`}
                    title="List View / Outline"
                >
                    <ListTree className="size-4" />
                </button>
                <button onClick={() => insertBlock('heading', { level: 2 })} className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground" title="Heading 2"><Heading2 className="size-4" /></button>
                <button onClick={() => insertBlock('heading', { level: 3 })} className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground" title="Heading 3"><Heading3 className="size-4" /></button>
                <div className="w-px h-4 bg-border mx-1" />
                <button onClick={() => insertBlock('bulletListItem')} className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground" title="Bullet List"><List className="size-4" /></button>
                <button onClick={() => insertBlock('numberedListItem')} className="p-1.5 hover:bg-muted/80 rounded-sm text-muted-foreground" title="Numbered List"><ListOrdered className="size-4" /></button>
                <button
                    type="button"
                    onMouseDown={(event) => {
                        event.preventDefault();
                    }}
                    onClick={() => {
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
                            window.alert('Select text before adding a link.');
                            return;
                        }
                        const existingUrl = selectionRef.current.url || editor.getSelectedLinkUrl();
                        const url = window.prompt('Enter URL', existingUrl || 'https://');
                        if (!url) return;
                        editor.createLink(url, selectedText);
                        editor.focus();
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
                            <span className="text-xs font-medium">Insert</span>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-52">
                        <DropdownMenuItem onClick={() => insertBlock('customImage')}>
                            <ImageIcon className="size-4 mr-2" /> Image
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('video')}>
                            <Video className="size-4 mr-2" /> Video
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => insertBlock('alert', { type: 'tip' })}>
                            <AlertTriangle className="size-4 mr-2 text-warning" /> Alert / Tip
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('faqSection')}>
                            <HelpCircle className="size-4 mr-2 text-primary" /> FAQ Section
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('recipeEmbed')}>
                            <Utensils className="size-4 mr-2 text-success" /> Embed Recipe
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('relatedContent')}>
                            <LayoutGrid className="size-4 mr-2 text-accent" /> Related Content
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('beforeAfter')}>
                            <SplitSquareVertical className="size-4 mr-2" /> Before / After
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('simpleTable')}>
                            <Table className="size-4 mr-2" /> Table
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => insertBlock('divider')}>
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
                            className="flex-1 text-sm outline-none"
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
                            className="rounded-sm px-2 py-1 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90"
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



/**
 * BlockEditor Component
 */
export default function BlockEditor({
    value,
    onChange,
    contentType = 'article',
    isSidebarOpen = true,
    onStructureUpdate,
    onSelectedBlockChange,
    recipe,
    onRecipeChange,
    roundup,
    onRoundupChange,
    faqs,
    onFaqsChange,
    faqTitle,
    onFaqTitleChange,
    onEditorReady,
    placeholder = 'Start writing your article...',
    className = '',
    context,
}) {
    const wrapperRef = useRef(null);
    const canvasRef = useRef(null);
    const onChangeRef = useRef(onChange);
    const lastSerializedRef = useRef('');
    const lastPointerBlockIdRef = useRef(null);

    // Initial content setup
    const initialContent = useMemo(() => {
        return contentJsonToBlocks(value);
    }, []); // Only run once on mount

    // Create editor instance
    const editor = useCreateBlockNote({
        schema,
        initialContent,
        domAttributes: {
            editor: {
                class: 'min-h-[32rem] pb-[30vh]',
            },
        },
        uploadFile: async (file) => {
            // TODO: Implement file upload
            return URL.createObjectURL(file);
        },
    });

    // Expose editor instance
    useEffect(() => {
        if (editor && onEditorReady) {
            onEditorReady(editor);
        }
    }, [editor, onEditorReady]);

    // Update content when value changes (for initial load)
    useEffect(() => {
        if (!editor || !value) return;

        // If editor is empty or we want to force update
        // We need to check if the content is actually different to avoid loops
        // For now, we'll trust that the parent component only passes loaded content

        async function updateContent() {
            const currentBlocks = editor.document;
            // Only update if editor is effectively empty (just has one empty paragraph)
            const isEmpty = currentBlocks.length === 0 ||
                (currentBlocks.length === 1 &&
                    currentBlocks[0].type === 'paragraph' &&
                    (!currentBlocks[0].content || currentBlocks[0].content.length === 0));

            // Check if value has blocks (handle string, array, or object with .blocks)
            let parsedValue = value;
            if (typeof value === 'string') {
                try {
                    parsedValue = JSON.parse(value);
                } catch {
                    parsedValue = null;
                }
            }
            const hasBlocks = Array.isArray(parsedValue) ? parsedValue.length > 0 :
                (parsedValue?.blocks && Array.isArray(parsedValue.blocks) && parsedValue.blocks.length > 0);

            if (isEmpty && hasBlocks) {
                const newBlocks = contentJsonToBlocks(value);
                if (newBlocks && newBlocks.length > 0) {
                    await editor.replaceBlocks(editor.document, newBlocks);
                }
            }
        }

        updateContent();
    }, [editor, value]);

    const [structureItems, setStructureItems] = useState([]);
    const structureItemsRef = useRef(structureItems);
    const [activeBlockId, setActiveBlockId] = useState(null);
    const [insertHandle, setInsertHandle] = useState(null);
    const [insertMenuOpen, setInsertMenuOpen] = useState(false);
    const insertMenuOpenRef = useRef(false);
    const toolbarActionBlockIdRef = useRef(null);
    const moveActionBlockIdRef = useRef(null);
    const activeBlockIdRef = useRef(activeBlockId);
    const canvasDragPointerRef = useRef({ x: 0, y: 0 });
    const canvasDragPointerListenerRef = useRef(null);
    const [linkToolbar, setLinkToolbar] = useState({
        open: false,
        top: 0,
        left: 0,
        text: '',
        url: '',
        selection: null,
        mode: 'buttons',
    });
    const linkToolbarRef = useRef(linkToolbar);
    const [activeStyles, setActiveStyles] = useState({});

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        structureItemsRef.current = structureItems;
    }, [structureItems]);

    useEffect(() => {
        activeBlockIdRef.current = activeBlockId;
    }, [activeBlockId]);

    useEffect(() => {
        if (!editor) return;

        const handleChange = () => {
            const blocks = editor.document;
            const flatBlocks = flattenBlocks(blocks);
            const nextItems = flatBlocks.map(({ block, depth, parentId }) => ({
                id: block.id,
                type: block.type,
                depth,
                parentId,
                level: block.props?.level,
                label: getBlockLabel(block),
                icon: getBlockIcon(block),
            }));
            setStructureItems(nextItems);
            if (editor.domElement) {
                const blockIds = new Set(flatBlocks.map(({ block }) => block.id));
                const customIds = new Set(
                    flatBlocks
                        .filter(({ block }) => CUSTOM_BLOCK_TYPES.has(block.type))
                        .map(({ block }) => block.id)
                );

                editor.domElement.querySelectorAll('[data-id][data-block-root]').forEach((node) => {
                    node.removeAttribute('data-block-root');
                });
                editor.domElement.querySelectorAll('[data-id][data-custom-block]').forEach((node) => {
                    node.removeAttribute('data-custom-block');
                });

                const escapeSelector = (value) => {
                    try {
                        return CSS.escape(value);
                    } catch {
                        return value.replace(/["\\]/g, '\\$&');
                    }
                };

                const nodesById = new Map();
                editor.domElement.querySelectorAll('[data-id]').forEach((node) => {
                    const id = node.getAttribute('data-id');
                    if (!id || !blockIds.has(id)) return;
                    if (!nodesById.has(id)) nodesById.set(id, []);
                    nodesById.get(id).push(node);
                });

                nodesById.forEach((nodes, id) => {
                    const selector = `[data-id="${escapeSelector(id)}"]`;
                    const rootNode = nodes.find((node) => !node.parentElement?.closest(selector)) || nodes[0];
                    if (!rootNode) return;
                    rootNode.setAttribute('data-block-root', 'true');
                    if (customIds.has(id)) {
                        rootNode.setAttribute('data-custom-block', 'true');
                    }
                });
            }
            if (onSelectedBlockChange && activeBlockId) {
                const activeBlock = flatBlocks.find(({ block }) => block.id === activeBlockId)?.block || null;
                onSelectedBlockChange(activeBlock);
            }
            if (onChangeRef.current) {
                const contentJson = blocksToContentJson(blocks);
                const serialized = JSON.stringify(contentJson, null, 2);
                if (serialized !== lastSerializedRef.current) {
                    lastSerializedRef.current = serialized;
                    onChangeRef.current(serialized);
                }
            }
        };

        handleChange();
        const unsubscribe = editor.onEditorContentChange(handleChange);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor]);

    // Keep activeBlockIdRef in sync with activeBlockId
    useEffect(() => {
        activeBlockIdRef.current = activeBlockId;
    }, [activeBlockId]);

    useEffect(() => {
        if (!editor) return undefined;
        const getBlockIdFromDom = () => {
            const selection = window.getSelection();
            if (!selection || !selection.anchorNode) return null;
            const anchorNode = selection.anchorNode.nodeType === Node.ELEMENT_NODE
                ? selection.anchorNode
                : selection.anchorNode.parentElement;
            if (!(anchorNode instanceof HTMLElement)) return null;
            const wrapper = anchorNode.closest('[data-block]');
            return wrapper?.getAttribute('data-block') || null;
        };
        const handleSelection = () => {
            if (moveActionBlockIdRef.current) {
                const moveId = moveActionBlockIdRef.current;
                moveActionBlockIdRef.current = null;
                const moveBlock = editor.getBlock(moveId) || null;
                if (moveBlock) {
                    setActiveBlockId(moveId);
                    onSelectedBlockChange?.(moveBlock);
                    requestAnimationFrame(() => {
                        try {
                            editor.setTextCursorPosition(moveId, 'start');
                        } catch {
                            // Ignore selection errors during block move.
                        }
                    });
                    return;
                }
            }
            if (toolbarActionBlockIdRef.current) {
                const toolbarId = toolbarActionBlockIdRef.current;
                const toolbarBlock = editor.getBlock(toolbarId) || null;
                if (toolbarBlock) {
                    setActiveBlockId(toolbarId);
                    onSelectedBlockChange?.(toolbarBlock);
                    toolbarActionBlockIdRef.current = null;
                    return;
                }
                toolbarActionBlockIdRef.current = null;
            }
            const activeElement = document.activeElement;
            const editorWrapper = wrapperRef.current;
            if (activeElement instanceof HTMLElement && editorWrapper) {
                // If focus is outside the editor canvas (sidebar, portals, toolbar, etc.)
                // we preserve the current block selection to prevent UI flickering/deselection.
                if (!editorWrapper.contains(activeElement)) {
                    const currentActiveId = activeBlockIdRef.current;
                    if (currentActiveId && editor.getBlock(currentActiveId)) {
                        return;
                    }
                }
            }
            const manualId = lastPointerBlockIdRef.current;
            if (manualId) {
                const manualBlock = editor.getBlock(manualId) || null;
                setActiveBlockId(manualId);
                onSelectedBlockChange?.(manualBlock);
                lastPointerBlockIdRef.current = null;
                return;
            }

            let block = null;
            try {
                block = editor.getTextCursorPosition().block;
            } catch {
                const domId = getBlockIdFromDom();
                if (domId) {
                    const domBlock = editor.getBlock(domId) || null;
                    setActiveBlockId(domId);
                    onSelectedBlockChange?.(domBlock);
                    lastPointerBlockIdRef.current = null;
                    return;
                }
            }

            setActiveBlockId(block?.id || null);
            onSelectedBlockChange?.(block || null);
            lastPointerBlockIdRef.current = null;
        };
        handleSelection();
        const unsubscribe = editor.onSelectionChange(handleSelection);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor, insertMenuOpen, onSelectedBlockChange]);

    useEffect(() => {
        const wrapper = wrapperRef.current;
        if (!wrapper) return undefined;

        const handlePointerDown = (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const moveButton = target.closest('button[aria-label="Move up"], button[aria-label="Move down"]');
            if (moveButton) {
                const blockRoot = moveButton.closest('[data-block]');
                const blockId = blockRoot?.getAttribute('data-block');
                if (blockId) {
                    moveActionBlockIdRef.current = blockId;
                }
                return;
            }
            if (target.closest('.wp-block-toolbar-wrap') || target.closest('.wp-block-toolbar')) {
                if (activeBlockId) {
                    toolbarActionBlockIdRef.current = activeBlockId;
                }
                return;
            }
            const customBlock = target.closest('.wp-block--custom');
            if (customBlock) {
                const blockId = customBlock.getAttribute('data-block');
                if (blockId) {
                    lastPointerBlockIdRef.current = blockId;
                    if (blockId !== activeBlockId) {
                        setActiveBlockId(blockId);
                        onSelectedBlockChange?.(editor?.getBlock(blockId) || null);
                    }
                    return;
                }
            }
            lastPointerBlockIdRef.current = null;
        };

        wrapper.addEventListener('pointerdown', handlePointerDown, true);
        return () => {
            wrapper.removeEventListener('pointerdown', handlePointerDown, true);
        };
    }, [activeBlockId, editor, onSelectedBlockChange]);

    useEffect(() => {
        if (!editor) return undefined;

        const handleSelection = () => {
            if (linkToolbarRef.current.mode === 'link') {
                return;
            }
            const text = editor.getSelectedText() || '';
            if (!text) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const anchorNode = selection.anchorNode;
            if (anchorNode && editor.domElement && !editor.domElement.contains(anchorNode)) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const range = selection.getRangeAt(0);
            if (range.collapsed) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const rect = range.getBoundingClientRect();
            if (!rect || (!rect.width && !rect.height)) {
                setLinkToolbar((prev) => (prev.open ? { ...prev, open: false, mode: 'buttons', selection: null } : prev));
                setActiveStyles({});
                return;
            }
            const wrapper = wrapperRef.current;
            if (!wrapper) return;
            const wrapperRect = wrapper.getBoundingClientRect();
            const left = rect.left - wrapperRect.left + rect.width / 2;
            const top = rect.top - wrapperRect.top - 10;
            const url = editor.getSelectedLinkUrl() || '';
            const selectionState = editor._tiptapEditor?.state?.selection;
            const selectionRange = selectionState ? { from: selectionState.from, to: selectionState.to } : null;
            setLinkToolbar({
                open: true,
                top,
                left,
                text,
                url,
                selection: selectionRange,
                mode: 'buttons',
            });
            setActiveStyles(editor.getActiveStyles() || {});
        };

        handleSelection();
        const unsubscribe = editor.onSelectionChange(handleSelection);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor, activeBlockId, onSelectedBlockChange]);

    useEffect(() => {
        onStructureUpdate?.({
            items: structureItems,
            activeBlockId,
        });
    }, [structureItems, activeBlockId, onStructureUpdate]);

    useEffect(() => {
        if (!onSelectedBlockChange) return;
        if (!editor || !activeBlockId) {
            onSelectedBlockChange(null);
            return;
        }
        const block = editor.getBlock(activeBlockId) || null;
        onSelectedBlockChange(block);
    }, [editor, activeBlockId, onSelectedBlockChange]);

    useEffect(() => {
        if (!editor?.domElement) return;
        const root = editor.domElement;
        const prevSelected = root.querySelector('[data-selected="true"]');
        if (prevSelected) {
            prevSelected.removeAttribute('data-selected');
        }
        if (activeBlockId) {
            const byRoot = root.querySelector(`[data-block-root="true"][data-id="${activeBlockId}"]`);
            const byId = root.querySelector(`[data-id="${activeBlockId}"]`);
            const bySelection = root.querySelector('.ProseMirror-selectednode')?.closest('[data-id]');
            const nextSelected = byRoot || byId || bySelection;
            if (nextSelected) {
                nextSelected.setAttribute('data-selected', 'true');
                if (!nextSelected.hasAttribute('data-block-root')) {
                    nextSelected.setAttribute('data-block-root', 'true');
                }
            }
        }
    }, [editor, activeBlockId]);

    useEffect(() => {
        if (!editor?.domElement) return;

        const handleLinkClick = (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            const link = target.closest('a');
            if (!link) return;
            if (!editor.domElement.contains(link)) return;
            event.preventDefault();
            event.stopPropagation();
        };

        document.addEventListener('click', handleLinkClick, true);
        document.addEventListener('pointerdown', handleLinkClick, true);

        return () => {
            document.removeEventListener('click', handleLinkClick, true);
            document.removeEventListener('pointerdown', handleLinkClick, true);
        };
    }, [editor]);

    useEffect(() => {
        if (!editor?.prosemirrorView || !wrapperRef.current) return;
        const root = editor.prosemirrorView?.dom || editor.domElement;
        const wrapper = wrapperRef.current;
        const canvas = canvasRef.current;

        let hideTimeout = null;

        const updateHandle = (event) => {
            if (insertMenuOpenRef.current) return;
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;

            // Keep the handle if we are hovering the button itself
            const isOverButton = !!target.closest('.block-insert-button');

            if (
                target.closest('.block-editor-structure-panel') ||
                target.closest('.bn-side-menu') ||
                target.closest('.bn-formatting-toolbar') ||
                target.closest('.bn-form-popover')
            ) {
                if (hideTimeout) clearTimeout(hideTimeout);
                setInsertHandle(null);
                return;
            }

            const isInsideEditor = (root instanceof HTMLElement && root.contains(target)) || wrapper.contains(target);
            if (!isInsideEditor && !isOverButton) {
                if (!hideTimeout) {
                    hideTimeout = setTimeout(() => {
                        setInsertHandle(null);
                        hideTimeout = null;
                    }, 400);
                }
                return;
            }

            const blockOuter = target.closest('[data-id]');
            let blockId = blockOuter?.getAttribute('data-id') || null;

            // Hide the plus button if we are inside a list item
            if (blockId) {
                const block = editor.getBlock(blockId);
                if (block && ['bulletListItem', 'numberedListItem', 'checkListItem'].includes(block.type)) {
                    setInsertHandle(null);
                    return;
                }
            }

            let rect = blockOuter instanceof HTMLElement ? blockOuter.getBoundingClientRect() : null;
            const edgeThreshold = 25; // Increased from 10 to make it easier to hit

            if (!blockId || !rect) {
                const view = editor.prosemirrorView;
                const coords = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                });
                if (!coords) {
                    if (!isOverButton && !hideTimeout) {
                        hideTimeout = setTimeout(() => {
                            setInsertHandle(null);
                            hideTimeout = null;
                        }, 400);
                    }
                    return;
                }
                const nearest = getNearestBlockPos(view.state.doc, coords.pos);
                if (!nearest) {
                    if (!isOverButton && !hideTimeout) {
                        hideTimeout = setTimeout(() => {
                            setInsertHandle(null);
                            hideTimeout = null;
                        }, 400);
                    }
                    return;
                }
                const info = getBlockInfo(nearest);
                blockId = info?.bnBlock?.node?.attrs?.id || null;
                
                // Hide if this block is also a list item
                if (blockId) {
                    const block = editor.getBlock(blockId);
                    if (block && ['bulletListItem', 'numberedListItem', 'checkListItem'].includes(block.type)) {
                        setInsertHandle(null);
                        return;
                    }
                }

                if (!blockId) {
                    if (!isOverButton && !hideTimeout) {
                        hideTimeout = setTimeout(() => {
                            setInsertHandle(null);
                            hideTimeout = null;
                        }, 400);
                    }
                    return;
                }
                let dom = view.nodeDOM(info.bnBlock.beforePos + 1) || view.nodeDOM(info.bnBlock.beforePos);
                if (!(dom instanceof HTMLElement)) {
                    const domAtPos = view.domAtPos(coords.pos).node;
                    dom = domAtPos instanceof HTMLElement ? domAtPos.closest('.bn-block-content') : null;
                }
                if (!(dom instanceof HTMLElement)) {
                    if (!isOverButton && !hideTimeout) {
                        hideTimeout = setTimeout(() => {
                            setInsertHandle(null);
                            hideTimeout = null;
                        }, 400);
                    }
                    return;
                }
                rect = dom.getBoundingClientRect();
            }

            const distanceTop = Math.abs(event.clientY - rect.top);
            const distanceBottom = Math.abs(rect.bottom - event.clientY);
            const isNearEdge = distanceTop <= edgeThreshold || distanceBottom <= edgeThreshold;

            if (!isNearEdge && !isOverButton) {
                if (!hideTimeout) {
                    hideTimeout = setTimeout(() => {
                        setInsertHandle(null);
                        hideTimeout = null;
                    }, 400);
                }
                return;
            }

            // If we are here, we are either near an edge or over the button
            if (hideTimeout) {
                clearTimeout(hideTimeout);
                hideTimeout = null;
            }

            // If over the button, we don't need to recalculate position, just keep the existing one
            if (isOverButton) return;

            const containerRect = (canvas || wrapper).getBoundingClientRect();
            let placement = distanceTop <= distanceBottom ? 'before' : 'after';
            let handleBlockId = blockId;
            let handleRect = rect;

            // Normalize: always prefer 'after' on the previous sibling so that
            // each inter-block gap only produces one insert handle.
            const allBlocks = editor.document;
            const flatIds = allBlocks.map((b) => b.id);
            const currentIndex = flatIds.indexOf(handleBlockId);

            let topPosition = (placement === 'before' ? handleRect.top : handleRect.bottom);

            // Try to center between this block and the next/previous one
            if (placement === 'after' && currentIndex < flatIds.length - 1) {
                const nextId = flatIds[currentIndex + 1];
                const nextEl = root instanceof HTMLElement
                    ? root.querySelector(`[data-id="${CSS.escape(nextId)}"]`)
                    : null;
                if (nextEl instanceof HTMLElement) {
                    const nextRect = nextEl.getBoundingClientRect();
                    // Center between current block bottom and next block top
                    topPosition = (handleRect.bottom + nextRect.top) / 2;
                }
            } else if (placement === 'before' && currentIndex > 0) {
                const prevId = flatIds[currentIndex - 1];
                const prevEl = root instanceof HTMLElement
                    ? root.querySelector(`[data-id="${CSS.escape(prevId)}"]`)
                    : null;
                if (prevEl instanceof HTMLElement) {
                    const prevRect = prevEl.getBoundingClientRect();
                    // Center between prev block bottom and current block top
                    topPosition = (prevRect.bottom + handleRect.top) / 2;
                }
            }

            const top = topPosition - containerRect.top;
            const left = handleRect.left - containerRect.left;
            const width = handleRect.width;
            setInsertHandle({
                blockId: handleBlockId,
                placement,
                top,
                left,
                width,
            });
        };

        const clearHandle = () => {
            if (!insertMenuOpenRef.current) {
                setInsertHandle(null);
            }
        };

        wrapper.addEventListener('mousemove', updateHandle);
        wrapper.addEventListener('pointermove', updateHandle);
        wrapper.addEventListener('mouseleave', clearHandle);
        wrapper.addEventListener('pointerleave', clearHandle);
        wrapper.addEventListener('scroll', clearHandle);

        return () => {
            if (hideTimeout) clearTimeout(hideTimeout);
            wrapper.removeEventListener('mousemove', updateHandle);
            wrapper.removeEventListener('pointermove', updateHandle);
            wrapper.removeEventListener('mouseleave', clearHandle);
            wrapper.removeEventListener('pointerleave', clearHandle);
            wrapper.removeEventListener('scroll', clearHandle);
        };
    }, [editor]);

    if (!editor) return null;

    const relatedContext = {
        categorySlug: context?.categorySlug || null,
        tagSlugs: Array.isArray(context?.tagSlugs) ? context.tagSlugs : [],
        currentSlug: context?.currentSlug || null,
    };

    const insertBlockAtHandle = (type, props = {}) => {
        if (!insertHandle) return;

        let targetId = insertHandle.blockId;
        let placement = insertHandle.placement;

        // Find root parent if nested, for custom blocks only
        if (CUSTOM_BLOCK_TYPES.has(type)) {
            const block = editor.getBlock(targetId);
            if (block && block.parentId) {
                let current = block;
                while (current.parentId) {
                    const parent = editor.getBlock(current.parentId);
                    if (!parent) break;
                    current = parent;
                    targetId = current.id;
                }
                // When we jump to the root after being nested, 
                // we should always use 'after' to insert it after the whole nested structure.
                placement = 'after';
            }
        }

        const inserted = editor.insertBlocks(
            [{ type, props }],
            targetId,
            placement,
        );
        if (inserted?.[0]?.id) {
            editor.setTextCursorPosition(inserted[0].id, 'start');
        }
        editor.focus();
        setInsertMenuOpen(false);
        setInsertHandle(null);
    };

    const canvasSensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        })
    );

    const updateCanvasDragPointer = useCallback((event) => {
        if (!event) return;
        if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
            canvasDragPointerRef.current = { x: event.clientX, y: event.clientY };
            return;
        }
        const touches = event.touches || event.changedTouches;
        if (touches && touches[0]) {
            canvasDragPointerRef.current = { x: touches[0].clientX, y: touches[0].clientY };
        }
    }, []);

    const startCanvasDragPointerTracking = useCallback((initialEvent) => {
        if (canvasDragPointerListenerRef.current) return;
        updateCanvasDragPointer(initialEvent);
        const handler = (event) => updateCanvasDragPointer(event);
        window.addEventListener('pointermove', handler, { capture: true });
        window.addEventListener('mousemove', handler, { capture: true });
        window.addEventListener('touchmove', handler, { capture: true, passive: true });
        canvasDragPointerListenerRef.current = handler;
    }, [updateCanvasDragPointer]);

    const stopCanvasDragPointerTracking = useCallback(() => {
        const handler = canvasDragPointerListenerRef.current;
        if (!handler) return;
        window.removeEventListener('pointermove', handler, { capture: true });
        window.removeEventListener('mousemove', handler, { capture: true });
        window.removeEventListener('touchmove', handler, { capture: true });
        canvasDragPointerListenerRef.current = null;
    }, []);

    useEffect(() => stopCanvasDragPointerTracking, [stopCanvasDragPointerTracking]);

    const reorderBlockRelativeToTarget = useCallback((draggedId, targetId, position) => {
        if (!editor || !draggedId || !targetId) return;
        if (draggedId === targetId) return;
        const items = structureItemsRef.current || [];
        const dragged = items.find((item) => item.id === draggedId);
        const target = items.find((item) => item.id === targetId);
        if (!dragged || !target) return;
        if (dragged.parentId !== target.parentId) return;

        const siblings = items
            .filter((item) => item.parentId === dragged.parentId)
            .map((item) => item.id);
        const fromIndex = siblings.indexOf(draggedId);
        const targetIndex = siblings.indexOf(targetId);
        if (fromIndex < 0 || targetIndex < 0) return;

        let desiredIndex = targetIndex + (position === 'after' ? 1 : 0);
        if (fromIndex < targetIndex) desiredIndex -= 1;
        desiredIndex = Math.max(0, Math.min(siblings.length - 1, desiredIndex));

        let steps = desiredIndex - fromIndex;
        editor.setTextCursorPosition(draggedId, 'start');
        while (steps < 0) {
            editor.moveBlocksUp();
            steps += 1;
        }
        while (steps > 0) {
            editor.moveBlocksDown();
            steps -= 1;
        }
        moveActionBlockIdRef.current = draggedId;
        setActiveBlockId(draggedId);
        editor.focus();
    }, [editor]);

    const getBlockFromPoint = useCallback((x, y) => {
        const root = editor?.domElement;
        if (!root) return null;
        const element = document.elementFromPoint(x, y);
        if (!(element instanceof HTMLElement)) return null;
        const candidate = element.closest('[data-id]');
        if (!(candidate instanceof HTMLElement)) return null;
        if (!root.contains(candidate)) return null;
        const id = candidate.getAttribute('data-id');
        if (!id) return null;
        return { id, element: candidate };
    }, [editor]);

    const handleCanvasDragStart = useCallback((event) => {
        startCanvasDragPointerTracking(event?.activatorEvent);
        const draggedId = event?.active?.id ? String(event.active.id) : null;
        if (draggedId) {
            setActiveBlockId(draggedId);
            toolbarActionBlockIdRef.current = draggedId;
        }
    }, [startCanvasDragPointerTracking]);

    const handleCanvasDragCancel = useCallback(() => {
        stopCanvasDragPointerTracking();
    }, [stopCanvasDragPointerTracking]);

    const handleCanvasDragEnd = useCallback((event) => {
        stopCanvasDragPointerTracking();
        const draggedId = event?.active?.id ? String(event.active.id) : null;
        if (!draggedId) return;
        const { x, y } = canvasDragPointerRef.current || {};
        if (typeof x !== 'number' || typeof y !== 'number') return;
        const target = getBlockFromPoint(x, y);
        const targetId = target?.id || null;
        if (!targetId || targetId === draggedId) return;
        const rect = target?.element?.getBoundingClientRect?.();
        const position = rect && rect.height ? (y < rect.top + rect.height / 2 ? 'before' : 'after') : 'after';
        reorderBlockRelativeToTarget(draggedId, targetId, position);
    }, [getBlockFromPoint, reorderBlockRelativeToTarget, stopCanvasDragPointerTracking]);

    useEffect(() => {
        if (!insertHandle) {
            setInsertMenuOpen(false);
        }
    }, [insertHandle]);

    useEffect(() => {
        insertMenuOpenRef.current = insertMenuOpen;
    }, [insertMenuOpen]);

    useEffect(() => {
        linkToolbarRef.current = linkToolbar;
    }, [linkToolbar]);

    return (
        <RelatedContentProvider value={relatedContext}>
            <BlockSelectionProvider activeBlockId={activeBlockId} setActiveBlockId={setActiveBlockId}>
                <RecipeDataContext.Provider value={{ recipe, setRecipe: onRecipeChange }}>
                    <RoundupDataContext.Provider value={{ roundup, setRoundup: onRoundupChange }}>
                        <FAQDataContext.Provider value={{
                            faqs: (() => {
                                if (!faqs) return [];
                                if (Array.isArray(faqs)) return faqs;
                                try { return JSON.parse(faqs) || []; } catch { return []; }
                            })(),
                            setFaqs: (newFaqs) => {
                                if (onFaqsChange) {
                                    onFaqsChange(Array.isArray(newFaqs) ? newFaqs : []);
                                }
                            },
                            faqTitle: faqTitle || 'Frequently Asked Questions',
                            setFaqTitle: onFaqTitleChange || (() => { }),
                        }}>
                            <div
                                ref={wrapperRef}
                                className={cn(
                                    "block-editor-wrapper relative",
                                    isSidebarOpen && "sidebar-open",
                                    className
                                )}
                            >
                                <div className="block-editor-main flex min-h-0">
                                    <div ref={canvasRef} className="block-editor-canvas flex-1 min-h-0 relative">
                                        <DndContext
                                            sensors={canvasSensors}
                                            onDragStart={handleCanvasDragStart}
                                            onDragEnd={handleCanvasDragEnd}
                                            onDragCancel={handleCanvasDragCancel}
                                        >
                                            <BlockNoteViewWithPortal
                                                editor={editor}
                                                theme="light"
                                                sideMenu={false}
                                                slashMenu={false}
                                                formattingToolbar={false}
                                                linkToolbar={false}
                                            >
                                                <SuggestionMenuController
                                                    triggerCharacter="/"
                                                    getItems={async (query) => getCustomSlashMenuItems(editor, {
                                                        contentType,
                                                        hasRecipeContext: typeof onRecipeChange === 'function',
                                                        hasRoundupContext: typeof onRoundupChange === 'function',
                                                    }).filter(item => item.title.toLowerCase().includes(query.toLowerCase()))}
                                                />
                                            </BlockNoteViewWithPortal>
                                        </DndContext>
                                        {linkToolbar.open && (
                                            <div
                                                className="inline-link-toolbar"
                                                style={{
                                                    top: `${linkToolbar.top}px`,
                                                    left: `${linkToolbar.left}px`,
                                                }}
                                                onMouseDown={(event) => {
                                                    if (!(event.target instanceof HTMLInputElement)) {
                                                        event.preventDefault();
                                                    }
                                                }}
                                            >
                                                <div className="inline-link-toolbar-inner">
                                                    <button
                                                        type="button"
                                                        className={cn('inline-link-button', activeStyles?.bold && 'is-active')}
                                                        onClick={() => {
                                                            editor.toggleStyles({ bold: true });
                                                            editor.focus();
                                                            setActiveStyles(editor.getActiveStyles() || {});
                                                        }}
                                                        title="Bold"
                                                    >
                                                        <Bold className="size-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={cn('inline-link-button', activeStyles?.italic && 'is-active')}
                                                        onClick={() => {
                                                            editor.toggleStyles({ italic: true });
                                                            editor.focus();
                                                            setActiveStyles(editor.getActiveStyles() || {});
                                                        }}
                                                        title="Italic"
                                                    >
                                                        <Italic className="size-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={cn('inline-link-button', linkToolbar.mode === 'link' && 'is-active')}
                                                        onClick={() => {
                                                            setLinkToolbar((prev) => ({
                                                                ...prev,
                                                                mode: 'link',
                                                                url: prev.url || 'https://',
                                                            }));
                                                        }}
                                                        title="Insert link"
                                                    >
                                                        <LinkIcon className="size-4" />
                                                    </button>
                                                    {linkToolbar.mode === 'link' && (
                                                        <div className="inline-link-input">
                                                            <input
                                                                type="url"
                                                                value={linkToolbar.url}
                                                                onChange={(event) => {
                                                                    const value = event.target.value;
                                                                    setLinkToolbar((prev) => ({ ...prev, url: value }));
                                                                }}
                                                                onKeyDown={(event) => {
                                                                    if (event.key === 'Enter') {
                                                                        event.preventDefault();
                                                                        const selectedText = linkToolbar.text || editor.getSelectedText();
                                                                        if (!selectedText || !linkToolbar.url) return;
                                                                        const selectionRange = linkToolbar.selection;
                                                                        if (selectionRange && editor._tiptapEditor?.commands?.setTextSelection) {
                                                                            editor._tiptapEditor.commands.setTextSelection(selectionRange);
                                                                        }
                                                                        editor.createLink(linkToolbar.url, selectedText);
                                                                        editor.focus();
                                                                        setLinkToolbar((prev) => ({ ...prev, open: false, mode: 'buttons' }));
                                                                    }
                                                                    if (event.key === 'Escape') {
                                                                        event.preventDefault();
                                                                        setLinkToolbar((prev) => ({ ...prev, mode: 'buttons' }));
                                                                    }
                                                                }}
                                                                className="inline-link-input-field"
                                                                placeholder="https://"
                                                                autoFocus
                                                            />
                                                            <button
                                                                type="button"
                                                                className="inline-link-action"
                                                                onClick={() => {
                                                                    const selectedText = linkToolbar.text || editor.getSelectedText();
                                                                    if (!selectedText || !linkToolbar.url) return;
                                                                    const selectionRange = linkToolbar.selection;
                                                                    if (selectionRange && editor._tiptapEditor?.commands?.setTextSelection) {
                                                                        editor._tiptapEditor.commands.setTextSelection(selectionRange);
                                                                    }
                                                                    editor.createLink(linkToolbar.url, selectedText);
                                                                    editor.focus();
                                                                    setLinkToolbar((prev) => ({ ...prev, open: false, mode: 'buttons' }));
                                                                }}
                                                                title="Apply link"
                                                            >
                                                                <Check className="size-4" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="inline-link-action"
                                                                onClick={() => setLinkToolbar((prev) => ({ ...prev, mode: 'buttons' }))}
                                                                title="Cancel"
                                                            >
                                                                <X className="size-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {insertHandle && (
                                            <div
                                                className="block-insert-handle"
                                                style={{
                                                    top: `${insertHandle.top}px`,
                                                    left: `${insertHandle.left}px`,
                                                    width: `${insertHandle.width}px`,
                                                }}
                                            >
                                                <div className="block-insert-line" />
                                                <DropdownMenu
                                                    open={insertMenuOpen}
                                                    onOpenChange={(open) => {
                                                        insertMenuOpenRef.current = open;
                                                        setInsertMenuOpen(open);
                                                        if (!open) {
                                                            setInsertHandle(null);
                                                        }
                                                    }}
                                                >
                                                    <DropdownMenuTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="block-insert-button"
                                                            onMouseDown={(event) => {
                                                                event.preventDefault();
                                                                event.stopPropagation();
                                                                // Blur the editor to hide the text caret/cursor
                                                                const dom = editor?.prosemirrorView?.dom;
                                                                if (dom instanceof HTMLElement) {
                                                                    dom.blur();
                                                                }
                                                                insertMenuOpenRef.current = true;
                                                                setInsertMenuOpen(true);
                                                            }}
                                                            title="Insert block"
                                                        >
                                                            <Plus className="size-4" />
                                                        </button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="center" className="w-56">
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('paragraph')}>
                                                            <FileText className="size-4 mr-2" />
                                                            Paragraph
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 2 })}>
                                                            <Heading2 className="size-4 mr-2" />
                                                            Heading 2
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 3 })}>
                                                            <Heading3 className="size-4 mr-2" />
                                                            Heading 3
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 4 })}>
                                                            <Heading3 className="size-4 mr-2" />
                                                            Heading 4
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 5 })}>
                                                            <Heading3 className="size-4 mr-2" />
                                                            Heading 5
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('heading', { level: 6 })}>
                                                            <Heading3 className="size-4 mr-2" />
                                                            Heading 6
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('bulletListItem')}>
                                                            <List className="size-4 mr-2" />
                                                            Bulleted list
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('numberedListItem')}>
                                                            <ListOrdered className="size-4 mr-2" />
                                                            Numbered list
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('blockquote')}>
                                                            <Quote className="size-4 mr-2" />
                                                            Quote
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('customImage')}>
                                                            <ImageIcon className="size-4 mr-2" />
                                                            Image
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('video')}>
                                                            <Video className="size-4 mr-2" />
                                                            Video
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('beforeAfter')}>
                                                            <SplitSquareVertical className="size-4 mr-2" />
                                                            Before / After
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('alert', { type: 'tip' })}>
                                                            <AlertTriangle className="size-4 mr-2" />
                                                            Tip box
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('faqSection')}>
                                                            <HelpCircle className="size-4 mr-2" />
                                                            FAQ
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('simpleTable')}>
                                                            <Table className="size-4 mr-2" />
                                                            Table
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('divider')}>
                                                            <Minus className="size-4 mr-2" />
                                                            Divider
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        {contentType === 'recipe' && typeof onRecipeChange === 'function' && (
                                                            <DropdownMenuItem onClick={() => insertBlockAtHandle('mainRecipe')}>
                                                                <Utensils className="size-4 mr-2" />
                                                                Recipe details
                                                            </DropdownMenuItem>
                                                        )}
                                                        {contentType === 'roundup' && typeof onRoundupChange === 'function' && (
                                                            <DropdownMenuItem onClick={() => insertBlockAtHandle('roundupList')}>
                                                                <LayoutGrid className="size-4 mr-2" />
                                                                Roundup list
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('recipeEmbed')}>
                                                            <Utensils className="w-4 h-4 mr-2" />
                                                            Embed recipe
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => insertBlockAtHandle('relatedContent')}>
                                                            <LayoutGrid className="w-4 h-4 mr-2" />
                                                            Related content
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <style>{`
        .block-editor-wrapper {
          border: none;
          border-radius: 0;
          overflow: visible;
          min-height: 32rem;
          background: transparent;
          position: relative;
          display: flex;
          flex-direction: column;
          --gutter: 12px;
          --sidebar: 300px;
          --inserter: 220px;
        }

        .block-editor-main {
          display: flex;
          min-height: inherit;
          height: 100%;
          overflow: visible;
          position: relative;
        }

        .block-editor-canvas {
          position: relative;
          flex: 1;
          min-height: inherit;
          min-width: 0;
          overflow: visible;
        }

        .block-editor-wrapper .bn-container {
          min-height: inherit;
        }
        
        /* Remove default min-height from editor as wrapper handles it */
        .block-editor-wrapper .bn-editor {
          padding: 16px var(--gutter) 72px;
          min-height: 100%;
          height: auto;
          overflow-y: auto;
          overflow-x: visible;
          max-width: clamp(1000px, 98vw, 1500px);
          margin: 0 auto;
        }

        .block-editor-wrapper .bn-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .inline-link-toolbar {
          position: absolute;
          transform: translate(-50%, -100%);
          z-index: 30;
          pointer-events: auto;
        }

        .inline-link-toolbar-inner {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px;
          border-radius: 999px;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
        }

        .inline-link-button {
          align-items: center;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: hsl(var(--muted-foreground));
          display: inline-flex;
          height: 26px;
          justify-content: center;
          width: 26px;
        }

        .inline-link-button:hover,
        .inline-link-button.is-active {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }

        .inline-link-input {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding-left: 4px;
          border-left: 1px solid hsl(var(--border));
        }

        .inline-link-input-field {
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          height: 26px;
          padding: 0 8px;
          font-size: 12px;
          min-width: 160px;
        }

        .inline-link-action {
          align-items: center;
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          color: hsl(var(--muted-foreground));
          display: inline-flex;
          height: 26px;
          justify-content: center;
          width: 26px;
        }

        .inline-link-action:hover {
          background: hsl(var(--border));
        }

        .block-editor-canvas .bn-editor {
          overflow-y: auto;
        }

        .block-insert-handle {
          position: absolute;
          height: 0;
          pointer-events: auto;
          z-index: 25;
          /* Hide any text cursor that might persist when insertion UI is active */
          caret-color: transparent;
        }

        .block-insert-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          top: -1px;
          --block-insert-gap: 18px;
          background: linear-gradient(
            to right,
            var(--wp-block-border-selected) 0,
            var(--wp-block-border-selected) calc(50% - var(--block-insert-gap)),
            transparent calc(50% - var(--block-insert-gap)),
            transparent calc(50% + var(--block-insert-gap)),
            var(--wp-block-border-selected) calc(50% + var(--block-insert-gap)),
            var(--wp-block-border-selected) 100%
          );
          pointer-events: none;
          transform-origin: center;
          animation: blockInsertLine 640ms cubic-bezier(0.2, 0, 0, 1);
          will-change: transform, opacity;
          /* Ensure line stays below button visually */
          z-index: -1;
        }

        .block-insert-button {
          position: absolute;
          left: 50%;
          top: 0;
          transform: translate(-50%, -50%);
          width: 26px;
          height: 26px;
          border-radius: 999px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
          color: hsl(var(--muted-foreground));
          pointer-events: auto;
          animation: blockInsertPop 640ms cubic-bezier(0.2, 0, 0, 1);
          will-change: transform, opacity;
          /* Ensure button is above all other elements including cursors */
          z-index: 26;
          caret-color: transparent;
          cursor: pointer !important;
        }

        .block-insert-button:hover {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }

        @keyframes blockInsertPop {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.85);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes blockInsertLine {
          from {
            opacity: 0;
            transform: scaleX(0);
          }
          to {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .block-insert-line,
          .block-insert-button {
            animation: none;
          }
        }

        .block-editor-wrapper .bn-side-menu {
          display: flex;
          gap: 6px;
          align-items: center;
          padding: 2px;
          z-index: 30;
        }

        .block-editor-wrapper .bn-side-menu .bn-button {
          align-items: center;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 999px;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
          display: inline-flex;
          height: 28px;
          justify-content: center;
          width: 28px;
        }

        .block-editor-wrapper .bn-side-menu .bn-button:hover {
          background: hsl(var(--muted));
          border-color: hsl(var(--border));
        }

        .block-editor-wrapper .bn-side-menu [draggable="true"] {
          cursor: grab;
        }

        .block-editor-wrapper .bn-side-menu [draggable="true"]:active {
          cursor: grabbing;
        }

        .block-editor-wrapper .bn-formatting-toolbar {
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 999px;
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
          padding: 4px 6px;
          z-index: 40;
        }

        .block-editor-wrapper .bn-formatting-toolbar .bn-button {
          border-radius: 999px;
        }

        .block-editor-wrapper .bn-suggestion-menu,
        .block-editor-wrapper .bn-menu-dropdown {
          border-radius: var(--radius);
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.12);
        }

        .block-editor-wrapper .bn-suggestion-menu-item {
          border-radius: var(--radius);
        }

        .block-editor-wrapper .bn-suggestion-menu-label {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 10px;
        }

        .bn-form-popover {
          background-color: var(--bn-colors-menu-background, hsl(var(--background)));
          border: var(--bn-border, 1px solid hsl(var(--border)));
          border-radius: var(--bn-border-radius-medium, 8px);
          box-shadow: var(--bn-shadow-medium, 0 10px 25px rgba(0, 0, 0, 0.12));
          color: var(--bn-colors-menu-text, hsl(var(--foreground)));
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 180px;
          padding: 6px;
        }

        .bn-form-popover .bn-text-input {
          width: 300px;
          max-width: min(20rem, 75vw);
        }

        .bn-form-popover label {
          color: var(--bn-colors-menu-text, hsl(var(--muted-foreground)));
          font-size: 11px;
          margin-bottom: 2px;
        }

        .bn-form-popover input,
        .bn-form-popover textarea,
        .bn-form-popover select {
          background-color: var(--bn-colors-background, hsl(var(--background)));
          border: 1px solid var(--bn-border-color, hsl(var(--border)));
          border-radius: 6px;
          color: var(--bn-colors-menu-text, hsl(var(--foreground)));
          font-size: 12px;
          padding: 6px 36px 6px 28px;
          width: 100%;
        }

        .bn-form-popover input::placeholder,
        .bn-form-popover textarea::placeholder {
          color: var(--bn-colors-menu-text, hsl(var(--muted-foreground)));
        }

        .bn-form-popover svg {
          color: var(--bn-colors-menu-text, hsl(var(--muted-foreground)));
        }

        .bn-link-submit {
          align-items: center;
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          border-radius: 999px;
          color: hsl(var(--foreground));
          cursor: pointer;
          display: inline-flex;
          height: 20px;
          justify-content: center;
          padding: 0;
          width: 20px;
        }

        .bn-link-submit:hover {
          background: hsl(var(--accent));
        }

        .bn-link-submit-icon {
          height: 12px;
          width: 12px;
        }
      `}</style>
                            </div>
                        </FAQDataContext.Provider>
                    </RoundupDataContext.Provider>
                </RecipeDataContext.Provider>
            </BlockSelectionProvider>
        </RelatedContentProvider>
    );
}

export { contentJsonToBlocks, blocksToContentJson };
