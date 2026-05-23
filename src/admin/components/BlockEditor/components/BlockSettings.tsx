import { useEffect, useState } from 'react';
import { Image, Settings, Type, AlignLeft, AlignCenter, AlignRight, Trash2, Upload, FolderOpen } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from './DocumentSettings';
import RelatedContentSettings from './block-settings/RelatedContentSettings';
import RecipeSettingsSidebar from './block-settings/RecipeSettingsSidebar';
import RoundupListSettings from './block-settings/RoundupListSettings';
import {
    parseJsonArray,
    clampNumber,
} from './block-settings/helpers';
import {
    IMAGE_BLOCK_OPEN_MEDIA_EVENT,
    IMAGE_BLOCK_OPEN_UPLOADER_EVENT,
    dispatchImageBlockEvent,
} from '../blocks/shared/image-block-events';

/**
 * Block Settings Component
 * 
 * Renders settings for the currently selected block.
 * Updates the block using the editor instance.
 */

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
    // NOTE: ImageBlock owns its own MediaDialog/ImageUploader.
    // We dispatch custom events to the block instead of mounting a second dialog.
    // This prevents double /api/media calls from two MediaLibrary instances.

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

    // Note: dialog state for customImage blocks is now owned by ImageBlock itself.

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

    /** Tells the ImageBlock to open its own Media Library dialog. */
    const openBlockMediaDialog = () => {
        if (!selectedBlock?.id) return;
        dispatchImageBlockEvent(IMAGE_BLOCK_OPEN_MEDIA_EVENT, { blockId: selectedBlock.id });
    };

    /** Tells the ImageBlock to open its own Image Uploader dialog. */
    const openBlockUploaderDialog = () => {
        if (!selectedBlock?.id) return;
        dispatchImageBlockEvent(IMAGE_BLOCK_OPEN_UPLOADER_EVENT, { blockId: selectedBlock.id });
    };

    const deleteBlock = () => {
        if (!editor || !selectedBlock) return;
        editor.removeBlocks([selectedBlock]);
        setBlockVersion((prev) => prev + 1);
    };

    const faqItems = selectedBlock.type === 'faqSection'
        ? parseJsonArray(selectedBlock.props.itemsJson)
        : [];
    const tableHeaders = selectedBlock.type === 'simpleTable'
        ? parseJsonArray(selectedBlock.props.headersJson)
        : [];
    const tableRows = selectedBlock.type === 'simpleTable'
        ? parseJsonArray(selectedBlock.props.rowsJson)
        : [];
    const handledTypes = new Set([
        'heading',
        'paragraph',
        'customImage',
        'alert',
        'divider',
        'faqSection',
        'beforeAfter',
        'simpleTable',
        'video',
        'relatedContent',
        'featuredImage',
        'title',
        'headline',
        'mainRecipe',
        'roundupList',
    ]);
    const hasTextAlignment = typeof selectedBlock.props?.textAlignment === 'string';
    const isHandled = handledTypes.has(selectedBlock.type);

    // Render varied settings based on block type
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

            {/* Type Specific Settings */}
            {selectedBlock.type === 'heading' && (
                <SettingsSection title="Heading Settings" icon={Type} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Level</Label>
                            <Select
                                value={selectedBlock.props.level?.toString()}
                                onValueChange={(val) => updateProps({ level: parseInt(val, 10) })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2">H2</SelectItem>
                                    <SelectItem value="3">H3</SelectItem>
                                    <SelectItem value="4">H4</SelectItem>
                                    <SelectItem value="5">H5</SelectItem>
                                    <SelectItem value="6">H6</SelectItem>
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
                                        onClick={() => updateProps({ textAlignment: align })}
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
                                        onClick={() => updateProps({ textAlignment: align })}
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
                            <Label className="text-xs">Replace image</Label>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                    onClick={(e) => { e.stopPropagation(); openBlockMediaDialog(); }}
                                >
                                    <FolderOpen className="w-3.5 h-3.5" />
                                    Media Library
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    className="h-8 gap-1.5"
                                    onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                                    onClick={(e) => { e.stopPropagation(); openBlockUploaderDialog(); }}
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    Upload
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Width</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.width || '100%'}
                                onChange={(e) => updateProps({ width: e.target.value })}
                                placeholder="100%"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Alignment</Label>
                            <Select
                                value={selectedBlock.props.alignment || 'center'}
                                onValueChange={(val) => updateProps({ alignment: val })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Select alignment" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">Left</SelectItem>
                                    <SelectItem value="center">Center</SelectItem>
                                    <SelectItem value="right">Right</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Caption</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.caption || ''}
                                onChange={(e) => updateProps({ caption: e.target.value })}
                                placeholder="Image caption"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Alt Text</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.alt || ''}
                                onChange={(e) => updateProps({ alt: e.target.value })}
                                placeholder="Describe the image"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Credit</Label>
                            <div className="min-h-8 rounded-md border border-input/50 px-2.5 py-1.5 text-xs text-muted-foreground">
                                {selectedBlock.props.credit || 'Select an uploaded media item to set image credit.'}
                            </div>
                        </div>
                    </div>
                    {/* MediaDialog and ImageUploader are owned by ImageBlock itself.
                         Buttons above dispatch custom events to open them there. */}
                </SettingsSection>
            )}

            {selectedBlock.type === 'alert' && (
                <SettingsSection title="Alert Settings" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Type</Label>
                            <Select
                                value={selectedBlock.props.type}
                                onValueChange={(val) => updateProps({ type: val })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
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
                        <div className="space-y-2">
                            <Label className="text-xs">Alignment</Label>
                            <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                                {['left', 'center', 'right'].map((align) => (
                                    <Button
                                        key={align}
                                        variant={selectedBlock.props.textAlignment === align ? 'secondary' : 'ghost'}
                                        size="sm"
                                        className="flex-1 h-7 text-xs"
                                        onClick={() => updateProps({ textAlignment: align })}
                                    >
                                        {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                        {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                        {align === 'right' && <AlignRight className="w-3 h-3" />}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Text Color</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.textColor || ''}
                                onChange={(e) => updateProps({ textColor: e.target.value })}
                                placeholder="#e74c3c"
                            />
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'divider' && (
                <SettingsSection title="Divider Settings" icon={Settings} defaultOpen>
                    <div className="space-y-2">
                        <Label className="text-xs">Style</Label>
                        <Select
                            value={selectedBlock.props.style || 'solid'}
                            onValueChange={(val) => updateProps({ style: val })}
                        >
                            <SelectTrigger className="h-8 text-sm w-full">
                                <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="solid">Solid</SelectItem>
                                <SelectItem value="dashed">Dashed</SelectItem>
                                <SelectItem value="dotted">Dotted</SelectItem>
                                <SelectItem value="double">Double</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'faqSection' && (
                <SettingsSection title="FAQ Settings" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Title</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.title || ''}
                                onChange={(e) => updateProps({ title: e.target.value })}
                                placeholder="FAQ title"
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Questions</span>
                            <span>{faqItems.length}</span>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'beforeAfter' && (
                <SettingsSection title="Before / After" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Layout</Label>
                            <Select
                                value={selectedBlock.props.layout || 'slider'}
                                onValueChange={(val) => updateProps({ layout: val })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Select layout" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="slider">Slider</SelectItem>
                                    <SelectItem value="side_by_side">Side by side</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Before image</span>
                            <span>{selectedBlock.props.beforeJson ? 'Set' : 'Empty'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>After image</span>
                            <span>{selectedBlock.props.afterJson ? 'Set' : 'Empty'}</span>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'simpleTable' && (
                <SettingsSection title="Table Settings" icon={Settings} defaultOpen>
                    <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                            <span>Columns</span>
                            <span>{tableHeaders.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Rows</span>
                            <span>{tableRows.length}</span>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'video' && (
                <SettingsSection title="Video Settings" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">URL</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.url || ''}
                                onChange={(e) => updateProps({ url: e.target.value })}
                                placeholder="https://"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Aspect Ratio</Label>
                            <Select
                                value={selectedBlock.props.aspectRatio || '16:9'}
                                onValueChange={(val) => updateProps({ aspectRatio: val })}
                            >
                                <SelectTrigger className="h-8 text-sm w-full">
                                    <SelectValue placeholder="Select ratio" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="16:9">16:9</SelectItem>
                                    <SelectItem value="4:3">4:3</SelectItem>
                                    <SelectItem value="1:1">1:1</SelectItem>
                                    <SelectItem value="9:16">9:16</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Provider</span>
                            <span>{selectedBlock.props.provider || '-'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Video ID</span>
                            <span>{selectedBlock.props.videoId || '-'}</span>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'relatedContent' && (
                <SettingsSection title="Related Content" icon={Settings} defaultOpen>
                    <RelatedContentSettings
                        selectedBlock={selectedBlock}
                        relatedContext={relatedContext}
                        updateProps={updateProps}
                    />
                </SettingsSection>
            )}

            {selectedBlock.type === 'featuredImage' && (
                <SettingsSection title="Featured Image" icon={Settings} defaultOpen>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Alt Text</Label>
                            <Input
                                className="h-8 text-sm w-full"
                                value={selectedBlock.props.imageAlt || ''}
                                onChange={(e) => updateProps({ imageAlt: e.target.value })}
                                placeholder="Describe the image"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs">Focal X</Label>
                                <Input
                                    className="h-8 text-sm w-full"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={selectedBlock.props.focalX ?? 50}
                                    onChange={(e) => updateProps({ focalX: clampNumber(e.target.value, 0, 100, 50) })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Focal Y</Label>
                                <Input
                                    className="h-8 text-sm w-full"
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={selectedBlock.props.focalY ?? 50}
                                    onChange={(e) => updateProps({ focalY: clampNumber(e.target.value, 0, 100, 50) })}
                                />
                            </div>
                        </div>
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'title' && (
                <SettingsSection title="Title" icon={Type} defaultOpen>
                    <div className="space-y-2">
                        <Label className="text-xs">Value</Label>
                        <Input
                            className="h-8 text-sm w-full"
                            value={selectedBlock.props.value || ''}
                            onChange={(e) => updateProps({ value: e.target.value })}
                            placeholder="Add title"
                        />
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'headline' && (
                <SettingsSection title="Headline" icon={Type} defaultOpen>
                    <div className="space-y-2">
                        <Label className="text-xs">Value</Label>
                        <Input
                            className="h-8 text-sm w-full"
                            value={selectedBlock.props.value || ''}
                            onChange={(e) => updateProps({ value: e.target.value })}
                            placeholder="Add headline"
                        />
                    </div>
                </SettingsSection>
            )}

            {selectedBlock.type === 'mainRecipe' && (
                <RecipeSettingsSidebar recipe={recipeData} setRecipe={onRecipeChange} />
            )}

            {selectedBlock.type === 'roundupList' && (
                <RoundupListSettings
                    selectedBlock={selectedBlock}
                    updateProps={updateProps}
                />
            )}

            {!isHandled && hasTextAlignment && (
                <SettingsSection title="Text Settings" icon={Type} defaultOpen>
                    <div className="space-y-2">
                        <Label className="text-xs">Alignment</Label>
                        <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                            {['left', 'center', 'right'].map((align) => (
                                <Button
                                    key={align}
                                    variant={selectedBlock.props.textAlignment === align ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="flex-1 h-7 text-xs"
                                    onClick={() => updateProps({ textAlignment: align })}
                                >
                                    {align === 'left' && <AlignLeft className="w-3 h-3" />}
                                    {align === 'center' && <AlignCenter className="w-3 h-3" />}
                                    {align === 'right' && <AlignRight className="w-3 h-3" />}
                                </Button>
                            ))}
                        </div>
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
