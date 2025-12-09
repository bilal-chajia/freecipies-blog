import React from 'react';

const VignetteOverlay = ({ enabled, intensity, aspect }) => {
    if (!enabled) return null;

    return (
        <div
            className="absolute pointer-events-none z-10"
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
                background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${intensity}) 100%)`
            }}
        />
    );
};

export default VignetteOverlay;
