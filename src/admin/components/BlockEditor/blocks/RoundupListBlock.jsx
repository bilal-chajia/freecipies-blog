import React, { createContext, useContext } from 'react';
import { createReactBlockSpec } from "@blocknote/react";
import RoundupBuilder from "../../RoundupBuilder";

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
            const { roundup, setRoundup } = useRoundupData();

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
                <div className="wp-roundup-list-block my-4">
                    <RoundupBuilder
                        value={roundup}
                        onChange={(newValue) => {
                            setRoundup(newValue);
                        }}
                    />
                </div>
            );
        }
    }
);
