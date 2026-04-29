import { ScrollArea } from '@/ui/scroll-area.jsx';
import PublishingSection from './PublishingSection';
import ImagesSection from './ImagesSection';
import RoleSection from './RoleSection';
import SEOSection from './SEOSection';
import SocialLinksSection from './SocialLinksSection';

export default function AuthorSidebar({
    formData,
    onInputChange,
    onSave,
    saving,
    isEditMode,
    imagesData,
    onImageChange,
    onImageRemove,
    onMediaDialogOpen,
    seoData,
    onSeoChange,
    socialLinks,
    onSocialChange,
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

                    <RoleSection
                        formData={formData}
                        onInputChange={onInputChange}
                    />

                    <ImagesSection
                        imagesData={imagesData}
                        onImageChange={onImageChange}
                        onImageRemove={onImageRemove}
                        onMediaDialogOpen={onMediaDialogOpen}
                    />

                    <SocialLinksSection
                        socialLinks={socialLinks}
                        onSocialChange={onSocialChange}
                    />

                    <SEOSection
                        seoData={seoData}
                        onSeoChange={onSeoChange}
                    />

                    {/* Bottom padding for scroll */}
                    <div className="h-20" />
                </div>
            </ScrollArea>
        </aside>
    );
}
