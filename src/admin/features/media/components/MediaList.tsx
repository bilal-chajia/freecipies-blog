import { Button } from '@/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { MoreHorizontal, Copy, Eye, Trash2, Check } from 'lucide-react';
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
    <div className="bg-card rounded-lg border border-border/80 shadow-xs overflow-hidden">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/50 bg-muted/30">
            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-12" />
            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Name</th>
            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:table-cell w-28">Type</th>
            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden sm:table-cell w-24 text-center">Size</th>
            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hidden md:table-cell w-32 text-center">Date</th>
            <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground w-16" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {filteredMedia.map((item) => {
            const isSelected = selectedMedia.includes(item.id);
            return (
              <tr
                key={item.id}
                className={`hover:bg-accent/40 transition-colors group cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                onClick={() => onSelect ? onSelect(item) : toggleMediaSelection(item.id)}
              >
                {/* Preview */}
                <td className="px-3 py-2.5 w-12">
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-accent/40 flex items-center justify-center shrink-0 border border-border/30">
                    {isMediaItemImage(item) ? (
                      <OptimizedImage item={item} className="object-cover w-full h-full" />
                    ) : (
                      <div className="scale-50">{getFileIcon(item.name)}</div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-primary/70 flex items-center justify-center">
                        <Check className="size-4 text-white" />
                      </div>
                    )}
                  </div>
                </td>

                {/* Name */}
                <td className="px-3 py-2.5">
                  <p className="text-sm font-medium text-foreground truncate max-w-[200px] md:max-w-xs">
                    {item.name}
                  </p>
                  {item.alt_text && (
                    <p className="text-[10px] text-muted-foreground truncate max-w-[200px] md:max-w-xs mt-0.5">
                      {item.alt_text}
                    </p>
                  )}
                </td>

                {/* Type */}
                <td className="px-3 py-2.5 hidden sm:table-cell w-28">
                  <span className="text-xs text-muted-foreground font-medium">
                    {item.mime_type || '—'}
                  </span>
                </td>

                {/* Size */}
                <td className="px-3 py-2.5 hidden sm:table-cell w-24 text-center">
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatDisplayedSize(item)}
                  </span>
                </td>

                {/* Date */}
                <td className="px-3 py-2.5 hidden md:table-cell w-32 text-center">
                  <span className="text-xs text-muted-foreground font-medium">
                    {formatDate(item.created_at)}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-3 py-2.5 w-16">
                  <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                          <MoreHorizontal className="size-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyUrl(getFullUrl(item)); }}>
                          <Copy className="size-3.5 mr-2" />
                          Copy URL
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(getFullUrl(item), '_blank'); }}>
                          <Eye className="size-3.5 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, id: item.id, isBulk: false }); }}
                          className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        >
                          <Trash2 className="size-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
export default MediaList;
