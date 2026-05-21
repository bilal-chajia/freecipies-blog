/**
 * ProgressPanel - Uploading state display
 */

import { motion } from 'motion/react';
import VariantProgress from '../VariantProgress';

interface ProgressPanelProps {
  progress: number;
  error?: string;
}

export default function ProgressPanel({ progress, error }: ProgressPanelProps) {
  return (
    <motion.div
      key="uploading"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="p-8 h-full flex items-center justify-center"
    >
      <div className="w-full max-w-lg">
        <VariantProgress progress={progress} error={error} />
      </div>
    </motion.div>
  );
}
