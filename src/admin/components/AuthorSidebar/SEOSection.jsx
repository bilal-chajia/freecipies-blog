import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import { Textarea } from '@/ui/textarea.jsx';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/ui/accordion.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/card.jsx';

export default function SEOSection({ seoData, onSeoChange }) {
    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">SEO & Metadata</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="seo" className="border-none">
                        <AccordionTrigger className="text-sm py-3 hover:no-underline font-medium text-muted-foreground hover:text-foreground">
                            Advanced Settings
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3.5 pt-2 pb-1">
                            <div className="space-y-1.5">
                                <Label htmlFor="metaTitle" className="text-sm font-medium">Meta Title</Label>
                                <Input
                                    id="metaTitle"
                                    value={seoData?.metaTitle || ''}
                                    onChange={(e) => onSeoChange({ ...seoData, metaTitle: e.target.value })}
                                    placeholder="SEO title (defaults to author name)"
                                    className="text-sm h-9"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {(seoData?.metaTitle || '').length}/60 characters
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="metaDescription" className="text-sm font-medium">Meta Description</Label>
                                <Textarea
                                    id="metaDescription"
                                    value={seoData?.metaDescription || ''}
                                    onChange={(e) => onSeoChange({ ...seoData, metaDescription: e.target.value })}
                                    placeholder="SEO description"
                                    rows={3}
                                    className="text-sm resize-none"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {(seoData?.metaDescription || '').length}/160 characters
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="canonicalUrl" className="text-sm font-medium">Canonical URL</Label>
                                <Input
                                    id="canonicalUrl"
                                    value={seoData?.canonicalUrl || ''}
                                    onChange={(e) => onSeoChange({ ...seoData, canonicalUrl: e.target.value })}
                                    placeholder="https://..."
                                    className="text-sm h-9"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="keywords" className="text-sm font-medium">Keywords</Label>
                                <Input
                                    id="keywords"
                                    value={seoData?.keywords?.join(', ') || ''}
                                    onChange={(e) => {
                                        const keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                                        onSeoChange({ ...seoData, keywords });
                                    }}
                                    placeholder="keyword1, keyword2, keyword3"
                                    className="text-sm h-9"
                                />
                                <p className="text-xs text-muted-foreground">Comma-separated</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
