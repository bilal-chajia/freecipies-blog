import { useEffect, useState } from 'react';
import { Settings, Type, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { SettingsSection } from './DocumentSettings';
import AlignmentPicker from './block-settings/AlignmentPicker';
import BlockSettingsRouter from './block-settings/BlockSettingsRouter';
import { SETTINGS_PANEL_TYPES } from './block-settings/panels';

export interface BlockSettingsProps {
    editor: any;
    selectedBlock: any;
    relatedContext: any;
    recipeData?: any;
    onRecipeChange?: (recipe: any) => void;
}

export default function BlockSettings({
    editor,
    selectedBlock: initialSelectedBlock,
    relatedContext,
    recipeData,
    onRecipeChange
}: BlockSettingsProps) {
    const [, setBlockVersion] = useState(0);

    useEffect(() => {
        if (!editor || !initialSelectedBlock?.id) return undefined;
        const handleChange = () => {
            setBlockVersion((prev) => prev + 1);
        };
        const unsubscribe = editor.onEditorContentChange(handleChange);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, [editor, initialSelectedBlock?.id]);

    const selectedBlock = initialSelectedBlock
        ? (editor?.getBlock(initialSelectedBlock.id) ?? initialSelectedBlock)
        : null;

    if (!selectedBlock) return null;

    const updateBlock = (updates: any) => {
        if (!editor || !selectedBlock) return;
        const currentBlock = editor.getBlock(selectedBlock.id) || selectedBlock;
        // Always preserve the block type to prevent BlockNote from replacing
        // content:'none' custom blocks (e.g. relatedContent) with a default heading.
        editor.updateBlock(currentBlock, { type: currentBlock.type, ...updates });
        setBlockVersion((prev) => prev + 1);
    };

    const updateProps = (props: any) => {
        const currentBlock = editor?.getBlock(selectedBlock.id) || selectedBlock;
        updateBlock({ type: currentBlock.type, props: { ...currentBlock.props, ...props } });
    };

    const deleteBlock = () => {
        if (!editor || !selectedBlock) return;
        editor.removeBlocks([selectedBlock]);
        setBlockVersion((prev) => prev + 1);
    };

    const hasTextAlignment = typeof selectedBlock.props?.textAlignment === 'string';
    const isHandled = SETTINGS_PANEL_TYPES.has(selectedBlock.type);

    return (
        <div className="relative w-full overflow-x-hidden">
            {/* Common Settings */}
            <SettingsSection title="Block Info" icon={Settings} defaultOpen>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Type</span>
                        <span className="text-xs font-semibold capitalize">{selectedBlock.type}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">ID</span>
                        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[150px]" title={selectedBlock.id}>
                            {selectedBlock.id}
                        </span>
                    </div>
                </div>
            </SettingsSection>

            {/* Type Specific Settings delegated to router */}
            <BlockSettingsRouter
                selectedBlock={selectedBlock}
                updateProps={updateProps}
                recipeData={recipeData}
                onRecipeChange={onRecipeChange}
                relatedContext={relatedContext}
            >
                {null}
            </BlockSettingsRouter>

            {!isHandled && hasTextAlignment && (
                <SettingsSection title="Text Settings" icon={Type} defaultOpen>
                    <div className="space-y-2">
                        <AlignmentPicker
                            value={selectedBlock.props.textAlignment || 'left'}
                            onChange={(align) => updateProps({ textAlignment: align })}
                        />
                    </div>
                </SettingsSection>
            )}

            {!isHandled && !hasTextAlignment && (
                <SettingsSection title="Block Settings" icon={Settings} defaultOpen>
                    <div className="text-xs text-muted-foreground">
                        No settings available for this block type yet.
                    </div>
                </SettingsSection>
            )}

            {/* Actions */}
            <div className="p-4 pt-8">
                <Button
                    variant="destructive"
                    size="sm"
                    className="w-full flex items-center justify-center gap-2"
                    onClick={deleteBlock}
                >
                    <Trash2 className="w-4 h-4" />
                    Delete Block
                </Button>
            </div>
        </div>
    );
}
