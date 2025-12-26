import React, { useState, useEffect } from 'react';
import { Upload, X, Star, GripVertical, Eye, Plus, Trash2, Edit2, Check } from 'lucide-react';

const PinterestPinManager = ({ articleId }) => {
  const [pins, setPins] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
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
      setBoards(data.boards || []);
    } catch (error) {
      console.error('Error fetching boards:', error);
    }
  };

  const fetchPins = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pins?article_id=${articleId}`);
      const data = await response.json();
      setPins(data.pins || []);
    } catch (error) {
      console.error('Error fetching pins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    try {
      setLoading(true);

      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData
      });

      if (!uploadResponse.ok) throw new Error('Upload failed');
      const uploadData = await uploadResponse.json();

      let imageUrl = '';
      if (uploadData.success) {
          if (uploadData.data?.variantsJson) {
              try {
                  const variants = typeof uploadData.data.variantsJson === 'string' 
                      ? JSON.parse(uploadData.data.variantsJson) 
                      : uploadData.data.variantsJson;
                  imageUrl = variants.original?.url || variants.lg?.url || '';
              } catch (e) {
                  // Fallback
                  imageUrl = uploadData.data?.url || uploadData.url || '';
              }
          } else {
              imageUrl = uploadData.data?.url || uploadData.url || '';
          }
      }

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
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.image_url) {
      alert('Please fill in all required fields');
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
      console.error('Error saving pin:', error);
      alert('Failed to save pin');
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

  const handleDelete = async (pinId) => {
    if (!confirm('Are you sure you want to delete this pin?')) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/pins?id=${pinId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete pin');
      await fetchPins();
    } catch (error) {
      console.error('Error deleting pin:', error);
      alert('Failed to delete pin');
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
      console.error('Error setting primary pin:', error);
      alert('Failed to set primary pin');
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
      <div className="text-center py-12 px-8 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
        <p>Save the article first to manage Pinterest pins</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Pinterest Pins</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#E60023] hover:bg-[#AD081B] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
          disabled={loading}
        >
          <Plus size={16} />
          Add Pin
        </button>
      </div>

      {showAddForm && (
        <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 mb-8 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-sm animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              {editingPin ? 'Edit Pin' : 'Add New Pin'}
            </h4>
            <button onClick={cancelEdit} className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Pin Image *</label>
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-600 rounded-lg overflow-hidden bg-white dark:bg-zinc-800 hover:border-[#E60023] dark:hover:border-[#E60023] transition-colors">
                {formData.image_url ? (
                  <div className="relative max-w-xs mx-auto my-4 group">
                    <img src={formData.image_url} alt="Pin preview" className="w-full h-auto rounded-lg shadow-md" />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-black/90 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center py-12 cursor-pointer text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={loading}
                      className="hidden"
                    />
                    <Upload size={32} className="mb-3" />
                    <span className="font-semibold">Upload Pin Image</span>
                    <small className="mt-1 text-zinc-400">Recommended: 1000x1500px (vertical)</small>
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Pin Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Eye-catching pin title"
                className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-[#E60023] focus:ring-1 focus:ring-[#E60023] dark:text-white"
                required
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Pin Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this pin for Pinterest users"
                rows={4}
                className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-[#E60023] focus:ring-1 focus:ring-[#E60023] dark:text-white resize-y"
                required
              />
              <small className="text-zinc-500 dark:text-zinc-400 text-xs text-right">{formData.description.length} / 500 characters</small>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Pinterest Board</label>
              <select
                value={formData.board_id}
                onChange={(e) => setFormData(prev => ({ ...prev, board_id: e.target.value }))}
                className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-[#E60023] focus:ring-1 focus:ring-[#E60023] dark:text-white"
              >
                <option value="">No Board (Master Feed Only)</option>
                {boards.filter(b => b.is_active).map(board => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
              <small className="text-zinc-500 dark:text-zinc-400 text-xs">Assign this pin to a specific Pinterest board for targeted RSS feeds</small>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Alt Text</label>
              <input
                type="text"
                value={formData.image_alt}
                onChange={(e) => setFormData(prev => ({ ...prev, image_alt: e.target.value }))}
                placeholder="Accessibility description"
                className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-[#E60023] focus:ring-1 focus:ring-[#E60023] dark:text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Width (px)</label>
                <input
                  type="number"
                  value={formData.image_width}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_width: parseInt(e.target.value) }))}
                  min="100"
                  className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-[#E60023] focus:ring-1 focus:ring-[#E60023] dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Height (px)</label>
                <input
                  type="number"
                  value={formData.image_height}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_height: parseInt(e.target.value) }))}
                  min="100"
                  className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-[#E60023] focus:ring-1 focus:ring-[#E60023] dark:text-white"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                  min="0"
                  className="px-3 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-[#E60023] focus:ring-1 focus:ring-[#E60023] dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <label className="flex items-center gap-2 cursor-pointer text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                  className="w-4 h-4 rounded border-zinc-300 text-[#E60023] focus:ring-[#E60023]"
                />
                <span className="font-medium">Set as primary pin</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-700 mt-2">
              <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[#E60023] hover:bg-[#AD081B] text-white rounded-lg font-bold transition-all disabled:opacity-50" disabled={loading}>
                <Check size={16} />
                {editingPin ? 'Update Pin' : 'Add Pin'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mt-8">
        {loading && pins.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">Loading pins...</div>
        ) : pins.length === 0 ? (
          <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
            <p>No pins yet. Add your first Pinterest pin!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pins.map(pin => (
              <div
                key={pin.id}
                className={`group relative bg-white dark:bg-zinc-900 border rounded-lg overflow-hidden hover:shadow-lg transition-all dark:hover:shadow-zinc-900/50 ${pin.is_primary
                    ? 'border-[#E60023] ring-1 ring-[#E60023]'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}
              >
                {pin.is_primary && (
                  <div className="absolute top-3 left-3 bg-[#E60023] text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-sm z-10">
                    <Star size={12} fill="currentColor" />
                    Primary
                  </div>
                )}

                <div className="aspect-[2/3] w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden relative">
                  <img src={pin.image_url} alt={pin.image_alt || pin.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                </div>

                <div className="p-4">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2 line-clamp-1" title={pin.title}>{pin.title}</h4>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3 line-clamp-2 min-h-[2.5em]">{pin.description}</p>
                  <div className="flex gap-3 text-xs text-zinc-400 dark:text-zinc-500 font-mono">
                    <span>{pin.image_width}x{pin.image_height}</span>
                    <span>Order: {pin.sort_order}</span>
                  </div>
                </div>

                <div className="flex gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800">
                  {!pin.is_primary && (
                    <button
                      onClick={() => handleSetPrimary(pin.id)}
                      className="flex-1 flex items-center justify-center p-2 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
                      title="Set as primary"
                      disabled={loading}
                    >
                      <Star size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(pin)}
                    className="flex-1 flex items-center justify-center p-2 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Edit pin"
                    disabled={loading}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(pin.id)}
                    className="flex-1 flex items-center justify-center p-2 rounded-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-white dark:hover:bg-zinc-700 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    title="Delete pin"
                    disabled={loading}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PinterestPinManager;

