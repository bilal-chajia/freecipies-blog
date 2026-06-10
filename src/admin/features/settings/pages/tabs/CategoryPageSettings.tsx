import { FormField, ToggleCard } from '@admin/features/settings/components';
import { PanelLeft, Filter, Navigation } from 'lucide-react';

interface CategoryPageSettingsProps {
  formData: Record<string, unknown>;
  handleInputChange: (field: string, value: unknown) => void;
}

const selectClass =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

/**
 * Global category page settings (uniform across all category pages).
 * Persists to site_settings.category_page_settings via PUT /api/settings/category-page.
 */
const CategoryPageSettings = ({ formData, handleInputChange }: CategoryPageSettingsProps) => {
  return (
    <div className="space-y-6 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          id="catPostsPerPage"
          label="Posts Per Page"
          type="number"
          value={formData.catPostsPerPage as number}
          onChange={(e) => handleInputChange('catPostsPerPage', parseInt(e.target.value, 10))}
          min={1}
          max={50}
          badge="1-50"
          suffix="items"
          description="Articles shown per category page."
        />

        <div className="space-y-1.5">
          <label htmlFor="catLayoutMode" className="text-sm font-medium">Layout</label>
          <select
            id="catLayoutMode"
            className={selectClass}
            value={(formData.catLayoutMode as string) || 'grid'}
            onChange={(e) => handleInputChange('catLayoutMode', e.target.value)}
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
            <option value="masonry">Masonry</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="catCardStyle" className="text-sm font-medium">Card Style</label>
          <select
            id="catCardStyle"
            className={selectClass}
            value={(formData.catCardStyle as string) || 'full'}
            onChange={(e) => handleInputChange('catCardStyle', e.target.value)}
          >
            <option value="full">Full</option>
            <option value="compact">Compact</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="catHeaderStyle" className="text-sm font-medium">Header Style</label>
          <select
            id="catHeaderStyle"
            className={selectClass}
            value={(formData.catHeaderStyle as string) || 'hero'}
            onChange={(e) => handleInputChange('catHeaderStyle', e.target.value)}
          >
            <option value="hero">Hero</option>
            <option value="minimal">Minimal</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="catSortBy" className="text-sm font-medium">Sort Articles By</label>
          <select
            id="catSortBy"
            className={selectClass}
            value={(formData.catSortBy as string) || 'published_at'}
            onChange={(e) => handleInputChange('catSortBy', e.target.value)}
          >
            <option value="published_at">Published date</option>
            <option value="title">Title</option>
            <option value="view_count">Views</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="catSortOrder" className="text-sm font-medium">Sort Order</label>
          <select
            id="catSortOrder"
            className={selectClass}
            value={(formData.catSortOrder as string) || 'desc'}
            onChange={(e) => handleInputChange('catSortOrder', e.target.value)}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>

      <div className="divide-y divide-border/40">
        <ToggleCard
          id="catShowSidebar"
          label="Show Sidebar"
          icon={PanelLeft}
          iconColor="text-primary"
          description="Display the sidebar (popular recipes, newsletter) on category pages."
          checked={(formData.catShowSidebar as boolean) ?? true}
          onCheckedChange={(checked) => handleInputChange('catShowSidebar', checked)}
        />
        <ToggleCard
          id="catShowFilters"
          label="Show Filters"
          icon={Filter}
          iconColor="text-primary"
          description="Display article filters on category pages."
          checked={(formData.catShowFilters as boolean) ?? true}
          onCheckedChange={(checked) => handleInputChange('catShowFilters', checked)}
        />
        <ToggleCard
          id="catShowBreadcrumb"
          label="Show Breadcrumb"
          icon={Navigation}
          iconColor="text-primary"
          description="Display breadcrumb navigation on category pages."
          checked={(formData.catShowBreadcrumb as boolean) ?? true}
          onCheckedChange={(checked) => handleInputChange('catShowBreadcrumb', checked)}
        />
      </div>
    </div>
  );
};

export default CategoryPageSettings;
