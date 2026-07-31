import { FormField } from '@admin/features/settings/components';
import { QuickFilterList, SectionCard } from '@admin/features/homepage/components';
import { SlidersHorizontal } from 'lucide-react';
import type { HomepageQuickFiltersSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const QuickFiltersSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const quickFilters = formData.sections.find(
    (item): item is HomepageQuickFiltersSection => (
      item.id === 'quick_filters' && item.type === 'quick_filters'
    ),
  );
  if (!quickFilters) return null;

  const patchQuickFilters = (patch: Partial<HomepageQuickFiltersSection>) => {
    updateSection('quick_filters', (section) => (
      section.type === 'quick_filters' ? { ...section, ...patch } : section
    ));
  };

  return (
    <SectionCard
      title="Quick Filters"
      description="Add direct links to recipe listings."
      icon={SlidersHorizontal}
      enabled={quickFilters.enabled}
      onEnabledChange={(checked) => patchQuickFilters({ enabled: checked })}
    >
      <FormField
        id="quickFiltersTitle"
        label="Section Title"
        value={quickFilters.title}
        onChange={(event) => patchQuickFilters({ title: event.target.value })}
        placeholder="Explore recipes"
      />

      <QuickFilterList
        filters={quickFilters.filters}
        onChange={(filters) => patchQuickFilters({ filters })}
      />
    </SectionCard>
  );
};

export default QuickFiltersSection;
