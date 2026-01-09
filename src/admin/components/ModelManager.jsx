/**
 * Model Manager Component
 * ========================
 * UI for managing AI models per provider
 */

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Power, PowerOff, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/ui/button';
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
import { cn } from '@/lib/utils';
import api from '@/services/api';
import { BulkImportModels } from './BulkImportModels';

export function ModelManager({
    provider,
    models = [],
    onUpdate,
    isAddDialogOpen: externalIsAddOpen,
    onAddDialogChange: externalSetIsAddOpen,
    hideHeaderActions = false
}) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingModel, setEditingModel] = useState(null);
    const [internalIsAddDialogOpen, setInternalIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(null);

    const isAddDialogOpen = externalIsAddOpen !== undefined ? externalIsAddOpen : internalIsAddDialogOpen;
    const setIsAddDialogOpen = externalSetIsAddOpen || setInternalIsAddDialogOpen;

    const [formData, setFormData] = useState({
        id: '',
        name: '',
        description: '',
        contextWindow: '',
        maxTokens: '',
    });

    const handleAddModel = async () => {
        try {
            const response = await api.post(`/admin/ai/models/${provider}`, {
                id: formData.id,
                name: formData.name,
                description: formData.description || undefined,
                contextWindow: formData.contextWindow ? parseInt(formData.contextWindow) : undefined,
                maxTokens: formData.maxTokens ? parseInt(formData.maxTokens) : undefined,
            });

            if (response.ok) {
                setIsAddDialogOpen(false);
                setFormData({ id: '', name: '', description: '', contextWindow: '', maxTokens: '' });
                onUpdate?.();
            }
        } catch (error) {
            console.error('Failed to add model:', error);
        }
    };

    const handleUpdateModel = async () => {
        try {
            const response = await api.put(`/admin/ai/models/${provider}/${editingModel.id}`, {
                name: formData.name,
                description: formData.description || undefined,
                contextWindow: formData.contextWindow ? parseInt(formData.contextWindow) : undefined,
                maxTokens: formData.maxTokens ? parseInt(formData.maxTokens) : undefined,
            });

            if (response.ok) {
                setIsEditDialogOpen(false);
                setEditingModel(null);
                setFormData({ id: '', name: '', description: '', contextWindow: '', maxTokens: '' });
                onUpdate?.();
            }
        } catch (error) {
            console.error('Failed to update model:', error);
        }
    };

    const handleToggleModel = async (modelId) => {
        try {
            const response = await api.patch(`/admin/ai/models/${provider}/${modelId}/toggle`);
            if (response.ok) {
                onUpdate?.();
            }
        } catch (error) {
            console.error('Failed to toggle model:', error);
        }
    };

    const handleDeleteModel = async (modelId) => {
        if (!confirm('Are you sure you want to delete this model?')) return;

        setIsDeleting(modelId);
        try {
            const response = await api.delete(`/admin/ai/models/${provider}/${modelId}`);
            if (response.ok) {
                onUpdate?.();
            }
        } catch (error) {
            console.error('Failed to delete model:', error);
        } finally {
            setIsDeleting(null);
        }
    };

    const openEditDialog = (model) => {
        setEditingModel(model);
        setFormData({
            id: model.id,
            name: model.name,
            description: model.description || '',
            contextWindow: model.contextWindow?.toString() || '',
            maxTokens: model.maxTokens?.toString() || '',
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
                                    <span className="text-sm font-medium">{model.name}</span>
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
                                    {model.description && <p className="text-xs">{model.description}</p>}
                                    <p className="text-xs">
                                        ID: {model.id}
                                        {model.contextWindow && ` • Context: ${(model.contextWindow / 1024).toFixed(0)}K`}
                                        {model.maxTokens && ` • Max: ${(model.maxTokens / 1024).toFixed(0)}K`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleToggleModel(model.id)}
                                    title={model.enabled ? 'Disable' : 'Enable'}
                                    className="h-7 w-7 p-0"
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
                                    className="h-7 w-7 p-0"
                                >
                                    <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteModel(model.id)}
                                    disabled={isDeleting === model.id}
                                    className="h-7 w-7 p-0"
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
                        <DialogTitle>Add New Model</DialogTitle>
                        <DialogDescription>
                            Add a new AI model to {provider}
                        </DialogDescription>
                    </DialogHeader>
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
                        <div className="grid gap-2">
                            <Label htmlFor="model-desc">Description</Label>
                            <Input
                                id="model-desc"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="e.g., Multimodal flagship"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="context-window">Context Window</Label>
                                <Input
                                    id="context-window"
                                    type="number"
                                    value={formData.contextWindow}
                                    onChange={(e) => setFormData({ ...formData, contextWindow: e.target.value })}
                                    placeholder="131072"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="max-tokens">Max Tokens</Label>
                                <Input
                                    id="max-tokens"
                                    type="number"
                                    value={formData.maxTokens}
                                    onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
                                    placeholder="65536"
                                />
                            </div>
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
                        <div className="grid gap-2">
                            <Label htmlFor="edit-model-desc">Description</Label>
                            <Input
                                id="edit-model-desc"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-context-window">Context Window</Label>
                                <Input
                                    id="edit-context-window"
                                    type="number"
                                    value={formData.contextWindow}
                                    onChange={(e) => setFormData({ ...formData, contextWindow: e.target.value })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-max-tokens">Max Tokens</Label>
                                <Input
                                    id="edit-max-tokens"
                                    type="number"
                                    value={formData.maxTokens}
                                    onChange={(e) => setFormData({ ...formData, maxTokens: e.target.value })}
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
        </div>
    );
}
