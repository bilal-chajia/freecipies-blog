import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { BookOpen } from 'lucide-react';
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

      <FormField
        id="collectionsRefs"
        label="Manual Roundup References"
        multiline
        rows={5}
        value={collections.refs.map((ref) => `${ref.roundup_id} · ${ref.title}`).join('\n')}
        onChange={() => undefined}
        placeholder="Roundup pickers land in the next P2 pass"
        description="Current curated refs are preserved on save. Full roundup picker wiring is the next P2 task."
      />
    </SectionCard>
  );
};

export default CollectionsSection;
