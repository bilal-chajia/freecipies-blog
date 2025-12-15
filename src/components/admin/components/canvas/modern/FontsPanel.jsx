import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Search, Loader2, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import useEditorStore from '../../../store/useEditorStore';
import { useUIStore } from '../../../store/useStore';
import ConfirmationModal from '@/components/ui/confirmation-modal';

/**
 * FontsPanel - Font management section for Text tab
 * Features: Upload fonts, view all fonts with name preview, delete fonts
 * Styled for dark zinc theme matching template editor
 */
const FontsPanel = () => {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [fonts, setFonts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const fileInputRef = useRef(null);

    const customFonts = useEditorStore(state => state.customFonts);
    const addCustomFont = useEditorStore(state => state.addCustomFont);
    const removeCustomFont = useEditorStore(state => state.removeCustomFont);

    // Load fonts from API
    const loadFonts = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/upload-font', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                }
            });
            const result = await response.json();
            if (result.data) {
                setFonts(result.data);

                // Sync with store and load fonts into document.fonts
                for (const font of result.data) {
                    const existsInStore = customFonts.some(f => f.name === font.name);
                    if (!existsInStore) {
                        addCustomFont({ name: font.name, url: font.url });
                    }

                    // Load into document.fonts if not already loaded
                    const isLoaded = Array.from(document.fonts).some(f => f.family === font.name);
                    if (!isLoaded) {
                        try {
                            const fontFace = new FontFace(font.name, `url(${font.url})`);
                            await fontFace.load();
                            document.fonts.add(fontFace);
                        } catch (e) {
                            console.warn(`Failed to load font ${font.name}:`, e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load fonts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFonts();
    }, []);

    // Handle font upload
    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload-font', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                },
                body: formData
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Upload failed');
            }

            // Add to store
            const fontName = result.data?.filename?.replace(/\.[^.]+$/, '') || file.name.split('.')[0];
            addCustomFont({ name: fontName, url: result.data?.url });

            // Load the font into document.fonts
            const fontFace = new FontFace(fontName, `url(${result.data?.url})`);
            await fontFace.load();
            document.fonts.add(fontFace);

            // Reload fonts list
            await loadFonts();
        } catch (error) {
            console.error('Font upload failed:', error);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // Confirmation State
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        data: null,
        title: '',
        description: ''
    });

    const closeConfirm = () => setConfirmState(prev => ({ ...prev, isOpen: false }));

    const handleConfirmAction = () => {
        if (confirmState.data) {
            executeDeleteFont(confirmState.data);
        }
        closeConfirm();
    };

    // Handle font delete
    const executeDeleteFont = async (font) => {
        try {
            const response = await fetch(`/api/upload-font?filename=${encodeURIComponent(font.filename)}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                }
            });

            if (response.ok) {
                removeCustomFont(font.name);
                setFonts(prev => prev.filter(f => f.name !== font.name));
                toast.success('Font deleted');
            }
        } catch (error) {
            console.error('Failed to delete font:', error);
            toast.error('Failed to delete font');
        }
    };

    const handleDelete = (font) => {
        setConfirmState({
            isOpen: true,
            data: font,
            title: 'Delete Font?',
            description: `Are you sure you want to delete "${font.name}"? This action cannot be undone.`
        });
    };

    // Filter fonts by search
    const filteredFonts = fonts.filter(font =>
        font.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-3">
            {/* Section Header */}
            {/* ... (keep header) */}
            <div className="flex items-center justify-between">
                <h3 className={`text-sm font-medium ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>Your Fonts</h3>
                <span className="text-xs text-zinc-500">{fonts.length}</span>
            </div>

            {/* Upload Button ... keep */}
            <Button
                className={`w-full ${isDark ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700' : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200'}`}
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                aria-label="Upload a custom font file"
            >
                {uploading ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                        <span>Uploading...</span>
                    </>
                ) : (
                    <>
                        <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                        <span>Upload Font</span>
                    </>
                )}
            </Button>
            <input
                ref={fileInputRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={handleUpload}
                aria-label="Select font file to upload"
            />

            {/* Search */}
            {fonts.length > 3 && (
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" aria-hidden="true" />
                    <Input
                        placeholder="Search fonts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`pl-8 h-8 text-sm ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500' : 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400'}`}
                        aria-label="Search your uploaded fonts"
                    />
                </div>
            )}

            {/* Fonts List */}
            {loading ? (
                <div className="flex items-center justify-center py-6" role="status" aria-label="Loading fonts">
                    <Loader2 className="w-5 h-5 animate-spin text-zinc-500" aria-hidden="true" />
                </div>
            ) : filteredFonts.length === 0 ? (
                <div className="text-center py-6 text-zinc-500" role="status">
                    <Type className="w-8 h-8 mx-auto mb-2 opacity-30" aria-hidden="true" />
                    <p className="text-xs">No fonts uploaded yet</p>
                    <p className="text-xs opacity-70 mt-1">.ttf, .otf, .woff supported</p>
                </div>
            ) : (
                <div className="space-y-1" role="list" aria-label="Uploaded fonts">
                    {filteredFonts.map((font) => (
                        <div
                            key={font.name}
                            className={`group flex items-center justify-between p-2 rounded-md transition-colors ${isDark ? 'bg-zinc-800/50 hover:bg-zinc-800' : 'bg-zinc-50 hover:bg-zinc-100'}`}
                            role="listitem"
                        >
                            {/* Font name displayed in the font itself */}
                            <span
                                className={`text-base truncate flex-1 min-w-0 mr-2 ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}
                                style={{ fontFamily: font.name }}
                                title={font.name}
                            >
                                {font.name}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={`h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 ${isDark ? 'text-zinc-400' : 'text-zinc-500'} hover:text-red-400 hover:bg-red-500/10`}
                                onClick={() => handleDelete(font)}
                                aria-label={`Delete font ${font.name}`}
                            >
                                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmState.isOpen}
                onClose={closeConfirm}
                onConfirm={handleConfirmAction}
                title={confirmState.title}
                description={confirmState.description}
                confirmText="Delete"
            />
        </div>
    );
};

export default FontsPanel;
