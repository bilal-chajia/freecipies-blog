import React, { createContext, useContext } from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import { List } from 'lucide-react';
import RoundupBuilder from "../../RoundupBuilder";
import BlockWrapper from '../components/BlockWrapper';
import BlockToolbar from '../components/BlockToolbar';
import { useBlockSelection } from '../selection-context';

/**
 * Context to share roundup data between the BlockEditor and RoundupListBlock
 */
export const RoundupDataContext = createContext({
    roundup: null,
    setRoundup: () => { },
});

export const useRoundupData = () => useContext(RoundupDataContext);

/**
 * RoundupListBlock
 * 
 * A BlockNote custom block that renders the RoundupBuilder.
 * It uses the RoundupDataContext to sync data with the parent editor.
 */
export const RoundupListBlock = createReactBlockSpec(
    {
        type: "roundupList",
        propSchema: {},
        content: "none",
    },
    {
        render: (props) => {
            const { block, editor } = props;
            const { roundup, setRoundup } = useRoundupData();
            const { isSelected, selectBlock } = useBlockSelection(block.id);

            const moveBlockUp = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksUp();
                editor.focus();
            };

            const moveBlockDown = () => {
                editor.setTextCursorPosition(block.id, 'start');
                editor.moveBlocksDown();
                editor.focus();
            };

            const sideMenu = editor.extensions?.sideMenu;
            const handleDragStart = (event) => {
                sideMenu?.blockDragStart?.(event, block);
            };
            const handleDragEnd = () => {
                sideMenu?.blockDragEnd?.();
            };

            const toolbar = (
                <BlockToolbar
                    blockIcon={List}
                    blockLabel="Roundup"
                    onMoveUp={moveBlockUp}
                    onMoveDown={moveBlockDown}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    showMoreMenu={false}
                />
            );

            if (!roundup && !setRoundup) {
                return (
                    <div className="p-4 border border-dashed rounded-lg bg-muted/20 text-center">
                        <p className="text-sm text-muted-foreground">
                            Roundup data context not found.
                        </p>
                    </div>
                );
            }

            return (
                <BlockWrapper
                    isSelected={isSelected}
                    toolbar={toolbar}
                    onClick={selectBlock}
                    onFocus={selectBlock}
                    onPointerDownCapture={selectBlock}
                    blockType="roundup-list"
                    blockId={block.id}
                    className="my-4"
                >
                    <div className="wp-roundup-list-block">
                        <RoundupBuilder
                            value={roundup}
                            onChange={(newValue) => {
                                setRoundup(newValue);
                            }}
                        />
                    </div>
                </BlockWrapper>
            );
        }
    }
);
