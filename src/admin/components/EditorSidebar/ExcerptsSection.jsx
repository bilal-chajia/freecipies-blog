import { Label } from '@/ui/label.jsx';
import { Textarea } from '@/ui/textarea.jsx';

export default function ExcerptsSection({ formData, onInputChange }) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="shortDescription" className="text-sm font-medium">Short Description *</Label>
                <Textarea
                    id="shortDescription"
                    value={formData.shortDescription}
                    onChange={(e) => onInputChange('shortDescription', e.target.value)}
                    placeholder="Brief description"
                    rows={2}
                    className="text-sm resize-none"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="tldr" className="text-sm font-medium">TL;DR *</Label>
                <Textarea
                    id="tldr"
                    value={formData.tldr}
                    onChange={(e) => onInputChange('tldr', e.target.value)}
                    placeholder="Too long; didn't read"
                    rows={2}
                    className="text-sm resize-none"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="introduction" className="text-sm font-medium">Introduction</Label>
                <Textarea
                    id="introduction"
                    value={formData.introduction}
                    onChange={(e) => onInputChange('introduction', e.target.value)}
                    placeholder="Article introduction"
                    rows={3}
                    className="text-sm resize-none"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="summary" className="text-sm font-medium">Summary</Label>
                <Textarea
                    id="summary"
                    value={formData.summary}
                    onChange={(e) => onInputChange('summary', e.target.value)}
                    placeholder="Article summary"
                    rows={3}
                    className="text-sm resize-none"
                />
            </div>
        </div>
    );
}
