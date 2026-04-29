import { Dialog, DialogContent, DialogTitle } from '@/ui/dialog.jsx';
import MediaLibrary from '@admin/features/media/pages/MediaLibrary';

export default function MediaDialog({ open, onOpenChange, onSelect, variantSizes }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
            <DialogContent className="!max-w-none !max-h-none w-[calc(100vw-120px)] h-[calc(100vh-40px)] flex flex-col p-6 z-[60]">
                <DialogTitle>Select Image</DialogTitle>
                <div className="flex-1 overflow-y-auto mt-4 px-1">
                    <MediaLibrary
                        onSelect={(item) => {
                            onSelect(item);
                            onOpenChange(false);
                        }}
                        isDialog
                        variantSizes={variantSizes}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
