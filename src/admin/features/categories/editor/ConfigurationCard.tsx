import { useState, type ChangeEvent } from 'react';
import { Settings } from 'lucide-react';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import ColorPicker from '@/components/ColorPicker';
import type { CategoryFormData, CategoryRecord, FormChangeHandler } from './types';

interface ConfigurationCardProps {
  formData: CategoryFormData;
  parentOptions: CategoryRecord[];
  parentLoading: boolean;
  isEditMode: boolean;
  currentSlug?: string;
  onChange: FormChangeHandler;
}

const ConfigurationCard = ({
  formData,
  parentOptions,
  parentLoading,
  isEditMode,
  currentSlug,
  onChange,
}: ConfigurationCardProps) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const color = formData.color || '#ff6b35ff';

  return (
    <Card className="border-0 shadow-sm ring-1 ring-border/50">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-500/10 rounded-md">
            <Settings className="w-4 h-4 text-orange-500" />
          </div>
          <CardTitle className="text-base">Configuration</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Parent Category</Label>
            <Select
              value={formData.parent_id === null ? '__none__' : String(formData.parent_id)}
              onValueChange={(value: string) =>
                onChange('parent_id', value === '__none__' ? null : parseInt(value, 10))
              }
              disabled={parentLoading}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {parentOptions
                  .filter((cat) => !isEditMode || cat.slug !== currentSlug)
                  .map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Sort Order</Label>
            <Input
              type="number"
              value={formData.displayOrder}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onChange('displayOrder', parseInt(e.target.value, 10) || 0)
              }
              className="h-9"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Collection Title</Label>
          <Input
            value={formData.collection_title}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('collection_title', e.target.value)}
            placeholder="e.g. Latest Recipes"
            className="h-9"
          />
          <p className="text-xs text-muted-foreground">Heading above the article grid.</p>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Badge Color</Label>
          <div className="flex items-center gap-3 relative">
            <div
              className="w-10 h-9 rounded border cursor-pointer hover:ring-2 hover:ring-primary/50"
              style={{ backgroundColor: color }}
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Click to change color"
            />
            <Input
              value={color}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onChange('color', e.target.value)}
              placeholder="#ff6b35ff"
              className="h-9 font-mono text-sm flex-1"
            />
            {showColorPicker && (
              <ColorPicker
                color={color}
                onChange={(value: string | null) => onChange('color', value || '#ff6b35ff')}
                onClose={() => setShowColorPicker(false)}
                className="top-12 left-0"
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">Color used for category badges</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="workflow_status" className="text-sm font-medium">Status</Label>
            <Select
              value={formData.workflow_status}
              onValueChange={(value: string) => onChange('workflow_status', value)}
            >
              <SelectTrigger id="workflow_status" className="h-10">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-md border px-3 py-2 h-[52px] mt-auto">
            <div>
              <p className="text-sm font-medium">Featured</p>
              <p className="text-xs text-muted-foreground">Show in featured blocks</p>
            </div>
            <Switch
              checked={formData.is_featured}
              onCheckedChange={(checked: boolean) => onChange('is_featured', checked)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConfigurationCard;
