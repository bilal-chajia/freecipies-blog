import { useEffect, useState, useRef } from 'react';
import {
  Upload,
  Search,
  Filter,
  Grid,
  List,
  Image as ImageIcon,
  File,
  Video,
  Music,
  Archive,
  X,
  Download,
  Copy,
  Trash2,
  Eye,
  Plus,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { mediaAPI } from '../../services/api';
import { formatFileSize, formatDate, isImageFile } from '../../utils/helpers';
import { useMediaStore } from '../../store/useStore';

const MediaLibrary = () => {
  const { media, selectedMedia, loading, error, setMedia, setSelectedMedia, toggleMediaSelection, clearSelection } = useMediaStore();
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
  const fileInputRef = useRef(null);

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

      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await mediaAPI.upload(formData);

      if (response.data.success) {
        setShowUploadDialog(false);
        setSelectedFile(null);
        setPreviewUrl('');
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

  const handleDelete = async (mediaId) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await mediaAPI.delete(mediaId);
      loadMedia();
    } catch (error) {
      console.error('Failed to delete media:', error);
      alert('Failed to delete file');
    }
  };

  const handleCopyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      alert('URL copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const getFileIcon = (filename) => {
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
      return <File className="w-8 h-8 text-gray-500" />;
    }
  };

  const filteredMedia = media.filter(item => {
    const matchesSearch = !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.alt?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const renderGridView = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {filteredMedia.map((item) => (
        <Card
          key={item.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedMedia.includes(item.id) ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => toggleMediaSelection(item.id)}
        >
          <CardContent className="p-4">
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center mb-3 overflow-hidden">
              {isImageFile(item.name) ? (
                <img
                  src={item.url}
                  alt={item.alt || item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                getFileIcon(item.name)
              )}
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium truncate" title={item.name}>
                {item.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(item.size)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="space-y-2">
      {filteredMedia.map((item) => (
        <Card
          key={item.id}
          className={`cursor-pointer transition-all hover:shadow-md ${
            selectedMedia.includes(item.id) ? 'ring-2 ring-primary' : ''
          }`}
          onClick={() => toggleMediaSelection(item.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center flex-shrink-0">
                {isImageFile(item.name) ? (
                  <img
                    src={item.url}
                    alt={item.alt || item.name}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  getFileIcon(item.name)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate" title={item.name}>
                  {item.name}
                </p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatFileSize(item.size)}</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleCopyUrl(item.url)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy URL
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.open(item.url, '_blank')}>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(item.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  if (loading && media.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(selectedFile.size)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Different File
                    </Button>
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

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false);
                    setSelectedFile(null);
                    setPreviewUrl('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
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
                if (confirm(`Delete ${selectedMedia.length} selected file${selectedMedia.length !== 1 ? 's' : ''}?`)) {
                  selectedMedia.forEach(id => handleDelete(id));
                  clearSelection();
                }
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
          {media.reduce((total, item) => total + item.size, 0).toLocaleString()} bytes total
        </span>
      </div>
    </div>
  );
};

export default MediaLibrary;