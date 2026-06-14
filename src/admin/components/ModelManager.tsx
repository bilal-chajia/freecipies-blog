/**
 * Model Manager Component
 * ========================
 * UI for managing AI models per provider
 */

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Power, PowerOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/ui/button';
import ConfirmationModal from '@/ui/confirmation-modal';
import { toast } from 'sonner';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import { Badge } from '@/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/card';
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
import { BulkImportModels } from './BulkImportModels';

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
    hideHeaderActions?: boolean;
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
    hideHeaderActions = false,
    isCustom = false,
}: ModelManagerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingModel, setEditingModel] = useState<ManagedModel | null>(null);
    const [internalIsAddDialogOpen, setInternalIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<DeleteModalState>({ isOpen: false, modelToDelete: null });

    const isAddDialogOpen = externalIsAddOpen !== undefined ? externalIsAddOpen : internalIsAddDialogOpen;
    const setIsAddDialogOpen = externalSetIsAddOpen || setInternalIsAddDialogOpen;

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
                setIsAddDialogOpen(false);
                setFormData({ id: '', name: '', context_window: '', max_tokens: '' });
                onUpdate?.();
            }
        } catch (error) {
            toast.error('Failed to add model');
        }
    };

    const handleUpdateModel = async () => {
        if (!editingModel) return;
        try {
            const response = await aiAPI.updateModel(provider, editingModel.id, {
                name: formData.name,
                context_window: formData.context_window ? parseInt(formData.context_window) : undefined,
                max_tokens: formData.max_tokens ? parseInt(formData.max_tokens) : undefined,
            });

            if (response.status >= 200 && response.status < 300) {
                setIsEditDialogOpen(false);
                setEditingModel(null);
                setFormData({ id: '', name: '', context_window: '', max_tokens: '' });
                onUpdate?.();
            }
        } catch (error) {
            toast.error('Failed to update model');
        }
    };

    const handleToggleModel = async (modelId: string) => {
        try {
            const response = await aiAPI.toggleModel(provider, modelId);
            if (response.status >= 200 && response.status < 300) {
                onUpdate?.();
            }
        } catch (error) {
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
        } catch (error) {
            toast.error('Failed to delete model');
        } finally {
            setIsDeleting(null);
            setDeleteModal({ isOpen: false, modelToDelete: null });
        }
    };

    const openEditDialog = (model: ManagedModel) => {
        setEditingModel(model);
        setFormData({
            id: model.id,
            name: model.name || model.id,
            context_window: model.context_window?.toString() || '',
            max_tokens: model.max_tokens?.toString() || '',
        });
        setIsEditDialogOpen(true);
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-1.5 h-7 px-2"
                >
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    <span className="text-sm font-medium">Models ({models.length})</span>
                </Button>
                {!hideHeaderActions && (
                    <div className="flex items-center gap-1.5">
                        <BulkImportModels provider={provider} onSuccess={onUpdate} />
                        <Button
                            size="sm"
                            onClick={() => setIsAddDialogOpen(true)}
                            className="flex items-center gap-1.5 px-2 text-xs"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Model
                        </Button>
                    </div>
                )}
            </div>

            {isExpanded && (
                <div className="space-y-1.5 pl-3">
                    {models.map((model) => (
                        <div
                            key={model.id}
                            className={cn(
                                'flex items-center justify-between p-2 rounded-md border',
                                !model.enabled && 'opacity-50 bg-muted/50'
                            )}
                        >
                            <div className="flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-medium">{model.name || model.id}</span>
                                    {model.status === 'unavailable' && (
                                        <Badge variant="outline" className="text-xs px-1 py-0">
                                            Unavailable
                                        </Badge>
                                    )}
                                    {model.deprecated && (
                                        <Badge variant="destructive" className="text-xs px-1 py-0">
                                            Deprecated
                                        </Badge>
                                    )}
                                    {!model.enabled && (
                                        <Badge variant="outline" className="text-xs px-1 py-0">
                                            Disabled
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-xs text-muted-foreground space-y-0.5">
                                    <p className="text-xs">
                                        ID: {model.id}
                                        {model.context_window && ` • Context: ${(model.context_window / 1024).toFixed(0)}K`}
                                        {model.max_tokens && ` • Max: ${(model.max_tokens / 1024).toFixed(0)}K`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
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
                                    onClick={() => openEditDialog(model)}
                                    className="h-9 w-9 p-0"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
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

            {/* Add Model Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Model</DialogTitle>
                        <DialogDescription>
                            Discover and select models, or add one manually, for {provider}
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="discover">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="discover">Discover</TabsTrigger>
                            <TabsTrigger value="manual">Manual</TabsTrigger>
                        </TabsList>

                        <TabsContent value="discover" className="mt-3">
                            {isAddDialogOpen && (
                                <DiscoverModelsTab
                                    provider={provider}
                                    isCustom={isCustom}
                                    existingModels={models}
                                    onAdded={() => onUpdate?.()}
                                    onClose={() => setIsAddDialogOpen(false)}
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
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
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

            {/* Edit Model Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Model</DialogTitle>
                        <DialogDescription>
                            Update model metadata for {editingModel?.id}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-model-name">Display Name *</Label>
                            <Input
                                id="edit-model-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-context-window">Context Window</Label>
                                <Input
                                    id="edit-context-window"
                                    type="number"
                                    value={formData.context_window}
                                    onChange={(e) => setFormData({ ...formData, context_window: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-max-tokens">Max Tokens</Label>
                                <Input
                                    id="edit-max-tokens"
                                    type="number"
                                    value={formData.max_tokens}
                                    onChange={(e) => setFormData({ ...formData, max_tokens: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateModel} disabled={!formData.name}>
                            Save Changes
                        </Button>
                    </DialogFooter>
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
        </div>
    );
};
