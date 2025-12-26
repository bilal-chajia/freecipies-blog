// @ts-nocheck
import React, { useState, useRef } from 'react';
import { GripVertical, Eye, EyeOff, Lock, Unlock, Type, Image, Square, Layers } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';

/**
 * DraggableLayersList - Drag-and-drop reorderable layers panel
 * Uses native HTML5 drag and drop for smooth reordering
 */
const DraggableLayersList = ({
    elements,
    selectedElement,
    onSelect,
    onReorder,
    onToggleVisibility,
    onToggleLock
}) => {
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

    const [draggedId, setDraggedId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);
    const [dragPosition, setDragPosition] = useState(null); // 'above' or 'below'

    // Handle drag start
    const handleDragStart = (e, id) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        // Add drag image styling
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '0.5';
        }
    };

    // Handle drag end
    const handleDragEnd = (e) => {
        if (e.target instanceof HTMLElement) {
            e.target.style.opacity = '1';
        }
        setDraggedId(null);
        setDragOverId(null);
        setDragPosition(null);
    };

    // Handle drag over
    const handleDragOver = (e, id, element) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';

        if (id === draggedId) return;

        setDragOverId(id);

        // Determine if dragging above or below the element
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        setDragPosition(e.clientY < midY ? 'above' : 'below');
    };

    // Handle drag leave
    const handleDragLeave = (e) => {
        // Only clear if leaving the current target
        if (e.currentTarget.contains(e.relatedTarget)) return;
        setDragOverId(null);
        setDragPosition(null);
    };

    // Handle drop
    const handleDrop = (e, targetId) => {
        e.preventDefault();

        if (!draggedId || draggedId === targetId) {
            setDraggedId(null);
            setDragOverId(null);
            setDragPosition(null);
            return;
        }

        // Reorder elements
        // Note: elements are displayed in reverse, so we need to account for that
        const reversedElements = [...elements].reverse();
        const draggedIndex = reversedElements.findIndex(el => el.id === draggedId);
        const targetIndex = reversedElements.findIndex(el => el.id === targetId);

        if (draggedIndex === -1 || targetIndex === -1) return;

        // Remove dragged element
        const newReversed = [...reversedElements];
        const [draggedElement] = newReversed.splice(draggedIndex, 1);

        // Calculate insert position
        let insertIndex = targetIndex;
        if (draggedIndex < targetIndex) {
            insertIndex = dragPosition === 'above' ? targetIndex - 1 : targetIndex;
        } else {
            insertIndex = dragPosition === 'above' ? targetIndex : targetIndex + 1;
        }

        // Insert at new position
        newReversed.splice(insertIndex, 0, draggedElement);

        // Reverse back to original order and call reorder
        onReorder([...newReversed].reverse());

        setDraggedId(null);
        setDragOverId(null);
        setDragPosition(null);
    };

    // Get element icon
    const getElementIcon = (type) => {
        switch (type) {
            case 'text': return Type;
            case 'imageSlot': return Image;
            case 'shape': return Square;
            case 'overlay': return Layers;
            default: return Square;
        }
    };

    if (elements.length === 0) {
        return (
            <div className="text-center text-muted-foreground py-8">
                <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No elements yet</p>
                <p className="text-xs mt-1">Add elements from the Add tab</p>
            </div>
        );
    }

    // Display in reverse order (top layers first)
    const displayElements = [...elements].reverse();

    return (
        <div className="layers-list p-2 space-y-0.5">
            {displayElements.map((el) => {
                const Icon = getElementIcon(el.type);
                const isSelected = selectedElement?.id === el.id;
                const isDragging = draggedId === el.id;
                const isDropTarget = dragOverId === el.id && draggedId !== el.id;

                return (
                    <div
                        key={el.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, el.id)}
                        onDragEnd={handleDragEnd}
                        onDragOver={(e) => handleDragOver(e, el.id, el)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, el.id)}
                        onClick={() => onSelect(el)}
                        className={`
              layer-item flex items-center gap-2 p-2 rounded cursor-grab active:cursor-grabbing
              transition-all duration-150 select-none
              ${isSelected ?
                                (isDark ? 'bg-primary/20 border border-primary/50' : 'bg-primary/10 border border-primary') :
                                (isDark ? 'hover:bg-zinc-800 border border-transparent' : 'hover:bg-zinc-100 border border-transparent')
                            }
              ${isDragging ? 'opacity-50 scale-95' : ''}
              ${isDropTarget && dragPosition === 'above' ? 'border-t-2 border-t-primary mt-1' : ''}
              ${isDropTarget && dragPosition === 'below' ? 'border-b-2 border-b-primary mb-1' : ''}
            `}
                    >
                        {/* Drag Handle */}
                        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0 hover:text-foreground" />

                        {/* Element Icon */}
                        <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${isSelected
                            ? 'bg-primary/20'
                            : (isDark ? 'bg-zinc-800' : 'bg-zinc-200')
                            }`}>
                            <Icon className={`w-3.5 h-3.5 ${isSelected
                                ? 'text-primary'
                                : (isDark ? 'text-zinc-400' : 'text-zinc-500')
                                }`} />
                        </div>

                        {/* Name */}
                        <span className={`text-sm flex-1 truncate ${isSelected ? 'font-medium' : ''} ${isDark ? 'text-zinc-200' : 'text-zinc-700'}`}>
                            {el.name || el.type}
                        </span>

                        {/* Type badge */}
                        <span className={`text-[10px] capitalize px-1.5 py-0.5 rounded ${isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-600'
                            }`}>
                            {el.type}
                        </span>

                        {/* Lock toggle */}
                        {onToggleLock && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleLock(el.id);
                                }}
                                className={`p-1 rounded-full hover:bg-muted transition-colors ${el.locked ? 'text-amber-500' : 'text-muted-foreground hover:text-foreground'}`}
                                title={el.locked ? 'Unlock element' : 'Lock element'}
                            >
                                {el.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                            </button>
                        )}
                    </div>
                );
            })}

            {/* Helper text */}
            <p className="text-[10px] text-muted-foreground text-center pt-2">
                Drag to reorder layers
            </p>
        </div>
    );
};

export default DraggableLayersList;

