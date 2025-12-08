export const createImage = (url) =>
    new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', () => resolve(image))
        image.addEventListener('error', (error) => reject(error))
        image.setAttribute('crossOrigin', 'anonymous')
        image.src = url
    })

export function getRadianAngle(degreeValue) {
    return (degreeValue * Math.PI) / 180
}

/**
 * Returns the new bounding area of a rotated rectangle.
 */
export function rotateSize(width, height, rotation) {
    const rotRad = getRadianAngle(rotation)

    return {
        width:
            Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
        height:
            Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
    }
}

/**
 * This function was adapted from the one in the Readme of https://github.com/DominicTobias/react-image-crop
 * Enhanced with filter support, watermarking (single and tiled), vignette, text overlay, and WebP output.
 */
export default async function getCroppedImg(
    imageSrc,
    pixelCrop,
    rotation = 0,
    flip = { horizontal: false, vertical: false },
    filter = '',
    watermark = null, // { type: 'text' | 'image', content: string, imageObj: Image, opacity: number, position: string, scale: number, repeat: 'single' | 'tiled', pattern: 'grid' | 'diagonal' | 'horizontal' | 'vertical', density: 1-5 }
    vignette = null, // { enabled: boolean, intensity: number }
    textOverlay = null, // { enabled: boolean, text: string, font: string, size: number, color: string, position: string, shadow: boolean }
    quality = 0.92 // WebP quality 0-1 (default 92%)
) {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        return null
    }

    const rotRad = getRadianAngle(rotation)

    // calculate bounding box of the rotated image
    const { width: bBoxWidth, height: bBoxHeight } = rotateSize(
        image.width,
        image.height,
        rotation
    )

    // set canvas size to match the bounding box
    canvas.width = bBoxWidth
    canvas.height = bBoxHeight

    // Apply filters if any
    if (filter) {
        ctx.filter = filter;
    }

    // translate canvas context to a central location to allow rotating and flipping around the center
    ctx.translate(bBoxWidth / 2, bBoxHeight / 2)
    ctx.rotate(rotRad)
    ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1)
    ctx.translate(-image.width / 2, -image.height / 2)

    // draw rotated image
    ctx.drawImage(image, 0, 0)

    // croppedAreaPixels values are bounding box relative
    // extract the cropped image using these values
    const data = ctx.getImageData(
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height
    )

    // set canvas width to final desired crop size - this will clear existing context
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // paste generated rotate image at the top left corner
    ctx.putImageData(data, 0, 0)

    // --- Vignette Effect ---
    if (vignette && vignette.enabled) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.max(canvas.width, canvas.height) * 0.7;

        const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.3, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(0, 0, 0, ${vignette.intensity || 0.5})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // --- Text Overlay ---
    if (textOverlay && textOverlay.enabled && textOverlay.text) {
        ctx.globalAlpha = 1;
        const fontSize = textOverlay.size || 48;
        ctx.font = `bold ${fontSize}px ${textOverlay.font || 'sans-serif'}`;
        ctx.fillStyle = textOverlay.color || '#ffffff';

        // Text shadow
        if (textOverlay.shadow) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = fontSize * 0.1;
            ctx.shadowOffsetX = fontSize * 0.05;
            ctx.shadowOffsetY = fontSize * 0.05;
        }

        const metrics = ctx.measureText(textOverlay.text);
        const textWidth = metrics.width;
        const textHeight = fontSize;
        const padding = canvas.width * 0.05;

        let tx = 0, ty = 0;
        switch (textOverlay.position) {
            case 'TL': tx = padding; ty = padding + textHeight; break;
            case 'top': tx = (canvas.width - textWidth) / 2; ty = padding + textHeight; break;
            case 'TR': tx = canvas.width - textWidth - padding; ty = padding + textHeight; break;
            case 'left': tx = padding; ty = (canvas.height + textHeight) / 2; break;
            case 'center': tx = (canvas.width - textWidth) / 2; ty = (canvas.height + textHeight) / 2; break;
            case 'right': tx = canvas.width - textWidth - padding; ty = (canvas.height + textHeight) / 2; break;
            case 'BL': tx = padding; ty = canvas.height - padding; break;
            case 'bottom': tx = (canvas.width - textWidth) / 2; ty = canvas.height - padding; break;
            case 'BR': tx = canvas.width - textWidth - padding; ty = canvas.height - padding; break;
            default: tx = (canvas.width - textWidth) / 2; ty = canvas.height - padding;
        }

        ctx.fillText(textOverlay.text, tx, ty);

        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    // --- Watermark Logic ---
    if (watermark) {
        ctx.globalAlpha = watermark.opacity || 0.5;

        const padding = canvas.width * 0.05; // 5% padding
        const scale = watermark.scale || 0.2;

        if (watermark.type === 'text') {
            const text = watermark.content || 'Freecipies';
            const fontSize = canvas.width * scale * 0.5; // Scale based on watermark scale
            ctx.font = `bold ${fontSize}px sans-serif`;

            // Brand Gradient for Text
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
            gradient.addColorStop(0, '#ff6b35');
            gradient.addColorStop(1, '#f7931e');
            ctx.fillStyle = gradient;

            const metrics = ctx.measureText(text);
            const textWidth = metrics.width;
            const textHeight = fontSize;

            if (watermark.repeat === 'tiled') {
                // Draw tiled pattern with configurable spacing and rotation
                const pattern = watermark.pattern || 'diagonal';
                const spacingH = watermark.spacingH || 100;
                const spacingV = watermark.spacingV || 80;
                const rotationAngle = watermark.rotation || -30;

                ctx.save();

                // Apply rotation based on pattern
                if (pattern === 'diagonal') {
                    ctx.rotate(rotationAngle * Math.PI / 180);
                } else if (pattern === 'vertical') {
                    ctx.rotate(Math.PI / 2);
                }
                // 'horizontal' and 'grid' use no rotation

                const startX = pattern === 'diagonal' ? -canvas.width : 0;
                const endX = pattern === 'diagonal' ? canvas.width * 2 : canvas.width;
                const startY = pattern === 'diagonal' ? -canvas.height : 0;
                const endY = pattern === 'diagonal' ? canvas.height * 2 : canvas.height;

                for (let y = startY; y < endY; y += textHeight + spacingV) {
                    for (let x = startX; x < endX; x += textWidth + spacingH) {
                        ctx.fillText(text, x, y);
                    }
                }
                ctx.restore();
            } else {
                // Single watermark
                let wx = 0, wy = 0;
                switch (watermark.position) {
                    case 'TL': wx = padding; wy = padding + textHeight; break;
                    case 'TR': wx = canvas.width - textWidth - padding; wy = padding + textHeight; break;
                    case 'BL': wx = padding; wy = canvas.height - padding; break;
                    case 'BR': wx = canvas.width - textWidth - padding; wy = canvas.height - padding; break;
                    case 'center': wx = (canvas.width - textWidth) / 2; wy = (canvas.height + textHeight) / 2; break;
                    default: wx = canvas.width - textWidth - padding; wy = canvas.height - padding;
                }
                ctx.fillText(text, wx, wy);
            }

        } else if (watermark.type === 'image' && watermark.imageObj) {
            const wImg = watermark.imageObj;
            const wWidth = canvas.width * scale;
            const wHeight = wImg.height * (wWidth / wImg.width);

            if (watermark.repeat === 'tiled') {
                // Draw tiled pattern with configurable spacing and rotation
                const pattern = watermark.pattern || 'diagonal';
                const spacingH = watermark.spacingH || 100;
                const spacingV = watermark.spacingV || 80;
                const rotationAngle = watermark.rotation || -30;

                ctx.save();

                // Apply rotation based on pattern
                if (pattern === 'diagonal') {
                    ctx.rotate(rotationAngle * Math.PI / 180);
                } else if (pattern === 'vertical') {
                    ctx.rotate(Math.PI / 2);
                }

                const startX = pattern === 'diagonal' ? -canvas.width : 0;
                const endX = pattern === 'diagonal' ? canvas.width * 2 : canvas.width;
                const startY = pattern === 'diagonal' ? -canvas.height : 0;
                const endY = pattern === 'diagonal' ? canvas.height * 2 : canvas.height;

                for (let y = startY; y < endY; y += wHeight + spacingV) {
                    for (let x = startX; x < endX; x += wWidth + spacingH) {
                        ctx.drawImage(wImg, x, y, wWidth, wHeight);
                    }
                }
                ctx.restore();
            } else {
                // Single watermark
                let wx = 0, wy = 0;
                switch (watermark.position) {
                    case 'TL': wx = padding; wy = padding; break;
                    case 'TR': wx = canvas.width - wWidth - padding; wy = padding; break;
                    case 'BL': wx = padding; wy = canvas.height - wHeight - padding; break;
                    case 'BR': wx = canvas.width - wWidth - padding; wy = canvas.height - wHeight - padding; break;
                    case 'center': wx = (canvas.width - wWidth) / 2; wy = (canvas.height - wHeight) / 2; break;
                    default: wx = canvas.width - wWidth - padding; wy = canvas.height - wHeight - padding;
                }
                ctx.drawImage(wImg, wx, wy, wWidth, wHeight);
            }
        }
    }

    // As WebP Blob
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            resolve(blob);
        }, 'image/webp', quality); // WebP format with configurable quality
    })
}
