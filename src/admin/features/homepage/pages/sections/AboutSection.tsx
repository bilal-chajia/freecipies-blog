import { SectionCard } from '@admin/features/homepage/components';
import { AuthorPicker } from '@admin/components/pickers';
import { UserRound } from 'lucide-react';
import { Label } from '@/ui/label';
import type { HomepageAboutAuthorSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const AboutSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const about = formData.sections.find(
    (item): item is HomepageAboutAuthorSection => item.id === 'about' && item.type === 'about_author',
  );
  if (!about) return null;

  const patchAbout = (patch: Partial<HomepageAboutAuthorSection>) => {
    updateSection('about', (section) => (section.type === 'about_author' ? { ...section, ...patch } : section));
  };

  return (
    <SectionCard
      title="About Author"
      description="Homepage author band"
      icon={UserRound}
      enabled={about.enabled}
      onEnabledChange={(checked) => patchAbout({ enabled: checked })}
    >
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-foreground/80">Featured Author</Label>
        <AuthorPicker
          value={about.author_id}
          onChange={(authorId) => patchAbout({ author_id: authorId })}
        />
        <p className="text-xs text-muted-foreground">Clear the picker to fall back to the site's featured author.</p>
      </div>
    </SectionCard>
  );
};

export default AboutSection;
