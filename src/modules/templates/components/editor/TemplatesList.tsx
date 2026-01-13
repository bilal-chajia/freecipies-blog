// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Badge } from '@/ui/badge';
import {
    Card,
    CardContent,
    CardFooter,
} from '@/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/ui/alert-dialog';
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit3,
    Trash2,
    Copy,
    Star,
    LayoutTemplate,
    Clock,
    Palette,
    ArrowUpRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { templatesAPI } from '@admin/services/api';
import { cn } from '@/lib/utils';

/**
 * TemplatesList - Professional Grid view of all Pinterest pin templates
 */
const TemplatesList = () => {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sizeFilter, setSizeFilter] = useState('all');
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

    // Filter templates
    const filteredTemplates = templates.filter(t => {
        // Search filter
        const matchesSearch = t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description?.toLowerCase().includes(searchQuery.toLowerCase());

        // Size filter
        if (sizeFilter === 'all') return matchesSearch;

        const width = t.width || t.canvas_width || 1000;
        const height = t.height || t.canvas_height || 1500;
        const sizeKey = `${width}x${height}`;

        return matchesSearch && sizeKey === sizeFilter;
    });

    // Actions
    const handleDelete = async () => {
        if (!templateToDelete) return;
        try {
            await templatesAPI.delete(templateToDelete.slug);
            toast.success('Template deleted');
            loadTemplates();
        } catch (error) {
            toast.error('Failed to delete template');
        } finally {
            setDeleteDialogOpen(false);
            setTemplateToDelete(null);
        }
    };

    const handleDuplicate = async (template) => {
        try {
            const newTemplate = {
                ...template,
                name: `${template.name} (Copy)`,
                slug: `${template.slug}-copy-${Date.now()}`,
                is_default: false,
            };
            // Clean ID and timestamps
            delete newTemplate.id;
            delete newTemplate.created_at;
            delete newTemplate.updated_at;

            await templatesAPI.create(newTemplate);
            toast.success('Template duplicated');
            loadTemplates();
        } catch (error) {
            toast.error('Failed to duplicate template');
        }
    };

    const handleSetDefault = async (template) => {
        try {
            const currentDefault = templates.find(t => t.is_default);
            if (currentDefault) {
                await templatesAPI.update(currentDefault.slug, { is_default: false });
            }
            await templatesAPI.update(template.slug, { is_default: true });
            toast.success('Default template updated');
            loadTemplates();
        } catch (error) {
            toast.error('Failed to update default template');
        }
    };

    // Render loading skeletons
    if (isLoading) {
        return (
            <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-64 bg-muted/50 animate-pulse rounded" />
                    </div>
                    <div className="h-10 w-32 bg-muted animate-pulse rounded" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="aspect-[2/3] bg-muted/30 animate-pulse rounded-xl border border-muted" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-8 max-w-[1600px] mx-auto min-h-screen bg-background text-foreground">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pin Templates</h1>
                    <p className="text-muted-foreground mt-1">
                        Design and manage professional Pinterest templates for your recipes
                    </p>
                </div>
                <Button
                    onClick={() => navigate('/templates/new')}
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Create Template
                </Button>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-xl border border-border/50 backdrop-blur-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search templates..."
                        className="pl-9 bg-background/50 border-transparent focus:bg-background transition-all"
                    />
                </div>

                {/* Size Filter */}
                <select
                    value={sizeFilter}
                    onChange={(e) => setSizeFilter(e.target.value)}
                    className="h-9 px-3 rounded-md bg-background/50 border border-border/50 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    <option value="all">All Sizes</option>
                    <option value="1000x1500">Pinterest Pin (1000×1500)</option>
                    <option value="1000x1000">Square (1000×1000)</option>
                    <option value="1080x1920">Story (1080×1920)</option>
                    <option value="1080x1080">Instagram (1080×1080)</option>
                    <option value="1200x630">Facebook (1200×630)</option>
                    <option value="1200x675">Twitter (1200×675)</option>
                </select>

                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-auto px-2">
                    <Palette className="w-4 h-4" />
                    <span>{filteredTemplates.length} Templates</span>
                </div>
            </div>

            {/* Grid */}
            {filteredTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-zinc-800 rounded-3xl bg-zinc-900/20">
                    <div className="h-20 w-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-black/20">
                        <LayoutTemplate className="w-10 h-10 text-zinc-700" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">No templates found</h3>
                    <p className="text-muted-foreground max-w-sm text-center mb-8">
                        {searchQuery
                            ? "Try adjusting your search terms to find what you're looking for."
                            : "Create your first template to start generating beautiful pins automatically."}
                    </p>
                    <Button onClick={() => navigate('/templates/new')} variant="outline">
                        Create New Template
                    </Button>
                </div>
            ) : (
                <motion.div
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
                    layout
                >
                    <AnimatePresence mode="popLayout">
                        {filteredTemplates.map((template, index) => (
                            <motion.div
                                key={template.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{
                                    duration: 0.2,
                                    delay: index * 0.03,
                                    layout: { duration: 0.3 }
                                }}
                            >
                                <Card
                                    className={cn(
                                        "group relative overflow-hidden bg-card hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 hover:-translate-y-1 border-0 ring-1 ring-border/20 p-0 gap-0",
                                        template.is_default && "ring-2 ring-primary/50"
                                    )}
                                >
                                    {/* Card Image Area */}
                                    <div
                                        className="h-48 relative bg-muted/50 overflow-hidden cursor-pointer"
                                        onClick={() => navigate(`/templates/${template.slug}`)}
                                        style={{ backgroundColor: template.background_color }}
                                    >
                                        {template.thumbnail_url && (
                                            template.thumbnail_url.startsWith('http') ||
                                            template.thumbnail_url.startsWith('/') ||
                                            template.thumbnail_url.startsWith('data:')
                                        ) ? (
                                            <img
                                                src={template.thumbnail_url}
                                                alt={template.name}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                                loading="lazy"
                                                onError={(e) => {
                                                    // Hide broken image and show placeholder
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'flex';
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className="absolute inset-0 flex-col items-center justify-center gap-3 opacity-30"
                                            style={{ display: template.thumbnail_url && (template.thumbnail_url.startsWith('http') || template.thumbnail_url.startsWith('/') || template.thumbnail_url.startsWith('data:')) ? 'none' : 'flex' }}
                                        >
                                            <LayoutTemplate className="w-16 h-16" />
                                            <span className="text-sm font-medium">No Preview</span>
                                        </div>

                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                        {/* Floating Action Buttons - Edit & Delete */}
                                        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8 rounded-full shadow-lg backdrop-blur-md bg-black/50 hover:bg-black/70 border border-white/20"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/templates/${template.slug}`);
                                                }}
                                                title="Edit Template"
                                            >
                                                <Edit3 className="w-4 h-4 text-white" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8 rounded-full shadow-lg backdrop-blur-md bg-black/50 hover:bg-black/70 border border-white/20"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDuplicate(template);
                                                }}
                                                title="Duplicate Template"
                                            >
                                                <Copy className="w-4 h-4 text-white" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8 rounded-full shadow-lg backdrop-blur-md bg-red-500/80 hover:bg-red-600 border border-white/20"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTemplateToDelete(template);
                                                    setDeleteDialogOpen(true);
                                                }}
                                                title="Delete Template"
                                            >
                                                <Trash2 className="w-4 h-4 text-white" />
                                            </Button>
                                        </div>

                                        {/* Default Badge */}
                                        {!!template.is_default && (
                                            <div className="absolute top-3 left-3">
                                                <Badge className="bg-yellow-500/90 hover:bg-yellow-500 border-none shadow-lg text-black font-semibold backdrop-blur-sm">
                                                    <Star className="w-3 h-3 mr-1 fill-black" /> Default
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    {/* Card Footer Info */}
                                    < div className="px-2 py-3 bg-card group-hover:bg-muted/30 transition-colors" >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <h3 className="font-medium truncate text-sm text-foreground/90 group-hover:text-primary transition-colors">
                                                    {template.name}
                                                </h3>
                                                {/* Canvas Size - below title */}
                                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                                    {(template.width || template.canvas_width || 1000)}×{(template.height || template.canvas_height || 1500)}
                                                </p>
                                            </div>
                                            {/* Date */}
                                            <div className="flex items-center text-[10px] text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-md whitespace-nowrap">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {new Date(template.updated_at || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Delete Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
};

export default TemplatesList;

