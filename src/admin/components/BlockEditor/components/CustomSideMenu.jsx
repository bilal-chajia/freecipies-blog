import React from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { SideMenu, DragHandleButton, DragHandleMenu } from '@blocknote/react';

export default function CustomSideMenu(props) {
    const { editor, block } = props;

    return (
        <SideMenu {...props} dragHandleMenu={DragHandleMenu}>
            <div className="flex items-center -mr-2 bg-background/50 backdrop-blur-sm rounded-lg border border-border/40 shadow-sm p-0.5 animate-in fade-in slide-in-from-left-2">
                <button
                    type="button"
                    className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-primary"
                    onClick={() => {
                        editor.setTextCursorPosition(block, 'start');
                        editor.focus();
                        const sm = editor.getExtension('suggestionMenu');
                        if (sm) {
                            sm.openSuggestionMenu('/');
                        }
                    }}
                    title="Add Block"
                >
                    <Plus className="size-4" />
                </button>
                <DragHandleButton {...props}>
                    <div
                        className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground/70 cursor-grab active:cursor-grabbing"
                        title="Drag to move"
                    >
                        <GripVertical className="size-4" />
                    </div>
                </DragHandleButton>
            </div>
        </SideMenu>
    );
}
