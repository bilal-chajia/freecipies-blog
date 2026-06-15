import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import type { HomepageSectionProps } from '../../types';

const SeoSection = ({ formData, updateSeo }: HomepageSectionProps) => {
  const { seo } = formData;

  return (
    <SectionCard
      title="SEO Settings"
      description="Search engine optimization for the homepage"
      icon={Search}
    >
      <FormField
        id="seoTitle"
        label="Meta Title"
        value={seo.meta_title}
        onChange={(e) => updateSeo({ meta_title: e.target.value })}
        placeholder="Homepage - My Blog"
        description="Recommended: 50-60 characters"
      />

      <FormField
        id="seoDesc"
        label="Meta Description"
        multiline
        rows={3}
        value={seo.meta_description}
        onChange={(e) => updateSeo({ meta_description: e.target.value })}
        placeholder="Discover amazing recipes..."
        description="Recommended: 150-160 characters"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="seoCanonical"
          label="Canonical URL"
          value={seo.canonical}
          onChange={(e) => updateSeo({ canonical: e.target.value })}
          placeholder="https://example.com"
        />
        <FormField
          id="seoOg"
          label="OG Image URL"
          value={seo.og_image}
          onChange={(e) => updateSeo({ og_image: e.target.value })}
          placeholder="https://..."
          description="1200x630px recommended"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="seoOgTitle"
          label="OG Title"
          value={seo.og_title}
          onChange={(e) => updateSeo({ og_title: e.target.value })}
          placeholder="Homepage title for social previews"
        />
        <FormField
          id="seoOgDescription"
          label="OG Description"
          value={seo.og_description}
          onChange={(e) => updateSeo({ og_description: e.target.value })}
          placeholder="Homepage description for social previews"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground/80">Twitter Card</Label>
          <Select
            value={seo.twitter_card}
            onValueChange={(value: 'summary' | 'summary_large_image') => updateSeo({ twitter_card: value })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="summary_large_image">Summary large image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border/40 bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">No index</p>
            <p className="text-xs text-muted-foreground">Ask search engines not to index the homepage</p>
          </div>
          <Switch checked={seo.no_index} onCheckedChange={(checked) => updateSeo({ no_index: checked })} />
        </div>
      </div>
    </SectionCard>
  );
};

export default SeoSection;
