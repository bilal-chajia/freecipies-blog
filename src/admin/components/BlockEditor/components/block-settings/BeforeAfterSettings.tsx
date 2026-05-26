import { Settings } from 'lucide-react';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from '../DocumentSettings';

interface BeforeAfterSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
}

export default function BeforeAfterSettings({ selectedBlock, updateProps }: BeforeAfterSettingsProps) {
    return (
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
    );
}
