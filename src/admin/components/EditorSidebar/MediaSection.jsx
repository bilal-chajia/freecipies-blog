import { Image as ImageIcon } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { extractImage, getImageSrcSet } from '@shared/utils';
import { buildImageStyle, toAdminImageUrl, toAdminSrcSet } from '../../utils/helpers';

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
    const featuredStyle = buildImageStyle(featured);

    const cover = extractImage(imagesData, 'cover', 1200);
    const coverSrcSet = toAdminSrcSet(getImageSrcSet(imagesData, 'cover'));
    const coverUrl = toAdminImageUrl(cover.imageUrl || formData.coverUrl);
    const coverAlt = formData.coverAlt || cover.imageAlt || 'Cover';
    const coverSizes = coverSrcSet ? '320px' : undefined;
    const coverStyle = buildImageStyle(cover);

    return (
        <div className="grid grid-cols-2 gap-4">
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
                            className="w-full h-40 object-cover rounded-lg border shadow-sm"
                            style={featuredStyle}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => onMediaDialogOpen('image')}
                                className="h-7 text-xs"
                            >
                                Change
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    onImageRemove?.('image');
                                }}
                                className="h-7 text-xs"
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => onMediaDialogOpen('image')}
                        className="w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-accent hover:border-primary/20 transition-all"
                    >
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Add Image</span>
                    </button>
                )}

                <Input
                    placeholder="Alt text"
                    value={formData.imageAlt}
                    onChange={(e) => onInputChange('imageAlt', e.target.value)}
                    className="text-sm h-8"
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
                            className="w-full h-40 object-cover rounded-lg border shadow-sm"
                            style={coverStyle}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => onMediaDialogOpen('cover')}
                                className="h-7 text-xs"
                            >
                                Change
                            </Button>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    onImageRemove?.('cover');
                                }}
                                className="h-7 text-xs"
                            >
                                Remove
                            </Button>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => onMediaDialogOpen('cover')}
                        className="w-full h-40 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-accent hover:border-primary/20 transition-all"
                    >
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Add Cover</span>
                    </button>
                )}

                <Input
                    placeholder="Alt text"
                    value={formData.coverAlt}
                    onChange={(e) => onInputChange('coverAlt', e.target.value)}
                    className="text-sm h-8"
                />
            </div>
        </div>
    );
}
