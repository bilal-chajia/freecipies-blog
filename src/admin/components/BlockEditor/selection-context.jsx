import { createContext, useContext } from 'react';

const BlockSelectionContext = createContext({
    activeBlockId: null,
    setActiveBlockId: () => { },
});

export function BlockSelectionProvider({ activeBlockId, setActiveBlockId, children }) {
    return (
        <BlockSelectionContext.Provider value={{ activeBlockId, setActiveBlockId }}>
            {children}
        </BlockSelectionContext.Provider>
    );
}

export function useBlockSelection(blockId) {
    const { activeBlockId, setActiveBlockId } = useContext(BlockSelectionContext);
    const isSelected = Boolean(blockId && activeBlockId === blockId);

    const selectBlock = () => {
        if (blockId) {
            setActiveBlockId?.(blockId);
        }
    };

    return { activeBlockId, setActiveBlockId, isSelected, selectBlock };
}
