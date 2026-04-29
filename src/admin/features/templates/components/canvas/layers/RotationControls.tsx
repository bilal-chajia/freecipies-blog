// @ts-nocheck
import React, { useState } from 'react';
import { Group, Circle, Path } from 'react-konva';

const RotationControls = ({
    selectedElement,
    actualScale,
    canvasOffset, // {x, y}
    isRotating,
    setIsRotating,
    onElementChange
}) => {
    const [hoveredRotationHandle, setHoveredRotationHandle] = useState(false);

    if (!selectedElement || selectedElement.locked) return null;

    const rotation = selectedElement.rotation || 0;

    // Calculate position for logic (toolbar avoidance)
    const screenTopY = (selectedElement.y + canvasOffset.y) * actualScale;
    const toolbarHeight = 36;
    const toolbarGap = 40;
    const isToolbarTop = screenTopY > (toolbarHeight + toolbarGap + 10);

    // Ideally: Toolbar Top -> Handle Bottom. Toolbar Bottom -> Handle Top.
    const handleY = isToolbarTop
        ? (selectedElement.height || 100) * (selectedElement.scaleY || 1) + (30 / actualScale) // Bottom
        : -(30 / actualScale); // Top

    return (
        <Group
            x={selectedElement.x}
            y={selectedElement.y}
            rotation={rotation}
            id="rotation-layer-group"
        >
            <Group
                draggable
                x={((selectedElement.width || 100) * (selectedElement.scaleX || 1)) / 2}
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
                    const pointer = stage.getPointerPosition();
                    if (!pointer) return;

                    // Calculate angle in "canvas" space
                    const pointerX = pointer.x / actualScale - canvasOffset.x;
                    const pointerY = pointer.y / actualScale - canvasOffset.y;

                    const w = (selectedElement.width || 100) * (selectedElement.scaleX || 1);
                    const h = (selectedElement.height || 100) * (selectedElement.scaleY || 1);
                    // Center of element
                    // P_center = P_topleft + Rot(w/2, h/2)
                    const currRotRad = (selectedElement.rotation || 0) * Math.PI / 180;
                    const cx = selectedElement.x + (w / 2) * Math.cos(currRotRad) - (h / 2) * Math.sin(currRotRad);
                    const cy = selectedElement.y + (w / 2) * Math.sin(currRotRad) + (h / 2) * Math.cos(currRotRad);

                    // Vector from center to pointer
                    const vecX = pointerX - cx;
                    const vecY = pointerY - cy;

                    // Angle of vector
                    let newRotation = Math.atan2(vecY, vecX) * 180 / Math.PI;

                    const angleOffset = isToolbarTop ? 90 : -90;
                    newRotation -= angleOffset;

                    // Snap
                    if (e.evt.shiftKey) {
                        newRotation = Math.round(newRotation / 45) * 45;
                    }

                    // Calculate new top-left to keep center fixed
                    const newRotRad = newRotation * Math.PI / 180;
                    const newX = cx - ((w / 2) * Math.cos(newRotRad) - (h / 2) * Math.sin(newRotRad));
                    const newY = cy - ((w / 2) * Math.sin(newRotRad) + (h / 2) * Math.cos(newRotRad));

                    onElementChange(selectedElement.id, {
                        rotation: newRotation,
                        x: newX,
                        y: newY
                    });

                    // Keep handle visual in place (relative to group rot)
                    e.target.position({
                        x: w / 2,
                        y: handleY
                    });
                }}
            >
                <Circle
                    radius={14}
                    fill={hoveredRotationHandle ? "#8b5cf6" : "white"}
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    shadowColor="black"
                    shadowBlur={5}
                    shadowOpacity={0.1}
                />
                <Path
                    data="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8 M21 3v5h-5"
                    stroke={hoveredRotationHandle ? "white" : "#8b5cf6"}
                    strokeWidth={2.5}
                    scaleX={0.6}
                    scaleY={0.6}
                    x={-7.2}
                    y={-7.2}
                />
            </Group>
        </Group>
    );
};

export default RotationControls;
