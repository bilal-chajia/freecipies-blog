import { FormField } from '@admin/features/settings/components';
import { FaqItemList, SectionCard } from '@admin/features/homepage/components';
import { HelpCircle } from 'lucide-react';
import type { HomepageFaqSection } from '@modules/settings/types/settings.types';
import type { HomepageSectionProps } from '../../types';

const FaqSection = ({ formData, updateSection }: HomepageSectionProps) => {
  const faq = formData.sections.find((item): item is HomepageFaqSection => item.id === 'faq' && item.type === 'faq');
  if (!faq) return null;

  const patchFaq = (patch: Partial<HomepageFaqSection>) => {
    updateSection('faq', (section) => (section.type === 'faq' ? { ...section, ...patch } : section));
  };

  return (
    <SectionCard
      title="FAQ"
      description="Answer common reader questions."
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

      <FaqItemList items={faq.items} onChange={(items) => patchFaq({ items })} />
    </SectionCard>
  );
};

export default FaqSection;
