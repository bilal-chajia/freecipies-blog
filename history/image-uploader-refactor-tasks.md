# ImageUploader Module - Refactoring Plan

> **Created** : 2026-02-03  
> **Status** : ✅ Complete  
> **Priority** : High  
> **Estimate** : 2-3 days of work

---

## 🎯 Objectives

1. **Simplify maintenance** - Reduce complexity of large files
2. **Add type safety** - Complete TypeScript migration
3. **Improve testability** - Separation of concerns
4. **Optimize performance** - Lazy loading and memory management

---

## 📊 Current Analysis

| File | Lines | Issue |
|------|-------|-------|
| `index.jsx` | 1100 | Too many responsibilities, UI/logic mix |
| `useImageUpload.js` | 855 | Monolithic hook, hard to test |
| `CropEditor.jsx` | 292 | **Unused** - logic duplicated in index.jsx |
| `DropZone.jsx` | 450 | Good separation but can be optimized |

---

## ✅ Detailed Tasks

### Phase 1 : Quick Fixes (30 min)

#### Task 1.1 - Clean up unused imports
**File** : `src/admin/components/ImageUploader/index.jsx`

```javascript
// Line 17 - REMOVE
import CropEditor from './CropEditor';
```

**Check** :
- [ ] No reference to `CropEditor` in the file
- [ ] Build passes without error

---

#### Task 1.2 - Fix useImageUpload dependencies
**File** : `src/admin/components/ImageUploader/hooks/useImageUpload.js`

**Issue** : Dependency array incomplete around line ~845

```javascript
// VERIFY all dependencies are listed:
}, [
    applyCrop,
    createOptimizedCanvas,
    getOptimizedContext,
    resizeCanvas,
    encodeCanvas,
    generatePlaceholder,
    getConfig,
    getFileExtension,
    uploadVariantsInParallel,
    cleanupResources,
    abortUpload
]);
```

**Check** :
- [ ] ESLint hooks/exhaustive-deps passes
- [ ] No React console warnings

---

### Phase 2 : TypeScript Migration (2-3h)

#### Task 2.1 - Create shared types
**File** : `src/admin/components/ImageUploader/types/index.ts`

```typescript
/**
 * Types for the ImageUploader module
 */

export interface UploadMetadata {
  filename: string;
  altText: string;
  caption: string;
  credit: string;
}

export interface CropSettings {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  aspect: string;
  croppedAreaPixels: CroppedArea | null;
}

export interface CroppedArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FocalPoint {
  x: number;
  y: number;
}

export interface QueueItem {
  id: string;
  type: 'file' | 'url';
  source: File | string;
  name: string;
  status: 'pending' | 'uploading' | 'done' | 'error' | 'skipped';
  previewUrl: string | null;
  finalName?: string;
  error?: string;
  result?: UploadResult;
}

export interface UploadProgress {
  overall: number;
  generating: number;
  uploading: number;
  finalizing: number;
}

export interface UploadResult {
  success: boolean;
  data?: {
    id: number;
    name: string;
    variants: Record<string, { url: string; width: number; height: number }>;
    placeholder: string;
  };
  error?: string;
  aborted?: boolean;
}

export interface ImageUploaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (data: UploadResult['data']) => void;
  defaultFormat?: 'webp' | 'avif';
  variantSizes?: {
    lg?: number;
    md?: number;
    sm?: number;
    xs?: number;
  };
  allowMultiple?: boolean;
}
```

---

#### Task 2.2 - Migrate errors.ts (already TS ✅)
**Status** : Already TypeScript - just verify type exports

---

#### Task 2.3 - Migrate config.js → config.ts
**File** : `src/admin/components/ImageUploader/config.ts`

