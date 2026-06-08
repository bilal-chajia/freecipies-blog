import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { Stage, Layer, Rect, Group, Transformer, Line, Circle, Path } from 'react-konva';
import { AnimatePresence } from 'motion/react';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useEditorStore, type EditorElement, type TextElement } from '@admin/features/templates/store';
import type { ExportFormat } from '@admin/features/templates/hooks';
import { useUIStore } from '@admin/features/templates/store/useUIStore';
import { GRID_SIZE } from './utils/canvasConstants';
import {
  useImageLoader,
  useCanvasExport,
  useKonvaStage,
  useElementTransform,
} from '@admin/features/templates/hooks';
import useSmartGuides from '@admin/features/templates/hooks/useSmartGuides';
import useKeyboardShortcuts from '@admin/features/templates/hooks/useKeyboardShortcuts';
import useCustomFontLoader from '@admin/features/templates/hooks/useCustomFontLoader';
import FloatingToolbar from './FloatingToolbar';
import ElementRenderer from './elements/ElementRenderer';

// Default canvas dimensions (Pinterest 2:3 ratio)
const DEFAULT_CANVAS_WIDTH = 1000;
const DEFAULT_CANVAS_HEIGHT = 1500;

interface TemplateCanvasProps {
  template?: {
    width?: number;
    height?: number;
    canvas_width?: number;
    canvas_height?: number;
    background_color?: string;
  } | null;
  articleData?: Record<string, any> | null;
  onExport?: ((exportFn: (format?: ExportFormat, quality?: number) => Promise<Blob | null>) => void) | null;
  editable?: boolean;
  scale?: number;
  onElementSelect?: ((element: EditorElement | null) => void) | null;
  onTemplateChange?: ((elements: EditorElement[]) => void) | null;
  showGrid?: boolean;
  zoom?: number;
  allowImageDrag?: boolean;
  onImageOffsetChange?: ((id: string, offset: { x: number; y: number }) => void) | null;
}

/**
 * TemplateCanvas - Professional Konva-based canvas for graphic/pin templates.
 * Extremely clean, modular, and optimized layout.
 */
