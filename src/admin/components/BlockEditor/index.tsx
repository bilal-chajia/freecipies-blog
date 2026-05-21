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
import { contentJsonToBlocks, blocksToContentJson } from './utils/conversion';
import CustomSlashMenu from './components/CustomSlashMenu';
import CustomSideMenu from './components/CustomSideMenu';

// Hooks
import { useEditorStateManager } from './hooks/useEditorStateManager';
import { useBlockSelection } from './hooks/useBlockSelection';
import { useLinkToolbar } from './hooks/useLinkToolbar';
import { useInsertHandle } from './hooks/useInsertHandle';
import { useCanvasDragDrop } from './hooks/useCanvasDragDrop';

import type { BlockEditorProps } from './utils/types';

export default function BlockEditor({
  value,
  onChange,
  contentType = 'article',
  isSidebarOpen = true,
  onStructureUpdate,
  onSelectedBlockChange,
  forceSelectBlockId,
  onForceSelectHandled,
  // RecipeDataContext eliminated (Phase 3.1): MainRecipeBlock uses recipeJson prop
  // RoundupDataContext eliminated (Phase 3.3): RoundupListBlock is self-contained
  // FAQDataContext eliminated (Phase 3.2): FAQSectionBlock uses itemsJson prop
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

  // --- Editor instance ---
  const initialContent = useMemo(() => contentJsonToBlocks(value), []);
  const editor = useCreateBlockNote({
    schema,
    initialContent,
    domAttributes: { editor: { class: 'min-h-[32rem] pb-[30vh]' } },
    uploadFile: async (file: File) => URL.createObjectURL(file),
  });

  const SlashMenuComponent = useMemo(
    () => (props: Record<string, unknown>) => <CustomSlashMenu {...props} editor={editor} />,
    [editor]
  );

  useEffect(() => { if (editor && onEditorReady) onEditorReady(editor); }, [editor, onEditorReady]);

  // External value sync (echo-safe)
  useEffect(() => {
    async function updateContent() {
      if (!editor || !value) return;
      const sv = typeof value === 'string' ? value : JSON.stringify(value);
      if (sv === lastEmittedValueRef.current) return;
      const cur = editor.document;
      const isEmpty = cur.length === 0 || (cur.length === 1 && cur[0].type === 'paragraph' && (!cur[0].content || cur[0].content.length === 0));
      let pv = value;
      if (typeof value === 'string') { try { pv = JSON.parse(value); } catch { pv = null; } }
      const hasBlocks = Array.isArray(pv) ? pv.length > 0 : pv?.blocks?.length > 0;
      if (isEmpty && hasBlocks) {
        const nb = contentJsonToBlocks(value);
        if (nb?.length > 0) {
          lastEmittedValueRef.current = sv;
          lastSerializedRef.current = sv;
          await editor.replaceBlocks(editor.document, nb);
        }
      }
    }
    updateContent();
  }, [editor, value]);

  // --- State ---
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);

  // --- Hooks ---
  const { structureItems, structureItemsRef } = useEditorStateManager({
    editor, onChange, onStructureUpdate, onSelectedBlockChange,
    contentType, onRoundupChange, activeBlockId,
  });

  const { toolbarActionBlockIdRef } = useBlockSelection({
    editor, wrapperRef, activeBlockId, setActiveBlockId,
    onSelectedBlockChange, forceSelectBlockId, onForceSelectHandled,
    moveActionBlockIdRef,
  });

  const { linkToolbar, setLinkToolbar, activeStyles, setActiveStyles } =
    useLinkToolbar({ editor, wrapperRef, activeBlockId });

  const { insertHandle, setInsertHandle } =
    useInsertHandle({ editor, wrapperRef, canvasRef });

  const { canvasSensors, handleCanvasDragStart, handleCanvasDragEnd, handleCanvasDragCancel } =
    useCanvasDragDrop({ editor, structureItemsRef, setActiveBlockId });

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
    if (sr && editor._tiptapEditor?.commands?.setTextSelection) editor._tiptapEditor.commands.setTextSelection(sr);
    editor.createLink(linkToolbar.url, selectedText);
    editor.focus();
    setLinkToolbar((prev) => ({ ...prev, open: false, mode: 'buttons' }));
  };

  const insertParagraphAtHandle = () => {
    let targetId = insertHandle.blockId;
    let placement = insertHandle.placement;
    const block = editor.getBlock(targetId);
    if (block?.parentId) {
      let current = block;
      while (current.parentId) {
        const parent = editor.getBlock(current.parentId);
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
      const sm = editor.getExtension('suggestionMenu');
      if (sm) sm.openSuggestionMenu('/');
    }
    setInsertHandle(null);
  };

  return (
    <RelatedContentProvider value={relatedContext}>
      <BlockSelectionProvider activeBlockId={activeBlockId} setActiveBlockId={setActiveBlockId}>
        <div ref={wrapperRef} className={cn('block-editor-wrapper relative', isSidebarOpen && 'sidebar-open', className)}>
          <div className="block-editor-main flex min-h-0">
            <div ref={canvasRef} className="block-editor-canvas flex-1 min-h-0 relative">
              <DndContext sensors={canvasSensors} onDragStart={handleCanvasDragStart} onDragEnd={handleCanvasDragEnd} onDragCancel={handleCanvasDragCancel}>
                <BlockNoteViewWithPortal editor={editor} theme="light" sideMenu={false} slashMenu={false} formattingToolbar={false} linkToolbar={false} placeholder={placeholder}>
                  <SuggestionMenuController
                    triggerCharacter="/"
                    getItems={async (query) => getCustomSlashMenuItems(editor, query, { contentType })}
                    suggestionMenuComponent={SlashMenuComponent}
                  />
                  <SideMenuController sideMenu={CustomSideMenu} />
                </BlockNoteViewWithPortal>
              </DndContext>

              {linkToolbar.open && (
                <div className="inline-link-toolbar" style={{ top: `${linkToolbar.top}px`, left: `${linkToolbar.left}px` }} onMouseDown={(e) => { if (!(e.target instanceof HTMLInputElement)) e.preventDefault(); }}>
                  <div className="inline-link-toolbar-inner">
                    <button type="button" className={cn('inline-link-button', activeStyles?.bold && 'is-active')} onClick={() => { editor.toggleStyles({ bold: true }); editor.focus(); setActiveStyles(editor.getActiveStyles() || {}); }} title="Bold"><Bold className="size-4" /></button>
                    <button type="button" className={cn('inline-link-button', activeStyles?.italic && 'is-active')} onClick={() => { editor.toggleStyles({ italic: true }); editor.focus(); setActiveStyles(editor.getActiveStyles() || {}); }} title="Italic"><Italic className="size-4" /></button>
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
    </RelatedContentProvider>
  );
}

export { contentJsonToBlocks, blocksToContentJson };
