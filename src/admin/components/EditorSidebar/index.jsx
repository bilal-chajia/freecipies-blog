import { ScrollArea } from '@/ui/scroll-area.jsx';
import PublishingSection from './PublishingSection';
import OrganizationSection from './OrganizationSection';
import MediaSection from './MediaSection';
import SEOSection from './SEOSection';
import ExcerptsSection from './ExcerptsSection';

export default function EditorSidebar({
    formData,
    onInputChange,
    onSave,
    saving,
    isEditMode,
    categories,
    authors,
    tags,
    onMediaDialogOpen,
}) {
    return (
        <aside className="sticky top-0 h-screen">
            <ScrollArea className="h-full">
                <div className="space-y-5 p-6">
                    <PublishingSection
                        formData={formData}
                        onInputChange={onInputChange}
                        onSave={onSave}
                        saving={saving}
                        isEditMode={isEditMode}
                    />

                    <OrganizationSection
                        formData={formData}
                        onInputChange={onInputChange}
                        categories={categories}
                        authors={authors}
                        tags={tags}
                    />

                    <MediaSection
                        formData={formData}
                        onInputChange={onInputChange}
                        onMediaDialogOpen={onMediaDialogOpen}
                    />

                    <SEOSection
                        formData={formData}
                        onInputChange={onInputChange}
                        isEditMode={isEditMode}
                    />

                    <ExcerptsSection
                        formData={formData}
                        onInputChange={onInputChange}
                    />

                    {/* Bottom padding for scroll */}
                    <div className="h-20" />
                </div>
            </ScrollArea>
        </aside>
    );
}
