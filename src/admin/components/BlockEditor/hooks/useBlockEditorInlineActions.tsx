import { useCallback } from 'react';

interface InlineActionsOptions {
  editor: any;
  linkToolbar: any;
  setLinkToolbar: React.Dispatch<React.SetStateAction<any>>;
  insertHandle: any;
  setInsertHandle: React.Dispatch<React.SetStateAction<any>>;
}

export function useBlockEditorInlineActions({
  editor,
  linkToolbar,
  setLinkToolbar,
  insertHandle,
  setInsertHandle,
}: InlineActionsOptions) {
  const applyLink = useCallback(() => {
    const selectedText = linkToolbar.text || editor.getSelectedText();
    if (!selectedText || !linkToolbar.url) return;
    const selectionRange = linkToolbar.selection;
    if (selectionRange && editor?._tiptapEditor?.commands?.setTextSelection) {
      editor._tiptapEditor.commands.setTextSelection(selectionRange);
    }
    editor.createLink(linkToolbar.url, selectedText);
    editor.focus();
    setLinkToolbar((prev: any) => ({ ...prev, open: false, mode: 'buttons' }));
  }, [editor, linkToolbar, setLinkToolbar]);

  const insertParagraphAtHandle = useCallback(() => {
    if (!insertHandle) return;
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
      const suggestionMenu = editor.getExtension('suggestionMenu');
      if (suggestionMenu) suggestionMenu.openSuggestionMenu('/');
    }
    setInsertHandle(null);
  }, [editor, insertHandle, setInsertHandle]);

  return { applyLink, insertParagraphAtHandle };
}
