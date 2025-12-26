import { Label } from '@/ui/label.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';
import TagSelector from '../TagSelector';

export default function OrganizationSection({
    formData,
    onInputChange,
    categories,
    authors,
    tags,
}) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-sm font-medium">Category *</Label>
                    <Select
                        value={formData.categorySlug}
                        onValueChange={(value) => onInputChange('categorySlug', value)}
                    >
                        <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.map((cat) => (
                                <SelectItem key={cat.slug} value={cat.slug}>
                                    {cat.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="author" className="text-sm font-medium">Author *</Label>
                    <Select
                        value={formData.authorSlug}
                        onValueChange={(value) => onInputChange('authorSlug', value)}
                    >
                        <SelectTrigger className="text-sm h-9">
                            <SelectValue placeholder="Select author" />
                        </SelectTrigger>
                        <SelectContent>
                            {authors.map((author) => (
                                <SelectItem key={author.slug} value={author.slug}>
                                    {author.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Tags</Label>
                    <TagSelector
                        tags={tags}
                        selectedTags={formData.selectedTags}
                        onTagsChange={(newTags) => onInputChange('selectedTags', newTags)}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
