import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { Mail } from 'lucide-react';
import type { HomepageNewsletterSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const NewsletterSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const newsletter = formData.sections.find(
    (item): item is HomepageNewsletterSection => item.id === 'newsletter' && item.type === 'newsletter',
  );
  if (!newsletter) return null;

  const patchNewsletter = (patch: Partial<HomepageNewsletterSection>) => {
    updateSection('newsletter', (section) => (section.type === 'newsletter' ? { ...section, ...patch } : section));
  };

  return (
    <SectionCard
      title="Newsletter"
      description="Email subscription form copy"
      icon={Mail}
      enabled={newsletter.enabled}
      onEnabledChange={(checked) => patchNewsletter({ enabled: checked })}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          id="nlTitle"
          label="Title"
          value={newsletter.title}
          onChange={(e) => patchNewsletter({ title: e.target.value })}
          placeholder="Get New Recipes Weekly"
        />
        <FormField
          id="nlButton"
          label="Button Text"
          value={newsletter.button_text}
          onChange={(e) => patchNewsletter({ button_text: e.target.value })}
          placeholder="Subscribe"
        />
      </div>

      <FormField
        id="nlSubtitle"
        label="Subtitle"
        multiline
        rows={2}
        value={newsletter.subtitle}
        onChange={(e) => patchNewsletter({ subtitle: e.target.value })}
        placeholder="Subscribe to receive delicious recipes straight to your inbox."
      />

      <FormField
        id="nlPlaceholder"
        label="Input Placeholder"
        value={newsletter.placeholder_text}
        onChange={(e) => patchNewsletter({ placeholder_text: e.target.value })}
        placeholder="Your email address"
      />
    </SectionCard>
  );
};

export default NewsletterSection;
