import React from 'react';
import { useTheme } from '../../context/ThemeContext';

/* ──────────────────────────────────────────────────────
 * Skeleton primitives
 * ────────────────────────────────────────────────────── */

/**
 * @component SkeletonBlock
 * [TH] แถบ skeleton พื้นฐาน — shimmer animation เพื่อบอกว่ากำลังโหลด
 * [EN] Base skeleton block with shimmer animation
 */
export const SkeletonBlock = ({ className = '', style = {}, rounded = '12px' }) => {
    const { isLight } = useTheme();
    return (
        <div
            className={`skeleton-shimmer ${className}`}
            style={{
                borderRadius: rounded,
                background: isLight
                    ? 'linear-gradient(90deg, rgba(226,232,240,1) 25%, rgba(241,245,249,1) 50%, rgba(226,232,240,1) 75%)'
                    : 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.05) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.6s infinite linear',
                ...style,
            }}
            aria-hidden="true"
        />
    );
};

/* ──────────────────────────────────────────────────────
 * Skeleton for Bento StatCard (4 cards in a grid)
 * ────────────────────────────────────────────────────── */
export const SkeletonStatCards = () => {
    const { isLight } = useTheme();
    const cardStyle = {
        borderRadius: '18px',
        padding: '18px 16px',
        background: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.04)',
        border: isLight ? '1px solid rgba(59,130,246,0.10)' : '1px solid rgba(255,255,255,0.06)',
    };
    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
                <div key={i} style={cardStyle}>
                    <SkeletonBlock className="h-3 w-16 mb-4" rounded="6px" />
                    <SkeletonBlock className="h-6 w-24 mb-2" rounded="8px" />
                    <SkeletonBlock className="h-3 w-20 mb-4" rounded="6px" />
                    <SkeletonBlock className="h-9 w-full" rounded="12px" />
                </div>
            ))}
            {/* Volume card — full width */}
            <div style={{ ...cardStyle, gridColumn: '1 / -1', padding: '18px 22px' }}>
                <SkeletonBlock className="h-3 w-32 mb-4" rounded="6px" />
                <SkeletonBlock className="h-10 w-full" rounded="14px" />
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────
 * Skeleton for Player Widget
 * ────────────────────────────────────────────────────── */
export const SkeletonPlayerCard = () => {
    const { isLight } = useTheme();
    return (
        <div style={{
            borderRadius: '24px',
            padding: '24px',
            background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.05)',
            border: isLight ? '1px solid rgba(59,130,246,0.12)' : '1px solid rgba(255,255,255,0.08)',
        }}>
            <SkeletonBlock className="h-3 w-24 mb-5" rounded="6px" />
            <SkeletonBlock className="w-full mb-4" style={{ aspectRatio: '16/9' }} rounded="16px" />
            <SkeletonBlock className="h-3 w-full mb-3" rounded="6px" />
            <div className="flex gap-3">
                <SkeletonBlock className="h-10 flex-1" rounded="12px" />
                <SkeletonBlock className="h-10 w-24" rounded="12px" />
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────
 * Skeleton for queue items
 * ────────────────────────────────────────────────────── */
export const SkeletonQueueItem = ({ index = 0 }) => (
    <div
        className="flex items-center gap-4 px-4 py-4"
        style={{ animationDelay: `${index * 80}ms` }}
    >
        <SkeletonBlock className="w-8 h-8 flex-shrink-0" rounded="50%" />
        <div className="flex-1">
            <SkeletonBlock className="h-4 w-3/4 mb-2" rounded="6px" />
            <SkeletonBlock className="h-3 w-1/2" rounded="6px" />
        </div>
        <SkeletonBlock className="w-8 h-8 flex-shrink-0" rounded="8px" />
    </div>
);

/* ──────────────────────────────────────────────────────
 * Skeleton for Student View (NowPlaying + Queue)
 * ────────────────────────────────────────────────────── */
export const SkeletonStudentQueue = () => {
    const { isLight } = useTheme();
    return (
        <div className="w-full max-w-[640px] mx-auto mt-8 animate-fade-in">
            {/* Now playing skeleton */}
            <div className="mb-2">
                <SkeletonBlock className="h-3 w-20 mb-3" rounded="6px" />
                <div style={{
                    padding: '16px 20px',
                    borderRadius: '24px',
                    background: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.04)',
                    border: isLight ? '1px solid rgba(59,130,246,0.10)' : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex', gap: 16, alignItems: 'center'
                }}>
                    <SkeletonBlock className="w-12 h-12 flex-shrink-0" rounded="14px" />
                    <div className="flex-1">
                        <SkeletonBlock className="h-5 w-3/4 mb-2" rounded="8px" />
                        <SkeletonBlock className="h-3 w-1/2" rounded="6px" />
                    </div>
                </div>
            </div>

            {/* Queue accordion skeleton */}
            <div className="mt-6">
                <div style={{
                    padding: '16px 20px',
                    borderRadius: '20px',
                    background: isLight ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.04)',
                    border: isLight ? '1px solid rgba(255,255,255,0.70)' : '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div className="flex items-center gap-4">
                        <SkeletonBlock className="w-11 h-11" rounded="50%" />
                        <div>
                            <SkeletonBlock className="h-4 w-20 mb-2" rounded="6px" />
                            <SkeletonBlock className="h-3 w-28" rounded="6px" />
                        </div>
                    </div>
                    <SkeletonBlock className="w-8 h-8" rounded="50%" />
                </div>
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────
 * Full Manager Dashboard Skeleton
 * ────────────────────────────────────────────────────── */
export const SkeletonManagerDashboard = () => (
    <div className="space-y-5 py-6 pb-16 animate-fade-in">
        <SkeletonStatCards />
        {/* Tab bar */}
        <div className="flex gap-6 px-1 border-b border-white/8 pb-3">
            <SkeletonBlock className="h-5 w-28" rounded="6px" />
            <SkeletonBlock className="h-5 w-28" rounded="6px" />
        </div>
        {/* Content grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-1">
                <SkeletonBlock className="w-full h-[400px]" rounded="24px" />
            </div>
            <div className="xl:col-span-2 flex flex-col gap-5">
                <SkeletonPlayerCard />
                <SkeletonBlock className="w-full h-[280px]" rounded="24px" />
            </div>
        </div>
    </div>
);
