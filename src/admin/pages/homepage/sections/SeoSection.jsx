/**
 * SeoSection - Homepage SEO configuration
 */

import React from 'react';
import { FormField } from '@/components/settings';
import { SectionCard } from '@/components/homepage';
import { Search } from 'lucide-react';

const SeoSection = ({ formData, handleNestedInputChange }) => {
    return (
        <SectionCard
            title="SEO Settings"
            description="Search engine optimization for the homepage"
            icon={Search}
        >
            <FormField
                id="seoTitle"
                label="Meta Title"
                value={formData.seo.metaTitle}
                onChange={(e) => handleNestedInputChange('seo', 'metaTitle', e.target.value)}
                placeholder="Homepage - My Blog"
                description="Recommended: 50-60 characters"
            />

            <FormField
                id="seoDesc"
                label="Meta Description"
                multiline
                rows={3}
                value={formData.seo.metaDescription}
                onChange={(e) => handleNestedInputChange('seo', 'metaDescription', e.target.value)}
                placeholder="Discover amazing content..."
                description="Recommended: 150-160 characters"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                    id="seoCanonical"
                    label="Canonical URL"
                    value={formData.seo.canonicalUrl}
                    onChange={(e) => handleNestedInputChange('seo', 'canonicalUrl', e.target.value)}
                    placeholder="https://example.com"
                />
                <FormField
                    id="seoOg"
                    label="OG Image URL"
                    value={formData.seo.ogImage}
                    onChange={(e) => handleNestedInputChange('seo', 'ogImage', e.target.value)}
                    placeholder="https://..."
                    description="1200x630px recommended"
                />
            </div>
        </SectionCard>
    );
};

export default SeoSection;
