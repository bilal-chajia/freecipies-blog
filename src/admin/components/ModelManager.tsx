/**
 * Model Manager Component
 * ========================
 * All model management lives inside a modal (Selected / Discover / Manual) so
 * the provider card keeps a fixed height and the grid never reflows.
 */

import { useState } from 'react';
import { Power, PowerOff, Trash2 } from 'lucide-react';
import { Button } from '@/ui/button';
import ConfirmationModal from '@/ui/confirmation-modal';
import { toast } from 'sonner';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Badge } from '@/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/tabs';
import { DiscoverModelsTab } from './ModelManager/DiscoverModelsTab';
import { cn } from '@/lib/utils';
import { aiAPI } from '@/services/api';

export type ManagedModel = {
    id: string;
    name?: string | null;
    context_window?: number | null;
    max_tokens?: number | null;
    supports_thinking?: boolean;
    enabled?: boolean;
    deprecated?: boolean;
    status?: 'available' | 'unavailable' | 'deprecated';
    source?: 'discovered' | 'manual';
};

type ModelManagerProps = {
    provider: string;
    models?: ManagedModel[];
    onUpdate?: () => void | Promise<void>;
    isAddDialogOpen?: boolean;
    onAddDialogChange?: (open: boolean) => void;
    isCustom?: boolean;
};

type ModelFormData = {
    id: string;
    name: string;
    context_window: string;
    max_tokens: string;
};

type DeleteModalState = {
    isOpen: boolean;
    modelToDelete: string | null;
};

export function ModelManager({
    provider,
    models = [],
    onUpdate,
    isAddDialogOpen: externalIsAddOpen,
    onAddDialogChange: externalSetIsAddOpen,
    isCustom = false,
}: ModelManagerProps) {
    const [internalIsAddDialogOpen, setInternalIsAddDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ isOpen: false, modelToDelete: null });

    const isDialogOpen = externalIsAddOpen !== undefined ? externalIsAddOpen : internalIsAddDialogOpen;
    const setIsDialogOpen = externalSetIsAddOpen || setInternalIsAddDialogOpen;

    const [formData, setFormData] = useState<ModelFormData>({
        id: '',
        name: '',
        context_window: '',
        max_tokens: '',
    });

    const handleAddModel = async () => {
        try {
            const response = await aiAPI.addModel(provider, {
                id: formData.id,
                name: formData.name,
                context_window: formData.context_window ? parseInt(formData.context_window) : undefined,
                max_tokens: formData.max_tokens ? parseInt(formData.max_tokens) : undefined,
            });

            if (response.status >= 200 && response.status < 300) {
                setFormData({ id: '', name: '', context_window: '', max_tokens: '' });
                onUpdate?.();
            }
        } catch {
            toast.error('Failed to add model');
        }
    };

    const handleToggleModel = async (modelId: string) => {
        try {
            const response = await aiAPI.toggleModel(provider, modelId);
            if (response.status >= 200 && response.status < 300) {
                onUpdate?.();
            }
        } catch {
            toast.error('Failed to toggle model');
        }
    };

    const handleDeleteModel = (modelId: string) => {
        setDeleteModal({ isOpen: true, modelToDelete: modelId });
    };

    const handleDeleteConfirm = async () => {
        const modelId = deleteModal.modelToDelete;
        if (!modelId) return;

        setIsDeleting(modelId);
        try {
            const response = await aiAPI.removeModel(provider, modelId);
            if (response.status >= 200 && response.status < 300) {
                onUpdate?.();
            }
        } catch {
            toast.error('Failed to delete model');
        } finally {
            setIsDeleting(null);
            setDeleteModal({ isOpen: false, modelToDelete: null });
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="h-7 px-2 text-sm font-medium"
            >
                Models ({models.length})
            </Button>

            {/* Manage Models Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Manage models</DialogTitle>
                        <DialogDescription>
                            Enable, remove, discover, or manually add models for {provider}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue={models.length > 0 ? 'selected' : 'discover'}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="selected">Selected ({models.length})</TabsTrigger>
                            <TabsTrigger value="discover">Discover</TabsTrigger>
                            <TabsTrigger value="manual">Manual</TabsTrigger>
                        </TabsList>

                        <TabsContent value="selected" className="mt-3">
                            {models.length === 0 ? (
                                <p className="py-6 text-center text-sm text-muted-foreground">
                                    No models yet — use Discover or Manual to add some.
                                </p>
                            ) : (
                                <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
                                    {models.map((model) => (
                                        <div
                                            key={model.id}
                                            className={cn(
                                                'flex items-center justify-between gap-2 p-2 rounded-md border',
                                                !model.enabled && 'opacity-50 bg-muted/50',
                                            )}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="truncate text-sm font-medium">{model.name || model.id}</span>
                                                    {model.status === 'unavailable' && (
                                                        <Badge variant="outline" className="text-xs px-1 py-0">Unavailable</Badge>
                                                    )}
                                                    {model.deprecated && (
                                                        <Badge variant="destructive" className="text-xs px-1 py-0">Deprecated</Badge>
                                                    )}
                                                    {!model.enabled && (
                                                        <Badge variant="outline" className="text-xs px-1 py-0">Disabled</Badge>
                                                    )}
                                                </div>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    ID: {model.id}
                                                    {model.context_window ? ` • Context: ${(model.context_window / 1024).toFixed(0)}K` : ''}
                                                    {model.max_tokens ? ` • Max: ${(model.max_tokens / 1024).toFixed(0)}K` : ''}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleToggleModel(model.id)}
                                                    title={model.enabled ? 'Disable' : 'Enable'}
                                                    className="h-9 w-9 p-0"
                                                >
                                                    {model.enabled ? (
                                                        <Power className="h-3.5 w-3.5 text-green-600" />
                                                    ) : (
                                                        <PowerOff className="h-3.5 w-3.5 text-muted-foreground" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteModel(model.id)}
                                                    disabled={isDeleting === model.id}
                                                    className="h-9 w-9 p-0"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="discover" className="mt-3">
                            {isDialogOpen && (
                                <DiscoverModelsTab
                                    provider={provider}
                                    isCustom={isCustom}
                                    existingModels={models}
                                    onAdded={() => onUpdate?.()}
                                    onClose={() => setIsDialogOpen(false)}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="manual" className="mt-3">
                            <div className="space-y-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="model-id">Model ID *</Label>
                                    <Input
                                        id="model-id"
                                        value={formData.id}
                                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                                        placeholder="e.g., gpt-4o"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="model-name">Display Name *</Label>
                                    <Input
                                        id="model-name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., GPT-4o"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="context-window">Context Window</Label>
                                        <Input
                                            id="context-window"
                                            type="number"
                                            value={formData.context_window}
                                            onChange={(e) => setFormData({ ...formData, context_window: e.target.value })}
                                            placeholder="131072"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="max-tokens">Max Tokens</Label>
                                        <Input
                                            id="max-tokens"
                                            type="number"
                                            value={formData.max_tokens}
                                            onChange={(e) => setFormData({ ...formData, max_tokens: e.target.value })}
                                            placeholder="65536"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleAddModel} disabled={!formData.id || !formData.name}>
                                        Add Model
                                    </Button>
                                </DialogFooter>
                            </div>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            <ConfirmationModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, modelToDelete: null })}
                onConfirm={handleDeleteConfirm}
                title="Delete Model"
                description="Are you sure you want to delete this model?"
                confirmText="Delete"
                cancelText="Cancel"
            />
        </>
    );
}
