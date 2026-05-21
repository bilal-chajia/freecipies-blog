import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Plus, Trash2, X, Check, Search, Edit, Wrench,
    ExternalLink, ImageIcon
} from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Card } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { equipmentAPI } from '../../../services/api';
import ConfirmationModal from '@/ui/confirmation-modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { generateSlug } from '../../../utils/helpers';
import { toast } from 'sonner';

interface EquipmentItem {
    id?: number;
    name: string;
    slug: string;
    brand?: string | null;
    description?: string | null;
    keywordsList?: string[];
    category?: string;
    affiliateUrl?: string | null;
    affiliate_url?: string | null;
    affiliateProvider?: string | null;
    affiliate_provider?: string | null;
    image?: {
        url?: string;
        variants?: {
            md?: { url: string };
            sm?: { url: string };
        };
    } | null;
}

interface EquipmentFormData {
    name: string;
    brand: string;
    description: string;
    keywords: string;
    category: string;
    affiliateUrl: string;
    affiliateProvider: string;
    imageUrl: string;
}

const CATEGORIES = [
    { value: 'appliances', label: 'Appliances' },
    { value: 'bakeware', label: 'Bakeware' },
    { value: 'cookware', label: 'Cookware' },
    { value: 'utensils', label: 'Utensils' },
    { value: 'gadgets', label: 'Gadgets' },
    { value: 'other', label: 'Other' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.04 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: "spring" as const, stiffness: 400, damping: 28 }
    }
};

const EMPTY_FORM: EquipmentFormData = {
    name: '',
    brand: '',
    description: '',
    keywords: '',
    category: 'other',
    affiliateUrl: '',
    affiliateProvider: '',
    imageUrl: '',
};

