import { useEffect, useMemo, useState } from 'react';
import { contentJsonToBlocks } from '@admin/components/BlockEditor/utils/conversion';
import { getEditorDomElement } from '@admin/components/BlockEditor/utils/editorView';
import type { BlockAdapterContext } from '../blocks/BlockAdapter';
import type { AppEditor } from '../schema';

export interface BlockEditorHydrationContext extends BlockAdapterContext {
  onRecipeChange?: (nextValue: string) => void;
  onFaqsChange?: (nextValue: string) => void;
  onImagesChange?: (nextValue: unknown) => void;
}

const SOURCE_HYDRATED_EDITOR_TYPES = new Set([
  'customImage',
  'beforeAfter',
  'faqSection',
  'mainRecipe',
  'relatedContent',
  'simpleTable',
]);

function escapeBlockIdSelector(blockId: string): string {
  return globalThis.CSS?.escape ? globalThis.CSS.escape(blockId) : blockId.replace(/["\\]/g, '\\$&');
}

export interface BlockEditorHydrationOptions {
  editor: AppEditor;
  value: unknown;
  hydrationContext: BlockEditorHydrationContext;
  lastEmittedValueRef: React.MutableRefObject<string>;
  lastSerializedRef: React.MutableRefObject<string>;
  activeBlockId: string | null;
  onEditorReady?: (editor: AppEditor) => void;
}

export function useBlockEditorHydration({
  editor,
  value,
  hydrationContext,
  lastEmittedValueRef,
  lastSerializedRef,
  activeBlockId,
  onEditorReady,
}: BlockEditorHydrationOptions) {
  const [viewReady, setViewReady] = useState(false);
  const mountedEditor = viewReady ? editor : null;

  // BlockNote hydration and synchronization is handled below.

  const sourceDataSignature = useMemo(
    () => JSON.stringify({
      recipe_json: hydrationContext.recipe_json,
      faqs_json: hydrationContext.faqs_json,
      imagesData: hydrationContext.imagesData,
      roundup_json: hydrationContext.roundup_json,
    }),
    [hydrationContext]
  );

  useEffect(() => {
    if (!editor) return undefined;
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

  useEffect(() => {
    async function updateContent() {
      if (!mountedEditor || !value) return;
      const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
      if (serializedValue === lastEmittedValueRef.current) return;
      const current = mountedEditor.document;
      const isEmpty =
        current.length === 0 ||
        (current.length === 1 &&
          current[0].type === 'paragraph' &&
          (!current[0].content || current[0].content.length === 0));
      let parsedValue: unknown = value;
      if (typeof value === 'string') {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = null;
        }
      }
      const hasBlocks = Array.isArray(parsedValue)
        ? parsedValue.length > 0
        : (parsedValue as Record<string, any> | null)?.blocks?.length > 0;
      if (isEmpty && hasBlocks) {
        const nextBlocks = contentJsonToBlocks(value, hydrationContext) as any;
        if (nextBlocks?.length) {
          lastEmittedValueRef.current = serializedValue;
          lastSerializedRef.current = serializedValue;
          await mountedEditor.replaceBlocks(mountedEditor.document, nextBlocks);
        }
      }
    }
    updateContent();
  }, [mountedEditor, value, hydrationContext, lastEmittedValueRef, lastSerializedRef]);

  useEffect(() => {
    if (!mountedEditor || !value) return;
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);
    if (serializedValue === lastEmittedValueRef.current) return;
    const hydratedBlocks = contentJsonToBlocks(value, hydrationContext) as any[] | undefined;
    if (!hydratedBlocks?.length) return;
    const editorRoot = getEditorDomElement(mountedEditor);
    const activeElement = document.activeElement;
    for (const hydratedBlock of hydratedBlocks) {
      if (!hydratedBlock?.id || !SOURCE_HYDRATED_EDITOR_TYPES.has(String(hydratedBlock.type))) continue;
      const currentBlock = mountedEditor.getBlock(hydratedBlock.id);
      if (!currentBlock || currentBlock.type !== hydratedBlock.type) continue;
      if (JSON.stringify(currentBlock.props || {}) === JSON.stringify(hydratedBlock.props || {})) continue;
      if (activeBlockId === hydratedBlock.id && editorRoot && activeElement instanceof HTMLElement) {
        const activeBlockElement = editorRoot.querySelector(
          `[data-block="${escapeBlockIdSelector(hydratedBlock.id)}"]`
        );
        if (activeBlockElement?.contains(activeElement)) continue;
      }
      try {
        mountedEditor.updateBlock(currentBlock, {
          type: hydratedBlock.type,
          props: { ...currentBlock.props, ...hydratedBlock.props },
        });
      } catch {
        // Next mount hydrates from source data.
      }
    }
  }, [mountedEditor, value, hydrationContext, sourceDataSignature, activeBlockId]);

  return { viewReady, mountedEditor };
}
