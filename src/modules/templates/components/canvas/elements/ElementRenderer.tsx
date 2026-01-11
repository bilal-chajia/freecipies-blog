// @ts-nocheck
import React, { memo } from 'react';
import { Group, Rect, Image as KonvaImage, Text } from 'react-konva';
import TextElement from './TextElement';

const ElementRenderer = memo(({
    element,
    isSelected,
    isLocked,
    editable,
    // Data
    loadedImage,
    logoImage,
    articleData,
    // Utils
    replaceVariables,
    // handlers
    onSelect,
    onDragStart,
    onDragMove,
    onDragEnd,
    onTransformStart,
    onTransformEnd,
    onElementChange,
    onImageOffsetChange,
    onTextDoubleClick,
    // Config
    allowImageDrag = false,
    selectedId,
    canvasWidth,
    canvasHeight
}) => {
    const commonProps = {
        id: element.id,
        draggable: editable && !isLocked,
        onClick: isLocked ? undefined : (e) => onSelect(element.id, e),
        onTap: isLocked ? undefined : (e) => onSelect(element.id, e),
        onDragStart: isLocked ? undefined : onDragStart,
        onDragMove: isLocked ? undefined : onDragMove,
        onDragEnd: isLocked ? undefined : (e) => onDragEnd(element.id, e),
        onTransformStart: isLocked ? undefined : onTransformStart,
        onTransformEnd: isLocked ? undefined : (e) => onTransformEnd(element.id, e),
    };

    const renderImageSlot = () => {
        const image = loadedImage;

        let imageScale = 1;
        let baseOffsetX = 0;
        let baseOffsetY = 0;
        let scaledWidth = element.width;
        let scaledHeight = element.height;

        if (image) {
            const imgWidth = image.naturalWidth || image.width;
            const imgHeight = image.naturalHeight || image.height;
            const slotRatio = element.width / element.height;
            const imgRatio = imgWidth / imgHeight;

            if (imgRatio > slotRatio) {
                imageScale = element.height / imgHeight;
                scaledWidth = imgWidth * imageScale;
                scaledHeight = element.height;
                baseOffsetX = (element.width - scaledWidth) / 2;
            } else {
                imageScale = element.width / imgWidth;
                scaledWidth = element.width;
                scaledHeight = imgHeight * imageScale;
                baseOffsetY = (element.height - scaledHeight) / 2;
            }
        }

        const zoomScale = articleData?.imageScales?.[element.id] || 1;
        const finalWidth = scaledWidth * zoomScale;
        const finalHeight = scaledHeight * zoomScale;
        const zoomOffsetX = (finalWidth - scaledWidth) / 2;
        const zoomOffsetY = (finalHeight - scaledHeight) / 2;
        const adjustedBaseOffsetX = baseOffsetX - zoomOffsetX;
        const adjustedBaseOffsetY = baseOffsetY - zoomOffsetY;

        const customOffset = articleData?.imageOffsets?.[element.id] || { x: 0, y: 0 };
        const imageOffsetX = adjustedBaseOffsetX + customOffset.x;
        const imageOffsetY = adjustedBaseOffsetY + customOffset.y;

        const groupDraggable = allowImageDrag ? false : commonProps.draggable;

        const groupHandlers = allowImageDrag
            ? { onClick: commonProps.onClick, onTap: commonProps.onTap }
            : {
                onDragStart: commonProps.onDragStart,
                onDragMove: commonProps.onDragMove,
                onDragEnd: commonProps.onDragEnd,
                onTransformStart: commonProps.onTransformStart,
                onTransformEnd: commonProps.onTransformEnd,
                onClick: commonProps.onClick,
                onTap: commonProps.onTap,
            };

        return (
            <Group
                key={element.id}
                id={element.id}
                x={element.x}
                y={element.y}
                width={element.width}
                height={element.height}
                rotation={element.rotation}
                draggable={groupDraggable}
                {...groupHandlers}
                clipFunc={(ctx) => {
                    const radius = element.borderRadius || 0;
                    const w = element.width;
                    const h = element.height;

                    if (radius > 0) {
                        ctx.beginPath();
                        if (typeof ctx.roundRect === 'function') {
                            ctx.roundRect(0, 0, w, h, radius);
                        } else {
                            ctx.moveTo(radius, 0);
                            ctx.lineTo(w - radius, 0);
                            ctx.quadraticCurveTo(w, 0, w, radius);
                            ctx.lineTo(w, h - radius);
                            ctx.quadraticCurveTo(w, h, w - radius, h);
                            ctx.lineTo(radius, h);
                            ctx.quadraticCurveTo(0, h, 0, h - radius);
                            ctx.lineTo(0, radius);
                            ctx.quadraticCurveTo(0, 0, radius, 0);
                        }
                        ctx.closePath();
                    } else {
                        ctx.rect(0, 0, w, h);
                    }
                }}
            >
                {image ? (
                    <KonvaImage
                        image={image}
                        x={imageOffsetX}
                        y={imageOffsetY}
                        width={finalWidth}
                        height={finalHeight}
                        draggable={allowImageDrag}
                        dragBoundFunc={function (pos) {
                            const node = this;
                            const transform = node.getParent().getAbsoluteTransform().copy();
                            transform.invert();
                            const localPos = transform.point(pos);

                            const minX = element.width - finalWidth;
                            const maxX = 0;
                            const minY = element.height - finalHeight;
                            const maxY = 0;

                            const x = Math.max(minX, Math.min(localPos.x, maxX));
                            const y = Math.max(minY, Math.min(localPos.y, maxY));

                            return node.getParent().getAbsoluteTransform().point({ x, y });
                        }}
                        onDragStart={(e) => {
                            if (allowImageDrag) e.cancelBubble = true;
                        }}
                        onDragMove={(e) => {
                            if (allowImageDrag) e.cancelBubble = true;
                        }}
                        onDragEnd={(e) => {
                            if (!allowImageDrag) return;
                            e.cancelBubble = true;
                            if (!onImageOffsetChange) return;

                            const newX = e.target.x() - adjustedBaseOffsetX;
                            const newY = e.target.y() - adjustedBaseOffsetY;
                            onImageOffsetChange(element.id, { x: newX, y: newY });
                        }}
                    />
                ) : (
                    <>
                        <Rect
                            width={element.width}
                            height={element.height}
                            fill="#2a2a3e"
                            cornerRadius={element.borderRadius || 0}
                            stroke={isSelected ? '#8b5cf6' : '#4a4a5e'}
                            strokeWidth={1}
                        />
                        <Text
                            text="IMG"
                            width={element.width}
                            height={element.height}
                            fontSize={48}
                            fill="#8b8ba7"
                            align="center"
                            verticalAlign="middle"
                        />
                        <Text
                            text={element.name || 'Drop Image'}
                            y={element.height / 2 + 30}
                            width={element.width}
                            fontSize={16}
                            fill="#8b8ba7"
                            align="center"
                        />
                    </>
                )}
            </Group>
        );
    };

    const renderText = () => (
        <TextElement
            element={element}
            commonProps={commonProps}
            replaceVariables={replaceVariables}
            onTextDoubleClick={onTextDoubleClick}
            onElementChange={onElementChange}
            isLocked={isLocked}
        />
    );

    const renderShape = () => (
        <Rect
            key={element.id}
            {...commonProps}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            fill={element.fill || '#6366f1'}
            opacity={element.opacity || 1}
            cornerRadius={element.borderRadius || 0}
            rotation={element.rotation || 0}
        />
    );

    const renderLogo = () => (
        <Group
            key={element.id}
            {...commonProps}
            x={element.x}
            y={element.y}
            opacity={element.opacity || 1}
        >
            {logoImage ? (
                <KonvaImage
                    image={logoImage}
                    width={element.width}
                    height={element.height}
                />
            ) : (
                <Rect
                    width={element.width || 120}
                    height={element.height || 40}
                    fill="#2a2a3e"
                    stroke="#4a4a5e"
                    strokeWidth={1}
                    cornerRadius={4}
                />
            )}
        </Group>
    );

    const renderOverlay = () => (
        <Rect
            key={element.id}
            {...commonProps}
            x={element.x || 0}
            y={element.y || 0}
            width={element.width || canvasWidth}
            height={element.height || canvasHeight}
            fill={element.fill || 'rgba(0,0,0,0.3)'}
            opacity={element.opacity || 1}
        />
    );

    switch (element.type) {
        case 'imageSlot':
            return renderImageSlot();
        case 'text':
            return renderText();
        case 'shape':
            return renderShape();
        case 'logo':
            return renderLogo();
        case 'overlay':
            return renderOverlay();
        default:
            return null;
    }
});

ElementRenderer.displayName = 'ElementRenderer';
export default ElementRenderer;

