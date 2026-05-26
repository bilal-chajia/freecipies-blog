import { Type } from 'lucide-react';
import { SettingsSection } from '../DocumentSettings';
import AlignmentPicker from './AlignmentPicker';

interface ParagraphSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
}

export default function ParagraphSettings({ selectedBlock, updateProps }: ParagraphSettingsProps) {
    return (
        <SettingsSection title="Text Settings" icon={Type} defaultOpen>
            <div className="space-y-4">
                <AlignmentPicker
                    value={selectedBlock.props.textAlignment || 'left'}
                    onChange={(align) => updateProps({ textAlignment: align })}
                />
            </div>
        </SettingsSection>
    );
}
