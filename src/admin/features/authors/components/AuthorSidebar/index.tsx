import { ScrollArea } from '@/ui/scroll-area';
import PublishingSection from './PublishingSection';
import ImagesSection from './ImagesSection';
import RoleSection from './RoleSection';
import SEOSection from './SEOSection';
import SocialLinksSection from './SocialLinksSection';

interface AuthorSidebarProps {
  formData: Record<string, unknown>;
  onInputChange: (field: string, value: unknown) => void;
  onSave: () => void;
  saving: boolean;
  isEditMode: boolean;
  imagesData?: Record<string, unknown>;
  onImageChange: (key: string, value: unknown) => void;
  onImageRemove: (key: string) => void;
  onMediaDialogOpen: (type: string) => void;
  seoData?: { metaTitle?: string; metaDescription?: string; canonicalUrl?: string; keywords?: string[] };
  onSeoChange: (data: { metaTitle?: string; metaDescription?: string; canonicalUrl?: string; keywords?: string[] }) => void;
  socialLinks?: Record<string, string>;
  onSocialChange: (links: Record<string, string>) => void;
}

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
}: AuthorSidebarProps) {
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
                        imagesData={imagesData || {}}
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
