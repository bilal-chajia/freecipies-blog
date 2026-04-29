import { Camera, Bird, Users, Globe, Play } from 'lucide-react';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';

export default function SocialLinksSection({ socialLinks, onSocialChange }) {
    const links = [
        { id: 'instagram', label: 'Instagram', icon: Camera, placeholder: '@username' },
        { id: 'twitter', label: 'Twitter', icon: Bird, placeholder: '@username' },
        { id: 'facebook', label: 'Facebook', icon: Users, placeholder: 'username or URL' },
        { id: 'website', label: 'Website', icon: Globe, placeholder: 'https://...' },
        { id: 'youtube', label: 'YouTube', icon: Play, placeholder: 'channel name or URL' },
    ];

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
                {links.map(({ id, label, icon: Icon, placeholder }) => (
                    <div key={id} className="space-y-1.5">
                        <Label htmlFor={id} className="text-sm font-medium flex items-center gap-1.5">
                            <Icon className="size-3.5" />
                            {label}
                        </Label>
                        <Input
                            id={id}
                            value={socialLinks?.[id] || ''}
                            onChange={(e) => onSocialChange({ ...socialLinks, [id]: e.target.value })}
                            placeholder={placeholder}
                            className="text-sm h-8"
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
