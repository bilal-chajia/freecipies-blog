import React, { useState, useRef, useEffect } from 'react';
import { useUIStore } from '../../../store/useUIStore';
import TopToolbar from './TopToolbar';
import SidePanel from './SidePanel';
import ContextToolbar from './ContextToolbar';

const EditorLayout = ({ children, onExport, onPreview, onExportImage, isPreviewOpen }) => {
    // Theme
    const { theme } = useUIStore();
    const isDark = theme === 'dark';

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
        <div className={`h-screen w-screen flex flex-col overflow-hidden ${isDark ? 'bg-zinc-950' : 'bg-zinc-100'}`}>
            {/* Top Navigation Bar */}
            <TopToolbar onExport={onExport} onPreview={onPreview} onExportImage={onExportImage} isPreviewOpen={isPreviewOpen} />

            <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar (Icons + Drawer) */}
                <SidePanel />

                {/* Main Content Area - with smooth transition when sidebar opens/closes */}
                <div className="flex-1 flex flex-col relative min-w-0 transition-all duration-300 ease-out">
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

                        {/* Background grid pattern */}
                        <div
                            className="absolute inset-0 opacity-[0.03] pointer-events-none"
                            style={{
                                backgroundImage: `radial-gradient(circle, ${isDark ? '#fff' : '#000'} 1px, transparent 1px)`,
                                backgroundSize: '20px 20px',
                            }}
                        />

                        {/* The Canvas - fills entire area */}
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditorLayout;
