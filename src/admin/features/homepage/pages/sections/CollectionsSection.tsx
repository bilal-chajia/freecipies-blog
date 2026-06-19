import { FormField } from '@admin/features/settings/components';
import { SectionCard, RoundupRefList } from '@admin/features/homepage/components';
import { BookOpen } from 'lucide-react';
import { Label } from '@/ui/label';
import type { HomepageCollectionsSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const CollectionsSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const collections = formData.sections.find(
    (item): item is HomepageCollectionsSection => item.id === 'collections' && item.type === 'collections',
  );
  if (!collections) return null;

  const patchCollections = (patch: Partial<HomepageCollectionsSection>) => {
    updateSection('collections', (section) => (section.type === 'collections' ? { ...section, ...patch } : section));
  };

  return (
    <SectionCard
      title="Collections"
      description="Curated roundup rail"
      icon={BookOpen}
      enabled={collections.enabled}
      onEnabledChange={(checked) => patchCollections({ enabled: checked })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="collectionsTitle"
          label="Section Title"
          value={collections.title}
          onChange={(e) => patchCollections({ title: e.target.value })}
          placeholder="Recipe Collections"
        />
        <FormField
          id="collectionsSubtitle"
          label="Subtitle"
          value={collections.subtitle}
          onChange={(e) => patchCollections({ subtitle: e.target.value })}
          placeholder="Roundups and seasonal sets"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground/80">Manual Roundup References</Label>
        <RoundupRefList refs={collections.refs} onChange={(refs) => patchCollections({ refs })} />
      </div>
    </SectionCard>
  );
};

export default CollectionsSection;
