import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { UserRound } from 'lucide-react';
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
      <FormField
        id="aboutAuthorId"
        label="Author ID"
        type="number"
        min={1}
        value={about.author_id ?? ''}
        onChange={(e) => patchAbout({ author_id: e.target.value ? Number.parseInt(e.target.value, 10) : null })}
        placeholder="Blank uses featured author"
        description="Leave blank to use the featured author fallback. Full author picker wiring is the next P2 task."
      />
    </SectionCard>
  );
};

export default AboutSection;
