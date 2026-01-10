// @ts-nocheck
import React, { useMemo } from 'react';
import { Text } from 'react-konva';

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
    // Handle font weight/style string construction
    const fontStyle = useMemo(() => {
        const italic = element.fontStyle === 'italic' ? 'italic' : '';
        const weight = element.fontWeight || 'normal';
        const weightStr = weight === 'normal' ? '' : weight;
        return [italic, weightStr].filter(Boolean).join(' ') || 'normal';
    }, [element.fontStyle, element.fontWeight]);


    // 2. Auto-Fit Logic (Memoized to prevent expensive recalculation on every render)
    const fontSize = useMemo(() => {
        const hasVariables = element.content?.includes('{{');
        const shouldAutoFit = element.autoFit !== false && (hasVariables || element.autoFit === true);

        if (!shouldAutoFit || !displayText) {
            return baseFontSize;
        }

        // Binary search for optimal font size
        let minSize = 10;
        let maxSize = baseFontSize;

        // We need a temporary Konva node to measure. 
        // Note: Creating nodes is strictly synchronous and can be expensive.
        // Doing this inside useMemo ensures it only runs when content/dimensions change.

        while (maxSize - minSize > 1) {
            const testSize = Math.floor((minSize + maxSize) / 2);
            const testText = new window.Konva.Text({
                text: displayText,
                width: width,
                fontSize: testSize,
                fontFamily: element.fontFamily || 'Inter, sans-serif',
                fontStyle: fontStyle,
                lineHeight: lineHeight,
                wrap: 'word',
            });

            const textHeight = testText.height();
            testText.destroy(); // Important cleanup

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
        lineHeight
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
                props.fillEnabled = false;
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
                props.fillEnabled = false;
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

    // 4. Transform Handler
    const handleTransformEnd = (e) => {
        if (isLocked) return;

        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale but keep visual size changes
        node.scaleX(1);
        node.scaleY(1);

        const currentFS = element.fontSize || 32;
        const scale = Math.max(scaleX, scaleY);
        const newFontSize = Math.round(currentFS * scale);
        const newWidth = Math.round(node.width() * scaleX);

        if (onElementChange) {
            onElementChange(element.id, {
                x: node.x(),
                y: node.y(),
                width: newWidth,
                fontSize: newFontSize,
                rotation: node.rotation()
            });
        }
    };

    return (
        <Text
            key={element.id}
            {...commonProps}
            x={element.x}
            y={element.y}
            text={displayText}
            width={width}
            height={height}
            fontSize={fontSize}
            fontFamily={element.fontFamily || 'Inter, sans-serif'}
            fontStyle={fontStyle}
            fill={effectProps.fillEnabled === false ? 'transparent' : (element.color || '#ffffff')}
            align={element.textAlign || 'center'}
            verticalAlign="middle"
            letterSpacing={element.letterSpacing || 0}
            lineHeight={lineHeight}
            textDecoration={element.textDecoration || ''}
            {...effectProps}
            wrap="word"
            ellipsis={false}
            rotation={element.rotation || 0}
            onDblClick={isLocked ? undefined : (e) => onTextDoubleClick?.(element, e)}
            onDblTap={isLocked ? undefined : (e) => onTextDoubleClick?.(element, e)}
            onTransformEnd={handleTransformEnd}
        />
    );
};

export default React.memo(TextElement);
