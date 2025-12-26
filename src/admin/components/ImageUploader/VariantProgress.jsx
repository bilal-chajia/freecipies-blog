/**
 * VariantProgress - Compact upload progress UI
 * 
 * Compact design showing all elements in a minimal layout
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Loader2, AlertCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/ui/progress';

// Variant configurations for display
const VARIANTS = [
  { key: 'original', label: 'Original' },
  { key: 'lg', label: 'Large' },
  { key: 'md', label: 'Medium' },
  { key: 'sm', label: 'Small' },
  { key: 'xs', label: 'Thumb' },
];

export default function VariantProgress({ progress, error }) {
  const overall = progress.overall || 0;
  const generating = progress.generating || 0;
  const uploading = progress.uploading || 0;
  const finalizing = progress.finalizing || 0;

  // Calculate variant statuses
  const getVariantStatus = (index) => {
    const threshold = ((index + 1) / VARIANTS.length) * 100;
    if (uploading >= threshold) return 'done';
    if (generating >= threshold || uploading > 0) return 'active';
    return 'pending';
  };

  // Current step label
  const getCurrentStep = () => {
    if (finalizing > 0 && finalizing < 100) return 'Saving to database...';
    if (uploading > 0 && uploading < 100) return 'Uploading to CDN...';
    if (generating > 0) return 'Generating variants...';
    return 'Starting...';
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Header: Title + Percentage */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Processing Image</h3>
          <p className="text-xs text-muted-foreground">{getCurrentStep()}</p>
        </div>
        <span className="text-2xl font-bold tabular-nums">{Math.round(overall)}%</span>
      </div>

      {/* Main Progress Bar */}
      <Progress value={overall} className="h-2" />

      {/* Variant Pills - Compact Row */}
      <div className="flex items-center gap-1.5">
        {VARIANTS.map((variant, index) => {
          const status = getVariantStatus(index);
          return (
            <motion.div
              key={variant.key}
              className={cn(
                "flex-1 h-7 rounded-md flex items-center justify-center gap-1 text-xs font-medium transition-colors",
                status === 'done' && "bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/30",
                status === 'active' && "bg-primary/10 text-primary border border-primary/30",
                status === 'pending' && "bg-muted text-muted-foreground border border-transparent"
              )}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              {status === 'done' && <Check className="h-3 w-3" />}
              {status === 'active' && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className="truncate">{variant.label}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Steps Row - Horizontal */}
      <div className="flex items-center justify-between text-xs pt-2 border-t">
        <StepIndicator 
          label="Generate" 
          status={generating === 100 ? 'done' : generating > 0 ? 'active' : 'pending'} 
        />
        <div className="flex-1 h-px bg-border mx-2" />
        <StepIndicator 
          label="Upload" 
          status={uploading === 100 ? 'done' : uploading > 0 ? 'active' : 'pending'} 
        />
        <div className="flex-1 h-px bg-border mx-2" />
        <StepIndicator 
          label="Save" 
          status={finalizing === 100 ? 'done' : finalizing > 0 ? 'active' : 'pending'} 
        />
      </div>

      {/* Speed indicator - smaller */}
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
        <Zap className="h-2.5 w-2.5" />
        <span>Parallel upload • 3x faster</span>
      </div>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
            <span className="text-destructive">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact step indicator
function StepIndicator({ label, status }) {
  return (
    <div className="flex items-center gap-1">
      {status === 'done' && (
        <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
          <Check className="h-2.5 w-2.5 text-white" />
        </div>
      )}
      {status === 'active' && (
        <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
          <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
        </div>
      )}
      {status === 'pending' && (
        <div className="w-4 h-4 rounded-full bg-muted border-2 border-muted-foreground/30" />
      )}
      <span className={cn(
        "font-medium",
        status === 'done' && "text-green-600 dark:text-green-400",
        status === 'active' && "text-primary",
        status === 'pending' && "text-muted-foreground"
      )}>
        {label}
      </span>
    </div>
  );
}
