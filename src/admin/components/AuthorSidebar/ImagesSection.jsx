import { Image as ImageIcon, Upload, X } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';

export default function ImagesSection({
    imagesData,
    onImageChange,
    onImageRemove,
    onMediaDialogOpen,
}) {
    const { avatar, cover, banner } = imagesData || {};

    const ImageUploadArea = ({ type, image, label, heightClass = "h-36" }) => (
        <div className="space-y-2">
            <Label className="text-sm font-medium">{label}</Label>
            {image?.url ? (
                <div className="relative group">
                    <img
                        src={image.url}
                        alt={image.alt || label}
                        className={`w-full ${heightClass} object-cover rounded-lg border shadow-sm`}
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

            {image?.url && (
                <Input
                    placeholder="Alt text"
                    value={image.alt || ''}
                    onChange={(e) => onImageChange(type, { ...image, alt: e.target.value })}
                    className="text-sm h-9"
                />
            )}
        </div>
    );

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
                />

                <ImageUploadArea
                    type="cover"
                    image={cover}
                    label="Cover Image (Optional)"
                    heightClass="h-28"
                />

                <ImageUploadArea
                    type="banner"
                    image={banner}
                    label="Banner (Optional)"
                    heightClass="h-24"
                />
            </CardContent>
        </Card>
    );
}
