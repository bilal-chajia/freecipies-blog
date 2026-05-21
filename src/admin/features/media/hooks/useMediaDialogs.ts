import { useState } from 'react';
import { mediaAPI } from '../../../services/api';
import { useMediaStore } from '../../../store/useStore';
import { toast } from 'sonner';
import type { MediaLibraryItem } from '../utils/mediaHelpers';

export const useMediaDialogs = () => {
  const { selectedMedia, clearSelection } = useMediaStore();

  const [uploading, setUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: number | string | null; isBulk: boolean }>({
    isOpen: false,
    id: null,
    isBulk: false
  });
  const [editingImage, setEditingImage] = useState<{ source: MediaLibraryItem; context?: string } | null>(null);

  const handleBulkDelete = () => {
    setDeleteModal({ isOpen: true, id: null, isBulk: true });
  };

  const confirmDelete = async (onSuccess: () => void) => {
    const { id, isBulk } = deleteModal;
    try {
      if (isBulk) {
        await mediaAPI.bulkDelete(selectedMedia);
        clearSelection();
        toast.success(`Deleted ${selectedMedia.length} assets`);
      } else if (id !== null) {
        await mediaAPI.delete(id);
        toast.success('Asset deleted');
      }
      onSuccess();
    } catch (error) {
      toast.error('Failed to delete asset(s)');
    } finally {
      setDeleteModal({ isOpen: false, id: null, isBulk: false });
    }
  };

  const handleCopyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Asset URL copied');
    } catch (error) {
      toast.error('Failed to copy URL');
    }
  };

  const handleEditorSave = async (file: File) => {
    if (editingImage?.context === 'upload') {
      setEditingImage(null);
      return;
    }

    try {
      setUploading(true);
      toast.info('To replace an image, please delete it and upload a new one via the Upload Assets button.');
      setEditingImage(null);
    } catch (error) {
      toast.error('Failed to update image');
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    setUploading,
    showUploadDialog,
    setShowUploadDialog,
    deleteModal,
    setDeleteModal,
    editingImage,
    setEditingImage,
    handleBulkDelete,
    confirmDelete,
    handleCopyUrl,
    handleEditorSave
  };
};
