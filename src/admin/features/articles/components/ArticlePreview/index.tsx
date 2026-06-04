import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/ui/sheet';
import { Button } from '@/ui/button';
import { Loader2, Monitor, Tablet, Smartphone, AlertCircle } from 'lucide-react';

interface ArticlePreviewProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    formData: Record<string, unknown>;
    content_json: string | unknown[];
    recipe_json?: string | Record<string, unknown>;
    roundup_json?: string | Record<string, unknown>;
    imagesData?: Record<string, unknown>;
    categories?: unknown[];
    authors?: unknown[];
}

const DEVICE_WIDTHS = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
} as const;

type DeviceType = keyof typeof DEVICE_WIDTHS;

export default function ArticlePreview({
    open,
    onOpenChange,
    formData,
    content_json,
    recipe_json,
    roundup_json,
    imagesData,
}: ArticlePreviewProps) {
    const [device, setDevice] = useState<DeviceType>('desktop');
    const [htmlContent, setHtmlContent] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);

    // Stable serialization of the payload to avoid re-renders on every parent render
    const payloadKey = useCallback(() => {
        try {
            return JSON.stringify({
                formData,
                content_json,
                recipe_json,
                roundup_json,
                imagesData,
            });
        } catch {
            return '';
        }
    }, [formData, content_json, recipe_json, roundup_json, imagesData]);

    useEffect(() => {
        if (!open) return;

        const renderPreview = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Combine all form data parts
                const payload = {
                    ...formData,
                    content_json: typeof content_json === 'string' ? content_json : JSON.stringify(content_json || []),
                    recipe_json: typeof recipe_json === 'string' ? recipe_json : JSON.stringify(recipe_json || {}),
                    roundup_json: typeof roundup_json === 'string' ? roundup_json : JSON.stringify(roundup_json || {}),
                    imagesData: typeof imagesData === 'string' ? imagesData : JSON.stringify(imagesData || {}),
                };

                const res = await fetch('/api/preview/render', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (res.ok) {
                    const html = await res.text();
                    setHtmlContent(html);
                } else {
                    const errText = await res.text();
                    console.error('Failed to render preview:', errText);
                    setError(`Server error (${res.status}). Check console for details.`);
                }
            } catch (err) {
                console.error('Error rendering preview:', err);
                setError('Network error — could not reach the preview endpoint.');
            } finally {
                setIsLoading(false);
            }
        };

        const debounceId = setTimeout(renderPreview, 500);
        return () => clearTimeout(debounceId);
    }, [open, payloadKey]);

    // Handle iframe content injection safely, waiting for load event
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe || !htmlContent) return;

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(htmlContent);
        doc.close();

        // Wait for the iframe document to finish loading before intercepting links
        const onLoad = () => {
            try {
                const innerDoc = iframe.contentDocument || iframe.contentWindow?.document;
                if (!innerDoc) return;
                const links = innerDoc.querySelectorAll('a');
                links.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                    });
                });
            } catch (e) {
                // Cross-origin guard — shouldn't happen with same-origin sandbox
            }
        };

        iframe.addEventListener('load', onLoad);
        return () => iframe.removeEventListener('load', onLoad);
    }, [htmlContent]);

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl p-0 flex flex-col"
            >
                <SheetHeader className="px-6 py-4 border-b bg-background shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <SheetTitle className="flex items-center gap-2">
                                Article Preview
                                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                            </SheetTitle>
                            <SheetDescription>
                                Live render using the actual Astro storefront code
                            </SheetDescription>
                        </div>

                        {/* Device Toggle */}
                        <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20 self-start sm:self-auto">
                            <Button
                                variant={device === 'desktop' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8 px-0"
                                onClick={() => setDevice('desktop')}
                            >
                                <Monitor className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={device === 'tablet' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8 px-0"
                                onClick={() => setDevice('tablet')}
                            >
                                <Tablet className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={device === 'mobile' ? 'secondary' : 'ghost'}
                                size="icon"
                                className="h-8 w-8 px-0"
                                onClick={() => setDevice('mobile')}
                            >
                                <Smartphone className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto bg-muted">
                    <div
                        className="mx-auto h-full transition-all duration-300 bg-white"
                        style={{
                            maxWidth: DEVICE_WIDTHS[device],
                            boxShadow: device !== 'desktop' ? 'var(--shadow-hover)' : 'none',
                        }}
                    >
                        {error ? (
                            <div className="w-full h-full flex flex-col items-center justify-center text-destructive gap-3 p-8 text-center">
                                <AlertCircle className="w-10 h-10" />
                                <p className="text-sm font-medium">{error}</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => { setError(null); setHtmlContent(''); }}
                                >
                                    Retry
                                </Button>
                            </div>
                        ) : htmlContent ? (
                            <iframe
                                ref={iframeRef}
                                className="w-full h-full border-0"
                                title="Article Preview"
                                sandbox="allow-same-origin allow-scripts"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                                <Loader2 className="w-8 h-8 animate-spin" />
                                <p>Rendering storefront preview...</p>
                            </div>
                        )}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
