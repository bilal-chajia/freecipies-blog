import { Save } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Label } from '@/ui/label.jsx';
import { Switch } from '@/ui/switch.jsx';
import { Input } from '@/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';

export default function PublishingSection({
    formData,
    onInputChange,
    onSave,
    saving,
    isEditMode
}) {
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
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Create Author')}
                </Button>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="isOnline" className="text-sm font-medium">Visibility</Label>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${formData.isOnline ? 'text-emerald-600' : 'text-gray-500'}`}>
                                {formData.isOnline ? 'Live' : 'Hidden'}
                            </span>
                            <Switch
                                id="isOnline"
                                checked={formData.isOnline}
                                onCheckedChange={(checked) => onInputChange('isOnline', checked)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="isFeatured" className="text-sm font-medium">Featured</Label>
                        <Switch
                            id="isFeatured"
                            checked={formData.isFeatured}
                            onCheckedChange={(checked) => onInputChange('isFeatured', checked)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="sortOrder" className="text-sm font-medium">Sort Order</Label>
                        <Input
                            id="sortOrder"
                            type="number"
                            value={formData.sortOrder || 0}
                            onChange={(e) => onInputChange('sortOrder', parseInt(e.target.value) || 0)}
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
