import { useState, useEffect } from 'react';
import { Settings, Type, AlignLeft, AlignCenter, AlignRight, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from './DocumentSettings';

/**
 * Block Settings Component
 * 
 * Renders settings for the currently selected block.
 * Updates the block using the editor instance.
 */
export default function BlockSettings({ editor, selectedBlock }) {
    if (!selectedBlock) return null;

    const updateBlock = (updates) => {
        if (!editor || !selectedBlock) return;
        editor.updateBlock(selectedBlock, updates);
    };

    const deleteBlock = () => {
        if (!editor || !selectedBlock) return;
        editor.removeBlocks([selectedBlock]);
    };

    // Render varied settings based on block type
    return (
        <div className="divide-y divide-border">
            {/* Common Settings */}
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Type</span>
                    <span className="text-sm font-semibold capitalize">{selectedBlock.type}</span>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">ID</span>
                    <span className="text-xs font-mono text-muted-foreground truncate max-w-[150px]" title={selectedBlock.id}>
                        {selectedBlock.id}
                    </span>
                </div>
            </div>

            {/* Type Specific Settings */}
            {selectedBlock.type === 'heading' && (
                <SettingsSection title="Heading Settings" icon={Type} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Level</Label>
                            <Select
                                value={selectedBlock.props.level?.toString()}
                                onValueChange={(val) => updateBlock({ props: { ...selectedBlock.props, level: parseInt(val) } })}
                            >
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">H1</SelectItem>
                                    <SelectItem value="2">H2</SelectItem>
                                    <SelectItem value="3">H3</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Alignment</Label>
                            <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                                {['left', 'center', 'right'].map((align) => (
                                    <Button
                                        key={align}
                                        variant={selectedBlock.props.textAlignment === align ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="flex-1 h-7 text-xs"
                                        onClick={() => updateBlock({ props: { ...selectedBlock.props, textAlignment: align } })}
                                    >
                                        {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                        {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                        {align === 'right' && <AlignRight className="w-3 h-3" />}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'paragraph' && (
                <SettingsSection title="Text Settings" icon={Type} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Alignment</Label>
                            <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                                {['left', 'center', 'right'].map((align) => (
                                    <Button
                                        key={align}
                                        variant={selectedBlock.props.textAlignment === align ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="flex-1 h-7 text-xs"
                                        onClick={() => updateBlock({ props: { ...selectedBlock.props, textAlignment: align } })}
                                    >
                                        {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                        {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                        {align === 'right' && <AlignRight className="w-3 h-3" />}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'customImage' && (
                <SettingsSection title="Image Settings" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Width</Label>
                            <Input
                                className="h-8 text-sm"
                                value={selectedBlock.props.width || '100%'}
                                onChange={(e) => updateBlock({ props: { ...selectedBlock.props, width: e.target.value } })}
                                placeholder="100%"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Caption</Label>
                            <Input
                                className="h-8 text-sm"
                                value={selectedBlock.props.caption || ''}
                                onChange={(e) => updateBlock({ props: { ...selectedBlock.props, caption: e.target.value } })}
                                placeholder="Image caption"
                            />
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'alert' && (
                <SettingsSection title="Alert Settings" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Type</Label>
                            <Select
                                value={selectedBlock.props.type}
                                onValueChange={(val) => updateBlock({ props: { ...selectedBlock.props, type: val } })}
                            >
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="tip">Tip</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="note">Note</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
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