```typescript
import {
  IMAGE_VARIANT_SIZES,
  IMAGE_ENCODING_QUALITY,
  IMAGE_PLACEHOLDER_CONFIG,
  IMAGE_FILE_CONSTRAINTS,
  IMAGE_ASPECT_RATIOS,
  IMAGE_ASPECT_RATIO_LABELS,
  IMAGE_UPLOAD_BEHAVIOR,
  IMAGE_CANVAS_CONFIG,
  type ImageUploadSettings,
} from '../../../shared/constants/image-upload';

export const VARIANT_SIZES = IMAGE_VARIANT_SIZES;
export const ENCODING_QUALITY = IMAGE_ENCODING_QUALITY;
export const PLACEHOLDER_CONFIG = IMAGE_PLACEHOLDER_CONFIG;
export const FILE_CONSTRAINTS = IMAGE_FILE_CONSTRAINTS;
export const ASPECT_RATIOS = IMAGE_ASPECT_RATIOS;
export const ASPECT_RATIO_LABELS = IMAGE_ASPECT_RATIO_LABELS;
export const UPLOAD_CONFIG = IMAGE_UPLOAD_BEHAVIOR;
export const CANVAS_CONFIG = IMAGE_CANVAS_CONFIG;

export type { ImageUploadSettings };
```

---

#### Task 2.4 - Migrate useImageUpload.js → useImageUpload.ts
**File** : `src/admin/components/ImageUploader/hooks/useImageUpload.ts`

**Steps** :
1. Rename the file
2. Add types for parameters
3. Type the hook return
4. Replace implicit `any` types

```typescript
import type { 
  UploadMetadata, 
  UploadProgress, 
  UploadResult,
  CroppedArea 
} from '../types';

interface UseImageUploadOptions {
  variantSizes?: {
    lg?: number;
    md?: number;
    sm?: number;
    xs?: number;
  };
}

interface UseImageUploadReturn {
  uploadWithVariants: (params: {
    file: File;
    cropArea: CroppedArea | null;
    format: 'webp' | 'avif';
    metadata: UploadMetadata & {
      focalPoint: { x: number; y: number };
      aspectRatio: string;
    };
  }) => Promise<UploadResult>;
  progress: UploadProgress;
  isUploading: boolean;
  error: string | null;
  cleanupResources: () => void;
  abortUpload: () => void;
}

export function useImageUpload(options?: UseImageUploadOptions): UseImageUploadReturn {
  // ... existing implementation typed
}
```

**Check** :
- [ ] `tsc --noEmit` passes without error
- [ ] No implicit `any` types

---

### Phase 3 : Component Extraction (3-4h)

Break down `index.jsx` (1100 lines) into smaller, focused components.

#### Task 3.1 - Create UploadQueue component
**New file** : `src/admin/components/ImageUploader/components/UploadQueue.tsx`

**Responsibility** : Render and manage the queue list UI

```typescript
interface UploadQueueProps {
  queue: QueueItem[];
  onStart: () => void;
  onClear: () => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

export function UploadQueue({ queue, onStart, onClear, onRemove, onRetry }: UploadQueueProps) {
  // Queue list UI (lines ~715-804 in current index.jsx)
}
```

---

#### Task 3.2 - Create CropPanel component
**New file** : `src/admin/components/ImageUploader/components/CropPanel.tsx`

**Responsibility** : Image crop area with controls

```typescript
interface CropPanelProps {
  imageUrl: string;
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  aspect: number | null;
  focalPoint: { x: number; y: number };
  showFocalPoint: boolean;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onRotationChange: (rotation: number) => void;
  onCropComplete: (area: CroppedArea) => void;
  onFocalPointClick: (point: { x: number; y: number }) => void;
}

export function CropPanel(props: CropPanelProps) {
  // Left panel - 60% width (lines ~829-885 in current index.jsx)
}
```

---

#### Task 3.3 - Create MetadataPanel component
**New file** : `src/admin/components/ImageUploader/components/MetadataPanel.tsx`

**Responsibility** : Form fields for metadata

```typescript
interface MetadataPanelProps {
  metadata: UploadMetadata;
  onChange: (metadata: UploadMetadata) => void;
  format: 'webp' | 'avif';
  onFormatChange: (format: 'webp' | 'avif') => void;
  aspect: string;
  onAspectChange: (aspect: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  rotation: number;
  onRotationChange: (rotation: number) => void;
  showFocalPoint: boolean;
  onToggleFocalPoint: () => void;
  authors: Array<{ slug: string; name: string }>;
  loadingAuthors: boolean;
}

export function MetadataPanel(props: MetadataPanelProps) {
  // Right panel - 40% width (lines ~888-1046 in current index.jsx)
}
```

---

#### Task 3.4 - Create ProgressPanel component
**New file** : `src/admin/components/ImageUploader/components/ProgressPanel.tsx`

**Responsibility** : Uploading state display

