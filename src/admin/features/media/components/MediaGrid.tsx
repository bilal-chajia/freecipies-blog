import { motion, AnimatePresence } from 'motion/react';
import { Card } from '@/ui/card';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Maximize2, Copy, Trash2, Check } from 'lucide-react';
import { OptimizedImage } from './OptimizedImage';
import {
  isMediaItemImage,
  getFullUrl,
  formatDisplayedSize
} from '../utils/mediaHelpers';
import type { MediaLibraryItem } from '../utils/mediaHelpers';

interface MediaGridProps {
  filteredMedia: MediaLibraryItem[];
  selectedMedia: (string | number)[];
  toggleMediaSelection: (id: number) => void;
  onSelect?: (item: MediaLibraryItem) => void;
  getFileIcon: (filename: string | undefined) => React.ReactNode;
  setDeleteModal: (val: { isOpen: boolean; id: number | string | null; isBulk: boolean }) => void;
  handleCopyUrl: (url: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.02 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 }
};

export const MediaGrid = ({
  filteredMedia,
  selectedMedia,
  toggleMediaSelection,
  onSelect,
  getFileIcon,
  setDeleteModal,
  handleCopyUrl
}: MediaGridProps) => {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4"
    >
      <AnimatePresence mode="popLayout">
        {filteredMedia.map((item, index) => (
          <motion.div
            key={item.id}
            variants={itemVariants}
            layout
            className="group"
          >
            <Card
              className={`relative overflow-hidden border-none bg-accent/50 group hover:ring-2 hover:ring-primary/40 transition-all duration-300 aspect-square rounded-2xl cursor-pointer shadow-sm p-0 ${selectedMedia.includes(item.id) ? 'ring-2 ring-primary ring-offset-2' : ''}`}
              onClick={() => onSelect ? onSelect(item) : toggleMediaSelection(item.id)}
            >
              {isMediaItemImage(item) ? (
                <OptimizedImage item={item} priority={index < 8} className="transition-transform duration-700 group-hover:scale-110" />
              ) : (
                <div className="flex h-full w-full items-center justify-center transition-transform duration-500 group-hover:scale-110">
                  {getFileIcon(item.name)}
                </div>
              )}

              {/* Modern Overlay */}
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute top-2 right-2 flex gap-0.5 translate-x-2 group-hover:translate-x-0 transition-transform duration-300">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-5 rounded-full bg-primary/80 backdrop-blur-md border-none text-white hover:bg-primary"
                    onClick={(e) => { e.stopPropagation(); window.open(getFullUrl(item), '_blank'); }}
                    title="View Full"
                  >
                    <Maximize2 className="size-2.5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-5 rounded-full bg-success/80 backdrop-blur-md border-none text-white hover:bg-success"
                    onClick={(e) => { e.stopPropagation(); handleCopyUrl(getFullUrl(item)); }}
                    title="Copy URL"
                  >
                    <Copy className="size-2.5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="size-5 rounded-full bg-destructive/80 backdrop-blur-md border-none text-white hover:bg-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, id: item.id, isBulk: false }); }}
                    title="Delete"
                  >
                    <Trash2 className="size-2.5" />
                  </Button>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span className="text-[10px] text-white/90 font-medium truncate max-w-25">
                    {item.name}
                  </span>
                  <Badge variant="secondary" className="h-4 px-1 text-[8px] bg-white/10 backdrop-blur-md text-white border-white/10 font-bold uppercase truncate">
                    {formatDisplayedSize(item)}
                  </Badge>
                </div>
              </div>

              {/* Image Type Badge (top-left, aligned with action buttons) */}
              {!selectedMedia.includes(item.id) && (() => {
                const type = (item.mimeType || item.mime_type || 'image/jpeg').split('/').pop() || 'jpeg';
                const colorClass: Record<string, string> = {
                  webp: 'bg-success/80',
                  avif: 'bg-secondary/80',
                  jpeg: 'bg-primary/80',
                  jpg: 'bg-primary/80',
                  png: 'bg-warning/80',
                };
                return (
                  <div className="absolute top-2 left-2 pointer-events-none">
                    <Badge className={`h-5 px-1.5 text-[7px] ${colorClass[type] || 'bg-muted/50'} backdrop-blur-sm text-white border-none font-bold uppercase flex items-center`}>
                      {type}
                    </Badge>
                  </div>
                );
              })()}

              {/* Selection Checkmark */}
              {selectedMedia.includes(item.id) && (
                <div className="absolute top-2 left-2 h-5 w-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-lg border-2 border-background">
                  <Check className="size-3 bold" />
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};
