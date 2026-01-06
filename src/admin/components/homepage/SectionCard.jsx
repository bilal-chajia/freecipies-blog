/**
 * SectionCard - Gutenberg-style collapsible section for Homepage
 * 
 * Matches the flat design of Settings pages while keeping
 * enable/disable toggle functionality
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Switch } from '@/ui/switch.jsx';
import { Badge } from '@/ui/badge.jsx';
import { ChevronDown } from 'lucide-react';

const SectionCard = ({
    title,
    description,
    icon: Icon,
    enabled = true,
    onEnabledChange,
    children,
    className,
    defaultExpanded = true,
}) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

    return (
        <div className={cn(
            'structure-section-card border border-[var(--wp-inserter-border)] rounded-md bg-[var(--wp-canvas-bg)] overflow-hidden',
            className
        )}>
            {/* Header */}
            <div
                className="structure-section-header flex items-center justify-between px-4 py-3 bg-[var(--wp-inserter-bg)] border-b border-[var(--wp-inserter-border)] cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" />
                        </div>
                    )}
                    <div>
                        <h3 className="text-sm font-semibold">{title}</h3>
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {onEnabledChange && (
                        <div
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Switch
                                checked={enabled}
                                onCheckedChange={onEnabledChange}
                                className="data-[state=checked]:bg-primary"
                            />
                            <Badge
                                variant={enabled ? "default" : "secondary"}
                                className="h-5 px-2 text-[9px] uppercase font-medium"
                            >
                                {enabled ? "On" : "Off"}
                            </Badge>
                        </div>
                    )}
                    <ChevronDown
                        className={cn(
                            'w-4 h-4 text-muted-foreground transition-transform duration-200',
                            isExpanded && 'rotate-180'
                        )}
                    />
                </div>
            </div>

            {/* Content */}
            <AnimatePresence>
                {isExpanded && enabled && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="p-4 space-y-4">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SectionCard;
