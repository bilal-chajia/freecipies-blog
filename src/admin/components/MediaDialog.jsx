import { Dialog, DialogContent, DialogTitle } from '@/ui/dialog.jsx';
import MediaLibrary from '../pages/media/MediaLibrary';

export default function MediaDialog({ open, onOpenChange, onSelect }) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-none w-[calc(100vw-120px)] h-[calc(100vh-40px)] flex flex-col p-6">
                <DialogTitle>Select Image</DialogTitle>
                <div className="flex-1 overflow-y-auto mt-4 px-1">
                    <MediaLibrary
                        onSelect={(item) => {
                            onSelect(item);
                            onOpenChange(false);
                        }}
                        isDialog
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
