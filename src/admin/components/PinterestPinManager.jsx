import React, { useState, useEffect } from 'react';
import { Upload, X, Star, GripVertical, Eye, Plus, Trash2, Edit2, Check } from 'lucide-react';
import { toast } from 'sonner';

const PinterestPinManager = ({ articleId }) => {
  const [pins, setPins] = useState([]);
  const [boards, setBoards] = useState([]);
const [saving, setSaving] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, pinToDelete: null });
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPin, setEditingPin] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    image_alt: '',
    image_width: 1000,
    image_height: 1500,
    board_id: '',
    is_primary: false,
    sort_order: 0
  });

  useEffect(() => {
    fetchBoards();
    if (articleId) {
      fetchPins();
    }
  }, [articleId]);

  const fetchBoards = async () => {
    try {
      const response = await fetch('/api/pinterest-boards');
      const data = await response.json();
      setBoards(data.data?.boards || data.boards || []);
    } catch (error) {
      toast.error('Failed to load boards');
    }
  };

  const fetchPins = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pins?article_id=${articleId}`);
      const data = await response.json();
      setPins(data.data?.pins || data.pins || []);
    } catch (error) {
      toast.error('Failed to load pins');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      return;
    }

    try {
      setLoading(true);

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const uploadResponse = await fetch('/api/pins/upload-image', {
        method: 'POST',
        body: uploadFormData
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json();

      const imageUrl = uploadData.success ? uploadData.data?.url || uploadData.url || '' : '';

      if (imageUrl) {
        const img = new Image();
        img.onload = () => {
          setFormData(prev => ({
            ...prev,
            image_url: imageUrl,
            image_width: img.width,
            image_height: img.height
          }));
        };
        img.src = imageUrl;
      }

    } catch (error) {
      toast.error('Failed to upload image');
      toast.error('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.image_url) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);

      const url = '/api/pins';
      const method = editingPin ? 'PUT' : 'POST';

      const payload = editingPin
        ? { ...formData, id: editingPin.id }
        : { ...formData, article_id: articleId };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('Failed to save pin');

      setFormData({
        title: '',
        description: '',
        image_url: '',
        image_alt: '',
        image_width: 1000,
        image_height: 1500,
        board_id: '',
        is_primary: false,
        sort_order: 0
      });
      setShowAddForm(false);
      setEditingPin(null);
      await fetchPins();

    } catch (error) {
      toast.error('Failed to save pin');
      toast.error('Failed to save pin');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pin) => {
    setEditingPin(pin);
    setFormData({
      title: pin.title,
      description: pin.description,
      image_url: pin.image_url,
      image_alt: pin.image_alt || '',
      image_width: pin.image_width,
      image_height: pin.image_height,
      board_id: pin.board_id || '',
      is_primary: pin.is_primary === 1,
      sort_order: pin.sort_order
    });
    setShowAddForm(true);
  };

  const handleDeletePin = (pinId) => {
    setDeleteModal({ isOpen: true, pinToDelete: pinId });
  };

  const handleDeleteConfirm = async () => {
    const pinId = deleteModal.pinToDelete;
    if (!pinId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/pins?id=${pinId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete pin');
      await fetchPins();
    } catch (error) {
      toast.error('Failed to delete pin');
      toast.error('Failed to delete pin');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrimary = async (pinId) => {
    const pin = pins.find(p => p.id === pinId);
    if (!pin) return;

    try {
      setLoading(true);
      const response = await fetch('/api/pins', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pin,
          is_primary: true
        })
      });

      if (!response.ok) throw new Error('Failed to set primary pin');
      await fetchPins();
    } catch (error) {
      toast.error('Failed to set primary pin');
      toast.error('Failed to set primary pin');
    } finally {
      setLoading(false);
    }
  };

  const cancelEdit = () => {
    setShowAddForm(false);
    setEditingPin(null);
    setFormData({
      title: '',
      description: '',
      image_url: '',
      image_alt: '',
      image_width: 1000,
      image_height: 1500,
      board_id: '',
      is_primary: false,
      sort_order: 0
    });
  };

  if (!articleId) {
    return (
      <div className="text-center py-12 px-8 bg-muted/50 rounded-lg text-muted-foreground border border-border">
        <p>Save the article first to manage Pinterest pins</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-card rounded-lg border border-border">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-foreground">Pinterest Pins</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
          disabled={loading}
        >
          <Plus className="size-4" />
          Add Pin
        </button>
      </div>

      {showAddForm && (
        <div className="bg-muted/50 p-6 mb-8 rounded-lg border border-border shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold text-foreground">
              {editingPin ? 'Edit Pin' : 'Add New Pin'}
            </h4>
            <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground transition-colors">
              <X className="size-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-foreground/80">Pin Image *</label>
              <div className="border-2 border-dashed border-input rounded-lg overflow-hidden bg-card hover:border-primary transition-colors">
                {formData.image_url ? (
                  <div className="relative max-w-xs mx-auto my-4 group">
                    <img src={formData.image_url} alt="Pin preview" className="w-full h-auto rounded-lg shadow-md" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-black/90 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center py-12 cursor-pointer text-muted-foreground hover:bg-muted/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={loading}
                      className="hidden"
                    />
                    <Upload className="size-8 mb-3" />
                    <span className="font-semibold">Upload Pin Image</span>
                    <small className="mt-1 text-muted-foreground/70">Recommended: 1000x1500px (vertical)</small>
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-foreground/80">Pin Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Eye-catching pin title"
                className="px-3 py-2.5 bg-card border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-foreground/80">Pin Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this pin for Pinterest users"
                rows={4}
                className="px-3 py-2.5 bg-card border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground resize-y"
                required
              />
              <small className="text-muted-foreground text-xs text-right">{formData.description.length} / 500 characters</small>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-foreground/80">Pinterest Board</label>
              <select
                value={formData.board_id}
                onChange={(e) => setFormData(prev => ({ ...prev, board_id: e.target.value }))}
                className="px-3 py-2.5 bg-card border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="">No Board (Master Feed Only)</option>
                {boards.filter(b => b.is_active).map(board => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
              <small className="text-muted-foreground text-xs">Assign this pin to a specific Pinterest board for targeted RSS feeds</small>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-foreground/80">Alt Text</label>
              <input
                type="text"
                value={formData.image_alt}
                onChange={(e) => setFormData(prev => ({ ...prev, image_alt: e.target.value }))}
                placeholder="Accessibility description"
                className="px-3 py-2.5 bg-card border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-sm text-foreground/80">Width (px)</label>
                <input
                  type="number"
                  value={formData.image_width}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_width: parseInt(e.target.value) }))}
                  min="100"
                  className="px-3 py-2.5 bg-card border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-sm text-foreground/80">Height (px)</label>
                <input
                  type="number"
                  value={formData.image_height}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_height: parseInt(e.target.value) }))}
                  min="100"
                  className="px-3 py-2.5 bg-card border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-sm text-foreground/80">Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                  min="0"
                  className="px-3 py-2.5 bg-card border border-input rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-foreground/80">
                <input
                  type="checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                  className="size-4 rounded border-input text-primary focus:ring-primary"
                />
                <span className="font-medium">Set as primary pin</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-2">
              <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-bold transition-all disabled:opacity-50" disabled={loading}>
                <Check className="size-4" />
                {editingPin ? 'Update Pin' : 'Add Pin'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-8">
        {loading && pins.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">Loading pins...</div>
        ) : pins.length === 0 ? (
          <div className="text-center py-12 bg-muted/50 rounded-lg text-muted-foreground border border-border">
            <p>No pins yet. Add your first Pinterest pin!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pins.map(pin => (
              <div
                key={pin.id}
                className={`group relative bg-card border rounded-lg overflow-hidden hover:shadow-lg transition-all ${pin.is_primary
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border hover:border-primary/50'
                  }`}
              >
                {pin.is_primary && (
                  <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm z-10">
                    <Star className="size-3" fill="currentColor" />
                    Primary
                  </div>
                )}

                <div className="aspect-[2/3] w-full bg-muted overflow-hidden relative">
                  <img src={pin.image_url} alt={pin.image_alt || pin.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-foreground mb-2 line-clamp-1" title={pin.title}>{pin.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5em]">{pin.description}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground font-mono">
                    <span>{pin.image_width}x{pin.image_height}</span>
                    <span>Order: {pin.sort_order}</span>
                  </div>
                </div>

                <div className="flex gap-2 p-3 bg-muted/50 border-t border-border">
                  {!pin.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(pin.id)}
                      className="flex-1 flex items-center justify-center p-2 rounded-md border border-border text-muted-foreground hover:bg-card hover:text-primary transition-colors"
                      title="Set as primary"
                      disabled={loading}
                    >
                      <Star className="size-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(pin)}
                    className="flex-1 flex items-center justify-center p-2 rounded-md border border-border text-muted-foreground hover:bg-card hover:text-primary transition-colors"
                    title="Edit pin"
                    disabled={loading}
                  >
                    <Edit2 className="size-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(pin.id)}
                    className="flex-1 flex items-center justify-center p-2 rounded-md border border-border text-muted-foreground hover:bg-card hover:text-destructive transition-colors"
                    title="Delete pin"
                    disabled={loading}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, pinToDelete: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Pin"
        description="Are you sure you want to delete this pin?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default PinterestPinManager;
