import { create } from 'zustand';
import type { LucideIcon } from 'lucide-react';

export type StructureItem = {
  id: string;
  type: string;
  label?: string;
  icon?: LucideIcon;
  parentId?: string | null;
  level?: number;
  depth?: number;
};

export type SelectedBlock = {
  id?: string | null;
  type?: string;
};

interface BlockEditorState {
  editor: any | null; // BlockNote editor instance
  inserterOpen: boolean;
  sidebarOpen: boolean;
  sidebarTab: 'document' | 'block' | 'ai';
  activeBlockId: string | null;
  selectedBlock: SelectedBlock | null;
  structureItems: StructureItem[];
  blockErrors: Record<string, string[]>;
  isSaving: boolean;

  setEditor: (editor: any) => void;
  setInserterOpen: (open: boolean) => void;
  toggleInserter: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarTab: (tab: 'document' | 'block' | 'ai') => void;
  setActiveBlock: (blockId: string | null, blockType?: string) => void;
  updateStructure: (items: StructureItem[]) => void;
  setBlockError: (blockId: string, errors: string[]) => void;
  clearBlockError: (blockId: string) => void;
  setSavingStatus: (saving: boolean) => void;
}

export const useBlockEditorStore = create<BlockEditorState>((set) => ({
  editor: null,
  inserterOpen: false,
  sidebarOpen: true,
  sidebarTab: 'document',
  activeBlockId: null,
  selectedBlock: null,
  structureItems: [],
  blockErrors: {},
  isSaving: false,

  setEditor: (editor) => set({ editor }),
  setInserterOpen: (open) => set({ inserterOpen: open }),
  toggleInserter: () => set((state) => ({ inserterOpen: !state.inserterOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setActiveBlock: (blockId, blockType) => set((state) => {
    if (!blockId) {
      const activeElement = typeof document !== 'undefined' ? document.activeElement : null;
      if (activeElement && state.activeBlockId) {
        const activeBlockDom = document.querySelector(`[data-block="${state.activeBlockId}"]`);
        if (activeBlockDom && activeBlockDom.contains(activeElement)) {
          return {}; // Keep selection locked
        }
      }
      return { activeBlockId: null, selectedBlock: null };
    }
    const resolvedType = blockType || state.structureItems.find(item => item.id === blockId)?.type;
    return {
      activeBlockId: blockId,
      selectedBlock: { id: blockId, type: resolvedType },
      sidebarTab: state.sidebarTab === 'ai' ? 'ai' : 'block', // Preserve AI tab if already in AI mode
    };
  }),
  updateStructure: (items) => set({ structureItems: items }),
  setBlockError: (blockId, errors) => set((state) => ({
    blockErrors: { ...state.blockErrors, [blockId]: errors }
  })),
  clearBlockError: (blockId) => set((state) => {
    const nextErrors = { ...state.blockErrors };
    delete nextErrors[blockId];
    return { blockErrors: nextErrors };
  }),
  setSavingStatus: (saving) => set({ isSaving: saving }),
}));