const EquipmentList = () => {
    const [items, setItems] = useState<EquipmentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    // Edit / Create state
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [formData, setFormData] = useState<EquipmentFormData>(EMPTY_FORM);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        item: EquipmentItem | null;
    }>({ isOpen: false, item: null });

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await equipmentAPI.getAll({ active: 'false' });
            const apiResponse = response.data;
            const data = Array.isArray(apiResponse) ? apiResponse : (apiResponse?.data || []);
            setItems(data);
        } catch (err) {
            toast.error('Failed to load equipment');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter((item) => {
        const matchesSearch =
            item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.brand?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const handleStartEdit = (item: EquipmentItem) => {
        setEditingSlug(item.slug);
        // Extract image URL from parsed image object
        const imgUrl = item.image?.variants?.md?.url || item.image?.variants?.sm?.url || item.image?.url || '';
        setFormData({
            name: item.name || '',
            brand: item.brand || '',
            description: item.description || '',
            keywords: (item.keywordsList || []).join(', '),
            category: item.category || 'other',
            affiliateUrl: item.affiliateUrl || item.affiliate_url || '',
            affiliateProvider: item.affiliateProvider || item.affiliate_provider || '',
            imageUrl: imgUrl,
        });
        setIsCreatingNew(false);
    };

    const handleStartCreate = () => {
        setIsCreatingNew(true);
        setEditingSlug(null);
        setFormData(EMPTY_FORM);
    };

    const handleCancel = () => {
        setEditingSlug(null);
        setIsCreatingNew(false);
        setFormData(EMPTY_FORM);
    };

    const buildPayload = () => {
        const keywordsArray = formData.keywords
            .split(',')
            .map((k) => k.trim().toLowerCase())
            .filter(Boolean);

        // Always include name lowercase
        const nameLower = formData.name.trim().toLowerCase();
        if (nameLower && !keywordsArray.includes(nameLower)) {
            keywordsArray.unshift(nameLower);
        }

        // Build imageJson from URL
        const imageUrl = formData.imageUrl?.trim() || null;
        const imageJson = imageUrl ? { url: imageUrl, variants: { md: { url: imageUrl }, sm: { url: imageUrl } } } : {};

        return {
            name: formData.name.trim(),
            slug: generateSlug(formData.name.trim()),
            brand: formData.brand.trim() || null,
            description: formData.description.trim() || null,
            keywords: keywordsArray,
            category: formData.category,
            affiliateUrl: formData.affiliateUrl.trim() || null,
            affiliateProvider: formData.affiliateProvider.trim() || null,
            imageJson,
        };
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return;

        try {
            setSaving(true);
            const payload = buildPayload();

            if (isCreatingNew) {
                const res = await equipmentAPI.create(payload);
                const newItem = res.data?.data || res.data;
                setItems((prev) => [...prev, newItem]);
                toast.success('Equipment created');
            } else {
                if (!editingSlug) {
                    toast.error('Invalid editing state');
                    return;
                }
                const res = await equipmentAPI.update(editingSlug, payload);
                const updated = res.data?.data || res.data;
                setItems((prev) => prev.map((i) => (i.slug === editingSlug ? updated : i)));
                toast.success('Equipment updated');
            }

            handleCancel();
        } catch (err) {
            toast.error('Failed to save equipment');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteConfirm = async () => {
        const itemToDelete = deleteModal.item;
        if (!itemToDelete) return;
        try {
            await equipmentAPI.delete(itemToDelete.slug);
            setItems((prev) => prev.filter((i) => i.slug !== itemToDelete.slug));
            setDeleteModal({ isOpen: false, item: null });
            toast.success('Equipment deleted');
        } catch (err) {
            toast.error('Failed to delete equipment');
        }
    };

    const updateField = <K extends keyof EquipmentFormData>(field: K, value: EquipmentFormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    // ─── Form component (reused for create & edit) ─────────────
    interface EquipmentFormProps {
        onCancel: () => void;
    }
    const EquipmentForm = ({ onCancel }: EquipmentFormProps) => (
        <Card className="p-6 border-2 border-primary/20 bg-primary/5 shadow-lg rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                    {isCreatingNew ? 'New Equipment' : 'Edit Equipment'}
                </span>
                <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="size-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs">Name *</Label>
                    <Input
                        value={formData.name}
                        onChange={(e) => updateField('name', e.target.value)}
                        placeholder="Stand Mixer"
                        className="h-9"
                        autoFocus
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Brand</Label>
                    <Input
                        value={formData.brand}
                        onChange={(e) => updateField('brand', e.target.value)}
                        placeholder="KitchenAid"
                        className="h-9"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs">Keywords (comma-separated)</Label>
                <Input
                    value={formData.keywords}
                    onChange={(e) => updateField('keywords', e.target.value)}
                    placeholder="mixer, batteur, robot pâtissier"
                    className="h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                    Synonyms for auto-detection in recipe instructions. Name and brand are auto-included.
                </p>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Select value={formData.category} onValueChange={(v) => updateField('category', v)}>
                    <SelectTrigger className="h-9">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs">Affiliate URL</Label>
                <Input
                    value={formData.affiliateUrl}
                    onChange={(e) => updateField('affiliateUrl', e.target.value)}
                    placeholder="https://www.amazon.com/dp/..."
                    className="h-9"
                />
            </div>

            {/* Image URL + Preview */}
            <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1"><ImageIcon className="size-3" /> Image URL</Label>
                <div className="flex gap-3 items-start">
                    <div className="flex-1">
                        <Input
                            value={formData.imageUrl}
                            onChange={(e) => updateField('imageUrl', e.target.value)}
                            placeholder="https://example.com/stand-mixer.jpg"
                            className="h-9"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Paste a direct image URL. Shows on recipe equipment cards.
                        </p>
                    </div>
                    {formData.imageUrl && (
                        <div className="w-16 h-16 rounded-lg border overflow-hidden bg-muted flex-shrink-0">
                            <img
                                src={formData.imageUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                width={64}
                                height={64}
                                loading="lazy"
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="Essential for whipping egg whites and kneading dough."
                    rows={2}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={!formData.name.trim() || saving}>
                    {saving ? 'Saving...' : isCreatingNew ? 'Create' : 'Save'}
                </Button>
            </div>
        </Card>
    );

    // ─── Loading skeleton ─────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="flex flex-col gap-2">
                    <div className="h-8 w-64 bg-muted rounded-lg" />
                    <div className="h-4 w-96 bg-muted rounded-md" />
                </div>
                <div className="h-12 w-full bg-muted rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-40 bg-muted rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
                        <Wrench className="size-4" />
                        Affiliate Catalog
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-balance">Equipment</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Kitchen tools & equipment with affiliate links. Auto-detected in recipe instructions.
                    </p>
                </div>
                <Button onClick={handleStartCreate} className="h-11 px-6 gap-2 shadow-sm rounded-xl" disabled={isCreatingNew}>
                    <Plus className="size-4" />
                    Add Equipment
                </Button>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full max-w-xl">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground opacity-60" />
                    <Input
                        placeholder="Search by name, brand, or slug..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-12 pl-10 border-none bg-card shadow-sm ring-1 ring-border/50 rounded-xl focus-visible:ring-primary/50 transition-all"
                    />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40 h-12 rounded-xl border-none bg-card shadow-sm ring-1 ring-border/50">
                        <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent/50 rounded-lg border border-border/30 ml-auto">
                    <span className="text-xs font-bold text-muted-foreground">{items.length}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60">Items</span>
                </div>
            </div>

            {/* Create Form */}
            {isCreatingNew && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <EquipmentForm onCancel={handleCancel} />
                </motion.div>
            )}

            {/* Equipment Grid */}
            <AnimatePresence mode="popLayout">
                <motion.div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                    key={searchTerm + filterCategory}
                >
                    {filteredItems.length === 0 && !isCreatingNew ? (
                        <div className="col-span-full">
                            <EmptyState
                                icon="settings"
                                title="No equipment found"
                                description={items.length === 0 ? 'Add your first kitchen tool or equipment item.' : 'Try adjusting your search or filter.'}
                                actionLabel={items.length === 0 ? 'Add Equipment' : undefined}
                                onAction={items.length === 0 ? handleStartCreate : undefined}
                            />
                        </div>
                    ) : (
                        filteredItems.map((item) => (
                            <motion.div key={item.slug || item.id} variants={itemVariants} layout className="h-full">
                                {editingSlug === item.slug ? (
                                    <EquipmentForm onCancel={handleCancel} />
                                ) : (
                                    <Card className="group p-5 rounded-2xl border border-border/50 shadow-sm transition-all duration-300 h-full flex flex-col hover:shadow-md hover:border-primary/20 bg-card">
                                        <div className="flex items-start justify-between mb-3">
                                            {/* Image thumbnail */}
                                            {(item.image?.url || item.image?.variants?.md?.url) && (
                                                <div className="w-10 h-10 rounded-lg border overflow-hidden bg-muted flex-shrink-0 mr-3">
                                                    <img
                                                        src={item.image?.variants?.md?.url || item.image?.url}
                                                        alt={item.name}
                                                        className="w-full h-full object-cover"
                                                        width={40}
                                                        height={40}
                                                        loading="lazy"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-sm truncate">
                                                    {item.brand && (
                                                        <span className="text-muted-foreground font-normal">{item.brand} </span>
                                                    )}
                                                    {item.name}
                                                </h3>
                                                {item.description && (
                                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                                                <button
                                                    onClick={() => handleStartEdit(item)}
                                                    className="p-1.5 hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                                                >
                                                    <Edit className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteModal({ isOpen: true, item })}
                                                    className="p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            <Badge variant="secondary" className="text-[10px]">{item.category || 'other'}</Badge>
                                        </div>

                                        {/* Keywords preview */}
                                        {(item.keywordsList || []).length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-3">
                                                {(item.keywordsList || []).slice(0, 4).map((kw, i) => (
                                                    <span key={i} className="text-[10px] px-1.5 py-0.5 bg-muted rounded-md text-muted-foreground">
                                                        {kw}
                                                    </span>
                                                ))}
                                                {(item.keywordsList || []).length > 4 && (
                                                    <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                                                        +{(item.keywordsList || []).length - 4}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        <div className="mt-auto pt-2 border-t border-border/30">
                                            {item.affiliateUrl || item.affiliate_url ? (
                                                <a
                                                    href={item.affiliateUrl || item.affiliate_url || undefined}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[10px] text-primary flex items-center gap-1 hover:underline truncate"
                                                >
                                                    <ExternalLink className="size-3 shrink-0" />
                                                    Affiliate link
                                                </a>
                                            ) : (
                                                <span className="text-[10px] text-muted-foreground/50">No affiliate link</span>
                                            )}
                                        </div>
                                    </Card>
                                )}
                            </motion.div>
                        ))
                    )}
                </motion.div>
            </AnimatePresence>

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Equipment"
                description={`Removing "${deleteModal.item?.name}" will remove it from the catalog. Existing recipe caches will not be affected.`}
                confirmText="Delete"
                cancelText="Cancel"
            />
        </div>
    );
};

export default EquipmentList;
