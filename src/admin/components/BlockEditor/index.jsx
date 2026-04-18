/**
 * BlockEditor Component
 * 
 * A visual block-based editor for article content.
 * Built on BlockNote for React with custom blocks.
 */

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockNoteViewWithPortal } from './BlockNoteViewWithPortal';
import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';

import {
    useCreateBlockNote,
    SuggestionMenuController,
    SideMenuController
} from '@blocknote/react';
import { getBlockInfo, getNearestBlockPos } from '@blocknote/core';
import { schema } from './schema';
import { getCustomSlashMenuItems } from './useSlashMenu';
import '@blocknote/mantine/style.css';
import './styles/block-editor-core.css';
import { cn } from '@/lib/utils';
import {
    Plus,
    Bold,
    Italic,
    Link as LinkIcon,
    Check,
    X
} from 'lucide-react';
import { RelatedContentProvider } from './related-content-context';
import { BlockSelectionProvider } from './selection-context';

// Utility imports
import {
    CUSTOM_BLOCK_TYPES
} from './utils/constants';
import {
    flattenBlocks,
    groupConsecutiveBlocks,
    getBlockLabel,
    getBlockIcon
} from './utils/blockHelpers';
import {
    contentJsonToBlocks,
    blocksToContentJson
} from './utils/conversion';
import { parseJsonArray } from './utils/json';
import { safeInsertBlock } from './utils/insert-block';
import { moveBlockById } from './blocks/primitives';
import CustomSlashMenu from './components/CustomSlashMenu';
import CustomSideMenu from './components/CustomSideMenu';

import { RecipeDataContext } from './blocks/MainRecipeBlock';
import { FAQDataContext } from './blocks/FAQSectionBlock';
// RoundupDataContext: shares roundup data between BlockEditor and child blocks
const RoundupDataContext = createContext({
    roundup: null,
    setRoundup: () => { },
});

