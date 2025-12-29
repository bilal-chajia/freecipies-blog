import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ImageEditor from '../../components/ImageEditor.jsx';
import ImageUploader from '../../components/ImageUploader';
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

const parseVariants = (item) => {
  const json = item.variants_json || item.variantsJson;
  if (!json) return null;
  if (typeof json === 'object') return json;
  try { return JSON.parse(json); } catch { return null; }
};

const getVariantMap = (variants) => {
  if (!variants || typeof variants !== 'object') return null;
  if (variants.variants && typeof variants.variants === 'object') {
    return variants.variants;
  }
  return variants;
};

const getBestVariant = (variants) => {
  const map = getVariantMap(variants);
  if (!map) return null;
  return map.xs || map.sm || map.md || map.lg || map.original || null;
};

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

// Get optimized thumbnail URL (xs/sm)
const getThumbnailUrl = (item) => {
  const variants = parseVariants(item);
  const best = getBestVariant(variants);
  return best?.url || item.url;
};

// Get full resolution URL
const getFullUrl = (item) => {
   const variants = parseVariants(item);
   if (!variants) return item.url;
   
   if (variants.variants) {
      const v = variants.variants;
      return v.original?.url || v.lg?.url || v.md?.url || item.url;
   }
   return variants.original?.url || variants.lg?.url || item.url;
};

