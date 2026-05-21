import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Users, Bird, Camera, Play, Hash, ExternalLink, Globe, Info, Share2 } from 'lucide-react';

// Tabs configuration for this settings page
export const socialSettingsTabs = [
  { value: 'platforms', label: 'Social Platforms', icon: Share2 },
];

interface SocialSettingsProps {
  formData: Record<string, unknown>;
  handleInputChange: (field: string, value: unknown) => void;
  activeSection?: string;
  setHeaderActions?: React.Dispatch<React.SetStateAction<React.ReactNode>>;
}

const SocialSettings = ({ formData, handleInputChange }: SocialSettingsProps) => {
  const socialPlatforms = [
    { id: 'facebookUrl', label: 'Facebook', icon: Users, color: 'text-[#1877F2]', placeholder: 'https://facebook.com/yourpage' },
    { id: 'twitterUrl', label: 'Twitter (X)', icon: Bird, color: 'text-foreground', placeholder: 'https://twitter.com/yourhandle' },
    { id: 'instagramUrl', label: 'Instagram', icon: Camera, color: 'text-[#E4405F]', placeholder: 'https://instagram.com/yourhandle' },
    { id: 'pinterestUrl', label: 'Pinterest', icon: Hash, color: 'text-[#BD081C]', placeholder: 'https://pinterest.com/yourprofile' },
    { id: 'youtubeUrl', label: 'YouTube', icon: Play, color: 'text-[#FF0000]', placeholder: 'https://youtube.com/yourchannel' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {socialPlatforms.map((platform) => (
          <div key={platform.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={platform.id} className="text-xs font-medium flex items-center gap-1.5">
                <platform.icon className={`w-3.5 h-3.5 ${platform.color}`} aria-hidden={true} />
                {platform.label}
              </Label>
              {formData[platform.id] as string && (
                <a
                  href={formData[platform.id] as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                >
                  Verify <ExternalLink className="w-2.5 h-2.5" aria-hidden={true} />
                </a>
              )}
            </div>
            <Input
              id={platform.id}
              value={formData[platform.id] as string}
              onChange={(e) => handleInputChange(platform.id, e.target.value)}
              placeholder={platform.placeholder}
              className="h-8 text-sm"
            />
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 p-2.5 bg-muted/50 rounded-md text-xs text-muted-foreground">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden={true} />
        Links appear in your site's header, footer, and article share components.
      </div>
    </div>
  );
};

export default SocialSettings;
