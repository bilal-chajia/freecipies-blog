import { useState, useEffect } from 'react';
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { Plus, Trash2, ArrowUp, ArrowDown, Upload, ExternalLink, Link2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/ui/tabs";

// Default roundup matching schema.sql structure
const defaultRoundup = {
    listType: 'ItemList',
    items: [],
};

const defaultItem = {
    position: 1,
    article_id: null,
    external_url: '',
    title: '',
    subtitle: '',
    note: '',
    cover: null,
};

export default function RoundupBuilder({ value, onChange }) {
    const [data, setData] = useState(defaultRoundup);
    const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
    const [jsonImportValue, setJsonImportValue] = useState('');
    const [jsonError, setJsonError] = useState('');

    useEffect(() => {
        try {
            if (value && value !== '{}' && value !== '{"items":[],"listType":"ItemList"}') {
                const parsed = JSON.parse(value);
                setData({
                    listType: parsed.listType || 'ItemList',
                    items: (parsed.items || []).map((item, idx) => ({
                        ...defaultItem,
                        ...item,
                        position: item.position || idx + 1,
                    })),
                });
            }
        } catch (e) {
            console.error("RoundupBuilder: Invalid JSON", e);
        }
    }, []);

    const updateData = (updates) => {
        const newData = { ...data, ...updates };
        setData(newData);
        onChange(JSON.stringify(newData, null, 2));
    };

    // Recalculate positions
    const recalculatePositions = (items) => {
        return items.map((item, idx) => ({ ...item, position: idx + 1 }));
    };

    // --- JSON Import ---
    const handleJsonImport = () => {
        try {
            const parsed = JSON.parse(jsonImportValue);
            setJsonError('');
            if (parsed.items && Array.isArray(parsed.items)) {
                const items = recalculatePositions(parsed.items.map(item => ({
                    ...defaultItem,
                    ...item,
                })));
                updateData({ items });
            } else {
                setJsonError('JSON must contain an "items" array');
            }
            setJsonDialogOpen(false);
            setJsonImportValue('');
        } catch (e) {
            setJsonError('Invalid JSON: ' + e.message);
        }
    };

    // --- Items ---
    const addItem = () => {
        const newItems = [
            ...data.items,
            { ...defaultItem, position: data.items.length + 1 }
        ];
        updateData({ items: newItems });
    };

    const removeItem = (index) => {
        const newItems = recalculatePositions(
            data.items.filter((_, i) => i !== index)
        );
        updateData({ items: newItems });
    };

    const updateItem = (index, field, val) => {
        const newItems = [...data.items];
        newItems[index] = { ...newItems[index], [field]: val };
        updateData({ items: newItems });
    };

    const moveItem = (index, direction) => {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= data.items.length) return;

        const newItems = [...data.items];
        [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
        updateData({ items: recalculatePositions(newItems) });
    };

    return (
        <div className="space-y-6">
            {/* Header with JSON Import */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Roundup Items ({data.items.length})</h3>
                <div className="flex gap-2">
                    <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                                <Upload className="w-4 h-4" /> Import JSON
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>Import Roundup from JSON</DialogTitle>
                                <DialogDescription>
                                    Paste roundup items JSON to replace current data
                                </DialogDescription>
                            </DialogHeader>
                            <Textarea
                                value={jsonImportValue}
                                onChange={(e) => setJsonImportValue(e.target.value)}
                                placeholder='{"items": [{"title": "Best Recipe", "article_id": 123}, ...]}'
                                rows={12}
                                className="font-mono text-sm"
                            />
                            {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setJsonDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleJsonImport}>Import</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                    <Button onClick={addItem} size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Item
                    </Button>
                </div>
            </div>

            {/* Items List */}
            <div className="space-y-4">
                {data.items.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p className="text-muted-foreground">No items added yet.</p>
                        <Button onClick={addItem} variant="outline" className="mt-4">
                            <Plus className="w-4 h-4 mr-2" /> Add First Item
                        </Button>
                    </div>
                )}
                {data.items.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-card">
                        <div className="flex gap-4">
                            {/* Position & Move */}
                            <div className="flex flex-col items-center gap-1">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                                    {item.position}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveItem(index, 'up')}
                                    disabled={index === 0}
                                >
                                    <ArrowUp className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => moveItem(index, 'down')}
                                    disabled={index === data.items.length - 1}
                                >
                                    <ArrowDown className="w-3 h-3" />
                                </Button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 space-y-4">
                                {/* Title & Link Type */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Title *</Label>
                                        <Input
                                            value={item.title || ''}
                                            onChange={(e) => updateItem(index, 'title', e.target.value)}
                                            placeholder="Best Lemon Biscuits"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Subtitle</Label>
                                        <Input
                                            value={item.subtitle || ''}
                                            onChange={(e) => updateItem(index, 'subtitle', e.target.value)}
                                            placeholder="Crispy edges, fluffy center"
                                        />
                                    </div>
                                </div>

                                {/* Link Type Tabs */}
                                <Tabs
                                    defaultValue={item.article_id ? "internal" : "external"}
                                    className="w-full"
                                    onValueChange={(val) => {
                                        if (val === 'internal') {
                                            updateItem(index, 'external_url', '');
                                        } else {
                                            updateItem(index, 'article_id', null);
                                        }
                                    }}
                                >
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="internal" className="gap-2">
                                            <Link2 className="w-4 h-4" /> Internal Recipe
                                        </TabsTrigger>
                                        <TabsTrigger value="external" className="gap-2">
                                            <ExternalLink className="w-4 h-4" /> External URL
                                        </TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="internal" className="mt-4">
                                        <div className="space-y-2">
                                            <Label>Article ID</Label>
                                            <Input
                                                type="number"
                                                value={item.article_id || ''}
                                                onChange={(e) => updateItem(index, 'article_id', parseInt(e.target.value) || null)}
                                                placeholder="123"
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Enter the ID of an internal recipe/article
                                            </p>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="external" className="mt-4">
                                        <div className="space-y-2">
                                            <Label>External URL</Label>
                                            <Input
                                                type="url"
                                                value={item.external_url || ''}
                                                onChange={(e) => updateItem(index, 'external_url', e.target.value)}
                                                placeholder="https://example.com/recipe"
                                            />
                                        </div>
                                    </TabsContent>
                                </Tabs>

                                {/* Note */}
                                <div className="space-y-2">
                                    <Label>Editorial Note</Label>
                                    <Textarea
                                        value={item.note || ''}
                                        onChange={(e) => updateItem(index, 'note', e.target.value)}
                                        placeholder="Why this recipe made the list..."
                                        rows={2}
                                    />
                                </div>
                            </div>

                            {/* Delete */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(index)}
                                className="text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