const OptimizedImage = ({ item, className = "", priority = false }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const variants = parseVariants(item);
  const placeholder = variants?.placeholder;
  
  // Resolve source and dimensions
  let src = item.url;
  let width = undefined;
  let height = undefined;
  
  const best = getBestVariant(variants);
  if (best) {
    src = best.url;
    width = best.width;
    height = best.height;
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
  }, [filterType, sortBy, sortOrder]);

  const loadMedia = async () => {
    try {
      const params = {
        type: filterType !== 'all' ? filterType : undefined,
        search: searchQuery || undefined,
        sortBy,
        order: sortOrder,
      };

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
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <ImageIcon className="w-8 h-8 text-blue-500" />;
    if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) return <Video className="w-8 h-8 text-rose-500" />;
    if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) return <Music className="w-8 h-8 text-emerald-500" />;
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return <Archive className="w-8 h-8 text-amber-500" />;
    return <FileIcon className="w-8 h-8 opacity-40" />;
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
                      className="h-5 w-5 rounded-full bg-blue-500/80 backdrop-blur-md border-none text-white hover:bg-blue-600"
                      onClick={(e) => { e.stopPropagation(); window.open(getFullUrl(item), '_blank'); }}
                      title="View Full"
                   >
                      <Maximize2 className="h-2.5 w-2.5" />
                   </Button>
                   <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-5 w-5 rounded-full bg-green-500/80 backdrop-blur-md border-none text-white hover:bg-green-600"
                      onClick={(e) => { e.stopPropagation(); handleCopyUrl(getFullUrl(item)); }}
                      title="Copy URL"
                   >
                      <Copy className="h-2.5 w-2.5" />
                   </Button>
                   <Button 
                      variant="secondary" 
                      size="icon" 
                      className="h-5 w-5 rounded-full bg-red-500/80 backdrop-blur-md border-none text-white hover:bg-red-600"
                      onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, id: item.id, isBulk: false }); }}
                      title="Delete"
                   >
                      <Trash2 className="h-2.5 w-2.5" />
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
                  webp: 'bg-green-500/80',
                  avif: 'bg-purple-500/80',
                  jpeg: 'bg-blue-500/80',
                  jpg: 'bg-blue-500/80',
                  png: 'bg-orange-500/80',
                }[type] || 'bg-black/50';
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
                   <Check className="h-3 w-3 bold" />
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );

  const renderListView = () => (
    <div className="space-y-3">
      {filteredMedia.map((item, index) => (
        <Card
          key={item.id}
          className={`group flex items-center gap-4 p-3 border-border/50 bg-card hover:bg-accent/40 shadow-sm transition-all duration-300 rounded-2xl cursor-pointer ${selectedMedia.includes(item.id) ? 'ring-2 ring-primary ring-offset-1' : ''}`}
          onClick={() => onSelect ? onSelect(item) : toggleMediaSelection(item.id)}
        >
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-accent/50 flex items-center justify-center shrink-0 border border-border/30">
            {isMediaItemImage(item) ? (
              <OptimizedImage item={item} priority={index < 8} className="transition-transform group-hover:scale-110" />
            ) : (
              getFileIcon(item.name)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
               <p className="font-bold text-sm truncate">{item.name}</p>
               {selectedMedia.includes(item.id) && <Badge className="h-4 px-1 text-[8px] uppercase">Selected</Badge>}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-tight mt-1 opacity-60">
              <span className="flex items-center gap-1"><RefreshCw className="h-2.5 w-2.5" /> {formatDate(item.created_at)}</span>
              <span className="flex items-center gap-1"><Info className="h-2.5 w-2.5" /> {formatDisplayedSize(item)}</span>
            </div>
          </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => handleCopyUrl(getFullUrl(item))}><Copy className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => window.open(getFullUrl(item), '_blank')}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => setDeleteModal({ isOpen: true, id: item.id, isBulk: false })}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1 uppercase tracking-wider">
              <ImageIcon className="h-4 w-4" />
              Assets & CDN
           </div>
           <h1 className="text-3xl font-bold tracking-tight">Media Library</h1>
           <p className="text-muted-foreground mt-1">
              Centralized repository for high-fidelity images, videos, and documentation.
           </p>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Selection Actions - appear when items selected */}
           <AnimatePresence>
              {selectedMedia.length > 0 && (
                 <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-2"
                 >
                    <span className="text-sm text-muted-foreground">
                       {selectedMedia.length} selected
                    </span>
                    <Button variant="ghost" size="sm" onClick={clearSelection} className="h-9 px-3">
                       Clear
                    </Button>
                    <Button onClick={handleBulkDelete} size="sm" variant="destructive" className="h-9 px-3 gap-1.5">
                       <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                 </motion.div>
              )}
           </AnimatePresence>

           <Button 
             className="h-11 px-6 gap-2 shadow-sm rounded-xl"
             onClick={() => setShowUploadDialog(true)}
           >
              <Upload className="h-4 w-4" />
              Upload Assets
           </Button>
        </div>
      </div>

      {/* Control Tools Bar */}
      <div className="flex flex-col xl:flex-row gap-4">
         <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-60 group-hover:text-primary transition-colors duration-300" />
            <Input
              placeholder="Search assets by name, tag, or metadata..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-10 border-none bg-card shadow-sm ring-1 ring-border/50 rounded-2xl focus-visible:ring-primary/50 transition-all"
            />
         </div>
         
         <div className="flex flex-wrap items-center gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
               <SelectTrigger className="w-[140px] h-12 border-none ring-1 ring-border/50 bg-card rounded-2xl text-xs font-bold">
                  <Filter className="h-3.5 w-3.5 mr-2 opacity-60" />
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
               <SelectTrigger className="w-[150px] h-12 border-none ring-1 ring-border/50 bg-card rounded-2xl text-xs font-bold">
                  <RefreshCw className="h-3.5 w-3.5 mr-2 opacity-60" />
                  <SelectValue placeholder="Sorted By" />
               </SelectTrigger>
               <SelectContent className="rounded-xl">
                  <SelectItem value="created_at">Recent Activity</SelectItem>
                  <SelectItem value="name">Alphanumeric</SelectItem>
                  <SelectItem value="size">Performance Size</SelectItem>
               </SelectContent>
            </Select>

            <div className="flex p-1 bg-accent/50 rounded-2xl border border-border/30 h-12">
               <button onClick={() => setViewMode('grid')} className={`h-full w-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'grid' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:bg-card/40'}`}>
                  <Grid className="h-4 w-4" />
               </button>
               <button onClick={() => setViewMode('list')} className={`h-full w-10 flex items-center justify-center rounded-xl transition-all ${viewMode === 'list' ? 'bg-card shadow-sm text-primary' : 'text-muted-foreground hover:bg-card/40'}`}>
                  <List className="h-4 w-4" />
               </button>
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
             <ImageIcon className="h-16 w-16 mb-4" />
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

      {/* New ImageUploader Component (replaces old Dialog) */}
      <ImageUploader
         open={showUploadDialog}
         onOpenChange={setShowUploadDialog}
         onUploadComplete={(mediaRecord) => {
            loadMedia();
            toast.success('Image uploaded successfully!');
         }}
         variantSizes={variantSizes}
      />
    </div>
  );
};

export default MediaLibrary;
