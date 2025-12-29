import { Label } from '@/ui/label.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';
import TagSelector from '../TagSelector';

export default function TagsSection({
    formData,
    onInputChange,
    tags,
}) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Tags</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <TagSelector
                    tags={tags}
                    selectedTags={formData.selectedTags}
                    onTagsChange={(newTags) => onInputChange('selectedTags', newTags)}
                />
            </CardContent>
        </Card>
    );
}
