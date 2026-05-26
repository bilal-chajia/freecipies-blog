import { Settings } from 'lucide-react';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from '../DocumentSettings';
import AlignmentPicker from './AlignmentPicker';

interface AlertSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
}

export default function AlertSettings({ selectedBlock, updateProps }: AlertSettingsProps) {
    return (
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
                <AlignmentPicker
                    value={selectedBlock.props.textAlignment || 'left'}
                    onChange={(align) => updateProps({ textAlignment: align })}
                />
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
    );
}
