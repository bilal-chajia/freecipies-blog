// @ts-nocheck
import React, { useEffect, useMemo, useRef } from 'react';
import { Group, Rect, Text } from 'react-konva';

const TextElement = ({
    element,
    commonProps,
    replaceVariables,
    onTextDoubleClick,
    onElementChange,
    isLocked
}) => {
    // 1. Prepare Content
    const displayText = useMemo(() => {
        let text = replaceVariables(element.content);
        if (element.textTransform === 'uppercase') text = text?.toUpperCase();
        else if (element.textTransform === 'lowercase') text = text?.toLowerCase();
        else if (element.textTransform === 'capitalize') text = text?.replace(/\b\w/g, l => l.toUpperCase());
        return text || 'Text';
    }, [element.content, element.textTransform, replaceVariables]);

    const width = element.width || 300;
    const height = element.height || 100;
    const baseFontSize = element.fontSize || 32;
    const lineHeight = element.lineHeight || 1.2;
    const verticalAlign = element.verticalAlign || 'middle';
    const wrap = element.wrap || 'word';
    const ellipsis = element.ellipsis || false;

    const background = element.background || null;
    const backgroundPadding = background?.padding ?? 0;
    const backgroundOpacity = background?.opacity ?? 1;
    const backgroundColor = background?.color || 'rgba(0,0,0,0.5)';
    const backgroundRadius = background?.borderRadius ?? 0;
    // Handle font weight/style string construction
    const fontStyle = useMemo(() => {
        const italic = element.fontStyle === 'italic' ? 'italic' : '';
        const weight = element.fontWeight || 'normal';
        const weightStr = weight === 'normal' ? '' : weight;
        return [italic, weightStr].filter(Boolean).join(' ') || 'normal';
    }, [element.fontStyle, element.fontWeight]);

    const measureNodeRef = useRef(null);
    useEffect(() => {
        return () => {
            try {
                measureNodeRef.current?.destroy?.();
            } catch {
                // ignore
            }
            measureNodeRef.current = null;
        };
    }, []);

    // 2. Auto-Fit Logic (Memoized to prevent expensive recalculation on every render)
    const fontSize = useMemo(() => {
        const hasVariables = element.content?.includes('{{');
        const shouldAutoFit = element.autoFit !== false && (hasVariables || element.autoFit === true);

        if (!shouldAutoFit || !displayText) {
            return baseFontSize;
        }

        if (typeof window === 'undefined' || !window.Konva) {
            return baseFontSize;
        }

        // Binary search for optimal font size
        let minSize = 10;
        let maxSize = baseFontSize;

        if (!measureNodeRef.current) {
            measureNodeRef.current = new window.Konva.Text();
        }
        const measureNode = measureNodeRef.current;
        measureNode.setAttrs({
            width,
            fontFamily: element.fontFamily || 'Inter, sans-serif',
            fontStyle,
            lineHeight,
            wrap,
            text: displayText,
        });

        while (maxSize - minSize > 1) {
            const testSize = Math.floor((minSize + maxSize) / 2);
            measureNode.fontSize(testSize);

            // force update of metrics
            const textHeight = measureNode.height();

            if (textHeight <= height) {
                minSize = testSize;
            } else {
                maxSize = testSize;
            }
        }

        return minSize;
    }, [
        displayText,
        width,
        height,
        baseFontSize,
        element.content, // for variable check
        element.autoFit,
        element.fontFamily,
        fontStyle,
        lineHeight,
        wrap,
    ]);


    // 3. Effects Logic (Memoized)
    const effectProps = useMemo(() => {
        const effect = element.effect || { type: 'none' };
        if (effect.type === 'none') return {};

        const props = {};

        switch (effect.type) {
            case 'shadow': {
                const offsetVal = effect.offset || 50;
                const dir = (effect.direction || 45) * Math.PI / 180;
                props.shadowColor = effect.color || 'rgba(0,0,0,0.5)';
                props.shadowBlur = (effect.blur || 50) / 10;
                props.shadowOffsetX = offsetVal * 0.1 * Math.cos(dir);
                props.shadowOffsetY = offsetVal * 0.1 * Math.sin(dir);
                props.shadowOpacity = 1 - ((effect.transparency || 40) / 100);
                break;
            }
            case 'lift':
                props.shadowColor = 'rgba(0,0,0,0.4)';
                props.shadowBlur = (effect.blur || 50) / 5;
                props.shadowOffsetX = 0;
                props.shadowOffsetY = 15;
                props.shadowOpacity = 0.5;
                break;
            case 'hollow':
                props.stroke = element.color || '#000000';
                props.strokeWidth = (effect.thickness || 50) / 25;
                props.fill = 'transparent'; // Use transparent fill instead of fillEnabled: false for hit detection
                break;
            case 'outline':
                props.stroke = effect.color || '#000000';
                props.strokeWidth = (effect.thickness || 50) / 15;
                break;
            case 'echo': {
                const offsetVal = (effect.offset || 50) / 10;
                props.shadowColor = effect.color || '#000000';
                props.shadowBlur = 0;
                props.shadowOffsetX = -offsetVal;
                props.shadowOffsetY = 0;
                props.shadowOpacity = 0.5;
                break;
            }
            case 'glitch': {
                const offsetVal = (effect.offset || 50) / 20;
                props.shadowColor = '#ff00ff';
                props.shadowBlur = 0;
                props.shadowOffsetX = offsetVal;
                props.shadowOffsetY = -offsetVal;
                props.shadowOpacity = 0.7;
                break;
            }
            case 'neon':
                props.shadowColor = effect.color || '#ff00ff';
                props.shadowBlur = (effect.blur || 50) / 2;
                props.shadowOffsetX = 0;
                props.shadowOffsetY = 0;
                props.shadowOpacity = 1;
                break;
            case 'splice': {
                const offsetVal = (effect.offset || 50) / 10;
                props.stroke = element.color || '#000000';
                props.strokeWidth = (effect.thickness || 50) / 25;
                props.fill = 'transparent'; // Use transparent fill for hit detection
                props.shadowColor = effect.color || '#cccccc';
                props.shadowBlur = 0;
                props.shadowOffsetX = offsetVal;
                props.shadowOffsetY = offsetVal;
                props.shadowOpacity = 1;
                break;
            }
        }
        return props;
    }, [element.effect, element.color]);

    // 4. Transform Handler (Canva-like)
    // - Side resize: reflow (width) without changing font size
    // - Corner resize: scale font size (using scaleY) + resize box
    const handleTransformEnd = (e) => {
        if (isLocked) return;

        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale but keep visual size changes
        node.scaleX(1);
        node.scaleY(1);

        // Check if Auto-Fit should solve this
        // If Auto-Fit is enabled, we ONLY update dimensions (W/H), and let the useMemo resolve fontSize.
        // If Auto-Fit is disabled, we manually update fontSize based on vertical scale pattern.

        const hasVariables = element.content?.includes('{{');
        const shouldAutoFit = element.autoFit !== false && (hasVariables || element.autoFit === true);

        const newWidth = Math.max(50, Math.round(width * scaleX));
        const newHeight = Math.max(20, Math.round(height * scaleY));

        const updates = {
            x: node.x(),
            y: node.y(),
            width: newWidth,
            height: newHeight, // Important to save height for auto-fit constraints
            rotation: node.rotation()
        };

        if (!shouldAutoFit) {
            // Manual scaling behavior:
            // - Corner resize (Scale X & Y): Update Font Size
            // - Side resize (Scale X only): Update Width only (Reflow)
            // Use scaleY as the driver for font size change
            const currentFS = element.fontSize || 32;
            const newFontSize = Math.round(currentFS * scaleY);
            updates.fontSize = newFontSize;
        }

        if (onElementChange) {
            onElementChange(element.id, updates);
        }
    };

    return (
        <Group
            key={element.id}
            {...commonProps}
            x={element.x}
            y={element.y}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            onTransformEnd={handleTransformEnd}
        >
            {background && (
                <Rect
                    x={-backgroundPadding}
                    y={-backgroundPadding}
                    width={width + backgroundPadding * 2}
                    height={height + backgroundPadding * 2}
                    fill={backgroundColor}
                    opacity={backgroundOpacity}
                    cornerRadius={backgroundRadius}
                    listening={false}
                />
            )}
            <Text
                x={0}
                y={0}
                text={displayText}
                width={width}
                height={height}
                fontSize={fontSize}
                fontFamily={element.fontFamily || 'Inter, sans-serif'}
                fontStyle={fontStyle}
                fill={element.color || '#ffffff'} // Default fill, overridden by effectProps if transparent
                align={element.textAlign || 'center'}
                verticalAlign={verticalAlign}
                letterSpacing={element.letterSpacing || 0}
                lineHeight={lineHeight}
                textDecoration={element.textDecoration || ''}
                {...effectProps}
                wrap={wrap}
                ellipsis={ellipsis}
                onDblClick={isLocked ? undefined : (e) => onTextDoubleClick?.(element, e)}
                onDblTap={isLocked ? undefined : (e) => onTextDoubleClick?.(element, e)}
            />
        </Group>
    );
};

export default React.memo(TextElement);
