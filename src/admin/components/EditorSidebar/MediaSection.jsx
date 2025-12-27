import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { toAdminImageUrl, toAdminSrcSet } from '../../utils/helpers';

export default function MediaSection({
    formData,
    imagesData,
    onInputChange,
    onImageRemove,
    onMediaDialogOpen,
}) {
    const featured = extractImage(imagesData, 'thumbnail', 720);
    const featuredSrcSet = toAdminSrcSet(getImageSrcSet(imagesData, 'thumbnail'));
    const featuredUrl = toAdminImageUrl(featured.imageUrl || formData.imageUrl);
    const featuredAlt = formData.imageAlt || featured.imageAlt || 'Featured';
    const featuredSizes = featuredSrcSet ? '320px' : undefined;

    const cover = extractImage(imagesData, 'cover', 1200);
    const coverSrcSet = toAdminSrcSet(getImageSrcSet(imagesData, 'cover'));
    const coverUrl = toAdminImageUrl(cover.imageUrl || formData.coverUrl);
    const coverAlt = formData.coverAlt || cover.imageAlt || 'Cover';
    const coverSizes = coverSrcSet ? '320px' : undefined;

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Featured Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                {/* Featured Image */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Featured Image</Label>
                    {featuredUrl ? (
                        <div className="relative group">
                            <img
                                src={featuredUrl}
                                alt={featuredAlt}
                                width={featured.imageWidth || 720}
                                height={featured.imageHeight || 405}
                                srcSet={featuredSrcSet || undefined}
                                sizes={featuredSizes}
                                className="w-full h-36 object-cover rounded-lg border shadow-sm"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onMediaDialogOpen('image')}
                                    className="h-8"
                                >
                                    Change
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        onImageRemove?.('image');
                                    }}
                                    className="h-8"
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => onMediaDialogOpen('image')}
                            className="w-full h-36 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-accent hover:border-primary/20 transition-all"
                        >
                            <ImageIcon className="w-10 h-10 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">Add Image</span>
                        </button>
                    )}

                    <Input
                        placeholder="Alt text"
                        value={formData.imageAlt}
                        onChange={(e) => onInputChange('imageAlt', e.target.value)}
                        className="text-sm h-9"
                    />
                </div>

                {/* Cover Image */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium">Cover Image (Optional)</Label>
                    {coverUrl ? (
                        <div className="relative group">
                            <img
                                src={coverUrl}
                                alt={coverAlt}
                                width={cover.imageWidth || 1200}
                                height={cover.imageHeight || 675}
                                srcSet={coverSrcSet || undefined}
                                sizes={coverSizes}
                                className="w-full h-28 object-cover rounded-lg border shadow-sm"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => onMediaDialogOpen('cover')}
                                    className="h-8"
                                >
                                    Change
                                </Button>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                        onImageRemove?.('cover');
                                    }}
                                    className="h-8"
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => onMediaDialogOpen('cover')}
                            className="w-full h-28 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-1.5 hover:bg-accent hover:border-primary/20 transition-all"
                        >
                            <ImageIcon className="w-8 h-8 text-muted-foreground" />
                            <span className="text-xs font-medium text-muted-foreground">Add Cover</span>
                        </button>
                    )}

                    <Input
                        placeholder="Alt text"
                        value={formData.coverAlt}
                        onChange={(e) => onInputChange('coverAlt', e.target.value)}
                        className="text-sm h-9"
                    />
                </div>
            </CardContent>
        </Card>
    );
}
