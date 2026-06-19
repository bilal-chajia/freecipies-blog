import { FormField } from '@admin/features/settings/components';
import { SectionCard, RecipeRefList } from '@admin/features/homepage/components';
import { Star } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Label } from '@/ui/label';
import type { HomepageFeaturedRecipesSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const FeaturedSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const featured = formData.sections.find(
    (item): item is HomepageFeaturedRecipesSection => item.id === 'featured' && item.type === 'featured_recipes',
  );
  if (!featured) return null;

  const patchFeatured = (patch: Partial<HomepageFeaturedRecipesSection>) => {
    updateSection('featured', (section) => (section.type === 'featured_recipes' ? { ...section, ...patch } : section));
  };

  return (
    <SectionCard
      title="Featured Recipes"
      description="Curated or automatic featured recipe rail"
      icon={Star}
      enabled={featured.enabled}
      onEnabledChange={(checked) => patchFeatured({ enabled: checked })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="featuredTitle"
          label="Section Title"
          value={featured.title}
          onChange={(e) => patchFeatured({ title: e.target.value })}
          placeholder="Featured Recipes"
        />
        <FormField
          id="featuredSubtitle"
          label="Subtitle"
          value={featured.subtitle}
          onChange={(e) => patchFeatured({ subtitle: e.target.value })}
          placeholder="Handpicked for you"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground/80">Source</Label>
          <Select
            value={featured.source}
            onValueChange={(value: 'manual' | 'category' | 'latest') => patchFeatured({ source: value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Manual refs</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="latest">Latest</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <FormField
          id="featuredCategory"
          label="Category Slug"
          value={featured.category_slug ?? ''}
          onChange={(e) => patchFeatured({ category_slug: e.target.value.trim() || null })}
          placeholder="breakfast"
        />

        <FormField
          id="featuredCount"
          label="Count"
          type="number"
          min={1}
          max={24}
          value={featured.count}
          onChange={(e) => patchFeatured({ count: Number.parseInt(e.target.value, 10) || 1 })}
        />
      </div>

      {featured.source === 'manual' && (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground/80">Manual Recipe References</Label>
          <RecipeRefList refs={featured.refs} onChange={(refs) => patchFeatured({ refs })} />
        </div>
      )}
      {featured.source !== 'manual' && (
        <p className="text-xs text-muted-foreground">Refs are only used when source is Manual.</p>
      )}
    </SectionCard>
  );
};

export default FeaturedSection;
