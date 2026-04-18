import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  parseVariantsJson,
  getVariantMap,
  getBestVariant,
  getLargestVariant,
  getVariantForContainer,
  pickVariantByWidth,
  CONTAINER_SIZES,
  resolveVariantUrl
} from '@shared/types/images';
import ImageEditor from '@/components/ImageEditor.jsx';
import ImageUploader from '@/components/ImageUploader';
import { Calendar } from '@/ui/calendar.jsx';
import { DateRangePicker } from '@/ui/date-range-picker.jsx';
import {
  Upload,
  Search,
  Grid,
  List,
  Edit2,
  Image as ImageIcon,
  File as FileIcon,
  Video,
  Music,
  Archive,
  Copy,
  Trash2,
  Eye,
  MoreVertical,
  X,
  Check,
  RefreshCw,
  Filter,
  ArrowUpRight,
  Info,
  Maximize2,
  CalendarDays,
} from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Card } from '@/ui/card.jsx';
import { Badge } from '@/ui/badge.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/dialog.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/select.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/ui/dropdown-menu.jsx';
import { Progress } from '@/ui/progress.jsx';
import { mediaAPI, authorsAPI } from '../../services/api';
import { formatFileSize, isImageFile, formatDate } from '../../utils/helpers';
import { useMediaStore } from '../../store/useStore';
import ConfirmationModal from '@/ui/confirmation-modal';
import { compressImage, QUALITY_PRESETS, formatBytes } from '../../../utils/imageCompression.js';
import { toast } from 'sonner';

// Helper to check if item is image (by mime or name)
const isMediaItemImage = (item) => {
  if (item.mimeType?.startsWith('image/') || item.mime_type?.startsWith('image/')) return true;
  // Fallback to name check if mimeType missing
  return isImageFile(item.name || '');
};

// Helper: parse variants from item (uses shared helper)
const parseVariants = (item) => parseVariantsJson(item);

// Helper: getVariantSizeBytes (local, simple logic)

const getVariantSizeBytes = (variant) => {
  if (!variant) return null;
  const size = variant.sizeBytes ?? variant.size_bytes;
  return typeof size === 'number' ? size : null;
};

const getDisplayedSizeBytes = (item) => {
  const variants = parseVariants(item);
  const best = getBestVariant(variants);
  const variantSize = getVariantSizeBytes(best);
  if (typeof variantSize === 'number') return variantSize;
  return null;
};

const formatDisplayedSize = (item) => {
  const bytes = getDisplayedSizeBytes(item);
  return typeof bytes === 'number' && bytes > 0 ? formatFileSize(bytes) : '-';
};

// Get optimized thumbnail URL (uses container-based selection)
// Media grid thumbnails are ~150px, so we use 'thumbnail' container with 'lg' size
const getThumbnailUrl = (item) => {
  const parsed = parseVariants(item);
  const variants = getVariantMap(parsed);
  if (!variants) return resolveVariantUrl(null) || item.url;

  const slot = { variants };
  const variant = getVariantForContainer(slot, 'thumbnail', 'lg');
  return resolveVariantUrl(variant) || item.url;
};

const getFullUrl = (item) => {
  const parsed = parseVariants(item);
  const variants = getVariantMap(parsed);
  if (!variants) return item.url;

  const slot = { variants };
  const variant = getVariantForContainer(slot, 'hero', 'xl');
  return resolveVariantUrl(variant) || item.url;
};