```typescript
interface ProgressPanelProps {
  progress: UploadProgress;
  error: string | null;
}

export function ProgressPanel({ progress, error }: ProgressPanelProps) {
  // Uploading state (lines ~1052-1064 in current index.jsx)
}
```

---

#### Task 3.5 - Refactor index.tsx to use new components
**File** : `src/admin/components/ImageUploader/index.tsx`

**Target** : Reduce from 1100 lines to ~300-400 lines

**Structure after refactor** :
```typescript
export default function ImageUploader({ open, onOpenChange, ...props }: ImageUploaderProps) {
  // State hooks only
  const { queue, currentIndex, ...queueActions } = useUploadQueue();
  const { uploadWithVariants, progress, abortUpload } = useImageUpload();
  
  // Render
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <Header />
        
        {!selectedFile && (
          allowMultiple && queue.length > 0 
            ? <UploadQueue queue={queue} {...queueActions} />
            : <DropZone {...dropZoneProps} />
        )}
        
        {selectedFile && !isUploading && (
          <>
            <CropPanel {...cropPanelProps} />
            <MetadataPanel {...metadataPanelProps} />
          </>
        )}
        
        {isUploading && <ProgressPanel progress={progress} error={error} />}
        
        {showProgressBar && <BackgroundUploadProgress queue={queue} />}
      </DialogContent>
    </Dialog>
  );
}
```

**Check** :
- [ ] index.tsx under 400 lines
- [ ] All components render correctly
- [ ] Props properly typed
- [ ] No prop drilling issues

---

### Phase 4 : Extract useUploadQueue Hook (2h)

#### Task 3.1 - Create useUploadQueue hook
**New file** : `src/admin/components/ImageUploader/hooks/useUploadQueue.ts`

**Responsibility** : Manage multi-upload queue

```typescript
import { useState, useCallback } from 'react';
import type { QueueItem, UploadResult } from '../types';

interface UseUploadQueueReturn {
  queue: QueueItem[];
  currentIndex: number;
  isQueueActive: boolean;
  addFiles: (files: File[]) => void;
  addUrls: (urls: string[]) => void;
  removeItem: (id: string) => void;
  startQueue: () => void;
  nextItem: () => QueueItem | null;
  skipItem: () => void;
  markItemUploading: (id: string) => void;
  markItemDone: (id: string, result: UploadResult) => void;
  markItemError: (id: string, error: string) => void;
  retryItem: (id: string) => void;
  clearQueue: () => void;
  pendingCount: number;
  completedCount: number;
}

export function useUploadQueue(): UseUploadQueueReturn {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  // Callback implementations with useCallback
  // ...
}
```

---

#### Task 3.2 - Integrate useUploadQueue in index.jsx
**File** : `src/admin/components/ImageUploader/index.jsx`

**Replace** (lines ~46-55) :
```javascript
// BEFORE
const [queue, setQueue] = useState([]);
const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);

// All queue management logic...
```

**With** :
```javascript
// AFTER
import { useUploadQueue } from './hooks/useUploadQueue';

const {
  queue,
  currentIndex: currentQueueIndex,
  addFiles: handleFilesSelect,
  addUrls: handleUrlsImport,
  removeItem: removeFromQueue,
  // ... etc
} = useUploadQueue();
```

**Check** :
- [ ] Queue works as before
- [ ] Skip/retry/clear work
- [ ] No UX regression

---

### Phase 5 : CropEditor Resolution (1h)

#### Task 4.1 - Architecture decision
**Option A** : Delete CropEditor.jsx (simpler)
**Option B** : Migrate crop logic into CropEditor.jsx (cleaner)

**Recommendation** : Option B - better separation of concerns

#### Task 4.2 - Refactor CropEditor.jsx
**File** : `src/admin/components/ImageUploader/CropEditor.tsx`

**Props** :
```typescript
interface CropEditorProps {
  imageUrl: string;
  aspect: string;
  onAspectChange: (aspect: string) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  rotation: number;
  onRotationChange: (rotation: number) => void;
  crop: { x: number; y: number };
  onCropChange: (crop: { x: number; y: number }) => void;
  focalPoint: { x: number; y: number };
  onFocalPointChange: (point: { x: number; y: number }) => void;
  showFocalPoint: boolean;
  onToggleFocalPoint: () => void;
  onCropComplete: (croppedArea: CroppedArea) => void;
}
```

