import { useState } from 'react';
import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { MediaDialog } from '@admin/features/media/components';
import { Button } from '@/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { ImagePlus, Sun, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type {
  AdminMediaPayload,
} from '@shared/images/image-contract';
import type {
  HomepageAdminSeasonalSpotlightSection,
} from '@modules/settings/types/settings.types';
import { buildHomepageImageFromAdminMedia } from '@modules/settings/services/homepage-settings-images';
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

const SeasonalSpotlightSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const spotlight = formData.sections.find(
    (item): item is HomepageAdminSeasonalSpotlightSection => (
      item.id === 'seasonal_spotlight' && item.type === 'seasonal_spotlight'
    ),
  );
  if (!spotlight) return null;

  const patchSpotlight = (patch: Partial<HomepageAdminSeasonalSpotlightSection>) => {
    updateSection('seasonal_spotlight', (section) => (
      section.type === 'seasonal_spotlight' ? { ...section, ...patch } : section
    ));
  };
  const handleMediaSelect = (media: unknown) => {
    if (!isAdminMediaPayload(media)) {
      toast.error('The selected media payload is incomplete');
      return;
    }

    try {
      patchSpotlight({ image: buildHomepageImageFromAdminMedia(media) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to select media';
      toast.error(message);
    }
  };
  const preview = spotlight.image?.variants.md ?? spotlight.image?.variants.sm ?? spotlight.image?.variants.lg;

  return (
    <>
      <SectionCard
        title="Seasonal Spotlight"
        description="Highlight a timely recipe collection or editorial feature."
        icon={Sun}
        enabled={spotlight.enabled}
        onEnabledChange={(checked) => patchSpotlight({ enabled: checked })}
      >
        <FormField
          id="seasonalSpotlightTitle"
          label="Title"
          value={spotlight.title}
          onChange={(event) => patchSpotlight({ title: event.target.value })}
          placeholder="Summer cooking"
        />

        <FormField
          id="seasonalSpotlightBody"
          label="Body"
          multiline
          rows={3}
          value={spotlight.body}
          onChange={(event) => patchSpotlight({ body: event.target.value })}
          placeholder="Fresh ideas for warm days."
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Spotlight Image</p>
            {spotlight.image && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove spotlight image"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => patchSpotlight({ image: null })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Remove image</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            {preview && spotlight.image ? (
              <div className="relative aspect-[4/3] overflow-hidden border border-border bg-muted/30">
                <img
                  src={preview.url}
                  alt={spotlight.image.alt}
                  width={preview.width}
                  height={preview.height}
                  loading="lazy"
                  className="size-full object-cover"
                  style={{
                    objectPosition: spotlight.image.focal_point
                      ? `${spotlight.image.focal_point.x}% ${spotlight.image.focal_point.y}%`
                      : undefined,
                  }}
                />
              </div>
            ) : (
              <div className="grid aspect-[4/3] place-items-center border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                No image selected
              </div>
            )}

            <Button type="button" variant="secondary" size="sm" onClick={() => setMediaDialogOpen(true)}>
              <ImagePlus className="size-4" />
              {spotlight.image ? 'Replace Image' : 'Media Library'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="seasonalSpotlightCtaLabel"
            label="CTA Label"
            value={spotlight.cta.label}
            onChange={(event) => patchSpotlight({ cta: { ...spotlight.cta, label: event.target.value } })}
            placeholder="Browse recipes"
          />
          <FormField
            id="seasonalSpotlightCtaHref"
            label="CTA URL"
            value={spotlight.cta.href}
            onChange={(event) => patchSpotlight({ cta: { ...spotlight.cta, href: event.target.value } })}
            placeholder="/recipes?category=summer"
          />
        </div>
      </SectionCard>

      <MediaDialog
        open={mediaDialogOpen}
        onOpenChange={setMediaDialogOpen}
        onSelect={handleMediaSelect}
        variantSizes={{ sm: 720, md: 1200, lg: 2048 }}
      />
    </>
  );
};

export default SeasonalSpotlightSection;
