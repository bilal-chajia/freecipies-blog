import { useCallback } from 'react';
import type { AppEditor } from '../schema';
import { setEditorTextSelection } from '../utils/editorView';
import type { LinkToolbarState } from './useLinkToolbar';
import type { InsertHandleState } from './useInsertHandle';

type NestableBlock = { id: string; parent_id?: string | null };

interface InlineActionsOptions {
  editor: AppEditor | null;
  linkToolbar: LinkToolbarState;
  setLinkToolbar: React.Dispatch<React.SetStateAction<LinkToolbarState>>;
  insertHandle: InsertHandleState | null;
  setInsertHandle: React.Dispatch<React.SetStateAction<InsertHandleState | null>>;
}

export function useBlockEditorInlineActions({
  editor,
  linkToolbar,
  setLinkToolbar,
  insertHandle,
  setInsertHandle,
}: InlineActionsOptions) {
  const applyLink = useCallback(() => {
    if (!editor) return;
    const selectedText = linkToolbar.text || editor.getSelectedText();
    if (!selectedText || !linkToolbar.url) return;
    const selectionRange = linkToolbar.selection;
    if (selectionRange) {
      setEditorTextSelection(editor, selectionRange.from, selectionRange.to);
    }
    editor.createLink(linkToolbar.url, selectedText);
    editor.focus();
    setLinkToolbar((prev) => ({ ...prev, open: false, mode: 'buttons' }));
  }, [editor, linkToolbar, setLinkToolbar]);

  const insertParagraphAtHandle = useCallback(() => {
    if (!editor || !insertHandle) return;
    let targetId = insertHandle.blockId;
    let placement = insertHandle.placement;
    // BlockNote's Block type doesn't surface `parent_id`; narrow to the shape we read.
    const getNestable = (id: string): NestableBlock | undefined =>
      editor.getBlock(id) as NestableBlock | undefined;
    const block = getNestable(targetId);
    if (block?.parent_id) {
      let current: NestableBlock = block;
      while (current.parent_id) {
        const parent = getNestable(current.parent_id);
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
      const suggestionMenu = editor.getExtension('suggestionMenu') as unknown as
        | { openSuggestionMenu?: (trigger: string) => void }
        | undefined;
      suggestionMenu?.openSuggestionMenu?.('/');
    }
    setInsertHandle(null);
  }, [editor, insertHandle, setInsertHandle]);

  return { applyLink, insertParagraphAtHandle };
}
