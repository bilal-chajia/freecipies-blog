import { useState } from 'react';
import { FormField } from '@admin/features/settings/components';
import { SectionCard, SocialFeedItemList } from '@admin/features/homepage/components';
import { MediaDialog } from '@admin/features/media/components';
import { Images } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminMediaPayload } from '@shared/images/image-contract';
import type { HomepageAdminSocialFeedSection } from '@modules/settings/types/settings.types';
import { buildHomepageImageFromAdminMedia } from '@modules/settings/services/homepage-settings-images';
import { updateSocialFeedItem } from '../../utils/social-feed-items';
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

const SocialFeedSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [requestedItemIndex, setRequestedItemIndex] = useState<number | null>(null);
  const socialFeed = formData.sections.find(
    (item): item is HomepageAdminSocialFeedSection => (
      item.id === 'social_feed' && item.type === 'social_feed'
    ),
  );
  if (!socialFeed) return null;

  const patchSocialFeed = (patch: Partial<HomepageAdminSocialFeedSection>) => {
    updateSection('social_feed', (section) => (
      section.type === 'social_feed' ? { ...section, ...patch } : section
    ));
  };
  const handleRequestMedia = (index: number) => {
    setRequestedItemIndex(index);
    setMediaDialogOpen(true);
  };
  const handleMediaDialogOpenChange = (open: boolean) => {
    setMediaDialogOpen(open);
    if (!open) setRequestedItemIndex(null);
  };
  const handleMediaSelect = (media: unknown) => {
    if (requestedItemIndex === null) return;
    if (!isAdminMediaPayload(media)) {
      toast.error('The selected media payload is incomplete');
      return;
    }

    try {
      patchSocialFeed({
        items: updateSocialFeedItem(socialFeed.items, requestedItemIndex, {
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
        title="Social Feed"
        description="Curate linked social posts with local image fallbacks."
        icon={Images}
        enabled={socialFeed.enabled}
        onEnabledChange={(checked) => patchSocialFeed({ enabled: checked })}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="socialFeedEyebrow"
            label="Eyebrow"
            value={socialFeed.eyebrow}
            onChange={(event) => patchSocialFeed({ eyebrow: event.target.value })}
            placeholder="From our kitchen"
          />
          <FormField
            id="socialFeedTitle"
            label="Title"
            value={socialFeed.title}
            onChange={(event) => patchSocialFeed({ title: event.target.value })}
            placeholder="Follow along"
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Social Feed Cards</p>
          <SocialFeedItemList
            items={socialFeed.items}
            onChange={(items) => patchSocialFeed({ items })}
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

export default SocialFeedSection;
