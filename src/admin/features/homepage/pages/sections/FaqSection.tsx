import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { HelpCircle } from 'lucide-react';
import type { HomepageFaqSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const FaqSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const faq = formData.sections.find((item): item is HomepageFaqSection => item.id === 'faq' && item.type === 'faq');
  if (!faq) return null;

  const patchFaq = (patch: Partial<HomepageFaqSection>) => {
    updateSection('faq', (section) => (section.type === 'faq' ? { ...section, ...patch } : section));
  };

  const serializedItems = faq.items.map((item) => `${item.question}\n${item.answer}`).join('\n\n');

  return (
    <SectionCard
      title="FAQ"
      description="Homepage FAQ content. Public rendering lands in P3."
      icon={HelpCircle}
      enabled={faq.enabled}
      onEnabledChange={(checked) => patchFaq({ enabled: checked })}
    >
      <FormField
        id="faqTitle"
        label="Section Title"
        value={faq.title}
        onChange={(e) => patchFaq({ title: e.target.value })}
        placeholder="Frequently Asked Questions"
      />

      <FormField
        id="faqItems"
        label="FAQ Items"
        multiline
        rows={8}
        value={serializedItems}
        onChange={() => undefined}
        placeholder="FAQ item editor lands in P3"
        description="Existing FAQ items are preserved on save. The structured item editor is part of P3."
      />
    </SectionCard>
  );
};

export default FaqSection;