const TemplateCanvas: React.FC<TemplateCanvasProps> = ({
  template = null,
  articleData = null,
  onExport = null,
  editable = true,
  scale = 0.4,
  onElementSelect = null,
  onTemplateChange = null,
  showGrid = false,
  zoom = 100,
  allowImageDrag = false,
  onImageOffsetChange = null,
}) => {
  // === REFS ===
  const stageRef = useRef<any>(null);
  const transformerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const guidesLayerRef = useRef<any>(null);

  // === DYNAMIC CANVAS DIMENSIONS ===
  const canvasWidth = template?.width || template?.canvas_width || DEFAULT_CANVAS_WIDTH;
  const canvasHeight = template?.height || template?.canvas_height || DEFAULT_CANVAS_HEIGHT;

  // === STORE SELECTORS (atomic) ===
  const elements = useEditorStore((state) => state.elements);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectElement = useEditorStore((state) => state.selectElement);
  const updateElement = useEditorStore((state) => state.updateElement);

  const selectedId = selectedIds.size > 0 ? [...selectedIds][0] : null;

  // === UI STATE ===
  const [isRotating, setIsRotating] = useState(false);
  const [hoveredRotationHandle, setHoveredRotationHandle] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // === THEME ===
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  // === ELEMENT CHANGE HANDLER ===
  const handleElementChange = useCallback(
    (id: string, newProps: Partial<EditorElement>) => {
      updateElement(id, newProps);
      if (onTemplateChange) {
        const state = useEditorStore.getState();
        const updated = state.elements.map((el) =>
          el.id === id ? ({ ...el, ...newProps } as EditorElement) : el
        );
        onTemplateChange(updated);
      }
    },
    [updateElement, onTemplateChange]
  );

  // === CUSTOM HOOKS INTEGRATION ===
  
  // 1. Stage Zoom & Positioning Hook
  const {
    actualScale,
    stageWidth,
    stageHeight,
    canvasOffsetX,
    canvasOffsetY,
  } = useKonvaStage({
    containerRef,
    scale,
    zoom,
    canvasWidth,
    canvasHeight,
  });

  // 2. Element Transformation & Text Editing Hook
  const {
    isTransforming,
    setIsTransforming,
    handleTransformStart,
    handleTransformEnd,
    handleTextTransformStart,
    handleTextTransform,
  } = useElementTransform({
    stageRef,
    transformerRef,
    elements,
    selectedIds,
    editable,
    handleElementChange,
  });

  // 3. Image Loading Hook
  const { loadedImages } = useImageLoader({ elements, articleData });

  // 4. Smart Guides Hook
  const { handleDragMove, handleDragEnd, handleTransformMove, clearGuides } = useSmartGuides({
    showGrid,
    canvasWidth,
    canvasHeight,
    onElementChange: handleElementChange,
    guidesLayerRef,
  });

  // 5. Canvas Export Hook
  const { exportToImage } = useCanvasExport({
    stageRef,
    transformerRef,
    canvasWidth,
    canvasHeight,
    actualScale,
    selectedId,
    clearGuides,
  });

  // Expose export function to parent
  useEffect(() => {
    if (onExport) {
      onExport(exportToImage);
    }
  }, [exportToImage, onExport]);

  // 6. Keyboard Shortcuts
  useKeyboardShortcuts({ editable, editingTextId });

  // 7. Custom Google Fonts Loader
  useCustomFontLoader();

  // === EVENT HANDLERS ===

  // Handle element selection (with Shift support for multi-select)
  const handleSelect = useCallback(
    (id: string, e?: any) => {
      if (e) e.cancelBubble = true;

      const state = useEditorStore.getState();
      const element = state.elements.find((el) => el.id === id);
      if (element?.locked) return;

      const shiftPressed = e?.evt?.shiftKey || e?.shiftKey || (window.event instanceof MouseEvent && window.event.shiftKey) || false;

      if (shiftPressed) {
        state.toggleSelection(id);
      } else {
        state.selectElement(id);
        onElementSelect?.(element || null);
      }
    },
    [onElementSelect]
  );

  // Start editing text on double-click
  const handleTextDoubleClick = useCallback(
    (element: TextElement, e?: KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!editable) return;
      if (element?.locked) return;
      if (e) e.cancelBubble = true;

      setEditingTextId(element.id);
      setEditingTextValue(element.content || '');
      selectElement(element.id);
    },
    [editable, selectElement]
  );

  // Save text edit and exit edit mode
  const handleTextEditSave = () => {
    if (editingTextId && editingTextValue !== null) {
      updateElement(editingTextId, { content: editingTextValue });
      handleElementChange(editingTextId, { content: editingTextValue });
    }
    setEditingTextId(null);
    setEditingTextValue('');
  };

  // Cancel text edit
  const handleTextEditCancel = () => {
    setEditingTextId(null);
    setEditingTextValue('');
  };

  // Focus textarea when editing starts
  useEffect(() => {
    if (editingTextId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingTextId]);

  // Wrapper for handleDragMove/End to track drag state
  const handleDragStart = useCallback((_e: KonvaEventObject<DragEvent>) => {
    setIsDragging(true);
    clearGuides();
  }, [clearGuides]);

  const wrappedHandleDragMove = useCallback((e: KonvaEventObject<DragEvent>) => {
    handleDragMove(e);
  }, [handleDragMove]);

  const wrappedHandleDragEnd = useCallback((id: string, e: KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    handleDragEnd(id, e);
  }, [handleDragEnd]);

  // Replace variable placeholders (legacy {{...}} support)
  const replaceVariables = useCallback((text: string) => {
    if (!text || !articleData) return text;
    return text
      .replace(/\{\{title\}\}/g, articleData.label || articleData.title || '')
      .replace(/\{\{category\}\}/g, articleData.categoryLabel || '')
      .replace(/\{\{author\}\}/g, articleData.authorName || '')
      .replace(/\{\{prepTime\}\}/g, articleData.prepTime || '')
      .replace(/\{\{cookTime\}\}/g, articleData.cookTime || '');
  }, [articleData]);

  // Render grid lines (memoized to avoid recreating Konva nodes each render)
  const gridLines = useMemo(() => {
    if (!showGrid) return null;

    const gridSize = canvasWidth / 20;
    const lines: React.ReactNode[] = [];

    // Vertical lines
    for (let i = 0; i <= 20; i++) {
      lines.push(
        <Line
          key={`v${i}`}
          points={[i * gridSize, 0, i * gridSize, canvasHeight]}
          stroke="rgba(38, 0, 255, 0.97)"
          strokeWidth={1}
          dash={[1, 8]}
          listening={false}
        />
      );
    }
    // Horizontal lines
    const numHorizontal = Math.ceil(canvasHeight / gridSize);
    for (let i = 0; i <= numHorizontal; i++) {
      lines.push(
        <Line
          key={`h${i}`}
          points={[0, i * gridSize, canvasWidth, i * gridSize]}
          stroke="rgba(38, 0, 255, 0.97)"
          strokeWidth={1}
          dash={[1, 8]}
          listening={false}
        />
      );
    }
    return lines;
  }, [showGrid, canvasWidth, canvasHeight]);

  return (
    <div
      ref={containerRef}
      className="pin-canvas-wrapper"
      style={{
        width: '100%',
        height: '100%',
        overflow: 'auto',
        position: 'relative',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        backgroundColor: isDark ? '#1a1a2e' : '#edeff2',
        transition: 'background-color 0.3s ease',
      }}
    >
      <style>{`
        .pin-canvas-wrapper::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        scaleX={actualScale}
        scaleY={actualScale}
        onClick={(e) => {
          // Deselect when clicking empty stage area
          if (e.target === e.target.getStage()) {
            selectElement(null);
            onElementSelect?.(null);
          }
        }}
      >
        {/* Layer 1: Canvas Background */}
        <Layer x={canvasOffsetX} y={canvasOffsetY} listening={false}>
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill={template?.background_color || (isDark ? '#1a1a2e' : '#ffffff')}
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={20}
            shadowOffset={{ x: 0, y: 4 }}
          />
        </Layer>

        {/* Layer 2: Graphic Elements */}
        <Layer x={canvasOffsetX} y={canvasOffsetY}>
          <Group clipFunc={(ctx) => ctx.rect(0, 0, canvasWidth, canvasHeight)}>
            {elements.map((element) => (
              <ElementRenderer
                key={element.id}
                element={element}
                isSelected={selectedIds.has(element.id)}
                isLocked={element.locked}
                editable={editable}
                loadedImage={
                  loadedImages.get(element.id) ??
                  (articleData?.image ? loadedImages.get('article_main') : undefined) ??
                  null
                }
                logoImage={loadedImages.get(`logo_${element.id}`) ?? null}
                articleData={articleData}
                replaceVariables={replaceVariables}
                onSelect={handleSelect}
                onDragStart={handleDragStart}
                onDragMove={wrappedHandleDragMove}
                onDragEnd={wrappedHandleDragEnd}
                onTransformStart={handleTransformStart}
                onTransformEnd={handleTransformEnd}
                onElementChange={handleElementChange}
                onImageOffsetChange={onImageOffsetChange ?? undefined}
                onTextDoubleClick={handleTextDoubleClick}
                allowImageDrag={allowImageDrag}
                selectedId={selectedId}
                canvasWidth={canvasWidth}
                canvasHeight={canvasHeight}
              />
            ))}
            {gridLines}
          </Group>
        </Layer>

        {/* Layer 3: Transformer Border Controls */}
        <Layer x={canvasOffsetX} y={canvasOffsetY}>
          {editable && (
            <Transformer
              ref={transformerRef}
              onTransformStart={handleTransformStart}
              onTransform={handleTransformMove}
              onTransformEnd={() => {
                setIsTransforming(false);
                clearGuides();
              }}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) {
                  return oldBox;
                }
                return newBox;
              }}
              anchorFill="#ffffff"
              anchorStroke="#8b5cf6"
              anchorStrokeWidth={1}
              anchorSize={10}
              anchorCornerRadius={5}
              borderStroke="#8b5cf6"
              borderStrokeWidth={1}
              borderDash={[]}
              rotateEnabled={false}
              rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
              enabledAnchors={[
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
                'middle-left',
                'middle-right',
                'top-center',
                'bottom-center',
              ]}
              keepRatio={false}
              ignoreStroke={true}
              padding={5}
            />
          )}
        </Layer>

        {/* Layer 4: Smart Alignment Guides */}
        <Layer ref={guidesLayerRef} x={canvasOffsetX} y={canvasOffsetY} listening={false} />

        {/* Layer 5: Rotation Handle */}
        <Layer x={canvasOffsetX} y={canvasOffsetY}>
          {editable &&
            selectedIds.size === 1 &&
            !editingTextId &&
            !isDragging &&
            !isTransforming &&
            (() => {
              const selectedElement = elements.find((el) => el.id === [...selectedIds][0]);
              if (!selectedElement || selectedElement.locked) return null;

              const rotation = selectedElement.rotation || 0;
              const screenTopY = (selectedElement.y + canvasOffsetY) * actualScale;
              const toolbarHeight = 36;
              const toolbarGap = 40;
              const isToolbarTop = screenTopY > toolbarHeight + toolbarGap + 10;

              // scaleX/scaleY live on the Konva node, not on the store element — default to 1
              const handleY = isToolbarTop
                ? (selectedElement.height || 100) * 1 +
                  30 / actualScale
                : -30 / actualScale;

              return (
                <Group
                  x={selectedElement.x}
                  y={selectedElement.y}
                  rotation={rotation}
                  id="rotation-layer-group"
                >
                  <Group
                    draggable
                    x={(selectedElement.width || 100) / 2}
                    y={handleY}
                    scaleX={1 / actualScale}
                    scaleY={1 / actualScale}
                    opacity={isRotating ? 0 : 1}
                    onMouseEnter={() => setHoveredRotationHandle(true)}
                    onMouseLeave={() => setHoveredRotationHandle(false)}
                    onDragStart={(e) => {
                      e.cancelBubble = true;
                      setIsRotating(true);
                    }}
                    onDragEnd={(e) => {
                      e.cancelBubble = true;
                      setIsRotating(false);
                    }}
                    onDragMove={(e) => {
                      e.cancelBubble = true;
                      const stage = e.target.getStage();
                      if (!stage) return;
                      const pointer = stage.getPointerPosition();
                      if (!pointer) return;

                      const pointerX = pointer.x / actualScale - canvasOffsetX;
                      const pointerY = pointer.y / actualScale - canvasOffsetY;

                      // scaleX/scaleY are Konva node properties, not stored — default to 1
                      const w = selectedElement.width || 100;
                      const h = selectedElement.height || 100;

                      const currRotRad = ((selectedElement.rotation || 0) * Math.PI) / 180;
                      const cx =
                        selectedElement.x +
                        (w / 2) * Math.cos(currRotRad) -
                        (h / 2) * Math.sin(currRotRad);
                      const cy =
                        selectedElement.y +
                        (w / 2) * Math.sin(currRotRad) +
                        (h / 2) * Math.cos(currRotRad);

                      const vecX = pointerX - cx;
                      const vecY = pointerY - cy;

                      let newRotation = (Math.atan2(vecY, vecX) * 180) / Math.PI;
                      const angleOffset = isToolbarTop ? 90 : -90;
                      newRotation -= angleOffset;

                      if (e.evt.shiftKey) {
                        newRotation = Math.round(newRotation / 45) * 45;
                      }

                      const newRotRad = (newRotation * Math.PI) / 180;
                      const newX =
                        cx - ((w / 2) * Math.cos(newRotRad) - (h / 2) * Math.sin(newRotRad));
                      const newY =
                        cy - ((w / 2) * Math.sin(newRotRad) + (h / 2) * Math.cos(newRotRad));

                      handleElementChange(selectedElement.id, {
                        rotation: newRotation,
                        x: newX,
                        y: newY,
                      });

                      e.target.position({
                        x: w / 2,
                        y: handleY,
                      });
                    }}
                  >
                    <Circle
                      radius={14}
                      fill={hoveredRotationHandle ? '#8b5cf6' : 'white'}
                      stroke="#8b5cf6"
                      strokeWidth={1}
                      shadowColor="black"
                      shadowBlur={5}
                      shadowOpacity={0.1}
                    />
                    <Path
                      data="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8 M21 3v5h-5"
                      stroke={hoveredRotationHandle ? 'white' : '#8b5cf6'}
                      strokeWidth={2.5}
                      scaleX={0.6}
                      scaleY={0.6}
                      x={-7.2}
                      y={-7.2}
                    />
                  </Group>
                </Group>
              );
            })()}
        </Layer>
      </Stage>

      {/* Floating Action Toolbar */}
      <AnimatePresence>
        {editable &&
          selectedIds.size === 1 &&
          !editingTextId &&
          !isDragging &&
          !isTransforming &&
          !isRotating &&
          (() => {
            const selectedElement = elements.find((el) => el.id === [...selectedIds][0]);
            if (!selectedElement) return null;
            return (
              <FloatingToolbar
                key="floating-toolbar"
                selectedElement={selectedElement}
                canvasScale={actualScale}
                canvasOffset={{ x: canvasOffsetX, y: canvasOffsetY }}
                containerRef={containerRef}
                stageRef={stageRef}
                onElementChange={handleElementChange}
              />
            );
          })()}
      </AnimatePresence>

      {/* Text Double-Click Inline Editor */}
      {editingTextId &&
        (() => {
          const editingElement = elements.find((el) => el.id === editingTextId);
          if (!editingElement) return null;

          return (
            <textarea
              ref={textareaRef}
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onBlur={handleTextEditSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  handleTextEditCancel();
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleTextEditSave();
                }
              }}
              style={{
                position: 'absolute',
                left: editingElement.x * actualScale + canvasOffsetX * actualScale,
                top: editingElement.y * actualScale + canvasOffsetY * actualScale,
                width: (editingElement.width || 300) * actualScale,
                minHeight: 40,
                maxHeight: 'none',
                height: 'auto',
                padding: '8px',
                fontSize: ((editingElement as TextElement).fontSize || 32) * actualScale,
                fontFamily: (editingElement as TextElement).fontFamily || 'Inter, sans-serif',
                fontWeight: (editingElement as TextElement).fontWeight || 'normal',
                fontStyle: (editingElement as TextElement).fontStyle || 'normal',
                textAlign: (editingElement as TextElement).textAlign || 'center',
                color: (editingElement as TextElement).color || '#ffffff',
                background: 'rgba(20, 20, 40, 0.95)',
                border: '2px solid #6366f1',
                borderRadius: '4px',
                outline: 'none',
                resize: 'vertical',
                zIndex: 1000,
                lineHeight: (editingElement as TextElement).lineHeight || 1.4,
                letterSpacing: (editingElement as TextElement).letterSpacing || 0,
                overflow: 'visible',
                boxSizing: 'border-box',
              }}
            />
          );
        })()}
    </div>
  );
};

// Export both the component and utility constants
export { TemplateCanvas, DEFAULT_CANVAS_WIDTH, DEFAULT_CANVAS_HEIGHT, GRID_SIZE };
export default TemplateCanvas;
