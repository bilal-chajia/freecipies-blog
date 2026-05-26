import { Settings } from 'lucide-react';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { SettingsSection } from '../DocumentSettings';
import { parseJsonArray } from '../../utils/json';

interface FAQSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
}

export default function FAQSettings({ selectedBlock, updateProps }: FAQSettingsProps) {
    const faqItems = parseJsonArray(selectedBlock.props.itemsJson);

    return (
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
    );
}
