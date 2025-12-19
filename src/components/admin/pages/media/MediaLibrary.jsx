import { useEffect, useState, useRef } from 'react';
import ImageEditor from '../../components/ImageEditor.jsx';
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
} from 'lucide-react';
import { Button } from '@/ui/button.jsx';
import { Input } from '@/ui/input.jsx';
import { Card } from '@/ui/card.jsx';
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
import { Slider } from '@/ui/slider.jsx';
import { mediaAPI, authorsAPI } from '../../services/api';
import { formatFileSize, isImageFile, formatDate } from '../../utils/helpers';
import { useMediaStore } from '../../store/useStore';
import ConfirmationModal from '@/ui/confirmation-modal';
import { compressImage, QUALITY_PRESETS, formatBytes } from '../../../../utils/imageCompression.js';

const MediaLibrary = ({ onSelect, isDialog }) => {
  const { media, selectedMedia, loading, setMedia, toggleMediaSelection, clearSelection } = useMediaStore();
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'image', 'video', 'audio', 'document'
  const [sortBy, setSortBy] = useState('created_at'); // 'created_at', 'name', 'size'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc', 'desc'
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
  const [compressionQuality, setCompressionQuality] = useState('high'); // 'low', 'medium', 'high', 'original'
  const [compressionStats, setCompressionStats] = useState(null);
  const fileInputRef = useRef(null);

  // Fetch authors when dialog opens
  useEffect(() => {
    if (showUploadDialog) {
      loadAuthors();
    }
  }, [showUploadDialog]);

  const loadAuthors = async () => {
    try {
      const response = await authorsAPI.getAll();
      if (response.data.success) {
        setAuthors(response.data.data || []);
      }
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
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Initialize custom filename with original name (without extension)
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
      setUploadProgress(0);

      let fileToUpload = selectedFile;

      // Compress image if it's an image file
      if (isImageFile(selectedFile.name)) {
        setUploadProgress(10);
        const qualityValue = QUALITY_PRESETS[compressionQuality]?.quality || 0.85;

        const { file: compressedFile, stats } = await compressImage(selectedFile, {
          quality: qualityValue,
          maxWidth: 1920,
          maxHeight: 1920,
        });

        fileToUpload = compressedFile;
        setCompressionStats(stats);
        setUploadProgress(50);
      }

      // Apply custom filename if set
      if (customFileName) {
        const currentExt = fileToUpload.name.split('.').pop();
        const newFileName = `${customFileName}.${currentExt}`;
        if (newFileName !== fileToUpload.name) {
          fileToUpload = new File([fileToUpload], newFileName, { type: fileToUpload.type });
        }
      }

      // Build attribution string from selected author
      const attribution = selectedAuthor && selectedAuthor !== 'none'
        ? `${authors.find(a => a.slug === selectedAuthor)?.name || selectedAuthor} / Freecipies`
        : '';

      setUploadProgress(75);

      // mediaAPI.upload handles FormData creation internally
      const response = await mediaAPI.upload(fileToUpload, {
        alt: altText,
        attribution: attribution,
      });

      if (response.data.success) {
        setShowUploadDialog(false);
        setSelectedFile(null);
        setPreviewUrl('');
        setCustomFileName('');
        setAltText('');
        setSelectedAuthor('');
        setCompressionStats(null);
        loadMedia();
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Failed to upload file');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = (mediaId) => {
    setDeleteModal({ isOpen: true, id: mediaId, isBulk: false });
  };

  const handleBulkDelete = () => {
    setDeleteModal({ isOpen: true, id: null, isBulk: true });
  };

  const confirmDelete = async () => {
    const { id, isBulk } = deleteModal;

    if (isBulk) {
      // Process deletions sequentially
      let hasError = false;
      for (const mediaId of selectedMedia) {
        try {
          await mediaAPI.delete(mediaId);
        } catch (error) {
          console.error(`Failed to delete media ${mediaId}:`, error);
          hasError = true;
        }
      }

      if (hasError) {
        alert('Some files could not be deleted. Check console for details.');
      }
      clearSelection();
    } else {
      try {
        await mediaAPI.delete(id);
      } catch (error) {
        console.error('Failed to delete media:', error);
        alert('Failed to delete file');
      }
    }

    loadMedia();
    setDeleteModal({ isOpen: false, id: null, isBulk: false });
  };

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleEditorSave = async (file) => {
    if (editingImage?.context === 'upload') {
      // For new uploads, just update the preview
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setEditingImage(null);
      return;
    }

    try {
      setUploading(true);

      // In-place replacement for existing library images
      const mediaItem = editingImage?.source;
      if (mediaItem?.id) {
        const response = await mediaAPI.replaceImage(mediaItem.id, file);
        if (response.data.success) {
          setEditingImage(null);
          loadMedia();
        }
      }
    } catch (error) {
      console.error('Failed to save edited image:', error);
      alert('Failed to save image');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (filename) => {
    if (!filename) return <FileIcon className="w-8 h-8 text-gray-500" />;
    const ext = filename.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    } else if (['mp4', 'avi', 'mov', 'wmv'].includes(ext)) {
      return <Video className="w-8 h-8 text-red-500" />;
    } else if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) {
      return <Music className="w-8 h-8 text-green-500" />;
    } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive className="w-8 h-8 text-yellow-500" />;
    } else {
      return <FileIcon className="w-8 h-8 text-gray-500" />;
    }
  };

  const filteredMedia = media.filter(item => {
    const matchesSearch = !searchQuery ||
      item.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.altText?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const renderGridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {filteredMedia.map((item) => (
        <Card
          key={item.id}
          className={`group relative overflow-hidden border-0 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-xl h-full flex flex-col aspect-square cursor-pointer p-0 gap-0 ${selectedMedia.includes(item.id) ? 'ring-2 ring-primary ring-offset-2' : ''
            }`}
          onClick={() => {
            if (onSelect) {
              onSelect(item);
            } else {
              toggleMediaSelection(item.id);
            }
          }}
        >
          {/* Image/Icon Layer */}
          <div className="absolute inset-0 z-0">
            {isImageFile(item.filename) ? (
              <img
                src={item.url}
                alt={item.altText || item.filename}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground group-hover:scale-110 transition-transform duration-500">
                {getFileIcon(item.filename)}
              </div>
            )}
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          </div>

          {/* Content Layer */}
          <div className="relative z-10 h-full pointer-events-none">
            {/* Actions - Top Center, Visible on Hover */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20 pointer-events-auto">
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(item.url, '_blank');
                }}
                title="View"
              >
                <Eye className="h-3 w-3" />
              </Button>
              {isImageFile(item.filename) && (
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-6 w-6 bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm rounded-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingImage({ source: item, context: 'library' });
                  }}
                  title="Edit"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 bg-black/40 hover:bg-black/60 text-white border-0 backdrop-blur-sm rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopyUrl(item.url);
                }}
                title="Copy URL"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="destructive"
                size="icon"
                className="h-6 w-6 bg-red-500/80 hover:bg-red-600/90 backdrop-blur-sm rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(item.id);
                }}
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>

            {/* File Size - Bottom Right */}
            <div className="absolute bottom-2 right-2 z-20">
              <span className="text-[10px] font-medium text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                {formatFileSize(item.sizeBytes)}
              </span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {filteredMedia.map((item) => (
        <div
          key={item.id}
          className={`flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer ${selectedMedia.includes(item.id) ? 'ring-2 ring-primary' : ''
            }`}
          onClick={() => {
            if (onSelect) {
              onSelect(item);
            } else {
              toggleMediaSelection(item.id);
            }
          }}
        >
          <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center shrink-0">
            {isImageFile(item.filename) ? (
              <img
                src={item.url}
                alt={item.altText || item.filename}
                className="h-full w-full object-cover"
              />
            ) : (
              getFileIcon(item.filename)
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{item.filename}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{formatFileSize(item.sizeBytes)}</span>
              <span>{formatDate(item.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                window.open(item.url, '_blank');
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
            {isImageFile(item.filename) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingImage({ source: item, context: 'library' });
                }}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyUrl(item.url);
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(item.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  // Skeleton media card
  const SkeletonMediaCard = () => (
    <div className="relative aspect-square rounded-lg bg-muted animate-pulse overflow-hidden">
      <div className="absolute bottom-2 right-2 h-5 w-12 bg-white/20 rounded" />
    </div>
  );

  if (loading && media.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-9 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-4">
          <div className="h-10 flex-1 bg-muted rounded animate-pulse" />
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {[...Array(12)].map((_, i) => (
            <SkeletonMediaCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <ImageIcon className="w-8 h-8" />
            Media Library
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage your images, videos, and other media files
          </p>
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Upload className="w-4 h-4" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Media Files</DialogTitle>
              <DialogDescription>
                Select files to upload to your media library
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                />
                {selectedFile ? (
                  <div className="space-y-4">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded"
                      />
                    )}
                    <div className="space-y-3">
                      {/* Filename */}
                      <div className="flex items-center gap-2">
                        <Input
                          value={customFileName}
                          onChange={(e) => setCustomFileName(e.target.value)}
                          className="flex-1 text-center font-medium"
                          placeholder="Enter filename"
                        />
                        <span className="text-muted-foreground text-sm">
                          .{selectedFile.name.split('.').pop()}
                        </span>
                      </div>

                      {/* Alt Text */}
                      <div>
                        <Input
                          value={altText}
                          onChange={(e) => setAltText(e.target.value)}
                          placeholder="Alt text (for SEO & accessibility)"
                          className="text-sm"
                        />
                      </div>

                      {/* Author / Attribution */}
                      <div>
                        <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Attribution (select author)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No attribution</SelectItem>
                            {authors.map((author) => (
                              <SelectItem key={author.slug} value={author.slug}>
                                {author.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quality Selector - only for images */}
                      {isImageFile(selectedFile.name) && (
                        <div>
                          <Select value={compressionQuality} onValueChange={setCompressionQuality}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Compression quality" />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(QUALITY_PRESETS).map(([key, preset]) => (
                                <SelectItem key={key} value={key}>
                                  {preset.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* File Size Info */}
                      <div className="text-center space-y-1">
                        <p className="text-sm text-muted-foreground">
                          Original: {formatFileSize(selectedFile.size)}
                        </p>
                        {compressionStats && !compressionStats.skipped && (
                          <p className="text-xs text-green-600 dark:text-green-400">
                            Compressed: {formatBytes(compressionStats.compressedSize)}
                            ({compressionStats.compressionRatio} smaller)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div>
                      <p className="font-medium">Drop files here or click to browse</p>
                      <p className="text-sm text-muted-foreground">
                        Supports images, videos, audio, and documents
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Files
                    </Button>
                  </div>
                )}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center gap-2">
                <div className="flex gap-1">
                  {selectedFile && (
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 w-7 bg-muted/80 hover:bg-muted text-foreground border-0 rounded-full"
                      title="Replace File"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {selectedFile && isImageFile(selectedFile.name) && (
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => setEditingImage({ source: selectedFile, context: 'upload' })}
                      className="h-7 w-7 bg-muted/80 hover:bg-muted text-foreground border-0 rounded-full"
                      title="Edit Image"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      setShowUploadDialog(false);
                      setSelectedFile(null);
                      setPreviewUrl('');
                      setCustomFileName('');
                    }}
                    className="h-7 w-7 bg-red-500/80 hover:bg-red-600/90 text-white rounded-full"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading || !customFileName.trim()}
                    className="h-7 w-7 bg-primary/80 hover:bg-primary text-primary-foreground rounded-full disabled:opacity-50"
                    title="Upload"
                  >
                    {uploading ? (
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search media files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="image">Images</SelectItem>
            <SelectItem value="video">Videos</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="document">Documents</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Date Created</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Selected Media Actions */}
      {selectedMedia.length > 0 && (
        <div className="flex items-center justify-between bg-muted p-4 rounded-lg">
          <span className="text-sm">
            {selectedMedia.length} file{selectedMedia.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear Selection
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                handleBulkDelete();
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected
            </Button>
          </div>
        </div>
      )}

      {/* Media Grid/List */}
      <div className="min-h-[400px]">
        {filteredMedia.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No media files found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || filterType !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first media file to get started'
              }
            </p>
            {!searchQuery && filterType === 'all' && (
              <Button onClick={() => setShowUploadDialog(true)} className="gap-2">
                <Upload className="w-4 h-4" />
                Upload Files
              </Button>
            )}
          </div>
        ) : (
          viewMode === 'grid' ? renderGridView() : renderListView()
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredMedia.length} of {media.length} files
        </span>
        <span>
          {media.reduce((total, item) => total + item.sizeBytes, 0).toLocaleString()} bytes total
        </span>
      </div>
      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, isBulk: false })}
        onConfirm={confirmDelete}
        title={deleteModal.isBulk ? "Delete Selected Files" : "Delete Media File"}
        description={deleteModal.isBulk
          ? `Are you sure you want to delete ${selectedMedia.length} files? This action cannot be undone.`
          : "Are you sure you want to delete this file? This action cannot be undone."}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <ImageEditor
        isOpen={!!editingImage}
        image={editingImage?.context === 'library' ? editingImage?.source?.url : editingImage?.source}
        originalFilename={
          editingImage?.context === 'library'
            ? editingImage?.source?.filename
            : editingImage?.source?.name || null
        }
        onSave={handleEditorSave}
        onCancel={() => setEditingImage(null)}
      />
    </div>
  );
};

export default MediaLibrary;