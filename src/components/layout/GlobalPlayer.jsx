import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Move, X, Play } from 'lucide-react';

// [TH] คอมโพเนนต์ห่อหุ้มเครื่องเล่น YouTube แบบถูกตัดขาดจาก React State
// [EN] Memoized container that never re-renders, preventing React from destroying the iframe
const YoutubeContainer = React.memo(() => (
    <div id="youtube-player-container" className="absolute top-0 left-0 w-full h-full"></div>
), () => true);

/**
 * @component GlobalPlayer
 * @description 
 * [TH] เครื่องเล่นสื่อ YouTube แบบฝังตัว (Persistent)
 * คอมโพเนนต์นี้จะถูกเมานท์ค้างไว้เหนือสุดของ App เพื่อป้องกันไม่ให้ iframe โหลดใหม่
 * และเพื่อให้เสียงเพลงไม่ขาดตอนเมื่อมีการเปลี่ยนหน้าจอ
 * 
 * [EN] The persistent YouTube media player. 
 * This component remains mounted at the top App-level to prevent iframe reloads 
 * and audio interruptions when switching between views.
 * 
 * [TH] มี 2 โหมดการแสดงผล:
 * 1. โหมดลอยตัว/ลากได้ (Floating/Draggable) สำหรับหน้านักเรียน
 * 2. โหมดเทียบท่า (Docked) สำหรับแสดงในแผงควบคุมของ ManagerDashboard
 * [EN] Features two layout modes:
 * 1. Floating/Draggable Mode (for Students/Listeners)
 * 2. Docked Mode (Snaps into the Manager Dashboard layout)
 * 
 * @param {string} viewMode - [TH] โหมดหน้าจอ ('student' หรือ 'manager') | [EN] Current view
 * @param {boolean} isSystemActive - [TH] อนุญาตให้เล่นเพลงหรือไม่ | [EN] Determines if playback should be allowed
 * @param {string} activeTab - [TH] แท็บปัจจุบันเพื่อซ่อน/แสดง | [EN] Controls visibility logic when in the manager view
 */
