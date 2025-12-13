import React, { useState, useRef, useEffect } from 'react';
import TopToolbar from './TopToolbar';
import SidePanel from './SidePanel';
import ContextToolbar from './ContextToolbar';

const EditorLayout = ({ children, onExport, onPreview }) => {
    // Left mouse button panning state
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    const scrollContainerRef = useRef(null);

    // Handle Shift+Wheel for horizontal scrolling
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            if (e.shiftKey) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    // Handle mouse events for left-click panning on background
    const handleMouseDown = (e) => {
        if (e.button === 0 && e.target === e.currentTarget) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({
                x: e.clientX + (scrollContainerRef.current?.scrollLeft || 0),
                y: e.clientY + (scrollContainerRef.current?.scrollTop || 0),
            });
        }
    };

    const handleWrapperMouseDown = (e) => {
        if (e.button === 0 && e.target === e.currentTarget) {
            e.preventDefault();
            setIsPanning(true);
            setPanStart({
                x: e.clientX + (scrollContainerRef.current?.scrollLeft || 0),
                y: e.clientY + (scrollContainerRef.current?.scrollTop || 0),
            });
        }
    };

    const handleMouseMove = (e) => {
        if (isPanning && scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft = panStart.x - e.clientX;
            scrollContainerRef.current.scrollTop = panStart.y - e.clientY;
        }
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };

    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden bg-zinc-950 text-white z-50">
            {/* Top Navigation Bar */}
            <TopToolbar onExport={onExport} onPreview={onPreview} />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar (Icons + Drawer) */}
                <SidePanel />

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col relative min-w-0">
                    {/* Canvas Scroll Container */}
                    <div
                        ref={scrollContainerRef}
                        className="canvas-scroll-area"
                        style={{
                            flex: 1,
                            overflow: 'auto',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                            cursor: isPanning ? 'grabbing' : 'grab',
                            position: 'relative',
                        }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <style>{`
                            .canvas-scroll-area::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>

                        {/* Inner wrapper for centering - clickable for panning */}
                        <div
                            style={{
                                minWidth: '100%',
                                minHeight: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '40px',
                                boxSizing: 'border-box',
                                cursor: isPanning ? 'grabbing' : 'grab',
                            }}
                            onMouseDown={handleWrapperMouseDown}
                        >
                            {/* Background grid pattern */}
                            <div
                                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                                style={{
                                    backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
                                    backgroundSize: '20px 20px',
                                }}
                            />

                            {/* The Canvas */}
                            {children}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorLayout;
