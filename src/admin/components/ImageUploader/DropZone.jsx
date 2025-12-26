/**
 * DropZone - Enhanced drag & drop with visual feedback and particle effects
 * 
 * Features:
 * - Particle effects on drop
 * - Better drag state feedback
 * - Animated file type badges
 * - URL import support
 */

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, Link, Image as ImageIcon, FileImage, Sparkles, X } from 'lucide-react';
import { Button } from '@/ui/button';
import { Input } from '@/ui/input';
import { Badge } from '@/ui/badge';
import { cn } from '@/lib/utils';

const SUPPORTED_FORMATS = [
  { ext: 'JPG', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  { ext: 'PNG', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  { ext: 'WebP', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  { ext: 'GIF', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
];

export default function DropZone({ onFileSelect, onUrlImport }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState('');
  const [urlError, setUrlError] = useState('');
  const [particles, setParticles] = useState([]);
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Create particle explosion effect
  const createParticles = useCallback((x, y) => {
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x,
      y,
      angle: (i * 45) * (Math.PI / 180),
      speed: 3 + Math.random() * 2,
      color: colors[i % colors.length],
      size: 4 + Math.random() * 4,
    }));
    
    setParticles(prev => [...prev, ...newParticles]);
    
    // Clean up particles after animation
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 1000);
  }, []);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) setIsDragging(false);
      return newCount;
    });
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setDragCounter(0);

    // Create particles at drop location
    if (dropZoneRef.current) {
      const rect = dropZoneRef.current.getBoundingClientRect();
      createParticles(e.clientX - rect.left, e.clientY - rect.top);
    }

    // Check for dropped URL
    const droppedUrl = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (droppedUrl && (droppedUrl.startsWith('http://') || droppedUrl.startsWith('https://'))) {
      if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(droppedUrl)) {
        onUrlImport(droppedUrl);
        return;
      }
    }

    // Check for dropped files
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect, onUrlImport, createParticles]);

  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [onFileSelect]);

  const handleUrlSubmit = useCallback(() => {
    if (!urlValue.trim()) return;

    try {
      new URL(urlValue);
      if (!/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(urlValue)) {
        setUrlError('URL must point to an image file');
        return;
      }
      setUrlError('');
      onUrlImport(urlValue);
      setUrlValue('');
      setShowUrlInput(false);
    } catch {
      setUrlError('Please enter a valid URL');
    }
  }, [urlValue, onUrlImport]);

  const handlePaste = useCallback((e) => {
    const pastedText = e.clipboardData.getData('text');
    if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://'))) {
      if (/\.(jpg|jpeg|png|gif|webp|avif)(\?|$)/i.test(pastedText)) {
        e.preventDefault();
        onUrlImport(pastedText);
      }
    }
  }, [onUrlImport]);

  return (
    <div className="space-y-4" onPaste={handlePaste}>
      {/* Particle Effects Container */}
      <div className="relative">
        {/* Particles */}
        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full pointer-events-none z-20"
              style={{
                backgroundColor: particle.color,
                width: particle.size,
                height: particle.size,
              }}
              initial={{ 
                x: particle.x, 
                y: particle.y,
                scale: 1,
                opacity: 1 
              }}
              animate={{ 
                x: particle.x + Math.cos(particle.angle) * 80,
                y: particle.y + Math.sin(particle.angle) * 80,
                scale: 0,
                opacity: 0 
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          ))}
        </AnimatePresence>

        {/* Main Drop Zone */}
        <motion.div
          ref={dropZoneRef}
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 overflow-hidden',
            isDragging
              ? 'border-primary bg-primary/5 scale-[1.02] shadow-xl shadow-primary/10'
              : 'border-border/50 hover:border-primary/40 hover:bg-accent/30 hover:shadow-lg'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {/* Animated background gradient */}
          <motion.div
            className="absolute inset-0 opacity-0 pointer-events-none"
            animate={{
              opacity: isDragging ? 0.5 : 0,
              background: isDragging
                ? 'radial-gradient(circle at center, hsl(var(--primary) / 0.1) 0%, transparent 70%)'
                : 'none',
            }}
            transition={{ duration: 0.3 }}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />

          <div className="relative flex flex-col items-center gap-5">
            {/* Animated Upload Icon */}
            <motion.div
              className={cn(
                'p-5 rounded-2xl transition-all duration-300',
                isDragging 
                  ? 'bg-primary/10 ring-4 ring-primary/20' 
                  : 'bg-muted/50'
              )}
              animate={isDragging ? { 
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              } : {}}
              transition={{ duration: 0.5 }}
            >
              {isDragging ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <FileImage className="h-12 w-12 text-primary" />
                </motion.div>
              ) : (
                <Upload className="h-12 w-12 text-muted-foreground" />
              )}
            </motion.div>

            {/* Text Content */}
            <div className="space-y-2">
              <motion.p 
                className="text-xl font-semibold"
                animate={{ 
                  color: isDragging ? 'hsl(var(--primary))' : 'currentColor' 
                }}
              >
                {isDragging ? 'Release to upload' : 'Drop your image here'}
              </motion.p>
              <p className="text-sm text-muted-foreground">
                or click to browse your files
              </p>
            </div>

            {/* File Type Badges */}
            <motion.div 
              className="flex flex-wrap justify-center gap-2"
              animate={{ y: isDragging ? -5 : 0 }}
            >
              {SUPPORTED_FORMATS.map((format, index) => (
                <motion.div
                  key={format.ext}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Badge 
                    variant="outline" 
                    className={cn(
                      'text-xs font-medium transition-all',
                      format.color,
                      isDragging && 'scale-110'
                    )}
                  >
                    {format.ext}
                  </Badge>
                </motion.div>
              ))}
            </motion.div>

            {/* Size Limit */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              <span>Max 50MB • Auto-optimized for web</span>
            </div>
          </div>

          {/* Drag Overlay Animation */}
          <AnimatePresence>
            {isDragging && (
              <motion.div
                className="absolute inset-0 border-2 border-primary rounded-2xl pointer-events-none"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Divider with URL option */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30" />
        </div>
        <Button
          variant={showUrlInput ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="relative z-10 gap-2 rounded-full px-4 shadow-sm"
        >
          {showUrlInput ? (
            <>
              <X className="h-3 w-3" />
              Cancel
            </>
          ) : (
            <>
              <Link className="h-3 w-3" />
              Import from URL
            </>
          )}
        </Button>
      </div>

      {/* URL Input */}
      <AnimatePresence mode="wait">
        {showUrlInput && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={urlValue}
                    onChange={(e) => {
                      setUrlValue(e.target.value);
                      setUrlError('');
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                    className={cn(
                      'pl-9',
                      urlError && 'border-destructive focus-visible:ring-destructive'
                    )}
                  />
                </div>
                <Button 
                  onClick={handleUrlSubmit}
                  disabled={!urlValue.trim()}
                  className="gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Import
                </Button>
              </div>
              
              <AnimatePresence>
                {urlError && (
                  <motion.p 
                    className="text-sm text-destructive"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {urlError}
                  </motion.p>
                )}
              </AnimatePresence>

              <p className="text-xs text-muted-foreground">
                Paste a direct link to an image (JPG, PNG, WebP, GIF, AVIF)
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
