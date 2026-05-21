/**
 * NewsletterSection - Homepage Newsletter configuration
 */

import React from 'react';
import { FormField } from '@admin/features/settings/components';
import { SectionCard } from '@admin/features/homepage/components';
import { Mail } from 'lucide-react';

interface NewsletterSectionProps {
  formData: Record<string, unknown>;
  handleNestedInputChange: (field: string, value: unknown) => void;
}

const NewsletterSection = ({ formData, handleNestedInputChange }: NewsletterSectionProps) => {
    return (
        <SectionCard
            title="Newsletter"
            description="Email subscription form for your readers"
            icon={Mail}
            enabled={formData.newsletter.enabled}
            onEnabledChange={(checked) => handleNestedInputChange('newsletter', 'enabled', checked)}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="nlTitle"
                    label="Title"
                    value={formData.newsletter.title}
                    onChange={(e) => handleNestedInputChange('newsletter', 'title', e.target.value)}
                    placeholder="Stay Updated"
                />
                <FormField
                    id="nlSubtitle"
                    label="Subtitle"
                    value={formData.newsletter.subtitle}
                    onChange={(e) => handleNestedInputChange('newsletter', 'subtitle', e.target.value)}
                    placeholder="Get the latest recipes delivered"
                />
            </div>

            <FormField
                id="nlDesc"
                label="Description"
                multiline
                rows={2}
                value={formData.newsletter.description}
                onChange={(e) => handleNestedInputChange('newsletter', 'description', e.target.value)}
                placeholder="Subscribe to our newsletter for weekly recipes..."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="nlButton"
                    label="Button Text"
                    value={formData.newsletter.buttonText}
                    onChange={(e) => handleNestedInputChange('newsletter', 'buttonText', e.target.value)}
                    placeholder="Subscribe Now"
                />
                <FormField
                    id="nlPlaceholder"
                    label="Input Placeholder"
                    value={formData.newsletter.placeholderText}
                    onChange={(e) => handleNestedInputChange('newsletter', 'placeholderText', e.target.value)}
                    placeholder="Enter your email address"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="nlSuccess"
                    label="Success Message"
                    value={formData.newsletter.successMessage}
                    onChange={(e) => handleNestedInputChange('newsletter', 'successMessage', e.target.value)}
                    placeholder="Thank you for subscribing!"
                />
                <FormField
                    id="nlPrivacy"
                    label="Privacy Text"
                    value={formData.newsletter.privacyText}
                    onChange={(e) => handleNestedInputChange('newsletter', 'privacyText', e.target.value)}
                    placeholder="We respect your privacy."
                />
            </div>
        </SectionCard>
    );
};

export default NewsletterSection;
