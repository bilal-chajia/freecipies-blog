// @ts-nocheck
import React from 'react';
import { Transformer } from 'react-konva';

const TransformerLayer = ({
    transformerRef,
    onTransformStart,
    onTransform,
    onTransformEnd,
    shouldFitCanvas,
    enabled = true,
    keepRatio = false
}) => {
    // Refs to track drag state without triggering re-renders
    const isCornerRef = React.useRef(false);
    const startRatioRef = React.useRef(1);

    if (!enabled) return null;

    return (
        <Transformer
            ref={transformerRef}
            onTransformStart={(e) => {
                const anchor = e.target.getActiveAnchor();
                const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
                isCornerRef.current = corners.includes(anchor);

                // Store aspect ratio at start of drag
                const node = e.target.nodes()[0];
                if (node) {
                    startRatioRef.current = node.width() / node.height();
                }

                if (onTransformStart) onTransformStart(e);
            }}
            onTransform={onTransform}
            onTransformEnd={(e) => {
                isCornerRef.current = false;
                if (onTransformEnd) onTransformEnd(e);
            }}
            boundBoxFunc={(oldBox, newBox) => {
                if (keepRatio && isCornerRef.current) {
                    // Manual Aspect Ratio Locking
                    // We prioritize Width changes and adjust Height to match ratio
                    // This creates a standard "Corner Scale" feel
                    // TODO: Could be smarter (detect dominant axis), but W-priority is usually fine for text width.
                    // Actually, for better feel, we can just use the aspect ratio.
                    const ratio = startRatioRef.current;
                    const newH = newBox.width / ratio;
                    newBox.height = newH;
                }

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
            keepRatio={false} // Always false, handled by boundBoxFunc
            ignoreStroke={true}
            padding={5}
        />
    );
};

export default TransformerLayer;
