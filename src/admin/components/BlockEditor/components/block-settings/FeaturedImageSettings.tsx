import { Settings } from 'lucide-react';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { SettingsSection } from '../DocumentSettings';
import { clampNumber } from './helpers';

interface FeaturedImageSettingsProps {
    selectedBlock: any;
    updateProps: (props: Record<string, any>) => void;
}

export default function FeaturedImageSettings({ selectedBlock, updateProps }: FeaturedImageSettingsProps) {
    return (
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
    );
}
