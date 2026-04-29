/**
 * MetadataPanel - Form for image metadata and adjustments
 */

import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group';
import { Slider } from '@/ui/slider';
import { Badge } from '@/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { ZoomIn, RotateCw, Focus } from 'lucide-react';
import { ASPECT_RATIOS, ASPECT_RATIO_LABELS } from '../config';

export default function MetadataPanel({
  metadata,
  onMetadataChange,
  format,
  onFormatChange,
  aspect,
  onAspectChange,
  zoom,
  onZoomChange,
  rotation,
  onRotationChange,
  focalPoint,
  showFocalPoint,
  onToggleFocalPoint,
  authors,
  loadingAuthors,
}) {
  const zoomPercent = Math.round((zoom - 1) * 50);
  const numericAspect = ASPECT_RATIOS[aspect];

  return (
    <div className="w-full lg:w-80 lg:min-w-[18rem] flex flex-col min-h-0 max-h-[50vh] lg:max-h-none border-t lg:border-t-0 lg:border-l bg-background">
      {/* Scrollable Form Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Filename */}
        <div className="space-y-1">
          <Label htmlFor="filename" className="text-xs font-medium">
            Filename <span className="text-destructive">*</span>
          </Label>
          <Input
            id="filename"
            value={metadata.filename}
            onChange={(e) => onMetadataChange({ ...metadata, filename: e.target.value })}
            placeholder="my-image-name"
            className="h-8 text-sm"
          />
        </div>

        {/* Alt Text */}
        <div className="space-y-1">
          <Label htmlFor="altText" className="text-xs font-medium">
            Alt Text <span className="text-destructive">*</span>
          </Label>
          <Input
            id="altText"
            value={metadata.altText}
            onChange={(e) => onMetadataChange({ ...metadata, altText: e.target.value })}
            placeholder="Describe for accessibility"
            className="h-8 text-sm"
          />
        </div>

        {/* Caption */}
        <div className="space-y-1">
          <Label htmlFor="caption" className="text-xs font-medium">Caption</Label>
          <Input
            id="caption"
            value={metadata.caption}
            onChange={(e) => onMetadataChange({ ...metadata, caption: e.target.value })}
            placeholder="Optional caption"
            className="h-8 text-sm"
          />
        </div>

        {/* Credit (Author) */}
        <div className="space-y-1">
          <Label htmlFor="credit" className="text-xs font-medium">Credit</Label>
          <Select
            value={metadata.credit || 'none'}
            onValueChange={(value) => onMetadataChange({ ...metadata, credit: value === 'none' ? '' : value })}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={loadingAuthors ? 'Loading...' : 'Select author'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {authors.map((author) => (
                <SelectItem key={author.slug} value={author.name}>
                  {author.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <hr className="border-border" />

        {/* Output Format */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Output Format</Label>
          <RadioGroup
            value={format}
            onValueChange={onFormatChange}
            className="flex gap-6"
          >
            <label className="inline-flex items-center cursor-pointer">
              <RadioGroupItem value="webp" id="format-webp" />
              <span className="ml-2 text-sm font-medium">WebP</span>
              <Badge variant="secondary" className="ml-2 text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                Recommended
              </Badge>
            </label>
            <label className="inline-flex items-center cursor-pointer">
              <RadioGroupItem value="avif" id="format-avif" />
              <span className="ml-2 text-sm font-medium">AVIF</span>
              <Badge variant="outline" className="ml-2 text-[10px]">Smaller</Badge>
            </label>
          </RadioGroup>
        </div>

        <hr className="border-border" />

        {/* Image Adjustments */}
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-medium">Aspect Ratio</Label>
            <Select value={aspect} onValueChange={onAspectChange}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select ratio" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(ASPECT_RATIOS).map((ratio) => (
                  <SelectItem key={ratio} value={ratio}>
                    {ASPECT_RATIO_LABELS[ratio] || ratio}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Zoom & Rotate Sliders */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ZoomIn className="size-3.5" /> Zoom
                </label>
                <span className="text-xs font-medium">{zoomPercent}%</span>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.05}
                onValueChange={([v]) => onZoomChange(v)}
                className="h-1.5"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <RotateCw className="size-3.5" /> Rotate
                </label>
                <span className="text-xs font-medium">{rotation}°</span>
              </div>
              <Slider
                value={[rotation]}
                min={-45}
                max={45}
                step={1}
                onValueChange={([v]) => onRotationChange(v)}
                className="h-1.5"
              />
            </div>
          </div>

          {/* Focal Point Button */}
          <Button
            variant={showFocalPoint ? 'default' : 'outline'}
            onClick={onToggleFocalPoint}
            className="w-full gap-2"
          >
            <Focus className="h-4 w-4" />
            Set Focal Point
            {showFocalPoint && (
              <span className="text-xs opacity-70">({focalPoint.x}%, {focalPoint.y}%)</span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
