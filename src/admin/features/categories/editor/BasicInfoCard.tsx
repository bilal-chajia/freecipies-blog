import type { ChangeEvent } from 'react';
import { Layout } from 'lucide-react';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import type { CategoryFormData, FormChangeHandler } from './types';

interface BasicInfoCardProps {
  formData: CategoryFormData;
  isEditMode: boolean;
  onChange: FormChangeHandler;
}

const BasicInfoCard = ({ formData, isEditMode, onChange }: BasicInfoCardProps) => (
  <Card className="border-0 shadow-sm ring-1 ring-border/50">
    <CardHeader className="pb-3 border-b">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary/10 rounded-md">
          <Layout className="size-4 text-primary" />
        </div>
        <CardTitle className="text-base">Basic Information</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-5 pt-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Label *</Label>
          <Input
            value={formData.label}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('label', e.target.value)}
            placeholder="e.g., Breakfast Recipes"
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Slug *</Label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-muted-foreground text-sm">/</span>
            <Input
              value={formData.slug}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('slug', e.target.value)}
              disabled={isEditMode}
              className="pl-6 h-9 font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Headline</Label>
        <Input
          value={formData.headline}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('headline', e.target.value)}
          placeholder="Catchy headline for the category page (H1)"
          className="h-9"
        />
        <p className="text-xs text-muted-foreground">Falls back to the label when empty.</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Short Description *</Label>
        <Textarea
          value={formData.short_description}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange('short_description', e.target.value)}
          rows={3}
          placeholder="Brief summary displayed on cards"
          className="resize-none min-h-[80px]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">TL;DR</Label>
        <Textarea
          value={formData.tldr}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange('tldr', e.target.value)}
          rows={2}
          placeholder="Optional intro shown at the top of the category page"
          className="resize-none min-h-[60px]"
        />
      </div>
    </CardContent>
  </Card>
);

export default BasicInfoCard;
