import { Save } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import { Input } from '@/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

interface PublishingSectionProps {
  formData: {
    workflow_status?: string;
    is_featured?: boolean;
    sort_order?: number;
  };
  onInputChange: (field: string, value: unknown) => void;
  onSave: () => void;
  saving: boolean;
  isEditMode: boolean;
}

export default function PublishingSection({
    formData,
    onInputChange,
    onSave,
    saving,
    isEditMode
}: PublishingSectionProps) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                <Button
                    onClick={onSave}
                    disabled={saving}
                    className="w-full gap-2 h-10"
                >
                    <Save className="size-4" />
                    {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create Author')}
                </Button>

                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="workflow_status" className="text-sm font-medium">Status</Label>
                        <Select
                            value={formData.workflow_status || 'draft'}
                            onValueChange={(value) => onInputChange('workflow_status', value)}
                        >
                            <SelectTrigger id="workflow_status" className="h-8">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="is_featured" className="text-sm font-medium">Featured</Label>
                        <Switch
                            id="is_featured"
                            checked={formData.is_featured}
                            onCheckedChange={(checked) => onInputChange('is_featured', checked)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="sort_order" className="text-sm font-medium">Sort Order</Label>
                        <Input
                            id="sort_order"
                            type="number"
                            value={formData.sort_order || 0}
                            onChange={(e) => onInputChange('sort_order', parseInt(e.target.value) || 0)}
                            className="text-sm h-9"
                            min="0"
                        />
                        <p className="text-xs text-muted-foreground">Lower numbers appear first</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
