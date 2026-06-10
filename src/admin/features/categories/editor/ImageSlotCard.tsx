import type { ChangeEvent } from 'react';
import { ImageIcon, Upload, FolderOpen } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { buildImageStyle, toAdminImageUrl, toAdminSrcSet } from '../../../utils/helpers';
import type { CategoryImageSlot, CategoryImageTarget } from './types';

interface ImageSlotCardProps {
  slot: CategoryImageTarget;
  title: string;
  /** Tailwind accent classes for the header icon, e.g. "bg-purple-500/10" + "text-purple-500". */
  accentBg: string;
  accentText: string;
  image: CategoryImageSlot | null;
  fallbackAlt: string;
  onUploadClick: () => void;
  onLibraryClick: () => void;
  onRemove: () => void;
  onAltChange: (alt: string) => void;
}

const ImageSlotCard = ({
  slot,
  title,
  accentBg,
  accentText,
  image,
  fallbackAlt,
  onUploadClick,
  onLibraryClick,
  onRemove,
  onAltChange,
}: ImageSlotCardProps) => {
  const slotJson = image ? JSON.stringify({ [slot]: image }) : null;
  const preview = extractImage(slotJson, slot, 1200);
  const previewSrcSet = toAdminSrcSet(getImageSrcSet(slotJson, slot));
  const previewUrl = toAdminImageUrl(preview.image_url || image?.url);
  const previewAlt = image?.alt || fallbackAlt;
  const previewStyle = buildImageStyle(preview);

  return (
    <Card className="border-0 shadow-sm ring-1 ring-border/50 overflow-hidden">
      <CardHeader className="pb-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-md ${accentBg}`}>
            <ImageIcon className={`w-4 h-4 ${accentText}`} />
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {previewUrl ? (
          <div className="relative group">
            <img
              src={previewUrl}
              alt={previewAlt}
              width={preview.imageWidth || 1200}
              height={preview.imageHeight || 675}
              srcSet={previewSrcSet || undefined}
              sizes={previewSrcSet ? '400px' : undefined}
              className="w-full aspect-video object-cover transition-opacity"
              style={previewStyle}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-sm">
              <Button variant="secondary" size="sm" className="h-8" onClick={onUploadClick}>
                Change
              </Button>
              <Button variant="destructive" size="sm" className="h-8" onClick={onRemove}>
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div
              className="flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/30 transition-colors rounded-lg py-6"
              onClick={onUploadClick}
            >
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1 text-sm">Upload {title}</h3>
              <p className="text-[11px] text-muted-foreground mb-1 max-w-[180px]">
                Click to open the image uploader
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or select from library</span>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={onLibraryClick}
              className="w-full h-8 text-xs"
            >
              <FolderOpen className="w-3 h-3 mr-2" />
              Select from Library
            </Button>
          </div>
        )}
        <div className="p-3 space-y-2 bg-muted/10">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">Alt Text</Label>
            <Input
              value={image?.alt || ''}
              onChange={(e: ChangeEvent<HTMLInputElement>) => onAltChange(e.target.value)}
              placeholder="Describe the image"
              className="h-8 text-xs"
              disabled={!image}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageSlotCard;
