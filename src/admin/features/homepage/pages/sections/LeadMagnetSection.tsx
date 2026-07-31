import { useState } from 'react';
import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { MediaDialog } from '@admin/features/media/components';
import { Button } from '@/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import { Gift, ImagePlus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { AdminMediaPayload } from '@shared/images/image-contract';
import type { HomepageAdminLeadMagnetSection } from '@modules/settings/types/settings.types';
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

const LeadMagnetSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const leadMagnet = formData.sections.find(
    (item): item is HomepageAdminLeadMagnetSection => (
      item.id === 'lead_magnet' && item.type === 'lead_magnet'
    ),
  );
  if (!leadMagnet) return null;

  const patchLeadMagnet = (patch: Partial<HomepageAdminLeadMagnetSection>) => {
    updateSection('lead_magnet', (section) => (
      section.type === 'lead_magnet' ? { ...section, ...patch } : section
    ));
  };
  const handleMediaSelect = (media: unknown) => {
    if (!isAdminMediaPayload(media)) {
      toast.error('The selected media payload is incomplete');
      return;
    }

    try {
      patchLeadMagnet({ image: buildHomepageImageFromAdminMedia(media) });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to select media';
      toast.error(message);
    }
  };
  const preview = leadMagnet.image?.variants.md ?? leadMagnet.image?.variants.sm ?? leadMagnet.image?.variants.lg;

  return (
    <>
      <SectionCard
        title="Lead Magnet"
        description="Promote a downloadable resource or email signup incentive."
        icon={Gift}
        enabled={leadMagnet.enabled}
        onEnabledChange={(checked) => patchLeadMagnet({ enabled: checked })}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="leadMagnetEyebrow"
            label="Eyebrow"
            value={leadMagnet.eyebrow}
            onChange={(event) => patchLeadMagnet({ eyebrow: event.target.value })}
            placeholder="Free meal plan"
          />
          <FormField
            id="leadMagnetTitle"
            label="Title"
            value={leadMagnet.title}
            onChange={(event) => patchLeadMagnet({ title: event.target.value })}
            placeholder="Plan a week of easy dinners"
          />
        </div>

        <FormField
          id="leadMagnetBody"
          label="Body"
          multiline
          rows={3}
          value={leadMagnet.body}
          onChange={(event) => patchLeadMagnet({ body: event.target.value })}
          placeholder="Get practical recipes and a ready-to-use shopping list."
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Lead Magnet Image</p>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={leadMagnet.image ? 'Replace lead magnet image' : 'Select lead magnet image'}
                    onClick={() => setMediaDialogOpen(true)}
                  >
                    {leadMagnet.image ? <RefreshCw className="size-4" /> : <ImagePlus className="size-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">{leadMagnet.image ? 'Replace image' : 'Select image'}</TooltipContent>
              </Tooltip>
              {leadMagnet.image && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove lead magnet image"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => patchLeadMagnet({ image: null })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Remove image</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {preview && leadMagnet.image ? (
            <div className="relative aspect-[4/3] overflow-hidden border border-border bg-muted/30">
              <img
                src={preview.url}
                alt={leadMagnet.image.alt}
                width={preview.width}
                height={preview.height}
                loading="lazy"
                className="size-full object-cover"
                style={{
                  objectPosition: leadMagnet.image.focal_point
                    ? `${leadMagnet.image.focal_point.x}% ${leadMagnet.image.focal_point.y}%`
                    : undefined,
                }}
              />
            </div>
          ) : (
            <div className="grid aspect-[4/3] place-items-center border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
              No image selected
            </div>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            id="leadMagnetCtaLabel"
            label="CTA Label"
            value={leadMagnet.cta.label}
            onChange={(event) => patchLeadMagnet({ cta: { ...leadMagnet.cta, label: event.target.value } })}
            placeholder="Get the free plan"
          />
          <FormField
            id="leadMagnetCtaHref"
            label="CTA URL"
            value={leadMagnet.cta.href}
            onChange={(event) => patchLeadMagnet({ cta: { ...leadMagnet.cta, href: event.target.value } })}
            placeholder="/free-meal-plan"
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

export default LeadMagnetSection;
