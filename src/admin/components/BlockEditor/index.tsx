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
import { useBlockEditorHydration } from './hooks/useBlockEditorHydration';
import { useBlockEditorInlineActions } from './hooks/useBlockEditorInlineActions';

// Hooks
import { useEditorStateManager } from './hooks/useEditorStateManager';
import { useBlockSelection } from './hooks/useBlockSelection';
import { useLinkToolbar } from './hooks/useLinkToolbar';
import { useInsertHandle } from './hooks/useInsertHandle';
import { useCanvasDragDrop } from './hooks/useCanvasDragDrop';
import { useBlockEditorStore } from './store/blockEditorStore';
import { useUIStore } from '../../store/useStore';
import type { BlockEditorProps } from './utils/types';

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
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  
  // --- Zustand Store Bindings ---
  const setEditor = useBlockEditorStore((state) => state.setEditor);
  const storeSetActiveBlock = useBlockEditorStore((state) => state.setActiveBlock);
  const theme = useUIStore((state) => state.theme);

  const handleSetActiveBlockId = useCallback((id: string | null) => {
    setActiveBlockId(id);
    storeSetActiveBlock(id);
  }, [storeSetActiveBlock]);

  const hydrationContext = useMemo(() => ({
    recipeJson,
    onRecipeChange,
    faqsJson,
    onFaqsChange,
    imagesData,
    onImagesChange,
    roundupJson,
  }), [recipeJson, onRecipeChange, faqsJson, onFaqsChange, imagesData, onImagesChange, roundupJson]);

  // --- Editor instance ---
  const initialContent = useMemo(() => contentJsonToBlocks(value, hydrationContext) as any, []);
  const editor = useCreateBlockNote({
    schema,
    initialContent,
    domAttributes: { editor: { class: 'min-h-[32rem] pb-[30vh]' } },
    uploadFile: async (file: File) => URL.createObjectURL(file),
  });

  const { viewReady, mountedEditor } = useBlockEditorHydration({
    editor,
    value,
    hydrationContext,
    lastEmittedValueRef,
    lastSerializedRef,
    activeBlockId,
    onEditorReady,
  });

  useEffect(() => {
    if (mountedEditor) {
      setEditor(mountedEditor);
    }
  }, [mountedEditor, setEditor]);

  const SlashMenuComponent = useMemo(
    () => (props: Record<string, unknown>) => <CustomSlashMenu {...props} editor={editor} />,
    [editor]
  );

  // --- State ---

  // --- Hooks ---
  const { structureItems, structureItemsRef } = useEditorStateManager({
    editor: mountedEditor, onChange, onStructureUpdate, onSelectedBlockChange,
    contentType, onRoundupChange, activeBlockId,
  });

  const { toolbarActionBlockIdRef } = useBlockSelection({
    editor: mountedEditor, wrapperRef, activeBlockId, setActiveBlockId: handleSetActiveBlockId,
    onSelectedBlockChange, forceSelectBlockId, onForceSelectHandled,
    moveActionBlockIdRef,
  });

  const { linkToolbar, setLinkToolbar, activeStyles, setActiveStyles } =
    useLinkToolbar({ editor: mountedEditor, wrapperRef, activeBlockId });

  const { insertHandle, setInsertHandle } =
    useInsertHandle({ editor: mountedEditor as any, wrapperRef, canvasRef });

  const { canvasSensors, handleCanvasDragStart, handleCanvasDragEnd, handleCanvasDragCancel } =
    useCanvasDragDrop({ editor: mountedEditor, structureItemsRef, setActiveBlockId: handleSetActiveBlockId });

  const relatedContext = useMemo(() => ({
    categorySlug: context?.categorySlug || null,
    tagSlugs: Array.isArray(context?.tagSlugs) ? context.tagSlugs : [],
    currentSlug: context?.currentSlug || null,
  }), [context]);

  // --- Render helpers ---
  // Called unconditionally (before the early return below) to satisfy the
  // Rules of Hooks — the callbacks guard against a missing editor themselves.
  const { applyLink, insertParagraphAtHandle } = useBlockEditorInlineActions({
    editor,
    linkToolbar,
    setLinkToolbar,
    insertHandle,
    setInsertHandle,
  });

  if (!editor) return null;

  return (
    <RelatedContentProvider value={relatedContext}>
      <BlockEditorSourceDataProvider value={hydrationContext}>
        <BlockSelectionProvider activeBlockId={activeBlockId} setActiveBlockId={handleSetActiveBlockId}>
        <div ref={wrapperRef} className={cn('block-editor-wrapper relative', isSidebarOpen && 'sidebar-open', className)}>
          <div className="block-editor-main flex min-h-0">
            <div ref={canvasRef} className="block-editor-canvas flex-1 min-h-0 relative">
              <DndContext sensors={canvasSensors} onDragStart={handleCanvasDragStart} onDragEnd={handleCanvasDragEnd} onDragCancel={handleCanvasDragCancel}>
                <BlockNoteViewWithPortal editor={editor as any} theme={theme} sideMenu={false} slashMenu={false} formattingToolbar={false} linkToolbar={false} placeholder={placeholder}>
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
                        <input id="inline-link-url" name="inline_link_url" type="url" value={linkToolbar.url} onChange={(e) => setLinkToolbar((prev) => ({ ...prev, url: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') { e.preventDefault(); setLinkToolbar((prev) => ({ ...prev, mode: 'buttons' })); } }} className="inline-link-input-field" placeholder="https://" autoFocus />
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
