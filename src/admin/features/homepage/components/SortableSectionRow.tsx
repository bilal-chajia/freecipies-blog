import type { CSSProperties } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'motion/react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SortableSectionRowProps {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  enabled: boolean;
  draggable: boolean;
  onClick: () => void;
}

export default function SortableSectionRow({
  id,
  label,
  icon: Icon,
  isActive,
  enabled,
  draggable,
  onClick,
}: SortableSectionRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !draggable,
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'structure-item group relative overflow-hidden transition-colors',
        isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
        isDragging && 'opacity-80 shadow-md',
      )}
    >
      {isActive && (
        <motion.div
          layoutId="homepage-active-tab"
          className="absolute inset-0 bg-[var(--primary-muted)] rounded-md z-0"
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className="relative z-10 flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <Icon
          className={cn(
            'structure-item-icon transition-all duration-200 group-hover:scale-110 shrink-0',
            isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
          )}
        />
        <span
          className={cn(
            'structure-item-label transition-transform duration-200 group-hover:translate-x-0.5',
            isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            'ml-auto w-1.5 h-1.5 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-110',
            enabled ? 'bg-green-500' : 'bg-muted-foreground/30',
          )}
        />
      </button>
      {draggable && (
        <button
          type="button"
          aria-label={`Reorder ${label}`}
          className="relative z-10 ml-1 grid h-6 w-5 shrink-0 cursor-grab place-items-center text-muted-foreground hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
