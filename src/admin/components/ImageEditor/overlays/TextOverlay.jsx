import React from 'react';

const TextOverlay = ({ textOverlay, aspect }) => {
    if (!textOverlay.enabled || !textOverlay.text) return null;

    return (
        <div
            className="absolute pointer-events-none z-20"
            style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: aspect >= 1 ? 'auto' : `calc(min(100%, 100vh * ${aspect}))`,
                height: aspect >= 1 ? `calc(min(100%, 100vw / ${aspect}))` : 'auto',
                aspectRatio: aspect || 1,
                maxWidth: '100%',
                maxHeight: '100%',
            }}
        >
            <div
                className={`absolute ${textOverlay.position === 'TL' ? 'top-[5%] left-[5%]' :
                    textOverlay.position === 'top' ? 'top-[5%] left-1/2 -translate-x-1/2' :
                        textOverlay.position === 'TR' ? 'top-[5%] right-[5%]' :
                            textOverlay.position === 'left' ? 'top-1/2 left-[5%] -translate-y-1/2' :
                                textOverlay.position === 'center' ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' :
                                    textOverlay.position === 'right' ? 'top-1/2 right-[5%] -translate-y-1/2' :
                                        textOverlay.position === 'BL' ? 'bottom-[5%] left-[5%]' :
                                            textOverlay.position === 'bottom' ? 'bottom-[5%] left-1/2 -translate-x-1/2' :
                                                textOverlay.position === 'BR' ? 'bottom-[5%] right-[5%]' :
                                                    'bottom-[5%] left-1/2 -translate-x-1/2'
                    }`}
                style={{
                    fontFamily: textOverlay.font,
                    fontSize: `${textOverlay.size}px`,
                    fontWeight: 'bold',
                    color: textOverlay.color,
                    textShadow: textOverlay.shadow ? '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)' : 'none',
                    whiteSpace: 'nowrap'
                }}
            >
                {textOverlay.text}
            </div>
        </div>
    );
};

export default TextOverlay;
