import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { Grid } from 'lucide-react';
import type { HomepageCategoryBrowseSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const CategoriesSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const categories = formData.sections.find(
    (item): item is HomepageCategoryBrowseSection => item.id === 'categories' && item.type === 'category_browse',
  );
  if (!categories) return null;

  const patchCategories = (patch: Partial<HomepageCategoryBrowseSection>) => {
    updateSection('categories', (section) => (section.type === 'category_browse' ? { ...section, ...patch } : section));
  };

  return (
    <SectionCard
      title="Categories"
      description="Quick navigation blocks for browsing by category"
      icon={Grid}
      enabled={categories.enabled}
      onEnabledChange={(checked) => patchCategories({ enabled: checked })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="catTitle"
          label="Section Title"
          value={categories.title}
          onChange={(e) => patchCategories({ title: e.target.value })}
          placeholder="Browse by Category"
        />
        <FormField
          id="catSubtitle"
          label="Subtitle"
          value={categories.subtitle}
          onChange={(e) => patchCategories({ subtitle: e.target.value })}
          placeholder="Find what interests you most"
        />
      </div>

      <FormField
        id="catMax"
        label="Max Categories"
        type="number"
        min={1}
        max={24}
        value={categories.max}
        onChange={(e) => patchCategories({ max: Number.parseInt(e.target.value, 10) || 1 })}
      />
    </SectionCard>
  );
};

export default CategoriesSection;