const OptimizedImage = ({ item, className = "", priority = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const parsed = parseVariants(item);
  const placeholder = parsed?.placeholder;
  const variants = getVariantMap(parsed);

  // Build srcset from available variants
  let srcset = '';
  let src = item.url; // item.url should now be resolved via resolveVariantUrl in the API
  let width = undefined;
  let height = undefined;

  if (variants) {
    const srcsetParts = [];
    if (variants.xs) srcsetParts.push(`${resolveVariantUrl(variants.xs)} ${variants.xs.width}w`);
    if (variants.sm) srcsetParts.push(`${resolveVariantUrl(variants.sm)} ${variants.sm.width}w`);
    if (variants.md) srcsetParts.push(`${resolveVariantUrl(variants.md)} ${variants.md.width}w`);
    if (variants.lg) srcsetParts.push(`${resolveVariantUrl(variants.lg)} ${variants.lg.width}w`);
    if (variants.original) srcsetParts.push(`${resolveVariantUrl(variants.original)} ${variants.original.width}w`);
    srcset = srcsetParts.join(', ');

    const slot = { variants };
    const selectedVariant = getVariantForContainer(slot, 'thumbnail', 'lg');
    if (selectedVariant) {
      src = resolveVariantUrl(selectedVariant) || src;
      width = selectedVariant.width;
      height = selectedVariant.height;
    }
  }

  // Fallback to item URL if calculation failed
  if (!src) src = item.url;

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {placeholder && (
        <img
          src={placeholder}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 blur-xl scale-110 ${isLoaded ? 'opacity-0' : 'opacity-100'}`}
          aria-hidden="true"
        />
      )}
      <img
        src={src}
        srcSet={srcset || undefined}
        sizes="180px"
        width={width}
        height={height}
        alt={item.altText || item.name}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        className={`w-full h-full object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
};

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

const MediaLibrary = ({ onSelect, isDialog, variantSizes }) => {
  const { media, selectedMedia, loading, setMedia, toggleMediaSelection, clearSelection } = useMediaStore();
  const [viewMode, setViewMode] = useState('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, isBulk: false });
  const [editingImage, setEditingImage] = useState(null);
  const [customFileName, setCustomFileName] = useState('');
  const [altText, setAltText] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [authors, setAuthors] = useState([]);
  const [compressionQuality, setCompressionQuality] = useState('high');
  const [compressionStats, setCompressionStats] = useState(null);
  const [dateFrom, setDateFrom] = useState(undefined);
  const [dateTo, setDateTo] = useState(undefined);
  // Date Popover State (Removed since DateRangePicker manages its own)
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (showUploadDialog) {
      loadAuthors();
    }
  }, [showUploadDialog]);

  const loadAuthors = async () => {
    try {
      const response = await authorsAPI.getAll();
      const authorsData = response.data?.data || response.data || [];
      setAuthors(Array.isArray(authorsData) ? authorsData : []);
    } catch (error) {
      console.error('Failed to load authors:', error);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [filterType, sortBy, sortOrder, dateFrom, dateTo]);

  const loadMedia = async () => {
    try {
      const params = {
        type: filterType,
        search: searchQuery || undefined,
        sortBy,
        order: sortOrder,
      };
      const getUtcBoundary = (d, isEndOfDay) => {
        if (!d) return undefined;
        const date = new Date(d);
        if (isEndOfDay) {
          date.setHours(23, 59, 59, 999);
        } else {
          date.setHours(0, 0, 0, 0);
        }
        return date.toISOString();
      };

      if (dateFrom) params.dateFrom = getUtcBoundary(dateFrom, false);
      if (dateTo) params.dateTo = getUtcBoundary(dateTo, true);

      const response = await mediaAPI.getAll(params);
      if (response.data.success) {
        setMedia(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load media:', error);
      toast.error('Failed to load media assets');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      setCustomFileName(nameWithoutExt);
      if (isImageFile(file.name)) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(10);

      let fileToUpload = selectedFile;

      if (isImageFile(selectedFile.name)) {
        const qualityValue = QUALITY_PRESETS[compressionQuality]?.quality || 0.85;
        const { file: compressedFile, stats } = await compressImage(selectedFile, {
          quality: qualityValue,
          maxWidth: 1920,
          maxHeight: 1920,
        });
        fileToUpload = compressedFile;
        setCompressionStats(stats);
        setUploadProgress(40);
      }

      if (customFileName) {
        const currentExt = fileToUpload.name.split('.').pop();
        const newFileName = `${customFileName}.${currentExt}`;
        if (newFileName !== fileToUpload.name) {
          fileToUpload = new File([fileToUpload], newFileName, { type: fileToUpload.type });
        }
      }

      const attribution = selectedAuthor && selectedAuthor !== 'none'
        ? `${authors.find(a => a.slug === selectedAuthor)?.name || selectedAuthor} / Freecipies`
        : '';

      setUploadProgress(60);

      const response = await mediaAPI.upload(fileToUpload, {
        alt: altText,
        attribution: attribution,
      });

      if (response.data.success) {
        setUploadProgress(100);
        toast.success(`"${fileToUpload.name}" uploaded successfully`);
        setTimeout(() => {
          setShowUploadDialog(false);
          setSelectedFile(null);
          setPreviewUrl('');
          setCustomFileName('');
          setAltText('');
          setSelectedAuthor('');
          setCompressionStats(null);
          loadMedia();
        }, 500);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleBulkDelete = () => {
    setDeleteModal({ isOpen: true, id: null, isBulk: true });
  };

  const confirmDelete = async () => {
    const { id, isBulk } = deleteModal;
    try {
      if (isBulk) {
        // Use optimized bulk delete endpoint
        await mediaAPI.bulkDelete(selectedMedia);
        clearSelection();
        toast.success(`Deleted ${selectedMedia.length} assets`);
      } else {
        await mediaAPI.delete(id);
        toast.success('Asset deleted');
      }
      loadMedia();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete asset(s)');
    } finally {
      setDeleteModal({ isOpen: false, id: null, isBulk: false });
    }
  };

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Asset URL copied');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const handleEditorSave = async (file) => {
    if (editingImage?.context === 'upload') {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setEditingImage(null);
      return;
    }

    try {
      setUploading(true);
      const mediaItem = editingImage?.source;
      if (mediaItem?.id) {
        const response = await mediaAPI.replaceImage(mediaItem.id, file);
        if (response.data.success) {
          toast.success('Image updated successfully');
          setEditingImage(null);
          loadMedia();
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
      toast.error('Failed to update image');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename) => {
    if (!filename) return <FileIcon className="w-8 h-8 opacity-40" />;
    const ext = filename.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <ImageIcon className="size-8 text-primary" />;
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return <Video className="size-8 text-destructive" />;
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) return <Music className="size-8 text-success" />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <Archive className="size-8 text-secondary" />;
    return <FileIcon className="size-8 opacity-40" />;
  };

  const filteredMedia = media.filter(item => {
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.altText?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const renderGridView = () => (
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
                  <span className="text-[10px] text-white/90 font-medium truncate max-w-[100px]">
                    {item.name}
                  </span>
                  <Badge variant="secondary" className="h-4 px-1 text-[8px] bg-white/10 backdrop-blur-md text-white border-white/10 font-bold uppercase truncate">
                    {formatDisplayedSize(item)}
                  </Badge>
                </div>
              </div>

              {/* Image Type Badge (top-left, aligned with action buttons) */}
              {!selectedMedia.includes(item.id) && (() => {
                const type = (item.mimeType || item.mime_type || 'image/jpeg').split('/').pop();
                const colorClass = {
                  webp: 'bg-success/80',
                  avif: 'bg-secondary/80',
                  jpeg: 'bg-primary/80',
                  jpg: 'bg-primary/80',
                  png: 'bg-warning/80',
                }[type] || 'bg-muted/50';
                return (
                  <div className="absolute top-2 left-2 pointer-events-none">
                    <Badge className={`h-5 px-1.5 text-[7px] ${colorClass} backdrop-blur-sm text-white border-none font-bold uppercase flex items-center`}>
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

  const renderListView = () => (
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
              <span className="scale-50">{getFileIcon(item.name)}</span>
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
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={(e) => { e.stopPropagation(); handleCopyUrl(getFullUrl(item)); }}><Copy className="size-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={(e) => { e.stopPropagation(); window.open(getFullUrl(item), '_blank'); }}><Eye className="size-3" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, id: item.id, isBulk: false }); }}><Trash2 className="size-3" /></Button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
            <ImageIcon className="size-4" />
            Assets & CDN
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
          <p className="text-muted-foreground mt-1">
            Centralized repository for high-fidelity images, videos, and documentation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            className="h-11 px-6 gap-2 shadow-sm rounded-xl"
            onClick={() => setShowUploadDialog(true)}
          >
            <Upload className="size-4" />
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
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-background/95 backdrop-blur-xl border border-border/60 shadow-2xl rounded-2xl px-5 py-3"
          >
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {selectedMedia.length} selected
            </span>
            <div className="w-px h-5 bg-border/60" />
            <Button variant="ghost" size="sm" onClick={clearSelection} className="h-9 px-4 rounded-xl">
              <X className="size-3.5 mr-1.5" /> Clear
            </Button>
            <Button onClick={handleBulkDelete} size="sm" variant="destructive" className="h-9 px-4 gap-1.5 rounded-xl">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Tools Bar */}
      <div className="flex flex-col xl:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-60 group-hover:text-primary transition-colors duration-300" />
          <Input
            placeholder="Search assets by name, tag, or metadata..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 pl-10 border-none bg-card shadow-sm ring-1 ring-border/50 rounded-2xl focus-visible:ring-primary/50 transition-all text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px] h-9 border-none ring-1 ring-border/50 bg-card rounded-2xl text-xs font-bold">
              <Filter className="size-3.5 mr-2 opacity-60" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Assets</SelectItem>
              <SelectItem value="image">Imagery</SelectItem>
              <SelectItem value="video">Motion</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px] h-9 border-none ring-1 ring-border/50 bg-card rounded-2xl text-xs font-bold">
              <RefreshCw className="h-3.5 w-3.5 mr-2 opacity-60" />
              <SelectValue placeholder="Sorted By" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
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
            className="w-[170px]"
          />

          <div className="flex p-1 bg-accent/50 rounded-2xl border border-border/30 h-9">
            <Button variant="ghost" onClick={() => setViewMode('grid')} className={`h-full w-10 p-0 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:bg-card/40'}`}>
              <Grid className="size-4" />
            </Button>
            <Button variant="ghost" onClick={() => setViewMode('list')} className={`h-full w-10 p-0 rounded-xl transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:bg-card/40'}`}>
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </div>


      {/* Main Library Display */}
      <div className="min-h-[500px] bg-accent/20 rounded-[40px] p-6 border border-border/30">
        <AnimatePresence mode="wait">
          {viewMode === 'grid' ? renderGridView() : renderListView()}
        </AnimatePresence>

        {filteredMedia.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-32 opacity-30">
            <ImageIcon className="size-16 mb-4" />
            <h3 className="font-bold text-lg">No Assets Detected</h3>
            <p className="text-sm">Initiate an upload to populate your library.</p>
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
          image={editingImage.source}
          onSave={handleEditorSave}
          onCancel={() => setEditingImage(null)}
        />
      )}

      {/* New ImageUploader Component with Bulk Upload Support */}
      <ImageUploader
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUploadComplete={(mediaRecord) => {
          loadMedia();
          toast.success('Image uploaded successfully!');
        }}
        variantSizes={variantSizes}
        allowMultiple={true}
      />
    </div>
  );
};

export default MediaLibrary;