export default function BlockEditor({
    value,
    onChange,
    contentType = 'article',
    isSidebarOpen = true,
    onStructureUpdate,
    onSelectedBlockChange,
    forceSelectBlockId,
    onForceSelectHandled,
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
    const lastEmittedValueRef = useRef('');
    const lastRoundupRef = useRef('');
    const lastPointerBlockIdRef = useRef(null);
    const roundupSyncRef = useRef(false);

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

    // Memoized Slash Menu component to pass editor prop
    const SlashMenuComponent = useMemo(() => {
        return (props) => <CustomSlashMenu {...props} editor={editor} />;
    }, [editor]);

    // Expose editor instance
    useEffect(() => {
        if (editor && onEditorReady) {
            onEditorReady(editor);
        }
    }, [editor, onEditorReady]);

    // Update content when value changes (for initial load OR external updates)
    // CRITICAL FIX: To prevent infinite update loops, we ONLY replace blocks if:
    // 1. The editor is empty (initial load scenario)
    // 2. The incoming value is NOT a duplicate of what we just emitted (echo prevention)
    useEffect(() => {
        async function updateContent() {
            if (!editor || !value) return;

            // Check if this value is just an echo of what we recently emitted
            const stringifiedValue = typeof value === 'string' ? value : JSON.stringify(value);
            if (stringifiedValue === lastEmittedValueRef.current) {
                return;
            }

            const currentBlocks = editor.document;
            const isEmpty = currentBlocks.length === 0 ||
                (currentBlocks.length === 1 &&
                    currentBlocks[0].type === 'paragraph' &&
                    (!currentBlocks[0].content || currentBlocks[0].content.length === 0));

            // Parse incoming value for checking hasBlocks
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
                    lastEmittedValueRef.current = stringifiedValue;
                    lastSerializedRef.current = stringifiedValue;
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
            const groupedBlocks = groupConsecutiveBlocks(flatBlocks);
            const nextItems = groupedBlocks.map((item) => ({
                id: item.block.id,
                type: item.block.type,
                depth: item.depth,
                parentId: item.parentId,
                level: item.block.props?.level,
                label: getBlockLabel(item.block, item.itemCount),
                icon: getBlockIcon(item.block),
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
                if (serialized !== lastEmittedValueRef.current) {
                    lastEmittedValueRef.current = serialized;
                    lastSerializedRef.current = serialized;
                    onChangeRef.current(serialized);
                }
            }
        };

        handleChange();
        const unsubscribe = editor.onEditorContentChange(() => {
            handleChange();

            // Sync Engine: Extract Roundup Items
            if (contentType === 'roundup' && onRoundupChange) {
                const currentBlocks = editor.document;
                const flat = flattenBlocks(currentBlocks);
                const itemBlocks = flat
                    .filter(({ block }) => block.type === 'roundupItem')
                    .map(({ block }) => block);

                const roundupItems = itemBlocks.map((b, idx) => ({
                    position: idx + 1,
                    article_id: b.props.articleId,
                    external_url: b.props.externalUrl,
                    title: b.props.title,
                    subtitle: b.props.subtitle,
                    note: b.props.note,
                    cover: b.props.cover,
                }));

                const nextRoundup = JSON.stringify({
                    listType: 'ItemList',
                    items: roundupItems
                }, null, 2);

                // Avoid infinite loops by checking if changed
                if (nextRoundup !== lastRoundupRef.current) {
                    lastRoundupRef.current = nextRoundup;
                    onRoundupChange(nextRoundup);
                }
            }
        });
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
                    // Only set text cursor for non-custom blocks;
                    // custom blocks have content:'none' so setTextCursorPosition fails.
                    if (!CUSTOM_BLOCK_TYPES.has(moveBlock.type)) {
                        requestAnimationFrame(() => {
                            try {
                                editor.setTextCursorPosition(moveId, 'start');
                            } catch {
                                // Ignore selection errors during block move.
                            }
                        });
                    }
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
                        // Check if cursor was programmatically moved to a different block
                        // (e.g. via List View / Outline click)
                        let cursorBlock = null;
                        try { cursorBlock = editor.getTextCursorPosition().block; } catch { }
                        if (cursorBlock && cursorBlock.id !== currentActiveId) {
                            setActiveBlockId(cursorBlock.id);
                            onSelectedBlockChange?.(cursorBlock);
                        }
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

            const nextBlockId = block?.id || null;
            if (nextBlockId !== activeBlockId) {
                // If the selection changed, we only apply it if we're NOT in a forced selection
                // or if the new selection is valid (not null).
                // CRITICAL FIX: To prevent jumping back to the previous block when clicking in List View,
                // we check if forceSelectBlockId is active. If it is, and the cursor is still in 
                // a DIFFERENT block than the forced one, we ignore the natural selection change.
                if (forceSelectBlockId && nextBlockId && nextBlockId !== forceSelectBlockId) {
                    return;
                }

                setActiveBlockId(nextBlockId);
                onSelectedBlockChange?.(block || null);
            }
            lastPointerBlockIdRef.current = null;
        };
        
        // Immediate call to ensure initial selection is correct
        handleSelection();
        const unsubscribe = editor.onSelectionChange(handleSelection);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor, onSelectedBlockChange, activeBlockId, forceSelectBlockId]);

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
                        const block = editor?.getBlock(blockId);
                        setActiveBlockId(blockId);
                        if (block) {
                            onSelectedBlockChange?.(block);
                        }
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

    // Allow parent to programmatically select a block (e.g. from List View click on custom blocks)
    useEffect(() => {
        if (!forceSelectBlockId || !editor) return;
        if (forceSelectBlockId === activeBlockId) return;
        const block = editor.getBlock(forceSelectBlockId) || null;
        if (block) {
            setActiveBlockId(forceSelectBlockId);
            onSelectedBlockChange?.(block);
            
            // If it's not already focused or the cursor is elsewhere, try to move it
            // but ONLY if the editor is not already at that position.
            try {
                const currentPos = editor.getTextCursorPosition();
                if (currentPos?.block?.id !== forceSelectBlockId) {
                    editor.setTextCursorPosition(forceSelectBlockId, 'start');
                }
            } catch {
                // Ignore failures for blocks that don't support cursor
            }
            
            // Notify parent that the forced selection has been handled
            // so they can clear the forceSelectBlockId state.
            onForceSelectHandled?.();
        }
    }, [forceSelectBlockId, editor, activeBlockId, onSelectedBlockChange, onForceSelectHandled]);

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
            setInsertHandle(null);
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
        // Use moveBlockById for reliable block moves (works for custom blocks too)
        const direction = steps < 0 ? 'up' : 'down';
        const absSteps = Math.abs(steps);
        for (let i = 0; i < absSteps; i++) {
            moveBlockById(editor, draggedId, direction);
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
        linkToolbarRef.current = linkToolbar;
    }, [linkToolbar]);

    const faqItems = useMemo(() => parseJsonArray(faqs), [faqs]);
    const handleFaqsChange = useCallback((newFaqs) => {
        if (!onFaqsChange) return;
        onFaqsChange(Array.isArray(newFaqs) ? newFaqs : parseJsonArray(newFaqs));
    }, [onFaqsChange]);

    return (
        <RelatedContentProvider value={relatedContext}>
            <BlockSelectionProvider activeBlockId={activeBlockId} setActiveBlockId={setActiveBlockId}>
                <RecipeDataContext.Provider value={{ recipe, setRecipe: onRecipeChange || (() => { }) }}>
                    <RoundupDataContext.Provider value={{ roundup, setRoundup: onRoundupChange || (() => { }) }}>
                        <FAQDataContext.Provider value={{
                            faqs: faqItems,
                            setFaqs: handleFaqsChange,
                            faqTitle: faqTitle || 'Frequently Asked Questions',
                            setFaqTitle: onFaqTitleChange || (() => { }),
                            hasExternalFaqState:
                                faqs !== undefined ||
                                typeof onFaqsChange === 'function' ||
                                faqTitle !== undefined ||
                                typeof onFaqTitleChange === 'function',
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
                                    <div ref={canvasRef} className={cn(
                                        "block-editor-canvas flex-1 min-h-0 relative"
                                    )}>

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
                                                placeholder={placeholder}
                                            >
                                                <SuggestionMenuController
                                                    triggerCharacter="/"
                                                    getItems={async (query) =>
                                                        getCustomSlashMenuItems(
                                                            editor,
                                                            query,
                                                            {
                                                                contentType,
                                                                hasRecipeContext: contentType === 'recipe',
                                                                hasRoundupContext: contentType === 'roundup',
                                                            }
                                                        )
                                                    }
                                                    suggestionMenuComponent={SlashMenuComponent}
                                                />
                                                <SideMenuController sideMenu={CustomSideMenu} />
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
                                                <button
                                                    type="button"
                                                    className="block-insert-button"
                                                    onClick={() => {
                                                        // Insert a paragraph and open slash menu
                                                        let targetId = insertHandle.blockId;
                                                        let placement = insertHandle.placement;

                                                        // Logic to handle nested blocks (insert after the root parent)
                                                        const block = editor.getBlock(targetId);
                                                        if (block && block.parentId) {
                                                            let current = block;
                                                            while (current.parentId) {
                                                                const parent = editor.getBlock(current.parentId);
                                                                if (!parent) break;
                                                                current = parent;
                                                                targetId = current.id;
                                                            }
                                                            placement = 'after';
                                                        }

                                                        const inserted = editor.insertBlocks(
                                                            [{ type: 'paragraph' }],
                                                            targetId,
                                                            placement
                                                        );

                                                        if (inserted?.[0]?.id) {
                                                            editor.setTextCursorPosition(inserted[0].id, 'start');
                                                            editor.focus();
                                                            const sm = editor.getExtension("suggestionMenu");
                                                            if (sm) {
                                                                sm.openSuggestionMenu("/");
                                                            }
                                                        }

                                                        setInsertHandle(null);
                                                    }}
                                                    title="Add Block"
                                                >
                                                    <Plus className="size-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </FAQDataContext.Provider>
                    </RoundupDataContext.Provider>
                </RecipeDataContext.Provider>
            </BlockSelectionProvider>
        </RelatedContentProvider>
    );
}

export { contentJsonToBlocks, blocksToContentJson };

