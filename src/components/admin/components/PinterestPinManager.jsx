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
  }, [articleId, fetchBoards, fetchPins]);

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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    try {
      setLoading(true);
      
      // Upload to R2
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      
      const uploadResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: uploadFormData
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadData = await uploadResponse.json();
      
      // Get image dimensions
      const img = new Image();
      img.onload = () => {
        setFormData(prev => ({
          ...prev,
          image_url: uploadData.url,
          image_width: img.width,
          image_height: img.height
        }));
      };
      img.src = uploadData.url;

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
      
      const url = editingPin ? '/api/pins' : '/api/pins';
      const method = editingPin ? 'PUT' : 'POST';
      
      const payload = editingPin 
        ? { ...formData, id: editingPin.id }
        : { ...formData, article_id: articleId };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to save pin');
      }

      // Reset form and refresh pins
      setFormData({
        title: '',
        description: '',
        image_url: '',
        image_alt: '',
        image_width: 1000,
        image_height: 1500,
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

      if (!response.ok) {
        throw new Error('Failed to delete pin');
      }

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

      if (!response.ok) {
        throw new Error('Failed to set primary pin');
      }

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
      <div className="pin-manager-placeholder">
        <p>Save the article first to manage Pinterest pins</p>
      </div>
    );
  }

  return (
    <div className="pinterest-pin-manager">
      <div className="manager-header">
        <h3>Pinterest Pins</h3>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-add-pin"
          disabled={loading}
        >
          <Plus size={16} />
          Add Pin
        </button>
      </div>

      {showAddForm && (
        <div className="pin-form-container">
          <div className="form-header">
            <h4>{editingPin ? 'Edit Pin' : 'Add New Pin'}</h4>
            <button onClick={cancelEdit} className="btn-close">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="pin-form">
            <div className="form-group">
              <label>Pin Image *</label>
              <div className="image-upload-area">
                {formData.image_url ? (
                  <div className="image-preview">
                    <img src={formData.image_url} alt="Pin preview" />
                    <button 
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="btn-remove-image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <label className="upload-label">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={loading}
                    />
                    <Upload size={32} />
                    <span>Upload Pin Image</span>
                    <small>Recommended: 1000x1500px (vertical)</small>
                  </label>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Pin Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Eye-catching pin title"
                required
              />
            </div>

            <div className="form-group">
              <label>Pin Description *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this pin for Pinterest users"
                rows={4}
                required
              />
              <small>{formData.description.length} / 500 characters</small>
            </div>

            <div className="form-group">
              <label>Pinterest Board</label>
              <select
                value={formData.board_id}
                onChange={(e) => setFormData(prev => ({ ...prev, board_id: e.target.value }))}
              >
                <option value="">No Board (Master Feed Only)</option>
                {boards.filter(b => b.is_active).map(board => (
                  <option key={board.id} value={board.id}>{board.name}</option>
                ))}
              </select>
              <small>Assign this pin to a specific Pinterest board for targeted RSS feeds</small>
            </div>

            <div className="form-group">
              <label>Alt Text</label>
              <input
                type="text"
                value={formData.image_alt}
                onChange={(e) => setFormData(prev => ({ ...prev, image_alt: e.target.value }))}
                placeholder="Accessibility description"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Width (px)</label>
                <input
                  type="number"
                  value={formData.image_width}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_width: parseInt(e.target.value) }))}
                  min="100"
                />
              </div>
              <div className="form-group">
                <label>Height (px)</label>
                <input
                  type="number"
                  value={formData.image_height}
                  onChange={(e) => setFormData(prev => ({ ...prev, image_height: parseInt(e.target.value) }))}
                  min="100"
                />
              </div>
              <div className="form-group">
                <label>Sort Order</label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) }))}
                  min="0"
                />
              </div>
            </div>

            <div className="form-group-checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_primary: e.target.checked }))}
                />
                <span>Set as primary pin</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="button" onClick={cancelEdit} className="btn-cancel">
                Cancel
              </button>
              <button type="submit" className="btn-save" disabled={loading}>
                <Check size={16} />
                {editingPin ? 'Update Pin' : 'Add Pin'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="pins-list">
        {loading && pins.length === 0 ? (
          <div className="loading">Loading pins...</div>
        ) : pins.length === 0 ? (
          <div className="empty-state">
            <p>No pins yet. Add your first Pinterest pin!</p>
          </div>
        ) : (
          <div className="pins-grid">
            {pins.map(pin => (
              <div key={pin.id} className={`pin-card ${pin.is_primary ? 'primary' : ''}`}>
                {pin.is_primary && (
                  <div className="primary-badge">
                    <Star size={14} fill="currentColor" />
                    Primary
                  </div>
                )}
                
                <div className="pin-image-container">
                  <img src={pin.image_url} alt={pin.image_alt || pin.title} />
                </div>

                <div className="pin-info">
                  <h4>{pin.title}</h4>
                  <p>{pin.description.substring(0, 80)}{pin.description.length > 80 ? '...' : ''}</p>
                  <div className="pin-meta">
                    <span>{pin.image_width}x{pin.image_height}</span>
                    <span>Order: {pin.sort_order}</span>
                  </div>
                </div>

                <div className="pin-actions">
                  {!pin.is_primary && (
                    <button 
                      onClick={() => handleSetPrimary(pin.id)}
                      className="btn-action"
                      title="Set as primary"
                      disabled={loading}
                    >
                      <Star size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => handleEdit(pin)}
                    className="btn-action"
                    title="Edit pin"
                    disabled={loading}
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(pin.id)}
                    className="btn-action btn-danger"
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