const GlobalPlayer = ({ viewMode, isSystemActive = true, activeTab = 'queue' }) => {
    const getInitialPos = () => ({
        x: Math.max(10, window.innerWidth - (window.innerWidth < 640 ? 170 : 340)),
        y: Math.max(10, window.innerHeight - (window.innerWidth < 640 ? 140 : 240))
    });

    const [floatPos, setFloatPos] = useState(getInitialPos);
    const [isDocked, setIsDocked] = useState(false);
    const [dockStyle, setDockStyle] = useState({});
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isMinimized, setIsMinimized] = useState(false);
    const playerRef = useRef(null);

    // [TH] แสดง Player เฉพาะเมื่ออยู่ในแท็บ DJ Dashboard (ซ่อนในแท็บ Festival)
    // [EN] Show player only when on DJ Dashboard tab (not Festival Library)
    const shouldDock = viewMode === 'manager' && activeTab === 'queue';

    // --- Docking Logic (use fixed positioning based on viewport) ---
    // [TH] ลอจิกการเทียบท่า: ซิงค์ตำแหน่งของ Player ให้ทับซ้อนกับ placeholder ใน ManagerDashboard
    // [EN] Docking Logic: Align the player over the placeholder in the dashboard.
    useEffect(() => {
        if (!shouldDock) {
            queueMicrotask(() => setIsDocked(false));
            return;
        }

        let pollInterval;
        let observer;

        const syncDock = () => {
            const target = document.getElementById('manager-player-placeholder');
            const scrollContainer = document.getElementById('app-scroll-container');
            if (target && scrollContainer) {
                const targetRect = target.getBoundingClientRect();
                const containerRect = scrollContainer.getBoundingClientRect();

                // [TH] คำนวณตำแหน่งสัมพัทธ์กับการสกรอลหน้าจอ
                // [EN] Calculate position relative to scroll container's internal content
                const top = targetRect.top - containerRect.top + scrollContainer.scrollTop;
                const left = targetRect.left - containerRect.left + scrollContainer.scrollLeft;

                setDockStyle({
                    position: 'absolute',
                    top: `${top}px`,
                    left: `${left}px`,
                    width: `${targetRect.width}px`,
                    height: `${targetRect.height}px`,
                    borderRadius: '16px',
                    zIndex: 50,
                    pointerEvents: 'none',
                });
                setIsDocked(true);

                // Setup resize observer if not already watching
                if (!observer) {
                    observer = new ResizeObserver(syncDock);
                    observer.observe(target);
                    // Also observe the scroll container to catch layout shifts
                    observer.observe(scrollContainer);
                }
                clearInterval(pollInterval); // Stop polling once found
                return true;
            }
            return false;
        };

        // Try to sync. If not found, start rapid polling until ManagerDashboard mounts it
        if (!syncDock()) {
            pollInterval = setInterval(syncDock, 100);
        }

        const handleResizeAndScroll = () => {
            if (isDocked) syncDock();
        };

        window.addEventListener('resize', handleResizeAndScroll);

        // Listen to scroll events on the container to keep it pinned correctly during rubber-banding
        const scrollContainer = document.getElementById('app-scroll-container');
        if (scrollContainer) scrollContainer.addEventListener('scroll', handleResizeAndScroll, { passive: true });

        return () => {
            if (observer) observer.disconnect();
            if (pollInterval) clearInterval(pollInterval);
            window.removeEventListener('resize', handleResizeAndScroll);
            if (scrollContainer) scrollContainer.removeEventListener('scroll', handleResizeAndScroll);
        };
    }, [shouldDock, activeTab, isDocked]);

    // --- Drag Logic ---
    // [TH] ลอจิกการลากและวางหน้าต่างสำหรับโหมดลอยตัว
    // [EN] Drag Logic for floating mode
    const startDrag = (clientX, clientY) => {
        if (shouldDock) return;
        setIsDragging(true);
        const rect = playerRef.current.getBoundingClientRect();
        setDragOffset({ x: clientX - rect.left, y: clientY - rect.top });
    };

    const moveDrag = useCallback((clientX, clientY) => {
        if (isDragging) {
            setFloatPos({
                x: Math.max(0, Math.min(clientX - dragOffset.x, window.innerWidth - 160)),
                y: Math.max(0, Math.min(clientY - dragOffset.y, window.innerHeight - 100))
            });
        }
    }, [isDragging, dragOffset]);

    const endDrag = useCallback(() => setIsDragging(false), []);

    const handleMouseDown = (e) => { if (e.button === 0) startDrag(e.clientX, e.clientY); };
    const handleTouchStart = (e) => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); };

    useEffect(() => {
        if (!isDragging) return;
        const onMove = (e) => moveDrag(e.clientX, e.clientY);
        const onTouchMove = (e) => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', endDrag);
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', endDrag);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', endDrag);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', endDrag);
        };
    }, [isDragging, dragOffset, moveDrag, endDrag]);

    // [TH] ไอคอนย่อส่วน (Minimized state) เมื่ออยู่ในโหมดของนักเรียน
    // [EN] Minimized state (student mode)
    if (isMinimized && viewMode === 'student' && isSystemActive) {
        return (
            <button
                onClick={() => setIsMinimized(false)}
                className="fixed bottom-4 right-4 z-[9999] bg-gradient-to-r from-brand-600 to-blue-600 text-white p-3 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-transform"
            >
                <Play size={20} fill="white" />
            </button>
        );
    }

    const isHidden = viewMode === 'manager' && activeTab !== 'queue';

    // [TH] เก็บค่าสไตล์ลอยตัวเริ่มต้น
    // [EN] Default floating styling
    const floatingStyle = {
        position: 'fixed',
        top: `${floatPos.y}px`,
        left: `${floatPos.x}px`,
        width: window.innerWidth < 640 ? '150px' : '320px',
        borderRadius: '12px',
        zIndex: 9999,
    };

    // [TH] เลือกสไตล์หลัก (เทียบท่า หรือ ลอย)
    // [EN] Choose base styling (Docked vs Floating)
    const style = isDocked ? dockStyle : floatingStyle;

    // [TH] กรณีซ่อนตัว: เก็บ React Tree ไว้แต่ใช้ CSS ทำให้มองไม่เห็นและไม่กินพื้นที่
    // [EN] Hidden state: keep React Tree but use CSS to make it invisible and zero-sized
    const finalStyle = isHidden
        ? { display: 'none' }
        : {
            transform: 'translateZ(0)',
            transition: isDragging ? 'none' : isDocked ? 'top 0.1s, left 0.1s, width 0.3s, height 0.3s' : 'all 0.5s cubic-bezier(0.4,0,0.2,1)',
            ...style,
            pointerEvents: isDocked ? 'none' : 'auto',
        };

    return (
        <div
            ref={playerRef}
            style={finalStyle}
            className={`bg-black overflow-hidden shadow-2xl
                ${!isSystemActive && !isHidden ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
        >
            {/* [TH] แถบด้านบนสำหรับคลิกลาก (เฉพาะโหมดลอยตัว) | [EN] Drag Handle (floating mode only) */}
            {!isDocked && (
                <div
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className={`bg-slate-900/90 backdrop-blur-sm p-1.5 sm:p-2 flex items-center justify-between select-none border-b border-white/10 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                >
                    <div className="flex items-center gap-1 sm:gap-2 text-white/70 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider">
                        <Move size={10} className="sm:w-3 sm:h-3" />
                        <span>Mini Player</span>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }}
                        className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* [TH] กล่องห่อหุ้มเครื่องเล่นวิดีโอ (ปล่อยว่างไว้ให้ usePlayer.js ควบคุม) | [EN] Video protective container */}
            <div className={`relative bg-black ${isDocked ? 'h-full' : 'pt-[56.25%]'}`}>
                <YoutubeContainer />
                {isDragging && <div className="absolute inset-0 z-50 bg-transparent" />}
            </div>
        </div>
    );
};

export default GlobalPlayer;
