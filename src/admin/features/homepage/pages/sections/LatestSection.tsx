import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { Newspaper } from 'lucide-react';
import type { HomepageLatestSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const LatestSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const latest = formData.sections.find((item): item is HomepageLatestSection => item.id === 'latest' && item.type === 'latest');
  if (!latest) return null;

  const patchLatest = (patch: Partial<HomepageLatestSection>) => {
    updateSection('latest', (section) => (section.type === 'latest' ? { ...section, ...patch } : section));
  };

  return (
    <SectionCard
      title="Latest Recipes"
      description="Display your most recent recipes"
      icon={Newspaper}
      enabled={latest.enabled}
      onEnabledChange={(checked) => patchLatest({ enabled: checked })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="latestTitle"
          label="Section Title"
          value={latest.title}
          onChange={(e) => patchLatest({ title: e.target.value })}
          placeholder="Latest Recipes"
        />
        <FormField
          id="latestCount"
          label="Count"
          type="number"
          min={1}
          max={24}
          value={latest.count}
          onChange={(e) => patchLatest({ count: Number.parseInt(e.target.value, 10) || 1 })}
        />
      </div>
    </SectionCard>
  );
};

export default LatestSection;
