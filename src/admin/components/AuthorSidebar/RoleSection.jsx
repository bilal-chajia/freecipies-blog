import { Label } from '@/ui/label.jsx';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/ui/select.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';

export default function RoleSection({ formData, onInputChange }) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Role & Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                <div className="space-y-1.5">
                    <Label htmlFor="role" className="text-sm font-medium">Author Role</Label>
                    <Select
                        value={formData.role || 'guest'}
                        onValueChange={(value) => onInputChange('role', value)}
                    >
                        <SelectTrigger className="text-sm h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">👑 Admin</SelectItem>
                            <SelectItem value="editor">✏️ Editor</SelectItem>
                            <SelectItem value="guest">👤 Guest Contributor</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Display-only designation (doesn't affect permissions)</p>
                </div>
            </CardContent>
        </Card>
    );
}
