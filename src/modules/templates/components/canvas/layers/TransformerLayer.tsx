// @ts-nocheck
import React from 'react';
import { Transformer } from 'react-konva';

const TransformerLayer = ({
    transformerRef,
    onTransformStart,
    onTransform,
    onTransformEnd,
    shouldFitCanvas,
    enabled = true
}) => {
    if (!enabled) return null;

    return (
        <Transformer
            ref={transformerRef}
            onTransformStart={onTransformStart}
            onTransform={onTransform}
            onTransformEnd={onTransformEnd}
            boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 20 || newBox.height < 20) {
                    return oldBox;
                }
                return newBox;
            }}
            // Canva style: white filled circular anchors with purple stroke
            anchorFill="#ffffff"
            anchorStroke="#8b5cf6"
            anchorStrokeWidth={1}
            anchorSize={10}
            anchorCornerRadius={5}
            // Selection border - purple like Canva
            borderStroke="#8b5cf6"
            borderStrokeWidth={1}
            borderDash={[]}
            // Disable default top rotation handle (we'll make a custom one)
            rotateEnabled={false}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
            // All anchors for full control
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
            keepRatio={false}
            ignoreStroke={true}
            padding={5}
        />
    );
};

export default TransformerLayer;
