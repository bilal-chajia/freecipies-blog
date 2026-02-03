/**
 * UploadQueue - Display and manage the upload queue
 */

import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/ui/button';
import { Badge } from '@/ui/badge';
import { Link, RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import DropZone from '../DropZone';

export default function UploadQueue({
  queue,
  onClear,
  onStart,
  onRemove,
  onRetry,
  dropZoneProps,
}) {
  const pendingCount = queue.filter(q => q.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* DropZone FIRST - Add More Images */}
      <DropZone {...dropZoneProps} />

      {/* Queue Header and List SECOND */}
      <div className="pt-4 border-t space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            Queue ({queue.length} images)
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
            >
              Clear All
            </Button>
            <Button
              size="sm"
              onClick={onStart}
              disabled={pendingCount === 0}
            >
              Start Editing →
            </Button>
          </div>
        </div>

        {/* Queue List */}
        <div className="grid gap-2 max-h-[300px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {queue.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.03,
                  ease: 'easeOut'
                }}
                layout
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  item.status === 'done' && "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800",
                  item.status === 'uploading' && "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
                  item.status === 'error' && "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
                  item.status === 'skipped' && "bg-gray-50 border-gray-200 opacity-50 dark:bg-gray-900/30",
                  item.status === 'pending' && "bg-background border-border"
                )}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                  {item.previewUrl ? (
                    <img
                      src={item.previewUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Link className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Name & Status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.finalName || item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.type === 'url' ? 'URL Import' : 'File'}
                  </p>
                </div>

                {/* Status Badge */}
                <Badge
                  variant={
                    item.status === 'done' ? 'default' :
                      item.status === 'uploading' ? 'secondary' :
                        item.status === 'error' ? 'destructive' :
                          item.status === 'skipped' ? 'outline' : 'outline'
                  }
                >
                  {item.status === 'pending' && '⏳ Pending'}
                  {item.status === 'uploading' && '🔄 Uploading'}
                  {item.status === 'done' && '✅ Done'}
                  {item.status === 'error' && '❌ Error'}
                  {item.status === 'skipped' && '⏭️ Skipped'}
                </Badge>

                {/* Retry Button (for error items) */}
                {item.status === 'error' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={() => onRetry(item.id)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </Button>
                )}

                {/* Remove Button (for pending and error items) */}
                {(item.status === 'pending' || item.status === 'error') && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onRemove(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
