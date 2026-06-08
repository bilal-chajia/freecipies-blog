import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';

type BlockSelectionContextValue = {
    activeBlockId: string | null;
    setActiveBlockId: (id: string | null) => void;
};

const BlockSelectionContext = createContext<BlockSelectionContextValue>({
    activeBlockId: null,
    setActiveBlockId: () => { },
});

export function BlockSelectionProvider({ activeBlockId, setActiveBlockId, children }: BlockSelectionContextValue & {
    children: ReactNode;
}) {
    return (
        <BlockSelectionContext.Provider value={{ activeBlockId, setActiveBlockId }}>
            {children}
        </BlockSelectionContext.Provider>
    );
}

export function useBlockSelection(blockId: string | null | undefined) {
    const { activeBlockId, setActiveBlockId } = useContext(BlockSelectionContext);
    const isSelected = Boolean(blockId && activeBlockId === blockId);

    const selectBlock = useCallback(() => {
        if (blockId) {
            setActiveBlockId?.(blockId);
        }
    }, [blockId, setActiveBlockId]);

    return { activeBlockId, setActiveBlockId, isSelected, selectBlock };
}
