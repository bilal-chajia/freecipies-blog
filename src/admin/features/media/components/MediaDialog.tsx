import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { Button } from '@/ui/button';
import type { MediaRecord } from '@modules/media/types/media.types';
import MediaLibrary from '@admin/features/media/pages/MediaLibrary';

interface MediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: MediaRecord) => void;
  variantSizes?: Record<string, number>;
}

export default function MediaDialog({ open, onOpenChange, onSelect, variantSizes }: MediaDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onOpenChange(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange, open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-60 bg-black/50 p-5" onMouseDown={() => onOpenChange(false)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-dialog-title"
        aria-describedby="media-dialog-description"
        className="mx-auto flex h-[calc(100vh-40px)] w-[calc(100vw-120px)] flex-col rounded-lg border bg-background p-6 shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="media-dialog-title" className="text-base font-semibold leading-none">
              Select Image
            </h2>
            <p id="media-dialog-description" className="sr-only">
              Choose an existing media asset from the library.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
        <div className="mt-4 flex-1 overflow-y-auto px-1">
          <MediaLibrary
            onSelect={(item: MediaRecord) => {
              onSelect(item);
              onOpenChange(false);
            }}
            isDialog
            variantSizes={variantSizes}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
