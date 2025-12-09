import React from 'react';

const WatermarkOverlay = ({
    watermarkType,
    watermarkOpacity,
    watermarkRepeat,
    watermarkPosition,
    watermarkScale,
    watermarkRotation,
    watermarkSpacingH,
    watermarkSpacingV,
    customWatermark,
    aspect,
    watermarkDensity // Keeping this prop although not explicitly used in the logic below, it was in state
}) => {
    if (watermarkType === 'none') return null;

    return (
        <div
            className="absolute pointer-events-none z-10"
            style={{
                // React-easy-crop centers the crop box, so we center the overlay too
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                // Match the crop area's aspect ratio and max dimensions
                width: aspect >= 1 ? 'auto' : `calc(min(100%, 100vh * ${aspect}))`,
                height: aspect >= 1 ? `calc(min(100%, 100vw / ${aspect}))` : 'auto',
                aspectRatio: aspect || 1,
                maxWidth: '100%',
                maxHeight: '100%',
                opacity: watermarkOpacity,
                overflow: 'hidden'
            }}
        >
            {/* Single Watermark */}
            {watermarkRepeat === 'single' && (
                <div className={`absolute ${watermarkPosition === 'TL' ? 'top-[5%] left-[5%]' :
                    watermarkPosition === 'T' ? 'top-[5%] left-1/2 -translate-x-1/2' :
                        watermarkPosition === 'TR' ? 'top-[5%] right-[5%]' :
                            watermarkPosition === 'L' ? 'top-1/2 left-[5%] -translate-y-1/2' :
                                watermarkPosition === 'C' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                                    watermarkPosition === 'R' ? 'top-1/2 right-[5%] -translate-y-1/2' :
                                        watermarkPosition === 'BL' ? 'bottom-[5%] left-[5%]' :
                                            watermarkPosition === 'B' ? 'bottom-[5%] left-1/2 -translate-x-1/2' :
                                                'bottom-[5%] right-[5%]' /* BR is default */
                    }`}>
                    {watermarkType === 'text' ? (
                        <span
                            className="font-bold"
                            style={{
                                fontSize: `${watermarkScale * 200}px`,
                                background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                            }}
                        >
                            Freecipies
                        </span>
                    ) : customWatermark ? (
                        <img
                            src={customWatermark.src}
                            alt="Watermark"
                            style={{ maxWidth: `${watermarkScale * 400}px` }}
                        />
                    ) : null}
                </div>
            )}

            {/* Tiled Watermark Pattern */}
            {watermarkRepeat === 'tiled' && (() => {
                const baseSize = watermarkType === 'text' ? 100 : 80;
                const effectiveSpacingH = Math.max(watermarkSpacingH, 20);
                const effectiveSpacingV = Math.max(watermarkSpacingV, 20);
                const cols = Math.max(8, Math.ceil(1200 / (effectiveSpacingH + baseSize * watermarkScale)) + 4);
                const rows = Math.max(8, Math.ceil(1200 / (effectiveSpacingV + baseSize * watermarkScale)) + 4);
                const totalWatermarks = cols * rows;

                return (
                    <div
                        className="absolute inset-0"
                        style={{
                            transform: `rotate(${watermarkRotation}deg)`,
                            transformOrigin: 'center center'
                        }}
                    >
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                gap: `${effectiveSpacingV}px ${effectiveSpacingH}px`,
                                position: 'absolute',
                                top: '-150%',
                                left: '-150%',
                                width: '400%',
                                height: '400%',
                                justifyItems: 'center',
                                alignItems: 'center'
                            }}
                        >
                            {Array.from({ length: totalWatermarks }).map((_, i) => (
                                <div key={i} className="flex-shrink-0">
                                    {watermarkType === 'text' ? (
                                        <span
                                            className="font-bold whitespace-nowrap"
                                            style={{
                                                fontSize: `${watermarkScale * 100}px`,
                                                background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                            }}
                                        >
                                            Freecipies
                                        </span>
                                    ) : customWatermark ? (
                                        <img
                                            src={customWatermark.src}
                                            alt="Watermark"
                                            style={{ maxWidth: `${watermarkScale * 200}px` }}
                                        />
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default WatermarkOverlay;
