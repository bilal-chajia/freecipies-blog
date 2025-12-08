import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Copy,
    Star,
    Loader2,
    LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';
import { templatesAPI } from '../../services/api';

/**
 * TemplatesList - Grid view of all Pinterest pin templates
 */
const TemplatesList = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState(null);

    // Load templates
    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const response = await templatesAPI.getAll();
            if (response.data?.success !== false) {
                setTemplates(response.data?.data || response.data || []);
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    // Filter templates by search
    const filteredTemplates = templates.filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle delete
    const handleDelete = async () => {
        if (!templateToDelete) return;

        try {
            await templatesAPI.delete(templateToDelete.slug);
            toast.success('Template deleted');
            loadTemplates();
        } catch (error) {
            console.error('Failed to delete template:', error);
            toast.error('Failed to delete template');
        } finally {
            setDeleteDialogOpen(false);
            setTemplateToDelete(null);
        }
    };

    // Handle duplicate
    const handleDuplicate = async (template) => {
        try {
            const newTemplate = {
                ...template,
                name: `${template.name} (Copy)`,
                slug: `${template.slug}-copy-${Date.now()}`,
                is_default: false,
            };
            delete newTemplate.id;
            delete newTemplate.created_at;
            delete newTemplate.updated_at;

            await templatesAPI.create(newTemplate);
            toast.success('Template duplicated');
            loadTemplates();
        } catch (error) {
            console.error('Failed to duplicate template:', error);
            toast.error('Failed to duplicate template');
        }
    };

    // Handle set as default
    const handleSetDefault = async (template) => {
        try {
            // First, unset any existing default
            for (const t of templates.filter(t => t.is_default)) {
                await templatesAPI.update(t.slug, { is_default: false });
            }
            // Set new default
            await templatesAPI.update(template.slug, { is_default: true });
            toast.success(`${template.name} set as default`);
            loadTemplates();
        } catch (error) {
            console.error('Failed to set default:', error);
            toast.error('Failed to set default template');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Pin Templates</h1>
                    <p className="text-muted-foreground">
                        Create and manage Pinterest pin templates
                    </p>
                </div>
                <Button onClick={() => navigate('/templates/new')}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search templates..."
                    className="pl-9"
                />
            </div>

            {/* Templates Grid */}
            {filteredTemplates.length === 0 ? (
                <Card className="p-12 text-center">
                    <LayoutTemplate className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <h3 className="font-medium mb-2">No templates yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Create your first Pinterest pin template to get started
                    </p>
                    <Button onClick={() => navigate('/templates/new')}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                    </Button>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredTemplates.map((template) => (
                        <Card
                            key={template.id}
                            className="group cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => navigate(`/templates/${template.slug}`)}
                        >
                            {/* Preview */}
                            <div
                                className="aspect-[2/3] rounded-t-lg bg-muted flex items-center justify-center overflow-hidden"
                                style={{ backgroundColor: template.background_color }}
                            >
                                {template.thumbnail_url ? (
                                    <img
                                        src={template.thumbnail_url}
                                        alt={template.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <LayoutTemplate className="w-16 h-16 text-muted-foreground opacity-30" />
                                )}
                            </div>

                            <CardHeader className="py-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            {template.name}
                                            {template.is_default && (
                                                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                                            )}
                                        </CardTitle>
                                        {template.description && (
                                            <CardDescription className="text-xs truncate">
                                                {template.description}
                                            </CardDescription>
                                        )}
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            onClick={(e) => e.stopPropagation()}
                                            asChild
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/templates/${template.slug}`);
                                                }}
                                            >
                                                <Edit className="w-4 h-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDuplicate(template);
                                                }}
                                            >
                                                <Copy className="w-4 h-4 mr-2" />
                                                Duplicate
                                            </DropdownMenuItem>
                                            {!template.is_default && (
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSetDefault(template);
                                                    }}
                                                >
                                                    <Star className="w-4 h-4 mr-2" />
                                                    Set as Default
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                className="text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTemplateToDelete(template);
                                                    setDeleteDialogOpen(true);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{templateToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default TemplatesList;
