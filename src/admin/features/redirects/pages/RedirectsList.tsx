import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
    Plus, Trash2, X, Check, Search, Edit, ArrowRightLeft,
    Power, PowerOff, FileText, Activity
} from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Card } from '@/ui/card';
import { Badge } from '@/ui/badge';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { redirectsAPI } from '../../../services/api';
import ConfirmationModal from '@/ui/confirmation-modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast } from 'sonner';

const STATUS_CODES = [
    { value: '301', label: '301 - Permanent' },
    { value: '302', label: '302 - Found / Temporary' },
    { value: '307', label: '307 - Temporary Redirect' },
    { value: '308', label: '308 - Permanent Redirect' },
];

const EMPTY_FORM = {
    fromPath: '',
    toPath: '',
    statusCode: '301',
    isActive: true,
    notes: '',
};

interface RedirectItem {
    id: string | number;
    fromPath: string;
    toPath: string;
    statusCode: number | string;
    isActive: boolean;
    notes?: string | null;
    hitCount?: number;
    lastHitAt?: string | null;
}

const RedirectsList = () => {
    const [items, setItems] = useState<RedirectItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterActive, setFilterActive] = useState('all');

    const [editingId, setEditingId] = useState<string | number | null>(null);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [saving, setSaving] = useState(false);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; item: RedirectItem | null }>({ isOpen: false, item: null });

    useEffect(() => { fetchItems(); }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await redirectsAPI.getAll();
            const data = response.data?.data || response.data || [];
            setItems(data);
        } catch (err) {
            toast.error('Failed to load redirects');
        } finally {
            setLoading(false);
        }
    };

    const filteredItems = items.filter((item) => {
        const matchesSearch =
            item.fromPath?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.toPath?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.notes?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterActive === 'all' || 
                             (filterActive === 'active' && item.isActive) || 
                             (filterActive === 'inactive' && !item.isActive);
        return matchesSearch && matchesStatus;
    });

    const handleStartEdit = (item: RedirectItem) => {
        setEditingId(item.id);
        setFormData({
            fromPath: item.fromPath || '',
            toPath: item.toPath || '',
            statusCode: String(item.statusCode || '301'),
            isActive: Boolean(item.isActive),
            notes: item.notes || '',
        });
        setIsCreatingNew(false);
    };

    const handleStartCreate = () => {
        setIsCreatingNew(true);
        setEditingId(null);
        setFormData(EMPTY_FORM);
    };

    const handleCancel = () => {
        setEditingId(null);
        setIsCreatingNew(false);
        setFormData(EMPTY_FORM);
    };

    const handleSave = async () => {
        if (!formData.fromPath.trim() || !formData.toPath.trim()) {
            toast.error('Source and Destination paths are required');
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...formData,
                fromPath: formData.fromPath.trim(),
                toPath: formData.toPath.trim(),
                notes: formData.notes.trim() || null,
            };

            if (isCreatingNew) {
                const res = await redirectsAPI.create(payload);
                setItems((prev) => [res.data?.data || res.data, ...prev]);
                toast.success('Redirect created');
            } else {
                if (editingId === null) return;
                const res = await redirectsAPI.update(editingId, payload);
                const updated = res.data?.data || res.data;
                setItems((prev) => prev.map((i) => (i.id === editingId ? updated : i)));
                toast.success('Redirect updated');
            }

            handleCancel();
        } catch (err) {
            toast.error('Failed to save redirect');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (item: RedirectItem) => {
        try {
            const updatedStatus = !item.isActive;
            const res = await redirectsAPI.update(item.id, { isActive: updatedStatus });
            const updated = res.data?.data || res.data;
            setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
            toast.success(`Redirect ${updatedStatus ? 'activated' : 'deactivated'}`);
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleDeleteConfirm = async () => {
        const item = deleteModal.item;
        if (!item) return;
        try {
            await redirectsAPI.delete(item.id);
            setItems((prev) => prev.filter((i) => i.id !== item.id));
            setDeleteModal({ isOpen: false, item: null });
            toast.success('Redirect deleted');
        } catch (err) {
            toast.error('Failed to delete redirect');
        }
    };

    const updateField = (field: string, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const RedirectForm = ({ onCancel }: { onCancel: () => void }) => (
        <Card className="p-4 border border-border/80 bg-card shadow-xs rounded-lg space-y-3 mb-4">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                    {isCreatingNew ? 'New Redirect Rule' : 'Edit Redirect Rule'}
                </span>
                <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
                    <X className="size-4" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs">Source Path (From) *</Label>
                    <Input
                        value={formData.fromPath}
                        onChange={(e) => updateField('fromPath', e.target.value)}
                        placeholder="/old-path-slug"
                        className="h-9"
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-xs">Destination Path (To) *</Label>
                    <Input
                        value={formData.toPath}
                        onChange={(e) => updateField('toPath', e.target.value)}
                        placeholder="/new-excellent-recipe"
                        className="h-9"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className="text-xs">Redirect Type</Label>
                    <Select value={formData.statusCode} onValueChange={(v) => updateField('statusCode', v)}>
                        <SelectTrigger className="h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUS_CODES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-end pb-1.5">
                     <div className="flex items-center gap-2 px-3 py-2 bg-background border rounded-lg w-full h-9">
                        <Label className="text-xs cursor-pointer flex-1" htmlFor="active-toggle" onClick={() => updateField('isActive', !formData.isActive)}>
                            Status: {formData.isActive ? 'Active' : 'Inactive'}
                        </Label>
                        <button 
                            id="active-toggle"
                            type="button"
                            onClick={() => updateField('isActive', !formData.isActive)}
                            className={`size-5 rounded-full flex items-center justify-center transition-colors ${formData.isActive ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}
                        >
                            {formData.isActive ? <Check className="size-3" /> : <X className="size-3" />}
                        </button>
                     </div>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs">Internal Notes</Label>
                <Textarea
                    value={formData.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Why was this created? e.g. Merged recipe A into B"
                    rows={2}
                />
            </div>

            <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Rule'}
                </Button>
            </div>
        </Card>
    );

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="flex flex-col gap-1">
                    <div className="h-6 w-48 bg-muted rounded-md" />
                    <div className="h-4 w-80 bg-muted rounded-md" />
                </div>
                <div className="h-9 w-full bg-muted rounded-lg" />
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-14 w-full bg-muted rounded-lg" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary font-semibold text-xs mb-0.5 uppercase tracking-wider">
                        <ArrowRightLeft className="size-3.5" />
                        Traffic Management
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-balance">Redirects</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Handle 301 and 302 redirects from old URLs to new paths.
                    </p>
                </div>
                <Button onClick={handleStartCreate} className="h-9 px-4 gap-2 shadow-xs rounded-lg" disabled={isCreatingNew}>
                    <Plus className="size-3.5" />
                    New Redirect
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full max-w-xl">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground opacity-60" />
                    <Input
                        placeholder="Search paths or notes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 pl-9 border border-border/80 bg-card rounded-lg focus-visible:ring-primary/50"
                    />
                </div>
                <Select value={filterActive} onValueChange={setFilterActive}>
                    <SelectTrigger className="w-40 h-9 rounded-lg border border-border/80 bg-card shadow-xs">
                        <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Rules</SelectItem>
                        <SelectItem value="active">Active Only</SelectItem>
                        <SelectItem value="inactive">Inactive Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {isCreatingNew && <RedirectForm onCancel={handleCancel} />}

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredItems.length === 0 ? (
                        <div className="col-span-full">
                            <EmptyState
                                icon="alert"
                                title="No redirect rules"
                                description={items.length === 0 ? 'Create your first redirect to manage URL migrations.' : 'Try adjusting your search or filter.'}
                                actionLabel={items.length === 0 ? 'New Redirect' : undefined}
                                onAction={items.length === 0 ? handleStartCreate : undefined}
                            />
                        </div>
                    ) : (
                        filteredItems.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                            >
                                {editingId === item.id ? (
                                    <RedirectForm onCancel={handleCancel} />
                                ) : (
                                    <Card className={`group p-3 rounded-lg border border-border/80 shadow-xs transition-all duration-200 ${!item.isActive ? 'opacity-60 grayscale-[0.5] bg-muted/30' : 'bg-card hover:border-border hover:bg-accent/5'}`}>
                                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Badge className={`rounded-md px-1.5 py-0.5 text-[10px] ${Number(item.statusCode) >= 307 ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                                                        {item.statusCode}
                                                    </Badge>
                                                    <span className="font-mono text-sm font-bold truncate block flex-1">
                                                        {item.fromPath}
                                                    </span>
                                                    <ArrowRightLeft className="size-3 text-muted-foreground shrink-0" />
                                                    <span className="font-mono text-sm text-primary truncate block flex-1">
                                                        {item.toPath}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                    {item.notes && (
                                                        <div className="flex items-center gap-1 max-w-[200px] truncate">
                                                            <FileText className="size-3" />
                                                            {item.notes}
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1">
                                                        <Activity className="size-3" />
                                                        {item.hitCount} hits
                                                    </div>
                                                    {item.lastHitAt && (
                                                        <div className="flex items-center gap-1">
                                                            Last: {new Date(item.lastHitAt).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className={`h-7 w-7 p-0 rounded-md ${item.isActive ? 'text-emerald-500 bg-emerald-500/10' : 'text-muted-foreground bg-muted'}`}
                                                    onClick={() => handleToggleActive(item)}
                                                    title={item.isActive ? 'Deactivate' : 'Activate'}
                                                >
                                                    {item.isActive ? <Power className="size-3.5" /> : <PowerOff className="size-3.5" />}
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 w-7 p-0 rounded-md"
                                                    onClick={() => handleStartEdit(item)}
                                                >
                                                    <Edit className="size-3.5" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="h-7 w-7 p-0 rounded-md hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteModal({ isOpen: true, item })}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </Card>
                                )}
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, item: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Redirect"
                description={`Are you sure you want to remove the redirect from "${deleteModal.item?.fromPath}"? This cannot be undone.`}
                confirmText="Delete Rule"
                cancelText="Cancel"
            />
        </div>
    );
};

export default RedirectsList;