import { ArrowLeft } from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import MediaDialog from '../../../components/MediaDialog';

/**
 * Shared layout wrapper for content editors
 * Provides header, 2-column layout, and media dialog
 */
export default function EditorLayout({
    title,
    subtitle,
    backPath,
    loading,
    mainContent,
    sidebarContent,
    mediaDialogOpen,
    setMediaDialogOpen,
    handleMediaSelect,
    navigate,
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(backPath)}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold">{title}</h2>
                        <p className="text-sm text-muted-foreground">{subtitle}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(backPath)}>
                        Cancel
                    </Button>
                </div>
            </div>

            {/* Main Layout: 2 columns */}
            <div className="flex-1 grid grid-cols-12 overflow-hidden">
                {/* Main Content Area */}
                <div className="col-span-8 overflow-y-auto border-r">
                    {mainContent}
                </div>

                {/* Sidebar */}
                <div className="col-span-4 overflow-y-auto bg-muted/30">
                    {sidebarContent}
                </div>
            </div>

            <MediaDialog
                open={mediaDialogOpen}
                onOpenChange={setMediaDialogOpen}
                onSelect={handleMediaSelect}
            />
        </div>
    );
}
