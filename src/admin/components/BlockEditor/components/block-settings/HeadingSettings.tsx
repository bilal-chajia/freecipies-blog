import { Type } from 'lucide-react';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from '../DocumentSettings';
import AlignmentPicker from './AlignmentPicker';

interface HeadingSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
}

export default function HeadingSettings({ selectedBlock, updateProps }: HeadingSettingsProps) {
    return (
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
                <AlignmentPicker
                    value={selectedBlock.props.textAlignment || 'left'}
                    onChange={(align) => updateProps({ textAlignment: align })}
                />
            </div>
        </SettingsSection>
    );
}
