import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { LayoutPanelLeft, Search } from 'lucide-react';
import { Switch } from '@/ui/switch';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import type { HomepageHeroSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const HeroSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const hero = formData.sections.find((item): item is HomepageHeroSection => item.id === 'hero' && item.type === 'hero');
  if (!hero) return null;

  const patchHero = (patch: Partial<HomepageHeroSection>) => {
    updateSection('hero', (section) => (section.type === 'hero' ? { ...section, ...patch } : section));
  };

  return (
    <SectionCard
      title="Hero Section"
      description="Main homepage recipe showcase"
      icon={LayoutPanelLeft}
      enabled={hero.enabled}
      onEnabledChange={(checked) => patchHero({ enabled: checked })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-foreground/80">Mode</Label>
          <Select value={hero.mode} onValueChange={(value: 'slider' | 'grid') => patchHero({ mode: value })}>
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="slider">Slider</SelectItem>
              <SelectItem value="grid">Grid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border/40 bg-muted/30 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Search className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Show Search Bar</p>
              <p className="text-xs text-muted-foreground">Stored for P3 hero search wiring</p>
            </div>
          </div>
          <Switch checked={hero.show_search} onCheckedChange={(checked) => patchHero({ show_search: checked })} />
        </div>
      </div>

      <FormField
        id="heroRefs"
        label="Manual Recipe References"
        multiline
        rows={5}
        value={hero.refs.map((ref) => `${ref.article_id} · ${ref.headline}`).join('\n')}
        onChange={() => undefined}
        placeholder="Recipe pickers land in the next P2 pass"
        description="Current curated refs are preserved on save. Full recipe picker wiring is the next P2 task."
      />
    </SectionCard>
  );
};

export default HeroSection;
