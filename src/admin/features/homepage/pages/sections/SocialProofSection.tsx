import { useState } from 'react';
import { FormField } from '@admin/features/settings/components';
import {
  SectionCard,
  SocialProofLogoList,
  SocialProofStatList,
  SocialProofTestimonialList,
} from '@admin/features/homepage/components';
import { MediaDialog } from '@admin/features/media/components';
import { BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminMediaPayload } from '@shared/images/image-contract';
import type { HomepageAdminSocialProofSection } from '@modules/settings/types/settings.types';
import { buildHomepageImageFromAdminMedia } from '@modules/settings/services/homepage-settings-images';
import { updateSocialProofLogo } from '../../utils/social-proof-items';
import type { HomepageSectionProps } from '../../types';

function isAdminMediaPayload(value: unknown): value is AdminMediaPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const media = value as Record<string, unknown>;
  return (
    typeof media.id === 'number'
    && typeof media.placeholder === 'string'
    && typeof media.variants === 'object'
    && media.variants !== null
    && typeof media.focal_point === 'object'
    && media.focal_point !== null
  );
}

const SocialProofSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [requestedLogoIndex, setRequestedLogoIndex] = useState<number | null>(null);
  const socialProof = formData.sections.find(
    (item): item is HomepageAdminSocialProofSection => (
      item.id === 'social_proof' && item.type === 'social_proof'
    ),
  );
  if (!socialProof) return null;

  const patchSocialProof = (patch: Partial<HomepageAdminSocialProofSection>) => {
    updateSection('social_proof', (section) => (
      section.type === 'social_proof' ? { ...section, ...patch } : section
    ));
  };
  const handleRequestMedia = (index: number) => {
    setRequestedLogoIndex(index);
    setMediaDialogOpen(true);
  };
  const handleMediaDialogOpenChange = (open: boolean) => {
    setMediaDialogOpen(open);
    if (!open) setRequestedLogoIndex(null);
  };
  const handleMediaSelect = (media: unknown) => {
    if (requestedLogoIndex === null) return;
    if (!isAdminMediaPayload(media)) {
      toast.error('The selected media payload is incomplete');
      return;
    }

    try {
      patchSocialProof({
        logos: updateSocialProofLogo(socialProof.logos, requestedLogoIndex, {
          image: buildHomepageImageFromAdminMedia(media),
        }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to select media';
      toast.error(message);
    }
  };

  return (
    <>
      <SectionCard
        title="Social Proof"
        description="Share reader trust signals, endorsements, and publication logos."
        icon={BadgeCheck}
        enabled={socialProof.enabled}
        onEnabledChange={(checked) => patchSocialProof({ enabled: checked })}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="socialProofEyebrow"
            label="Eyebrow"
            value={socialProof.eyebrow}
            onChange={(event) => patchSocialProof({ eyebrow: event.target.value })}
            placeholder="Cook with confidence"
          />
          <FormField
            id="socialProofTitle"
            label="Title"
            value={socialProof.title}
            onChange={(event) => patchSocialProof({ title: event.target.value })}
            placeholder="Trusted by home cooks"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Statistics</p>
          <SocialProofStatList
            stats={socialProof.stats}
            onChange={(stats) => patchSocialProof({ stats })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Testimonials</p>
          <SocialProofTestimonialList
            testimonials={socialProof.testimonials}
            onChange={(testimonials) => patchSocialProof({ testimonials })}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Publication Logos</p>
          <SocialProofLogoList
            logos={socialProof.logos}
            onChange={(logos) => patchSocialProof({ logos })}
            onRequestMedia={handleRequestMedia}
          />
        </div>
      </SectionCard>

      <MediaDialog
        open={mediaDialogOpen}
        onOpenChange={handleMediaDialogOpenChange}
        onSelect={handleMediaSelect}
        variantSizes={{ sm: 480, md: 768, lg: 1280 }}
      />
    </>
  );
};

export default SocialProofSection;
