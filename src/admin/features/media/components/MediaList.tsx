import { Button } from '@/ui/button';
import { Check, Copy, Eye, Trash2 } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import {
  isMediaItemImage,
  getFullUrl,
  formatDisplayedSize
} from '../utils/mediaHelpers';
import { formatDate } from '../../../utils/helpers';
import type { MediaLibraryItem } from '../utils/mediaHelpers';

interface MediaListProps {
  filteredMedia: MediaLibraryItem[];
  selectedMedia: (string | number)[];
  toggleMediaSelection: (id: number) => void;
  onSelect?: (item: MediaLibraryItem) => void;
  getFileIcon: (filename: string | undefined) => React.ReactNode;
  setDeleteModal: (val: { isOpen: boolean; id: number | string | null; isBulk: boolean }) => void;
  handleCopyUrl: (url: string) => void;
}

export const MediaList = ({
  filteredMedia,
  selectedMedia,
  toggleMediaSelection,
  onSelect,
  getFileIcon,
  setDeleteModal,
  handleCopyUrl
}: MediaListProps) => {
  return (
    <div className="bg-card rounded-2xl overflow-hidden">
      {/* Table Header */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-border/40 bg-accent/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        <div className="w-10 shrink-0" />
        <div className="flex-1 min-w-0">Name</div>
        <div className="w-20 text-center hidden sm:block">Size</div>
        <div className="w-32 text-center hidden md:block">Date</div>
        <div className="w-24 shrink-0" />
      </div>

      {/* Table Rows */}
      {filteredMedia.map((item, index) => (
        <div
          key={item.id}
          className={`group flex items-center gap-4 px-4 py-2.5 cursor-pointer transition-all duration-300 ease-out hover:bg-accent/30 ${index < filteredMedia.length - 1 ? 'border-b border-border/30' : ''} ${selectedMedia.includes(item.id) ? 'bg-primary/5 translate-x-2' : ''}`}
          onClick={() => onSelect ? onSelect(item) : toggleMediaSelection(item.id)}
        >
          {/* Thumbnail */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-accent/40 flex items-center justify-center shrink-0 border border-border/30">
            {isMediaItemImage(item) ? (
              <OptimizedImage item={item} priority={index < 8} className="transition-transform duration-500 group-hover:scale-105" />
            ) : (
              <div className="scale-50">{getFileIcon(item.name)}</div>
            )}
            {selectedMedia.includes(item.id) && (
              <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                <Check className="size-4 text-white" />
              </div>
            )}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
          </div>

          {/* Size */}
          <div className="w-20 text-center hidden sm:block">
            <span className="text-xs text-muted-foreground font-medium">{formatDisplayedSize(item)}</span>
          </div>

          {/* Date */}
          <div className="w-32 text-center hidden md:block">
            <span className="text-xs text-muted-foreground font-medium">{formatDate(item.createdAt || item.created_at)}</span>
          </div>

          {/* Actions */}
          <div className="w-24 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={(e) => { e.stopPropagation(); handleCopyUrl(getFullUrl(item)); }}><Copy className="size-3" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={(e) => { e.stopPropagation(); window.open(getFullUrl(item), '_blank'); }}><Eye className="size-3" /></Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, id: item.id, isBulk: false }); }}><Trash2 className="size-3" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
};
export default MediaList;
