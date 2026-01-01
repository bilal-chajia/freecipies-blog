import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Textarea } from '@/ui/textarea.jsx';

export default function SEOSection({ formData, onInputChange, isEditMode }) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-sm font-medium">Slug *</Label>
                <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => onInputChange('slug', e.target.value)}
                    placeholder="article-slug"
                    disabled={isEditMode}
                    className="text-sm h-9"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="metaTitle" className="text-sm font-medium">Meta Title</Label>
                <Input
                    id="metaTitle"
                    value={formData.metaTitle}
                    onChange={(e) => onInputChange('metaTitle', e.target.value)}
                    placeholder="SEO title"
                    className="text-sm h-9"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="metaDescription" className="text-sm font-medium">Meta Description</Label>
                <Textarea
                    id="metaDescription"
                    value={formData.metaDescription}
                    onChange={(e) => onInputChange('metaDescription', e.target.value)}
                    placeholder="SEO description"
                    rows={3}
                    className="text-sm resize-none"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="canonicalUrl" className="text-sm font-medium">Canonical URL</Label>
                <Input
                    id="canonicalUrl"
                    value={formData.canonicalUrl}
                    onChange={(e) => onInputChange('canonicalUrl', e.target.value)}
                    placeholder="https://..."
                    className="text-sm h-9"
                />
            </div>
        </div>
    );
}
