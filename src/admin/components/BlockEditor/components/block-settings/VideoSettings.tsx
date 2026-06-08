import { Settings } from 'lucide-react';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { SettingsSection } from '../DocumentSettings';

interface VideoSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
}

export default function VideoSettings({ selectedBlock, updateProps }: VideoSettingsProps) {
    return (
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
    );
}
