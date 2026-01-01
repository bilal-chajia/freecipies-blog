import TagSelector from '../TagSelector';

export default function TagsSection({
    formData,
    onInputChange,
    tags,
}) {
    return (
        <TagSelector
            tags={tags}
            selectedTags={formData.selectedTags}
            onTagsChange={(newTags) => onInputChange('selectedTags', newTags)}
        />
    );
}
