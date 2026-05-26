import { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMediaAssets } from '../hooks/useMediaAssets';
import {
  ImageEditor,
  ImageUploader,
  MediaGrid,
  MediaList
} from '../components';
import { DateRangePicker } from '@/ui/date-range-picker';
import {
  Upload,
  Search,
  Grid,
  List,
  Image as ImageIcon,
  File as FileIcon,
  Video,
  Music,
  Archive,
  Copy,
  Trash2,
  X,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select';
import ConfirmationModal from '@/ui/confirmation-modal';
import { getFullUrl } from '../utils/mediaHelpers';
import type { MediaLibraryItem } from '../utils/mediaHelpers';

interface MediaLibraryProps {
  onSelect?: (item: MediaLibraryItem) => void;
  isDialog?: boolean;
  variantSizes?: Record<string, number>;
}

const getFileIcon = (filename: string | undefined): React.ReactNode => {
  if (!filename) return <FileIcon className="w-8 h-8 opacity-40" />;
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <ImageIcon className="size-8 text-primary" />;
  if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return <Video className="size-8 text-destructive" />;
  if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) return <Music className="size-8 text-success" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <Archive className="size-8 text-secondary" />;
  return <FileIcon className="size-8 opacity-40" />;
};

const MediaLibrary = ({ onSelect, isDialog, variantSizes }: MediaLibraryProps) => {
  const {
    mediaItems,
    selectedMedia,
    loading,
    pagination,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    sortBy,
    setSortBy,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    showUploadDialog,
    setShowUploadDialog,
    deleteModal,
    setDeleteModal,
    editingImage,
    setEditingImage,
    loadMedia,
    handlePageChange,
    handleBulkDelete,
    confirmDelete,
    handleCopyUrl,
    handleEditorSave,
    clearSelection,
    toggleMediaSelection
  } = useMediaAssets();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredMedia = mediaItems.filter(item => {
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.altText?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-4 pb-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-xs mb-0.5 uppercase tracking-wider">
            <ImageIcon className="size-3.5" />
            Assets & CDN
          </div>
          <h1 className="text-xl font-bold tracking-tight text-balance">Media Library</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Centralized repository for high-fidelity images, videos, and documentation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="h-9 px-4 gap-2 shadow-xs rounded-lg"
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="size-3.5" />
            Upload Assets
          </Button>
        </div>
      </div>

      {/* Sticky Action Bar - visible when items are selected */}
      <AnimatePresence>
        {selectedMedia.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background/95 backdrop-blur-xl border border-border/80 shadow-xs rounded-lg px-4 py-2.5"
          >
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {selectedMedia.length} selected
            </span>
            <div className="w-px h-5 bg-border/60" />
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-8 px-3 rounded-md">
              <X className="size-3.5 mr-1.5" /> Clear
            </Button>
            <Button onClick={handleBulkDelete} size="sm" variant="destructive" className="h-8 px-3 gap-1.5 rounded-md">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Tools Bar */}
      <div className="flex flex-col xl:flex-row gap-3">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground opacity-60 group-hover:text-primary transition-colors duration-300" />
          <Input
            placeholder="Search assets by name, tag, or metadata..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-9 border border-border/80 bg-card rounded-lg focus-visible:ring-primary/50 transition-all text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-35 h-9 border border-border/80 bg-card rounded-lg text-xs font-bold shadow-xs">
              <Filter className="size-3.5 mr-1.5 opacity-60" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="all">All Assets</SelectItem>
              <SelectItem value="image">Imagery</SelectItem>
              <SelectItem value="video">Motion</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-37.5 h-9 border border-border/80 bg-card rounded-lg text-xs font-bold shadow-xs">
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 opacity-60" />
              <SelectValue placeholder="Sorted By" />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="created_at">Recent Activity</SelectItem>
              <SelectItem value="name">Alphanumeric</SelectItem>
            </SelectContent>
          </Select>

          <DateRangePicker
            dateFrom={dateFrom}
            dateTo={dateTo}
            onApply={(range) => {
              setDateFrom(range.dateFrom);
              setDateTo(range.dateTo);
            }}
            placeholder="All Time"
            className="w-42.5"
          />

          <div className="flex p-0.5 bg-accent/50 rounded-lg border border-border/30 h-9">
            <Button variant="ghost" onClick={() => setViewMode('grid')} className={`h-full w-9 p-0 rounded-md transition-all ${viewMode === 'grid' ? 'bg-card shadow-xs text-primary' : 'text-muted-foreground hover:bg-card/40'}`}>
              <Grid className="size-4" />
            </Button>
            <Button variant="ghost" onClick={() => setViewMode('list')} className={`h-full w-9 p-0 rounded-md transition-all ${viewMode === 'list' ? 'bg-card shadow-xs text-primary' : 'text-muted-foreground hover:bg-card/40'}`}>
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Library Display */}
      <div className="min-h-125 bg-accent/5 rounded-lg p-4 border border-border/80 shadow-xs">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? (
            <MediaGrid
              filteredMedia={filteredMedia}
              selectedMedia={selectedMedia}
              toggleMediaSelection={toggleMediaSelection}
              onSelect={onSelect}
              getFileIcon={getFileIcon}
              setDeleteModal={setDeleteModal}
              handleCopyUrl={handleCopyUrl}
            />
          ) : (
            <MediaList
              filteredMedia={filteredMedia}
              selectedMedia={selectedMedia}
              toggleMediaSelection={toggleMediaSelection}
              onSelect={onSelect}
              getFileIcon={getFileIcon}
              setDeleteModal={setDeleteModal}
              handleCopyUrl={handleCopyUrl}
            />
          )}
        </AnimatePresence>

        {filteredMedia.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-32 opacity-30">
            <ImageIcon className="size-16 mb-4" />
            <h3 className="font-bold text-lg">No Assets Detected</h3>
            <p className="text-sm">Initiate an upload to populate your library.</p>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between mt-8 pt-6 border-t border-border/30 gap-4">
            <div className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> assets
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1 || loading}
                className="h-9 w-9 rounded-lg"
              >
                <ChevronLeft className="size-4" />
              </Button>

              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pagination.page === pageNum ? "default" : "outline"}
                      size="icon"
                      onClick={() => handlePageChange(pageNum)}
                      disabled={loading}
                      className={`h-9 w-9 rounded-lg transition-all ${
                        pagination.page === pageNum
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-accent"
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages || loading}
                className="h-9 w-9 rounded-lg"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Editors */}
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, isBulk: false })}
        onConfirm={confirmDelete}
        title={deleteModal.isBulk ? "Delete Selected" : "Delete Image"}
        description={deleteModal.isBulk
          ? `Delete ${selectedMedia.length} selected items? This cannot be undone.`
          : "Delete this image? Any content using it will show a broken image."}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {editingImage && (
        <ImageEditor
          isOpen={!!editingImage}
          image={getFullUrl(editingImage.source)}
          onSave={handleEditorSave}
          onCancel={() => setEditingImage(null)}
        />
      )}

      {/* New ImageUploader Component with Bulk Upload Support */}
      {showUploadDialog && (
        <ImageUploader
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          onUploadComplete={() => {
            loadMedia();
          }}
          variantSizes={variantSizes}
          allowMultiple={true}
        />
      )}
    </div>
  );
};

export default MediaLibrary;
