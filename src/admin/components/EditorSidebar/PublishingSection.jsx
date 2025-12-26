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
                    {saving ? 'Saving...' : (isEditMode ? 'Update' : 'Publish')}
                </Button>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="isOnline" className="text-sm font-medium">Status</Label>
                        <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium ${formData.isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                                {formData.isOnline ? 'Online' : 'Draft'}
                            </span>
                            <Switch
                                id="isOnline"
                                checked={formData.isOnline}
                                onCheckedChange={(checked) => onInputChange('isOnline', checked)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="isFavorite" className="text-sm font-medium">Favorite</Label>
                        <Switch
                            id="isFavorite"
                            checked={formData.isFavorite}
                            onCheckedChange={(checked) => onInputChange('isFavorite', checked)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="publishedAt" className="text-sm font-medium">Published Date</Label>
                        <Input
                            id="publishedAt"
                            type="datetime-local"
                            value={formData.publishedAt}
                            onChange={(e) => onInputChange('publishedAt', e.target.value)}
                            className="text-sm h-9"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
