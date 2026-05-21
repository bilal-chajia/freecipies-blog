/**
 * BlockEditor Component — Composition Shell
 *
 * A visual block-based editor for article content.
 * Built on BlockNote for React with custom blocks.
 *
 * Logic is delegated to hooks:
 * - useEditorStateManager: content change + structure + serialization
 * - useBlockSelection: active block tracking + DOM selection sync
 * - useLinkToolbar: floating inline toolbar for text selection
 * - useInsertHandle: + button between blocks
 * - useCanvasDragDrop: DnD canvas-level block reordering
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlockNoteViewWithPortal } from './BlockNoteViewWithPortal';
import { DndContext } from '@dnd-kit/core';
import {
  useCreateBlockNote,
  SuggestionMenuController,
  SideMenuController
} from '@blocknote/react';
import { schema } from './schema';
import { getCustomSlashMenuItems } from './useSlashMenu';
import '@blocknote/mantine/style.css';
import './styles/block-editor-core.css';
import { cn } from '@/lib/utils';
import { Plus, Bold, Italic, Link as LinkIcon, Check, X } from 'lucide-react';
import { RelatedContentProvider } from './related-content-context';
import { BlockSelectionProvider } from './selection-context';
import { BlockEditorSourceDataProvider } from './source-data-context';
import { contentJsonToBlocks, blocksToContentJson } from './utils/conversion';
import { getEditorDomElement } from './utils/editorView';
import CustomSlashMenu from './components/CustomSlashMenu';
import CustomSideMenu from './components/CustomSideMenu';

// Hooks
import { useEditorStateManager } from './hooks/useEditorStateManager';
import { useBlockSelection } from './hooks/useBlockSelection';
import { useLinkToolbar } from './hooks/useLinkToolbar';
import { useInsertHandle } from './hooks/useInsertHandle';
import { useCanvasDragDrop } from './hooks/useCanvasDragDrop';

import type { BlockEditorProps } from './utils/types';

const SOURCE_HYDRATED_EDITOR_TYPES = new Set([
  'customImage',
  'beforeAfter',
  'faqSection',
  'mainRecipe',
  'relatedContent',
  'simpleTable',
]);

export default function BlockEditor({
  value,
  onChange,
  recipeJson,
  onRecipeChange,
  faqsJson,
  onFaqsChange,
  imagesData,
  onImagesChange,
  roundupJson,
  contentType = 'article',
  isSidebarOpen = true,
  onStructureUpdate,
  onSelectedBlockChange,
  forceSelectBlockId,
  onForceSelectHandled,
  onRoundupChange,
  onEditorReady,
  placeholder = 'Start writing your article...',
  className = '',
  context,
}: BlockEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastEmittedValueRef = useRef('');
  const lastSerializedRef = useRef('');
  const moveActionBlockIdRef = useRef<string | null>(null);
  const [viewReady, setViewReady] = useState(false);
  const hydrationContext = useMemo(() => ({
    recipeJson,
    onRecipeChange,
    faqsJson,
    onFaqsChange,
    imagesData,
    onImagesChange,
    roundupJson,
  }), [recipeJson, onRecipeChange, faqsJson, onFaqsChange, imagesData, onImagesChange, roundupJson]);
  const sourceDataSignature = useMemo(
    () => JSON.stringify({
      recipeJson,
      faqsJson,
      imagesData,
      roundupJson,
    }),
    [recipeJson, faqsJson, imagesData, roundupJson]
  );

  // --- Editor instance ---
  const initialContent = useMemo(() => contentJsonToBlocks(value, hydrationContext) as any, []);
  const editor = useCreateBlockNote({
    schema,
    initialContent,
    domAttributes: { editor: { class: 'min-h-[32rem] pb-[30vh]' } },
    uploadFile: async (file: File) => URL.createObjectURL(file),
  });
  const mountedEditor = viewReady ? editor : null;

  const SlashMenuComponent = useMemo(
    () => (props: Record<string, unknown>) => <CustomSlashMenu {...props} editor={editor} />,
    [editor]
  );

  useEffect(() => {
    setViewReady(false);

    let frame = 0;
    let cancelled = false;

    const waitForView = () => {
      if (cancelled) return;
      if (getEditorDomElement(editor)) {
        setViewReady(true);
        return;
      }
      frame = requestAnimationFrame(waitForView);
    };

    frame = requestAnimationFrame(waitForView);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [editor]);

  useEffect(() => {
    if (mountedEditor && onEditorReady) onEditorReady(mountedEditor);
  }, [mountedEditor, onEditorReady]);

  // External value sync (echo-safe)
  useEffect(() => {
    async function updateContent() {
      if (!mountedEditor || !value) return;
      const sv = typeof value === 'string' ? value : JSON.stringify(value);
      if (sv === lastEmittedValueRef.current) return;
      const cur = mountedEditor.document;
      const isEmpty = cur.length === 0 || (cur.length === 1 && cur[0].type === 'paragraph' && (!cur[0].content || cur[0].content.length === 0));
      let pv: any = value;
      if (typeof value === 'string') { try { pv = JSON.parse(value); } catch { pv = null; } }
      const hasBlocks = Array.isArray(pv) ? pv.length > 0 : (pv as Record<string, any> | null)?.blocks?.length > 0;
      if (isEmpty && hasBlocks) {
        const nb = contentJsonToBlocks(value, hydrationContext) as any;
        if (nb && nb.length > 0) {
          lastEmittedValueRef.current = sv;
          lastSerializedRef.current = sv;
          await mountedEditor.replaceBlocks(mountedEditor.document, nb);
        }
      }
    }
    updateContent();
  }, [mountedEditor, value, hydrationContext]);

  useEffect(() => {
    if (!mountedEditor || !value) return;

    const hydratedBlocks = contentJsonToBlocks(value, hydrationContext) as any[] | undefined;
    if (!hydratedBlocks?.length) return;

    for (const hydratedBlock of hydratedBlocks) {
      if (!hydratedBlock?.id || !SOURCE_HYDRATED_EDITOR_TYPES.has(String(hydratedBlock.type))) {
        continue;
      }

      const currentBlock = mountedEditor.getBlock(hydratedBlock.id);
      if (!currentBlock || currentBlock.type !== hydratedBlock.type) {
        continue;
      }

      const currentProps = JSON.stringify(currentBlock.props || {});
      const nextProps = JSON.stringify(hydratedBlock.props || {});
      if (currentProps === nextProps) {
        continue;
      }

      try {
        mountedEditor.updateBlock(currentBlock, {
          type: hydratedBlock.type,
          props: {
            ...currentBlock.props,
            ...hydratedBlock.props,
          },
        });
      } catch {
        // The view can disappear during route changes; the next mount will hydrate from source data.
      }
    }
  }, [mountedEditor, value, hydrationContext, sourceDataSignature]);

  // --- State ---
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // --- Hooks ---
  const { structureItems, structureItemsRef } = useEditorStateManager({
    editor: mountedEditor as any, onChange, onStructureUpdate, onSelectedBlockChange,
    contentType, onRoundupChange, activeBlockId,
  });

  const { toolbarActionBlockIdRef } = useBlockSelection({
    editor: mountedEditor as any, wrapperRef, activeBlockId, setActiveBlockId,
    onSelectedBlockChange, forceSelectBlockId, onForceSelectHandled,
    moveActionBlockIdRef,
  });

  const { linkToolbar, setLinkToolbar, activeStyles, setActiveStyles } =
    useLinkToolbar({ editor: mountedEditor as any, wrapperRef, activeBlockId });

  const { insertHandle, setInsertHandle } =
    useInsertHandle({ editor: mountedEditor as any, wrapperRef, canvasRef });

  const { canvasSensors, handleCanvasDragStart, handleCanvasDragEnd, handleCanvasDragCancel } =
    useCanvasDragDrop({ editor: mountedEditor as any, structureItemsRef, setActiveBlockId });

  const relatedContext = useMemo(() => ({
    categorySlug: context?.categorySlug || null,
    tagSlugs: Array.isArray(context?.tagSlugs) ? context.tagSlugs : [],
    currentSlug: context?.currentSlug || null,
  }), [context]);

  if (!editor) return null;

  // --- Render helpers ---
  const applyLink = () => {
    const selectedText = linkToolbar.text || editor.getSelectedText();
    if (!selectedText || !linkToolbar.url) return;
    const sr = linkToolbar.selection;
    if (sr && (editor as Record<string, any>)._tiptapEditor?.commands?.setTextSelection) {
      (editor as Record<string, any>)._tiptapEditor.commands.setTextSelection(sr);
    }
    editor.createLink(linkToolbar.url, selectedText);
    editor.focus();
    setLinkToolbar((prev) => ({ ...prev, open: false, mode: 'buttons' }));
  };

  const insertParagraphAtHandle = () => {
    if (!insertHandle) return;
    let targetId = insertHandle.blockId;
    let placement = insertHandle.placement;
    const block = editor.getBlock(targetId) as Record<string, any> | undefined;
    if (block?.parentId) {
      let current = block;
      while (current.parentId) {
        const parent = editor.getBlock(current.parentId) as Record<string, any> | undefined;
        if (!parent) break;
        current = parent;
        targetId = current.id;
      }
      placement = 'after';
    }
    const inserted = editor.insertBlocks([{ type: 'paragraph' }], targetId, placement);
    if (inserted?.[0]?.id) {
      editor.setTextCursorPosition(inserted[0].id, 'start');
      editor.focus();
      const sm = editor.getExtension('suggestionMenu') as Record<string, any> | undefined;
      if (sm) sm.openSuggestionMenu('/');
    }
    setInsertHandle(null);
  };

  return (
    <RelatedContentProvider value={relatedContext}>
      <BlockEditorSourceDataProvider value={hydrationContext}>
        <BlockSelectionProvider activeBlockId={activeBlockId} setActiveBlockId={setActiveBlockId}>
        <div ref={wrapperRef} className={cn('block-editor-wrapper relative', isSidebarOpen && 'sidebar-open', className)}>
          <div className="block-editor-main flex min-h-0">
            <div ref={canvasRef} className="block-editor-canvas flex-1 min-h-0 relative">
              <DndContext sensors={canvasSensors} onDragStart={handleCanvasDragStart} onDragEnd={handleCanvasDragEnd} onDragCancel={handleCanvasDragCancel}>
                <BlockNoteViewWithPortal editor={editor as any} theme="light" sideMenu={false} slashMenu={false} formattingToolbar={false} linkToolbar={false} placeholder={placeholder}>
                  {viewReady && (
                    <>
                      <SuggestionMenuController
                        triggerCharacter="/"
                        getItems={async (query) => getCustomSlashMenuItems(editor as any, query, { contentType })}
                        suggestionMenuComponent={SlashMenuComponent}
                      />
                      <SideMenuController sideMenu={CustomSideMenu} />
                    </>
                  )}
                </BlockNoteViewWithPortal>
              </DndContext>

              {linkToolbar.open && (
                <div className="inline-link-toolbar" style={{ top: `${linkToolbar.top}px`, left: `${linkToolbar.left}px` }} onMouseDown={(e) => { if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); }}>
                  <div className="inline-link-toolbar-inner">
                    <button type="button" className={cn('inline-link-button', activeStyles?.bold && 'is-active')} onClick={() => { editor.toggleStyles({ bold: true }); editor.focus(); setActiveStyles((editor.getActiveStyles() || {}) as Record<string, boolean | string>); }} title="Bold"><Bold className="size-4" /></button>
                    <button type="button" className={cn('inline-link-button', activeStyles?.italic && 'is-active')} onClick={() => { editor.toggleStyles({ italic: true }); editor.focus(); setActiveStyles((editor.getActiveStyles() || {}) as Record<string, boolean | string>); }} title="Italic"><Italic className="size-4" /></button>
                    <button type="button" className={cn('inline-link-button', linkToolbar.mode === 'link' && 'is-active')} onClick={() => setLinkToolbar((prev) => ({ ...prev, mode: 'link', url: prev.url || 'https://' }))} title="Insert link"><LinkIcon className="size-4" /></button>
                    {linkToolbar.mode === 'link' && (
                      <div className="inline-link-input">
                        <input type="url" value={linkToolbar.url} onChange={(e) => setLinkToolbar((prev) => ({ ...prev, url: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') { e.preventDefault(); setLinkToolbar((prev) => ({ ...prev, mode: 'buttons' })); } }} className="inline-link-input-field" placeholder="https://" autoFocus />
                        <button type="button" className="inline-link-action" onClick={applyLink} title="Apply link"><Check className="size-4" /></button>
                        <button type="button" className="inline-link-action" onClick={() => setLinkToolbar((prev) => ({ ...prev, mode: 'buttons' }))} title="Cancel"><X className="size-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {insertHandle && (
                <div className="block-insert-handle" style={{ top: `${insertHandle.top}px`, left: `${insertHandle.left}px`, width: `${insertHandle.width}px` }}>
                  <div className="block-insert-line" />
                  <button type="button" className="block-insert-button" onClick={insertParagraphAtHandle} title="Add Block"><Plus className="size-4" /></button>
                </div>
              )}
            </div>
          </div>
        </div>
        </BlockSelectionProvider>
      </BlockEditorSourceDataProvider>
    </RelatedContentProvider>
  );
}

export { contentJsonToBlocks, blocksToContentJson };
