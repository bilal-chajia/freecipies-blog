import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { buildImageStyle, toAdminImageUrl, toAdminSrcSet } from '../../utils/helpers';

export default function ImagesSection({
    imagesData,
    onImageChange,
    onImageRemove,
    onMediaDialogOpen,
}) {
    const { avatar, cover, banner } = imagesData || {};

    const ImageUploadArea = ({ type, image, label, heightClass = "h-36", targetWidth = 720 }) => {
        const preview = extractImage(image ? { [type]: image } : null, type, targetWidth);
        const srcSet = toAdminSrcSet(getImageSrcSet(image ? { [type]: image } : null, type));
        const previewUrl = toAdminImageUrl(preview.imageUrl || image?.url);
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
                            alt={image?.alt || label}
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
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Add Image</span>
                    </button>
                )}

                {previewUrl && (
                    <Input
                        placeholder="Alt text"
                        value={image?.alt || ''}
                        onChange={(e) => onImageChange(type, { ...image, alt: e.target.value })}
                        className="text-sm h-9"
                    />
                )}
            </div>
        );
    };

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
                />

                <ImageUploadArea
                    type="cover"
                    image={cover}
                    label="Cover Image (Optional)"
                    heightClass="h-28"
                    targetWidth={720}
                />

                <ImageUploadArea
                    type="banner"
                    image={banner}
                    label="Banner (Optional)"
                    heightClass="h-24"
                    targetWidth={720}
                />
            </CardContent>
        </Card>
    );
}
