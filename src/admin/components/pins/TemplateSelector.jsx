import React from 'react';
import { Check } from 'lucide-react';

/**
 * TemplateSelector - Gallery to select a pin template
 */
const TemplateSelector = ({ templates = [], selectedId, onSelect, isLoading = false }) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="aspect-[2/3] rounded-lg bg-muted animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (templates.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <p>No templates available.</p>
                <p className="text-sm">Create a template first in the Template Editor.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {templates.map((template) => {
                const isSelected = selectedId === template.id;

                return (
                    <button
                        key={template.id}
                        type="button"
                        onClick={() => onSelect(template)}
                        className={`
                            relative aspect-[2/3] rounded-lg overflow-hidden border-2 transition-all
                            hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary
                            ${isSelected
                                ? 'border-primary ring-2 ring-primary shadow-lg'
                                : 'border-muted hover:border-muted-foreground/50'
                            }
                        `}
                    >
                        {/* Thumbnail or placeholder */}
                        {template.thumbnail_url ? (
                            <img
                                src={template.thumbnail_url}
                                alt={template.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center"
                                style={{ backgroundColor: template.background_color || '#1a1a2e' }}
                            >
                                <span className="text-white/60 text-xs font-medium">
                                    {template.name}
                                </span>
                            </div>
                        )}

                        {/* Selection indicator */}
                        {isSelected && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                                    <Check className="w-5 h-5 text-primary-foreground" />
                                </div>
                            </div>
                        )}

                        {/* Template name overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <p className="text-white text-xs font-medium truncate">
                                {template.name}
                            </p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default TemplateSelector;
