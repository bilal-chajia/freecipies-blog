import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';

interface AlignmentPickerProps {
    value: string;
    onChange: (alignment: string) => void;
    label?: string;
}

const alignments = [
    { value: 'left', icon: AlignLeft },
    { value: 'center', icon: AlignCenter },
    { value: 'right', icon: AlignRight },
] as const;

export default function AlignmentPicker({ value, onChange, label = 'Alignment' }: AlignmentPickerProps) {
    return (
        <div className="space-y-2">
            <Label className="text-xs">{label}</Label>
            <div className="flex bg-muted/50 rounded-md p-1 gap-1">
                {alignments.map(({ value: align, icon: Icon }) => (
                    <Button
                        key={align}
                        variant={value === align ? 'secondary' : 'ghost'}
                        size="sm"
                        className="flex-1 h-7 text-xs"
                        onClick={() => onChange(align)}
                    >
                        <Icon className="w-3 h-3" />
                    </Button>
                ))}
            </div>
        </div>
    );
}
