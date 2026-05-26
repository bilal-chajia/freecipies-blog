import { Type } from 'lucide-react';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { SettingsSection } from '../DocumentSettings';

interface TitleHeadlineSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
    label: 'Title' | 'Headline';
}

export default function TitleHeadlineSettings({
    selectedBlock,
    updateProps,
    label,
}: TitleHeadlineSettingsProps) {
    return (
        <SettingsSection title={label} icon={Type} defaultOpen>
            <div className="space-y-2">
                <Label className="text-xs">Value</Label>
                <Input
                    className="h-8 text-sm w-full"
                    value={selectedBlock.props.value || ''}
                    onChange={(e) => updateProps({ value: e.target.value })}
                    placeholder={`Add ${label.toLowerCase()}`}
                />
            </div>
        </SettingsSection>
    );
}
