import type { ChangeEvent } from 'react';
import { Globe } from 'lucide-react';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Switch } from '@/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import type { CategoryFormData, FormChangeHandler } from './types';

interface SeoCardProps {
  formData: CategoryFormData;
  onChange: FormChangeHandler;
}

const counterClass = (length: number, max: number) =>
  length > max ? 'text-[10px] text-destructive text-right' : 'text-[10px] text-muted-foreground text-right';

const SeoCard = ({ formData, onChange }: SeoCardProps) => (
  <Card className="border-0 shadow-sm ring-1 ring-border/50">
    <CardHeader className="pb-3 border-b">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-primary/10 rounded-md">
          <Globe className="size-4 text-primary" />
        </div>
        <CardTitle className="text-base">SEO Settings</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-5 pt-5">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Meta Title</Label>
        <Input
          value={formData.metaTitle}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('metaTitle', e.target.value)}
          placeholder="SEO optimized title"
          className="h-9"
        />
        <p className={counterClass(formData.metaTitle.length, 60)}>
          {formData.metaTitle.length}/60 characters
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Meta Description</Label>
        <Textarea
          value={formData.metaDescription}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange('metaDescription', e.target.value)}
          rows={3}
          placeholder="SEO optimized description"
          className="resize-none min-h-[80px]"
        />
        <p className={counterClass(formData.metaDescription.length, 160)}>
          {formData.metaDescription.length}/160 characters
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">Canonical URL</Label>
        <Input
          value={formData.canonicalUrl}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('canonicalUrl', e.target.value)}
          placeholder="https://example.com/categories/breakfast"
          className="h-9"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">OG Image URL</Label>
          <Input
            value={formData.ogImage}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('ogImage', e.target.value)}
            placeholder="https://cdn.example.com/og-image.jpg"
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">OG Title</Label>
          <Input
            value={formData.ogTitle}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('ogTitle', e.target.value)}
            placeholder="Social share title"
            className="h-9"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">OG Description</Label>
        <Textarea
          value={formData.ogDescription}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange('ogDescription', e.target.value)}
          rows={2}
          placeholder="Social share description"
          className="resize-none min-h-[60px]"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Twitter Card</Label>
          <Select
            value={formData.twitterCard}
            onValueChange={(value: string) => onChange('twitterCard', value)}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">summary</SelectItem>
              <SelectItem value="summary_large_image">summary_large_image</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Robots</Label>
          <Input
            value={formData.robots}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('robots', e.target.value)}
            placeholder="e.g., noindex,nofollow"
            className="h-9"
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <p className="text-sm font-medium">No Index</p>
          <p className="text-xs text-muted-foreground">Hide from search engines</p>
        </div>
        <Switch
          checked={formData.noIndex}
          onCheckedChange={(checked: boolean) => onChange('noIndex', checked)}
        />
      </div>
    </CardContent>
  </Card>
);

export default SeoCard;
