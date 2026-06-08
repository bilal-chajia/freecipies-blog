import { Settings } from 'lucide-react';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from '../DocumentSettings';

interface DividerSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
}

export default function DividerSettings({ selectedBlock, updateProps }: DividerSettingsProps) {
    return (
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
    );
}
