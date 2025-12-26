/**
 * MetadataForm - Image metadata form with AI generation support
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Textarea } from '@/ui/textarea';
import { Label } from '@/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group';
import { ArrowLeft, Upload, Sparkles, Loader2 } from 'lucide-react';
import { authorsAPI } from '@admin/services/api';

export default function MetadataForm({
  metadata,
  onMetadataChange,
  format,
  onFormatChange,
  previewUrl,
  onBack,
  onUpload,
}) {
  const [authors, setAuthors] = useState([]);
  const [loadingAuthors, setLoadingAuthors] = useState(true);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Load authors on mount
  useEffect(() => {
    const loadAuthors = async () => {
      try {
        const response = await authorsAPI.getAll();
        setAuthors(response.data?.data || response.data || []);
      } catch (err) {
        console.error('Failed to load authors:', err);
      } finally {
        setLoadingAuthors(false);
      }
    };
    loadAuthors();
  }, []);

  const handleChange = useCallback((field, value) => {
    onMetadataChange(prev => ({ ...prev, [field]: value }));
  }, [onMetadataChange]);

  const handleGenerateAI = useCallback(async () => {
    if (!previewUrl) return;
    
    setGeneratingAI(true);
    try {
      // TODO: Implement AI generation API call
      // For now, generate placeholder text
      const response = await fetch('/api/ai/generate-image-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: previewUrl }),
      });
      
      if (response.ok) {
        const data = await response.json();
        onMetadataChange(prev => ({
          ...prev,
          altText: data.altText || prev.altText,
          caption: data.caption || prev.caption,
        }));
      }
    } catch (err) {
      console.error('AI generation failed:', err);
      // Fallback: Generate basic placeholder
      onMetadataChange(prev => ({
        ...prev,
        altText: prev.altText || 'Image description',
        caption: prev.caption || 'A descriptive caption for this image.',
      }));
    } finally {
      setGeneratingAI(false);
    }
  }, [previewUrl, onMetadataChange]);

  const isValid = metadata.filename && metadata.altText;

  return (
    <div className="space-y-6">
      {/* Preview */}
      <div className="flex gap-6">
        <div className="w-48 h-48 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 space-y-4">
          {/* Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename">
              Filename <span className="text-destructive">*</span>
            </Label>
            <Input
              id="filename"
              value={metadata.filename}
              onChange={(e) => handleChange('filename', e.target.value)}
              placeholder="my-image-name"
            />
          </div>

          {/* Alt Text */}
          <div className="space-y-2">
            <Label htmlFor="altText">
              Alt Text <span className="text-destructive">*</span>
            </Label>
            <Input
              id="altText"
              value={metadata.altText}
              onChange={(e) => handleChange('altText', e.target.value)}
              placeholder="Describe the image for accessibility"
            />
          </div>
        </div>
      </div>

      {/* Caption */}
      <div className="space-y-2">
        <Label htmlFor="caption">Caption</Label>
        <Textarea
          id="caption"
          value={metadata.caption}
          onChange={(e) => handleChange('caption', e.target.value)}
          placeholder="Optional caption for the image"
          rows={2}
        />
      </div>

      {/* AI Generate Button */}
      <Button
        variant="outline"
        onClick={handleGenerateAI}
        disabled={generatingAI}
        className="w-full"
      >
        {generatingAI ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-2" />
        )}
        Generate Alt + Caption with AI
      </Button>

      {/* Credit / Author */}
      <div className="space-y-2">
        <Label>Credit / Author</Label>
        <Select
          value={metadata.credit || 'none'}
          onValueChange={(v) => handleChange('credit', v === 'none' ? '' : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select author..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No credit</SelectItem>
            {authors.map((author) => (
              <SelectItem key={author.slug} value={author.name}>
                {author.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Format Selection */}
      <div className="space-y-2">
        <Label>Output Format</Label>
        <RadioGroup
          value={format}
          onValueChange={onFormatChange}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="webp" id="format-webp" />
            <Label htmlFor="format-webp" className="cursor-pointer">WebP</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="avif" id="format-avif" />
            <Label htmlFor="format-avif" className="cursor-pointer">AVIF</Label>
          </div>
        </RadioGroup>
        <p className="text-xs text-muted-foreground">
          {format === 'webp' ? 'Best compatibility (97%+ browser support)' : 'Best compression (smaller files)'}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border/40">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Button onClick={onUpload} disabled={!isValid}>
          <Upload className="h-4 w-4 mr-2" />
          Upload
        </Button>
      </div>
    </div>
  );
}