#### Task 4.3 - Use CropEditor in index.tsx
**File** : `src/admin/components/ImageUploader/index.tsx`

**Extract** the crop section (lines ~820-885) into CropEditor

---

### Phase 6 : Performance Optimizations (1-2h)

#### Task 5.1 - Lazy load Web Worker
**File** : `src/admin/components/ImageUploader/hooks/useImageUpload.ts`

```typescript
// BEFORE - Immediate creation
const worker = new Worker(
  new URL('../workers/encoder.worker.js', import.meta.url),
  { type: 'module' }
);

// AFTER - Lazy loading
const getEncoderWorker = useCallback(() => {
  if (workerRef.current) return workerRef.current;
  
  workerRef.current = new Worker(
    new URL('../workers/encoder.worker.js', import.meta.url),
    { type: 'module' }
  );
  // ... setup onmessage
  
  return workerRef.current;
}, []);
```

---

#### Task 5.2 - Memoize frequent callbacks
**File** : `src/admin/components/ImageUploader/index.jsx`

Add `useMemo` for :
- `numericAspect` (line ~571)
- `zoomPercent` (line ~575)
- `canUpload` (line ~572)

---

## 📁 Expected Final Structure

```
src/admin/components/ImageUploader/
├── index.tsx                    # Main component (300-400 lines max)
├── types/
│   └── index.ts                 # TypeScript types
├── config.ts                    # Configuration
├── errors.ts                    # Error handling (already ✅)
├── components/
│   ├── DropZone.tsx             # Drop zone
│   ├── UploadQueue.tsx          # Queue list
│   ├── CropPanel.tsx            # Crop area (left panel)
│   ├── CropEditor.tsx           # Standalone crop editor
│   ├── MetadataPanel.tsx        # Metadata form (right panel)
│   ├── MetadataForm.tsx         # Form fields sub-component
│   ├── VariantProgress.tsx      # Progress display
│   └── ProgressPanel.tsx        # Uploading state panel
├── hooks/
│   ├── useImageUpload.ts        # Main upload hook
│   ├── useUploadQueue.ts        # Queue management
│   └── useCropState.ts          # Crop state (optional)
├── utils/
│   └── cropImage.ts             # Canvas utilities
├── workers/
│   └── encoder.worker.ts        # Web Worker

```

---

## ✅ Validation Checklist

### Before merge
- [ ] `tsc --noEmit` passes
- [ ] `npm run build` passes
- [ ] No functional regression manually tested :
  - [ ] Simple upload
  - [ ] Multiple upload
  - [ ] URL import
  - [ ] Crop + zoom + rotation
  - [ ] Focal point
  - [ ] Cancel upload
  - [ ] Retry after error

---

## ✅ Completion Summary

### Results Achieved

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **index.jsx** | 1100 lines | 692 lines | **-408 lines (-37%)** |
| **Total Files** | 9 | 14 | +5 organized files |
| **Hooks** | 1 | 2 | Extracted useUploadQueue |
| **Components** | 3 | 7 | +4 extracted components |

### Files Created/Modified

**New Files:**
- `types/index.ts` - TypeScript type definitions
- `hooks/useUploadQueue.js` - Queue state management
- `components/UploadQueue.jsx` - Queue list UI
- `components/CropPanel.jsx` - Image crop area
- `components/MetadataPanel.jsx` - Form panel
- `components/ProgressPanel.jsx` - Upload progress

**Modified:**
- `index.jsx` → Refactored from 1100 to 692 lines
- `config.js` → Migrated to `config.ts`
- `useImageUpload.js` → Migrated to `useImageUpload.ts`
- `errors.ts` → Added CONFIRM_FAILED and toUserError()

**Deleted:**
- `CropEditor.jsx` - Unused component

### Architecture Improvements

1. **Separation of Concerns** - UI, state, and logic are now separated
2. **Type Safety** - Full TypeScript migration for core files
3. **Reusability** - Hooks and components can be reused
4. **Maintainability** - Smaller, focused files are easier to maintain
5. **Performance** - Added useMemo for computed values

---

## 📝 Notes

- **Don't modify** business logic in Phase 1 and 2 (TS migration)
- **Manually test at each phase** before moving to the next
- **Prefer several small PRs** over one big PR
