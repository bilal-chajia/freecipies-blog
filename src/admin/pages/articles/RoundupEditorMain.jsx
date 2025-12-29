import { Label } from '@/ui/label.jsx';
import { Input } from '@/ui/input.jsx';
import BlockEditor from '../../components/BlockEditor';
import RoundupBuilder from '../../components/RoundupBuilder';
import { Code } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import Editor from '@monaco-editor/react';

/**
 * Main content area for Roundup Editor
 * Focused on roundup-specific fields without type selector
 */
export default function RoundupEditorMain({
    formData,
    onInputChange,
    contentJson,
    setContentJson,
    roundupJson,
    setRoundupJson,
    faqsJson,
    setFaqsJson,
    jsonErrors,
    validateJSON,
    useVisualEditor,
    setUseVisualEditor,
    isValidJSON,
}) {
    return (
        <main className="space-y-8 p-8 max-w-4xl mx-auto pb-20">
            {/* Title */}
            <div className="space-y-3">
                <Input
                    value={formData.label}
                    onChange={(e) => onInputChange('label', e.target.value)}
                    placeholder="Roundup title..."
                    className="text-5xl font-bold border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/40 h-auto leading-tight"
                />
            </div>

            {/* Headline */}
            <div className="space-y-3">
                <Input
                    value={formData.headline}
                    onChange={(e) => onInputChange('headline', e.target.value)}
                    placeholder="Add a compelling headline..."
                    className="text-2xl text-muted-foreground border-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 h-auto"
                />
            </div>

            <hr className="border-t-2 my-8" />

            {/* Introduction Content */}
            <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-semibold">Introduction</Label>
                    <div className="flex items-center gap-2">
                        {jsonErrors.content && (
                            <span className="text-sm text-destructive font-medium">{jsonErrors.content}</span>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setUseVisualEditor(!useVisualEditor)}
                            className="gap-1.5 text-xs h-8"
                        >
                            <Code className="h-3.5 w-3.5" />
                            {useVisualEditor ? 'JSON Mode' : 'Visual Mode'}
                        </Button>
                    </div>
                </div>

                {useVisualEditor ? (
                    <BlockEditor
                        value={contentJson}
                        onChange={(value) => {
                            setContentJson(value);
                            validateJSON('content', value);
                        }}
                        placeholder="Introduce your roundup..."
                    />
                ) : (
                    <div className="border rounded-lg overflow-hidden shadow-sm">
                        <Editor
                            height="200px"
                            language="json"
                            theme="vs-dark"
                            value={contentJson}
                            onChange={(value) => {
                                setContentJson(value);
                                validateJSON('content', value);
                            }}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                            }}
                        />
                    </div>
                )}
            </div>

            <hr className="border-t-2 my-8" />

            {/* Roundup Builder - Always visible */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">📚 Roundup Items</Label>
                    {jsonErrors.roundup && (
                        <span className="text-sm text-destructive font-medium">{jsonErrors.roundup}</span>
                    )}
                </div>
                <div className="border rounded-lg overflow-hidden bg-muted/50 p-6 shadow-sm">
                    <RoundupBuilder
                        value={roundupJson}
                        onChange={(newValue) => {
                            setRoundupJson(newValue);
                            validateJSON('roundup', newValue);
                        }}
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Add internal recipes or external links to your curated list
                </p>
            </div>

            {/* FAQs (optional) */}
            <div className="space-y-3 pt-8 border-t-2">
                <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">FAQs (Optional)</Label>
                    {jsonErrors.faqs && (
                        <span className="text-sm text-destructive font-medium">{jsonErrors.faqs}</span>
                    )}
                </div>
                <div className="border rounded-lg overflow-hidden shadow-sm">
                    <Editor
                        height="180px"
                        language="json"
                        theme="vs-dark"
                        value={faqsJson}
                        onChange={(value) => {
                            setFaqsJson(value);
                            validateJSON('faqs', value);
                        }}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                        }}
                    />
                </div>
            </div>
        </main>
    );
}
