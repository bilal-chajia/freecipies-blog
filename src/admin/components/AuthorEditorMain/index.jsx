import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';
import BlockEditor from '../BlockEditor';

export default function AuthorEditorMain({
    formData,
    onInputChange,
    bioData,
    onBioChange,
}) {
    return (
        <main className="space-y-8 p-8 max-w-4xl mx-auto pb-20">
            {/* Basic Information */}
            <div className="space-y-6">
                {/* Name & Email */}
                <div className="space-y-3">
                    <Input
                        value={formData.name}
                        onChange={(e) => onInputChange('name', e.target.value)}
                        placeholder="Author name..."
                        className="text-5xl font-bold border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 h-auto leading-tight"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={formData.email}
                            onChange={(e) => onInputChange('email', e.target.value)}
                            placeholder="author@example.com"
                            className="h-10"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="slug" className="text-sm font-medium">Slug *</Label>
                        <Input
                            id="slug"
                            value={formData.slug}
                            onChange={(e) => onInputChange('slug', e.target.value)}
                            placeholder="author-slug"
                            className="h-10"
                            disabled={formData.isEditMode}
                        />
                        {formData.isEditMode && (
                            <p className="text-xs text-muted-foreground">Slug cannot be changed</p>
                        )}
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="jobTitle" className="text-sm font-medium">Job Title</Label>
                    <Input
                        id="jobTitle"
                        value={formData.jobTitle || ''}
                        onChange={(e) => onInputChange('jobTitle', e.target.value)}
                        placeholder="e.g., Food Blogger, Chef, Recipe Developer"
                        className="h-10"
                    />
                </div>
            </div>

            <hr className="border-t-2 my-8" />

            {/* Bio Section */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-xl">Biography</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Headline */}
                    <div className="space-y-1.5">
                        <Label htmlFor="headline" className="text-sm font-medium">Headline</Label>
                        <Input
                            id="headline"
                            value={bioData?.headline || ''}
                            onChange={(e) => onBioChange({ ...bioData, headline: e.target.value })}
                            placeholder="Award-winning Food Blogger"
                            className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">Short catchy tagline</p>
                    </div>

                    {/* Subtitle */}
                    <div className="space-y-1.5">
                        <Label htmlFor="subtitle" className="text-sm font-medium">Subtitle</Label>
                        <Input
                            id="subtitle"
                            value={bioData?.subtitle || ''}
                            onChange={(e) => onBioChange({ ...bioData, subtitle: e.target.value })}
                            placeholder="Specializing in Italian Cuisine"
                            className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">Specialization or focus area</p>
                    </div>

                    {/* Short Introduction */}
                    <div className="space-y-1.5">
                        <Label htmlFor="introduction" className="text-sm font-medium">Introduction (Short)</Label>
                        <Textarea
                            id="introduction"
                            value={bioData?.introduction || ''}
                            onChange={(e) => onBioChange({ ...bioData, introduction: e.target.value })}
                            placeholder="Brief introduction paragraph for author cards..."
                            rows={3}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">Used in author cards and listings</p>
                    </div>

                    {/* Full Bio (BlockNote) */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">Full Biography</Label>
                        <div className="border rounded-lg overflow-hidden shadow-sm">
                            <BlockEditor
                                value={bioData?.fullBio || '{}'}
                                onChange={(value) => onBioChange({ ...bioData, fullBio: value })}
                                placeholder="Write the author's full biography here..."
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Rich text editor for detailed biography
                        </p>
                    </div>

                    {/* Expertise Tags */}
                    <div className="space-y-1.5">
                        <Label htmlFor="expertise" className="text-sm font-medium">Areas of Expertise</Label>
                        <Input
                            id="expertise"
                            value={bioData?.expertise?.join(', ') || ''}
                            onChange={(e) => {
                                const expertise = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                onBioChange({ ...bioData, expertise });
                            }}
                            placeholder="Italian, Desserts, Vegan Cooking"
                            className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">Comma-separated list</p>
                    </div>
                </CardContent>
            </Card>

            {/* Short Description (Legacy) */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Short Description (Legacy)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="shortDescription" className="text-sm font-medium">Short Description *</Label>
                        <Textarea
                            id="shortDescription"
                            value={formData.shortDescription || ''}
                            onChange={(e) => onInputChange('shortDescription', e.target.value)}
                            placeholder="Brief description for author cards"
                            rows={2}
                            className="resize-none"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="excerpt" className="text-sm font-medium">Excerpt</Label>
                        <Textarea
                            id="excerpt"
                            value={formData.excerpt || ''}
                            onChange={(e) => onInputChange('excerpt', e.target.value)}
                            placeholder="Author excerpt for listings"
                            rows={3}
                            className="resize-none"
                        />
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}
