import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';
import { Input } from '@/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { buildImageStyle, toAdminImageUrl, toAdminSrcSet } from '@admin/utils/helpers';

interface ImagesSectionProps {
  imagesData: Record<string, unknown>;
  onImageChange: (type: string, data: unknown) => void;
  onImageRemove: (type: string) => void;
  onMediaDialogOpen: (type: string) => void;
}

interface ImageUploadAreaProps {
  type: string;
  image: unknown;
  label: string;
  heightClass?: string;
  targetWidth?: number;
  onMediaDialogOpen: (type: string) => void;
  onImageChange: (type: string, data: unknown) => void;
  onImageRemove: (type: string) => void;
}

const ImageUploadArea = ({
  type,
  image,
  label,
  heightClass = "h-36",
  targetWidth = 720,
  onMediaDialogOpen,
  onImageChange,
  onImageRemove,
}: ImageUploadAreaProps) => {
  const imagesMap = image ? { [type]: image } : null;
  const preview = extractImage(imagesMap as string | null | undefined, type as 'avatar' | 'hero' | 'thumbnail', targetWidth);
  const srcSet = toAdminSrcSet(getImageSrcSet(imagesMap as string | null | undefined, type as 'avatar' | 'hero' | 'thumbnail'));
  const previewUrl = toAdminImageUrl(preview.imageUrl || (image as Record<string, string> | undefined)?.url);
  const sizes = srcSet ? '320px' : undefined;
  const fallbackHeight = type === 'avatar' ? targetWidth : Math.round(targetWidth * 0.56);
  const previewStyle = buildImageStyle(preview);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {previewUrl ? (
        <div className="relative group">
          <img
            src={previewUrl}
            alt={((image as Record<string, string> | undefined)?.alt) || label}
            width={preview.imageWidth || targetWidth}
            height={preview.imageHeight || fallbackHeight}
            srcSet={srcSet || undefined}
            sizes={sizes}
            className={`w-full ${heightClass} object-cover rounded-lg border shadow-sm`}
            style={previewStyle}
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onMediaDialogOpen(type)}
              className="h-8"
            >
              Change
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onImageRemove(type)}
              className="h-8"
            >
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onMediaDialogOpen(type)}
          className={`w-full ${heightClass} border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-accent hover:border-primary/20 transition-all`}
        >
          <ImageIcon className="size-8 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Add Image</span>
        </button>
      )}

      {previewUrl && (
        <Input
          placeholder="Alt text"
          value={((image as Record<string, string> | undefined)?.alt) || ''}
          onChange={(e) => onImageChange(type, { ...image as Record<string, unknown>, alt: e.target.value })}
          className="text-sm h-8"
        />
      )}
    </div>
  );
};

export default function ImagesSection({
  imagesData,
  onImageChange,
  onImageRemove,
  onMediaDialogOpen,
}: ImagesSectionProps) {
  const { avatar, hero } = imagesData || {};

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Images</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <ImageUploadArea
          type="avatar"
          image={avatar}
          label="Avatar (Square)"
          heightClass="h-36"
          targetWidth={240}
          onMediaDialogOpen={onMediaDialogOpen}
          onImageChange={onImageChange}
          onImageRemove={onImageRemove}
        />

        <ImageUploadArea
          type="hero"
          image={hero}
          label="Hero Image (Optional)"
          heightClass="h-28"
          targetWidth={720}
          onMediaDialogOpen={onMediaDialogOpen}
          onImageChange={onImageChange}
          onImageRemove={onImageRemove}
        />
      </CardContent>
    </Card>
  );
}
