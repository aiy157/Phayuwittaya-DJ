import React from 'react';
import { SkipForward, RefreshCw, Disc3, Play } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

/**
 * @component PlayerWidget
 * Manager-facing player controls: video placeholder + now-playing metadata.
 */
const PlayerWidget = ({ currentSong, currentTime, duration, handleSkipSong, formatTime, reloadPlayer, isSystemActive }) => {
    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const isReallyPlaying = currentSong && isSystemActive;
    const { isLight } = useTheme();

    const textDim = isLight ? '#94a3b8' : 'rgba(255,255,255,0.35)';
    const textSub = isLight ? '#64748b' : 'rgba(255,255,255,0.28)';

    return (
        <div className="flex flex-col gap-3">

            {/* ── Player Area ── */}
            <div
                className="relative overflow-hidden rounded-[20px]"
                style={{
                    aspectRatio: '16/9',
                    background: isLight
                        ? 'linear-gradient(135deg, #dbeafe 0%, #ede9fe 100%)'
                        : 'linear-gradient(135deg, #060b18 0%, #0d1530 100%)',
                    border: isLight ? '1px solid rgba(59,130,246,0.18)' : '1px solid rgba(255,255,255,0.07)',
                    boxShadow: isLight
                        ? '0 4px 24px rgba(59,130,246,0.10)'
                        : '0 12px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)',
                }}
            >
                {/* Ambient gradient overlay */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background:
                            'radial-gradient(ellipse at 20% 10%, rgba(59,130,246,0.20) 0%, transparent 55%),' +
                            'radial-gradient(ellipse at 80% 90%, rgba(139,92,246,0.15) 0%, transparent 55%)',
                    }}
                    aria-hidden
                />

                {/* GlobalPlayer docking target */}
                <div id="manager-player-placeholder" className="w-full h-full flex items-center justify-center relative z-0">
                    <div className="text-center">
                        <div className="relative inline-block mb-3">
                            <div
                                className="absolute -inset-4 rounded-full animate-glow-pulse"
                                style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.30) 0%, transparent 70%)' }}
                                aria-hidden
                            />
                            <Disc3
                                size={40}
                                className="relative animate-spin-slow"
                                style={{ color: isLight ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.15)' }}
                                aria-hidden
                            />
                        </div>
                        <p className="text-[11px] font-black tracking-widest uppercase" style={{ color: isLight ? 'rgba(59,130,246,0.30)' : 'rgba(255,255,255,0.18)' }}>
                            Player Area
                        </p>
                    </div>
                </div>

                {/* Reload button */}
                <button
                    onClick={reloadPlayer}
                    title="รีโหลดเครื่องเล่น"
                    aria-label="รีโหลดเครื่องเล่น"
                    className="
            absolute top-3 right-3 z-10
            flex items-center gap-1.5 px-3 py-1.5 rounded-[10px]
            text-[11px] font-semibold min-h-[34px]
            backdrop-blur-sm
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70
            active:scale-95
            [&>svg]:hover:rotate-180 [&>svg]:transition-transform [&>svg]:duration-500
            transition-all duration-200
          "
                    style={isLight
                        ? { background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(59,130,246,0.20)', color: '#3b82f6' }
                        : { background: 'rgba(0,0,0,0.80)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.65)' }
                    }
                >
                    <RefreshCw size={12} aria-hidden />
                    Reload Player
                </button>
            </div>

            {/* ── Now Playing ── */}
            {isReallyPlaying ? (
                <div
                    className="relative overflow-hidden flex items-center gap-4 p-4 rounded-[18px]"
                    style={{
                        background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.05)',
                        border: isLight ? '1px solid rgba(139,92,246,0.22)' : '1px solid rgba(139,92,246,0.25)',
                        boxShadow: '0 4px 24px rgba(139,92,246,0.15)',
                    }}
                >
                    {/* Left gradient strip */}
                    <div
                        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-[18px]"
                        style={{ background: 'linear-gradient(180deg, #3b82f6, #8b5cf6, #f43f5e)' }}
                        aria-hidden
                    />
                    {/* Shimmer overlay */}
                    <div className="absolute inset-0 pointer-events-none shimmer-anim opacity-25" aria-hidden />

                    <div className="min-w-0 flex-1 pl-1">
                        <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-amber-400 text-[11px]" aria-hidden>⚡</span>
                            <p className="section-label text-violet-400">On Air</p>
                        </div>

                        <p className="text-[15px] font-bold truncate mb-3" style={{ color: isLight ? '#0f172a' : 'rgba(255,255,255,0.92)' }}>
                            {currentSong.title || 'ไม่ทราบชื่อเพลง'}
                        </p>

                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                            <span
                                className="text-[11px] font-medium tabular-nums w-10 text-right"
                                style={{ color: textDim }}
                                aria-label={`เวลาปัจจุบัน ${formatTime(currentTime)}`}
                            >
                                {formatTime(currentTime)}
                            </span>

                            <div className="progress-track flex-1" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
                                <div className="progress-fill" style={{ width: `${progress}%` }} />
                                <div className="progress-dot" style={{ left: `${progress}%` }} aria-hidden />
                            </div>

                            <span
                                className="text-[11px] font-medium tabular-nums w-10"
                                style={{ color: textDim }}
                                aria-label={`ความยาวทั้งหมด ${formatTime(duration)}`}
                            >
                                {formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    {/* Skip button */}
                    <button
                        onClick={handleSkipSong}
                        aria-label="ข้ามเพลง"
                        className="
              flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-[12px]
              font-bold text-[12px] min-h-[44px]
              bg-violet-500/18 border border-violet-500/30 text-violet-300
              hover:bg-violet-500 hover:text-white hover:border-violet-400
              hover:shadow-[0_4px_20px_rgba(139,92,246,0.55)]
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/80
              active:scale-95 active:shadow-none
              transition-all duration-200
            "
                    >
                        <SkipForward size={15} aria-hidden />
                        <span className="hidden sm:inline">ข้ามเพลง</span>
                    </button>
                </div>
            ) : (
                <div
                    className="flex items-center gap-3 p-4 rounded-[16px]"
                    style={{
                        background: isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)',
                        border: isLight ? '1px solid rgba(59,130,246,0.12)' : '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <Play size={15} style={{ color: isLight ? 'rgba(59,130,246,0.30)' : 'rgba(255,255,255,0.18)' }} aria-hidden />
                    <span className="text-[13px]" style={{ color: textSub }}>ยังไม่มีเพลงที่กำลังเล่น</span>
                </div>
            )}
        </div>
    );
};

export default PlayerWidget;
