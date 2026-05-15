import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useImageUploadSettings } from '@admin/hooks/useImageUploadSettings';
import { authorsAPI } from '../../../../services/api';
import { Slider } from '@/ui/slider.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.jsx';
import { Label } from '@/ui/label.jsx';
import { Card, CardContent } from '@/ui/card.jsx';
import { Alert, AlertDescription, AlertTitle } from '@/ui/alert.jsx';
import { AlertCircle, CheckCircle2, Image as ImageIcon, Zap, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { ASPECT_RATIO_OPTIONS } from '../../../../../shared/constants/image-upload';
import { Button } from '@/ui/button.jsx';
import ConfirmationModal from '@/ui/confirmation-modal.jsx';
import { Input } from '@/ui/input.jsx';

const ImageUploadSettings = ({ onRegisterActions }) => {
  const { settings, updateSettings, resetSettings, isLoading, defaults } = useImageUploadSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [authors, setAuthors] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error' | null
  const [saveMessage, setSaveMessage] = useState('');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const statusTimeoutRef = useRef(null);

  // Sync with loaded settings (only when not dirty/editing)
  useEffect(() => {
    if (settings && !hasChanges) {
      setLocalSettings(settings);
    }
  }, [settings, hasChanges]);

  // Check for changes
  useEffect(() => {
    if (!settings) return;
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings);
    setHasChanges(changed);
    if (changed) {
      setSaveStatus(null);
      setSaveMessage('');
    }
  }, [localSettings, settings]);

  // Fetch authors for default credit
  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const response = await authorsAPI.getAll();
        if (response.data?.success) {
          setAuthors(response.data.data);
        }
      } catch (e) {
        console.error('Failed to fetch authors', e);
      }
    };
    fetchAuthors();
  }, []);

  const handleChange = (key, value) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleEncodingChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      encoding: {
        ...(prev?.encoding || defaults.encoding),
        [key]: value,
      },
    }));
  };

  const handleVariantWidthChange = (key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      variant_widths: {
        ...(prev?.variant_widths || defaults.variant_widths),
        [key]: value,
      },
    }));
  };

  const buildDefaultCredit = (authorId) => {
    if (!authorId || authorId === 'none') return null;
    const author = authors.find(item => String(item.id) === String(authorId));
    if (!author?.id || !author?.name || !author?.slug) return null;
    return {
      type: 'author',
      id: Number(author.id),
      name: author.name,
      slug: author.slug,
      avatar: null,
    };
  };

  const setStatus = useCallback((status, message, timeoutMs = 3000) => {
    setSaveStatus(status);
    setSaveMessage(message);
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    if (timeoutMs) {
      statusTimeoutRef.current = setTimeout(() => {
        setSaveStatus(null);
        setSaveMessage('');
      }, timeoutMs);
    }
  }, []);

  const getErrorMessage = useCallback((error, fallback) => {
    return (
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.message ||
      fallback
    );
  }, []);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveStatus(null);
    setSaveMessage('');
    try {
      const result = await updateSettings(localSettings);

      // Explicitly update localSettings with the saved result
      if (result) {
        setLocalSettings(result);
      }

      toast.success('Image upload settings saved');
      setStatus('success', 'Image upload settings saved.');
      setHasChanges(false);
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error, 'Failed to save settings');
      toast.error(message);
      setStatus('error', message, 6000);
    } finally {
      setIsSaving(false);
    }
  }, [getErrorMessage, localSettings, setStatus, updateSettings]);

  const handleReset = useCallback(() => {
    setResetModalOpen(true);
  }, []);

  const handleResetConfirm = useCallback(async () => {
    setResetModalOpen(false);
    setIsSaving(true);
    try {
      const newSettings = await resetSettings();
      setLocalSettings(newSettings);
      toast.success('Settings reset to defaults');
      setStatus('success', 'Settings reset to defaults.');
      setHasChanges(false);
    } catch (error) {
      console.error(error);
      const message = getErrorMessage(error, 'Failed to reset settings');
      toast.error(message);
      setStatus('error', message, 6000);
    } finally {
      setIsSaving(false);
    }
  }, [getErrorMessage, resetSettings, setStatus]);

  const actionState = useMemo(() => ({
    onSave: handleSave,
    onReset: handleReset,
    isSaving,
    hasChanges,
  }), [handleSave, handleReset, hasChanges, isSaving]);

  useEffect(() => {
    if (!onRegisterActions) return;
    onRegisterActions(actionState);
    return () => onRegisterActions(null);
  }, [actionState, onRegisterActions]);

  if (isLoading && !localSettings) {
    return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 w-full max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
      {saveStatus && (
        <Alert variant={saveStatus === 'error' ? 'destructive' : 'default'}>
          {saveStatus === 'error' ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          )}
          <AlertTitle>
            {saveStatus === 'error' ? 'Save failed' : 'Saved'}
          </AlertTitle>
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      )}

      <h3 className="sr-only">Image Upload Configuration</h3>

      <div className="grid gap-4 lg:grid-cols-2">

        {/* Compression Settings */}
        <Card className="border-border/50 shadow-sm">
          <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Compression Quality</h4>
          </div>
          <CardContent className="p-4 grid gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>WebP Quality</span>
                  <span className="font-normal text-xs text-muted-foreground">Balance between size and quality for WebP images.</span>
                </Label>
                <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{localSettings?.encoding?.webp_quality ?? 80}%</span>
              </div>
              <Slider
                value={[localSettings?.encoding?.webp_quality ?? 80]}
                min={10}
                max={100}
                step={5}
                onValueChange={([val]) => handleEncodingChange('webp_quality', val)}
                className="w-full"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>AVIF Quality</span>
                  <span className="font-normal text-xs text-muted-foreground">Newer format with better compression. Usually requires lower values than WebP.</span>
                </Label>
                <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{localSettings?.encoding?.avif_quality ?? 70}%</span>
              </div>
              <Slider
                value={[localSettings?.encoding?.avif_quality ?? 70]}
                min={10}
                max={100}
                step={5}
                onValueChange={([val]) => handleEncodingChange('avif_quality', val)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        {/* Global Defaults */}
        <Card className="border-border/50 shadow-sm">
          <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Global Defaults</h4>
          </div>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="space-y-1">
              <Label>Default Aspect Ratio</Label>
              <Select
                value={localSettings?.default_aspect_ratio ?? 'free'}
                onValueChange={(val) => handleChange('default_aspect_ratio', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASPECT_RATIO_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Pre-selected ratio when opening the uploader.</p>
            </div>

            <div className="space-y-1">
              <Label>Default Output Format</Label>
              <Select
                value={localSettings?.encoding?.format ?? 'webp'}
                onValueChange={(val) => handleEncodingChange('format', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="webp">WebP (Recommended)</SelectItem>
                  <SelectItem value="avif">AVIF (Best Compression)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Preferred format for generated variants.</p>
            </div>

            <div className="space-y-1">
              <Label>Default Credit Author</Label>
              <Select
                value={localSettings?.default_credit?.id ? String(localSettings.default_credit.id) : 'none'}
                onValueChange={(val) => handleChange('default_credit', buildDefaultCredit(val))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an author" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {authors.map(author => (
                    <SelectItem key={author.id} value={String(author.id)}>
                      {author.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Automatically attribute uploads to this author.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="max-file-size">Max Upload Size</Label>
              <div className="relative">
                <Input
                  id="max-file-size"
                  name="maxFileSizeMB"
                  type="number"
                  value={localSettings?.max_file_size_mb ?? 50}
                  onChange={(e) => handleChange('max_file_size_mb', parseInt(e.target.value))}
                  className="h-8 w-full pr-8"
                />
                <span className="absolute right-3 top-2 text-xs text-muted-foreground">MB</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Maximum allowed file size per upload.</p>
            </div>

          </CardContent>
        </Card>

        {/* Variant Sizes */}
        <Card className="border-border/50 shadow-sm lg:col-span-2">
          <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h4 className="font-medium text-sm">Variant Sizes (Max Width)</h4>
          </div>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label htmlFor="variant-lg" className="text-xs text-muted-foreground">Large (lg)</Label>
                <div className="relative">
                  <Input
                    id="variant-lg"
                    name="variantLg"
                    type="number"
                    value={localSettings?.variant_widths?.lg ?? 2048}
                    onChange={(e) => handleVariantWidthChange('lg', parseInt(e.target.value))}
                    className="h-8 w-full pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-muted-foreground">px</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="variant-md" className="text-xs text-muted-foreground">Medium (md)</Label>
                <div className="relative">
                  <Input
                    id="variant-md"
                    name="variantMd"
                    type="number"
                    value={localSettings?.variant_widths?.md ?? 1200}
                    onChange={(e) => handleVariantWidthChange('md', parseInt(e.target.value))}
                    className="h-8 w-full pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-muted-foreground">px</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="variant-sm" className="text-xs text-muted-foreground">Small (sm)</Label>
                <div className="relative">
                  <Input
                    id="variant-sm"
                    name="variantSm"
                    type="number"
                    value={localSettings?.variant_widths?.sm ?? 720}
                    onChange={(e) => handleVariantWidthChange('sm', parseInt(e.target.value))}
                    className="h-8 w-full pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-muted-foreground">px</span>
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="variant-xs" className="text-xs text-muted-foreground">Thumbnail (xs)</Label>
                <div className="relative">
                  <Input
                    id="variant-xs"
                    name="variantXs"
                    type="number"
                    value={localSettings?.variant_widths?.xs ?? 360}
                    onChange={(e) => handleVariantWidthChange('xs', parseInt(e.target.value))}
                    className="h-8 w-full pr-8"
                  />
                  <span className="absolute right-3 top-2 text-xs text-muted-foreground">px</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmationModal
        isOpen={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        onConfirm={handleResetConfirm}
        title="Reset Settings"
        description="Are you sure you want to reset all image upload settings to defaults?"
        confirmText="Reset"
        cancelText="Cancel"
      />
    </div>
  );
};

export default ImageUploadSettings;
