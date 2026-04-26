import React, { createContext, useState, useEffect } from 'react';
import {
    Clock, Music, Volume2, VolumeX, ListMusic, X, CheckCircle2,
    Lock, Unlock, Library, Timer, RefreshCw, Activity, KeyRound, MonitorPlay, Radio, Settings, History, Plus
} from 'lucide-react';
import EventPlaylistManager from './EventPlaylistManager';
import CustomVolumeSlider from '../ui/CustomVolumeSlider';
import { useTheme } from '../../context/ThemeContext';

/* ─────────────────────────────────────────────
 * StatCard — Compound Component
 * Shares accent color implicitly via Context.
 * Usage:
 *   <StatCard accent="blue">
 *     <StatCard.Header label="Title" />
 *     <StatCard.Body>…</StatCard.Body>
 *     <StatCard.Footer>…</StatCard.Footer>
 *   </StatCard>
 * ─────────────────────────────────────────── */
const StatCardCtx = createContext('blue');

const StatCard = ({ accent = 'blue', children, onClick, style = {} }) => (
    <StatCardCtx.Provider value={accent}>
        <div
            className={`stat-card stat-${accent} ${onClick ? 'cursor-pointer select-none' : ''}`}
            onClick={onClick}
            style={style}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
        >
            {children}
        </div>
    </StatCardCtx.Provider>
);

StatCard.Header = ({ label, accent, isLight }) => {
    const labelColorsDark = {
        blue: 'rgba(147,197,253,0.65)',
        violet: 'rgba(196,181,253,0.65)',
        emerald: 'rgba(110,231,183,0.65)',
        rose: 'rgba(253,164,175,0.65)',
        amber: 'rgba(253,230,138,0.65)',
        cyan: 'rgba(103,232,249,0.65)',
    };
    const labelColorsLight = {
        blue: '#3b82f6',
        violet: '#7c3aed',
        emerald: '#059669',
        rose: '#e11d48',
        amber: '#d97706',
        cyan: '#0284c7',
    };
    const colors = isLight ? labelColorsLight : labelColorsDark;
    return (
        <p className="section-label" style={{ color: colors[accent] || (isLight ? '#4a6fa5' : 'rgba(255,255,255,0.35)') }}>
            {label}
        </p>
    );
};

StatCard.Body = ({ children }) => <div>{children}</div>;
StatCard.Footer = ({ children }) => <div>{children}</div>;

/* ─────────────────────────────────────────────
 * DaySelector
 * ─────────────────────────────────────────── */
const DaySelector = ({ selectedDay, setSelectedDay, daysTh }) => {
    const { isLight } = useTheme();
    return (
    <div
        className="flex gap-1 mb-5 p-1 rounded-[14px]"
        style={{
            background: isLight ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.04)',
            border: isLight ? '1px solid rgba(59,130,246,0.16)' : '1px solid rgba(255,255,255,0.07)'
        }}
        role="group"
        aria-label="เลือกวัน"
    >
        {Object.entries(daysTh).map(([key, label]) => {
            const isActive = selectedDay === parseInt(key);
            return (
                <button
                    key={key}
                    onClick={() => setSelectedDay(parseInt(key))}
                    className="
            flex-1 py-1.5 rounded-[10px] text-[11px] font-bold
            transition-all duration-200 min-h-[34px]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
          "
                    style={isActive
                        ? { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', boxShadow: '0 2px 12px rgba(139,92,246,0.45)' }
                        : { color: isLight ? '#64748b' : 'rgba(255,255,255,0.35)' }
                    }
                    aria-pressed={isActive}
                    aria-label={label}
                >
                    {label}
                </button>
            );
        })}
    </div>
    );
};

/* ─────────────────────────────────────────────
 * TabBar — underline tab strip
 * ─────────────────────────────────────────── */
const DASHBOARD_TABS = [
    { id: 'queue', label: 'DJ Dashboard', icon: <ListMusic size={14} aria-hidden />, grad: '#3b82f6,#8b5cf6' },
    { id: 'events', label: 'Festival Library', icon: <Library size={14} aria-hidden />, grad: '#8b5cf6,#f43f5e' },
];

const TabBar = ({ activeTab, setActiveTab }) => {
    const { isLight } = useTheme();
    return (
    <div
        className="flex gap-6 px-1"
        style={{ borderBottom: isLight ? '1px solid rgba(59,130,246,0.14)' : '1px solid rgba(255,255,255,0.08)' }}
        role="tablist"
        aria-label="Dashboard tabs"
    >
        {DASHBOARD_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
                <button
                    key={tab.id}
                    role="tab"
                    aria-selected={isActive}
                    id={`tab-${tab.id}`}
                    aria-controls={`panel-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className="
            flex items-center gap-1.5 pb-3 text-[13px] font-semibold relative
            transition-colors duration-200 min-h-[44px]
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 focus-visible:rounded-t
          "
                    style={{
                        color: isActive
                            ? (isLight ? '#0f172a' : 'rgba(255,255,255,0.92)')
                            : (isLight ? '#94a3b8' : 'rgba(255,255,255,0.35)'),
                        marginBottom: '-1px',
                    }}
                >
                    {tab.icon}
                    {tab.label}
                    {isActive && (
                        <span
                            className="absolute bottom-0 left-0 right-0 h-[2.5px] rounded-full"
                            style={{ background: `linear-gradient(90deg,${tab.grad})` }}
                        />
                    )}
                </button>
            );
        })}
    </div>
    );
};

/* ─────────────────────────────────────────────
 * TimeInput — local state wrapper to prevent re-render focus loss
 * ─────────────────────────────────────────── */
const DayTimeInput = ({ value, onChange, ariaLabel }) => {
    const [localValue, setLocalValue] = useState(value || '00:00');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalValue(value || '00:00');
    }, [value]);

    const handleChange = (e) => {
        setLocalValue(e.target.value);
        onChange(e.target.value);
    };

    return (
        <input
            type="time"
            value={localValue}
            onChange={handleChange}
            className="input-premium w-full px-3 py-2 rounded-[10px] text-[12px] font-semibold relative z-10"
            aria-label={ariaLabel}
        />
    );
};

/* ─────────────────────────────────────────────
 * SessionCard — one schedule session block
 * ─────────────────────────────────────────── */
const SESSION_CONFIG = {
    morning: { label: 'ภาคเช้า', color: '#f59e0b', glow: 'rgba(245,158,11,0.22)', border: 'rgba(245,158,11,0.30)' },
    noon: { label: 'พักเที่ยง', color: '#06b6d4', glow: 'rgba(6,182,212,0.20)', border: 'rgba(6,182,212,0.28)' },
    afternoon: { label: 'ภาคบ่าย', color: '#8b5cf6', glow: 'rgba(139,92,246,0.22)', border: 'rgba(139,92,246,0.30)' },
};

const SessionCard = ({ session, dayData = {}, events, onTimeChange, onModeChange, onToggleActive }) => {
    const cfg = SESSION_CONFIG[session];
    const isActive = !!dayData?.active;
    const sessionData = dayData || {};
    const { isLight } = useTheme();

    return (
        <div
            className="relative overflow-hidden transition-all duration-200"
            style={{
                borderRadius: '16px',
                padding: '15px',
                background: isActive
                    ? (isLight ? `rgba(${cfg.color === '#f59e0b' ? '245,158,11' : cfg.color === '#06b6d4' ? '6,182,212' : '139,92,246'},0.10)` : cfg.glow)
                    : (isLight ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.03)'),
                border: isActive
                    ? `1.5px solid ${cfg.border}`
                    : (isLight ? '1px dashed rgba(59,130,246,0.18)' : '1px dashed rgba(255,255,255,0.08)'),
                boxShadow: isActive ? `0 4px 20px ${cfg.glow}` : 'none',
            }}
        >
            {/* Left accent bar */}
            {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full" style={{ background: cfg.color }} aria-hidden />
            )}

            {/* Header row */}
            <div className="flex items-center justify-between mb-3 pl-1">
                <div className="flex items-center gap-2">
                    <span
                        className="w-2 h-2 rounded-full"
                        style={{ background: cfg.color, boxShadow: isActive ? `0 0 6px ${cfg.color}` : 'none' }}
                        aria-hidden
                    />
                    <span
                        className="text-[12px] font-black uppercase tracking-wider"
                        style={{ color: isActive ? (isLight ? '#0f172a' : 'rgba(255,255,255,0.82)') : (isLight ? '#94a3b8' : 'rgba(255,255,255,0.28)') }}
                    >
                        {cfg.label}
                    </span>
                </div>
                <button
                    onClick={onToggleActive}
                    aria-pressed={isActive}
                    aria-label={`${isActive ? 'ปิด' : 'เปิด'} ${cfg.label}`}
                    className="
            flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold min-h-[30px]
            transition-all duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70
          "
                    style={isActive
                        ? { background: 'rgba(16,185,129,0.15)', color: '#059669', border: '1px solid rgba(16,185,129,0.30)' }
                        : { background: isLight ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.05)', color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.30)', border: isLight ? '1px solid rgba(59,130,246,0.12)' : '1px solid rgba(255,255,255,0.08)' }
                    }
                >
                    {isActive ? <><CheckCircle2 size={10} aria-hidden />Active</> : <><X size={10} aria-hidden />Off</>}
                </button>
            </div>

            {/* Mode selector */}
            <div
                className={`flex gap-1 p-1 rounded-[10px] mb-3 ${!isActive ? 'opacity-30 pointer-events-none' : ''}`}
                style={{
                    background: isLight ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.04)',
                    border: isLight ? '1px solid rgba(59,130,246,0.12)' : '1px solid rgba(255,255,255,0.07)'
                }}
                role="group"
                aria-label="โหมดการเล่น"
            >
                {['queue', 'event'].map(mode => {
                    const isSelected = mode === 'queue'
                        ? sessionData.mode !== 'event'
                        : sessionData.mode === 'event';
                    return (
                        <button
                            key={mode}
                            onClick={() => mode === 'queue'
                                ? onModeChange(session, 'queue')
                                : onModeChange(session, 'event', sessionData.targetEvent || events[0])
                            }
                            aria-pressed={isSelected}
                            className="
                flex-1 py-1.5 rounded-[8px] text-[11px] font-bold transition-all duration-150
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60
              "
                            style={isSelected
                                ? { background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', color: '#fff', boxShadow: '0 2px 10px rgba(139,92,246,0.35)' }
                                : { color: isLight ? '#64748b' : 'rgba(255,255,255,0.30)' }
                            }
                        >
                            {mode === 'queue' ? '🎓 Student' : '🎪 Festival'}
                        </button>
                    );
                })}
            </div>

            {/* Event selector */}
            {sessionData.mode === 'event' && isActive && (
                <select
                    value={sessionData.targetEvent || ''}
                    onChange={e => onModeChange(session, 'event', e.target.value)}
                    className="input-premium w-full px-3 py-2 rounded-[10px] text-[12px] mb-3"
                    aria-label="เลือกคลัง Festival"
                >
                    {events.length === 0
                        ? <option>ยังไม่มีคลัง</option>
                        : events.map(e => <option key={e} value={e}>{e}</option>)
                    }
                </select>
            )}

            {/* Time inputs */}
            <div className={`flex gap-3 ${!isActive ? 'opacity-30 pointer-events-none' : ''}`}>
                {['start', 'end'].map(field => (
                    <div key={field} className="flex-1">
                        <label className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.30)' }}>
                                {field === 'start' ? 'เริ่ม' : 'สิ้นสุด'}
                            </span>
                            {field === 'end' && (
                                <button
                                    onClick={() => onTimeChange(session, 'end', '24:00')}
                                    className="text-[10px] font-bold text-violet-400 hover:text-violet-300 focus-visible:outline-none transition-colors"
                                    aria-label="ไม่มีหมดเวลา"
                                >
                                    ∞
                                </button>
                            )}
                        </label>
                        {sessionData[field] === '24:00' && field === 'end' ? (
                            <div className="input-premium w-full px-3 py-2 rounded-[10px] text-[12px] text-violet-400 flex items-center justify-between">
                                <span>ไม่มีหมดเวลา</span>
                                <button
                                    onClick={() => onTimeChange(session, 'end', '23:59')}
                                    className="text-white/20 hover:text-white/60 focus-visible:outline-none transition-colors"
                                    aria-label="ล้างค่า"
                                >
                                    <X size={12} aria-hidden />
                                </button>
                            </div>
                        ) : (
                            <DayTimeInput
                                value={sessionData[field] || '00:00'}
                                onChange={val => onTimeChange(session, field, val)}
                                ariaLabel={`${cfg.label} ${field === 'start' ? 'เวลาเริ่ม' : 'เวลาสิ้นสุด'}`}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
 * Main ManagerDashboard
 * ─────────────────────────────────────────── */
const ManagerDashboard = ({
    isSystemActive, volume, handleVolumeChange,
    isRequestsEnabled, toggleRequestLock,
    handleSaveSchedule, selectedDay, setSelectedDay, schedule, setSchedule, daysTh,
    playerComponent, queueComponent,
    eventPlaylists, addEventPlaylist, deleteEventPlaylist, addSongToEvent, deleteSongFromEvent,
    addRequest, showToast,
    playbackMode, activeEvent, setPlaybackMode,
    maxSongDuration, setMaxDuration,
    activeTab, setActiveTab,
    onChangePassword,
    isPrimaryBroadcaster, setIsPrimaryBroadcaster,
    history = []
}) => {
    const { isLight } = useTheme();
    const [showHistory, setShowHistory] = useState(false);
    const toggleSessionActive = (s) => {
        const currentData = schedule[selectedDay]?.[s] || {};
        const updatedSession = { ...currentData, active: !currentData.active };
        const updatedSchedule = { ...schedule, [selectedDay]: { ...schedule[selectedDay], [s]: updatedSession } };
        
        // 1. Update local state for immediate UI feedback
        setSchedule(updatedSchedule);

        // 2. Persist to Firebase immediately
        handleSaveSchedule(updatedSchedule);
    };

    const handleModeChangeSync = (s, mode, targetEvent = null) => {
        const updatedSchedule = { 
            ...schedule, 
            [selectedDay]: { 
                ...schedule[selectedDay], 
                [s]: { ...schedule[selectedDay]?.[s], mode, targetEvent } 
            } 
        };
        setSchedule(updatedSchedule);
        handleSaveSchedule(updatedSchedule);
    };

    const handleTimeChangeSync = (s, f, v) => {
        const updatedSchedule = { 
            ...schedule, 
            [selectedDay]: { 
                ...schedule[selectedDay], 
                [s]: { ...schedule[selectedDay]?.[s], [f]: v } 
            } 
        };
        setSchedule(updatedSchedule);
        // We might want to avoid saving on every single keystroke of time, 
        // but here it's simple enough or the user can click 'Save' if they prefer.
        // For now, let's keep the handleSaveSchedule call at the end to be safe.
        // We'll keep the main 'Save' button too for peace of mind.
    };

    const events = Object.keys(eventPlaylists || {}).sort();
    const textSub = isLight ? '#64748b' : 'rgba(255,255,255,0.35)';
    const textDim = isLight ? '#94a3b8' : 'rgba(255,255,255,0.28)';


    return (
        <div className="space-y-5 py-6 pb-16 animate-fade-in">

            {/* ═══════ BENTO STATS ═══════ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" role="region" aria-label="System Status">

                {/* System Status */}
                <StatCard accent="blue">
                    <StatCard.Header label="System Status" accent="blue" isLight={isLight} />
                    <StatCard.Body>
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSystemActive ? 'bg-emerald-400 animate-heartbeat' : 'bg-rose-500'}`}
                                style={isSystemActive ? { boxShadow: '0 0 8px rgba(52,211,153,0.80)' } : { boxShadow: '0 0 8px rgba(244,63,94,0.80)' }}
                                aria-hidden
                            />
                            <span className="text-[17px] font-bold" style={{ color: isSystemActive ? '#6ee7b7' : '#fda4af' }}>
                                {isSystemActive ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <p className="text-[11px]" style={{ color: textSub }}>
                            {isSystemActive ? 'ระบบออกอากาศทำงานปกติ' : 'ระบบปิดทำการอยู่'}
                        </p>
                    </StatCard.Body>
                    <StatCard.Footer>
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => window.location.reload()}
                                className="
                    w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[12px]
                    text-[12px] font-semibold min-h-[40px]
                    bg-blue-500/15 border border-blue-500/25 text-blue-300
                    hover:bg-blue-500/30 hover:text-blue-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70
                    active:scale-95
                    transition-all duration-150
                  "
                                aria-label="รีเฟรชหน้าจอ"
                            >
                                <RefreshCw size={13} aria-hidden />รีเฟรช
                            </button>
                            <button
                                onClick={onChangePassword}
                                className="
                    w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[12px]
                    text-[12px] font-semibold min-h-[40px]
                    bg-violet-500/15 border border-violet-500/25 text-violet-300
                    hover:bg-violet-500/30 hover:text-violet-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70
                    active:scale-95
                    transition-all duration-150
                  "
                                aria-label="เปลี่ยนรหัสผ่าน"
                            >
                                <KeyRound size={13} aria-hidden />เปลี่ยนรหัสผ่าน
                            </button>
                        </div>
                    </StatCard.Footer>
                </StatCard>

                {/* Playback Mode */}
                <StatCard accent="violet" style={playbackMode === 'event' ? { background: 'rgba(139,92,246,0.08)' } : {}}>
                    <StatCard.Header label="Playback Mode" accent="violet" isLight={isLight} />
                    <StatCard.Body>
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Music size={14} className="text-violet-400 flex-shrink-0" aria-hidden />
                                    <span className="text-[15px] font-bold text-white/90 truncate max-w-[90px]">
                                        {playbackMode === 'event' ? activeEvent : 'Queue Mode'}
                                    </span>
                                </div>
                                <p className="text-[11px]" style={{ color: textSub }}>
                                    {playbackMode === 'event' ? '🎪 Festival Mode' : '🎵 Student Queue'}
                                </p>
                            </div>
                            {playbackMode === 'event' && (
                                <button
                                    onClick={() => setPlaybackMode('queue')}
                                    className="
                    text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 min-h-[30px]
                    bg-violet-500/25 border border-violet-500/40 text-violet-300
                    hover:bg-violet-500/45 hover:text-violet-100
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70
                    active:scale-95 transition-all duration-150
                  "
                                    aria-label="รีเซ็ตโหมดการเล่น"
                                >
                                    Reset
                                </button>
                            )}
                        </div>
                    </StatCard.Body>
                    <StatCard.Footer>
                        <button
                            onClick={() => setShowHistory(true)}
                            className="
                                w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[12px]
                                text-[12px] font-semibold min-h-[40px]
                                bg-violet-500/15 border border-violet-500/25 text-violet-300
                                hover:bg-violet-500/30 hover:text-violet-200
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70
                                active:scale-95 transition-all duration-150
                            "
                            aria-label="ดูประวัติเพลง"
                        >
                            <History size={13} aria-hidden /> ประวัติการเล่น
                        </button>
                    </StatCard.Footer>
                </StatCard>

                {/* Requests & Queue Settings */}
                <StatCard accent={isRequestsEnabled ? 'emerald' : 'rose'}>
                    <StatCard.Header label="Requests & Settings" accent={isRequestsEnabled ? 'emerald' : 'rose'} isLight={isLight} />
                    
                    {/* Body: Request Toggle */}
                    <StatCard.Body>
                        <div 
                           className="flex items-center justify-between cursor-pointer rounded-xl transition-all duration-200 hover:bg-white/5 p-2 -mx-2 -my-1"
                           onClick={() => toggleRequestLock(!isRequestsEnabled)}
                           role="button"
                           tabIndex={0}
                           aria-label="Toggle Request Status"
                        >
                            <div>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    {isRequestsEnabled
                                        ? <Unlock size={15} className="text-emerald-400" aria-hidden />
                                        : <Lock size={15} className="text-rose-400" aria-hidden />
                                    }
                                    <span className={`text-[17px] font-bold ${isRequestsEnabled ? 'text-emerald-300' : 'text-rose-300'}`}>
                                        {isRequestsEnabled ? 'เปิดรับ' : 'ปิดรับ'}
                                    </span>
                                </div>
                                <p className="text-[11px]" style={{ color: textDim }}>แตะเพื่อเปลี่ยนสถานะเปิด/ปิดรับเพลง</p>
                            </div>
                            <div
                                className={`toggle-track flex-shrink-0 ${isRequestsEnabled ? 'toggle-on' : 'toggle-off'} pointer-events-none`}
                                aria-hidden
                            >
                                <div className="toggle-thumb" />
                            </div>
                        </div>
                    </StatCard.Body>
                    
                    {/* Footer: Max Song Length Slider */}
                    <StatCard.Footer>
                        <div className="flex items-center justify-between gap-3 mb-2 px-1">
                            <div className="flex items-center gap-1.5">
                                <Timer size={14} className="text-amber-400" aria-hidden />
                                <span className="text-[11px] font-bold text-white/70 uppercase tracking-wider">Max Length</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-[15px] font-black text-amber-400">{maxSongDuration}</span>
                                <span className="text-[10px] text-white/50 font-medium">นาที</span>
                            </div>
                        </div>
                        <input
                            type="range" min="1" max="60" value={maxSongDuration}
                            onChange={e => setMaxDuration(parseInt(e.target.value))}
                            className="w-full"
                            style={{ background: `linear-gradient(to right, #f59e0b ${(maxSongDuration / 60) * 100}%, rgba(255,255,255,0.10) 0%)` }}
                            aria-label={`ความยาวสูงสุด ${maxSongDuration} นาที`}
                        />
                    </StatCard.Footer>
                </StatCard>

                {/* Display & Broadcast */}
                <StatCard accent="indigo">
                    <StatCard.Header label="Display & Controls" accent="indigo" isLight={isLight} />
                    <StatCard.Body>
                        <div className="flex flex-col gap-3 h-full justify-center">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 ${isPrimaryBroadcaster ? 'bg-indigo-500' : (isLight ? 'bg-slate-300' : 'bg-slate-700/60')}`}>
                                    <div className={`absolute left-0.5 top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm ${isPrimaryBroadcaster ? 'translate-x-3.5' : 'translate-x-0'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={isPrimaryBroadcaster}
                                    onChange={(e) => setIsPrimaryBroadcaster(e.target.checked)}
                                />
                                <span className="text-[12px] font-bold text-white/90 group-hover:text-white transition-colors flex items-center gap-1.5">
                                    <Radio size={13} className={isPrimaryBroadcaster ? "text-indigo-400" : "text-slate-400"} />
                                    ตั้งเป็นเครื่องออกอากาศหลัก
                                </span>
                            </label>
                            
                            <p className="text-[10px] leading-tight mt-[-6px] ml-[40px]" style={{ color: textSub }}>
                                ควบคุมการข้ามเพลงอัตโนมัติหากคลิปเล่นไม่ได้ (ควรเปิดไว้แค่เครื่องหลักเครื่องเดียว)
                            </p>
                        </div>
                    </StatCard.Body>
                    <StatCard.Footer>
                        <button
                            onClick={() => window.open('?mode=display', '_blank')}
                            className="
                    w-full flex items-center justify-center gap-1.5 py-2.5 rounded-[12px]
                    text-[12px] font-semibold min-h-[40px]
                    bg-indigo-500/15 border border-indigo-500/25 text-indigo-300
                    hover:bg-indigo-500/30 hover:text-indigo-200
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/70
                    active:scale-95
                    transition-all duration-150
                  "
                            aria-label="เปิดโหมดจอภาพ"
                        >
                            <MonitorPlay size={13} aria-hidden />เปิดโหมดฉายจอทีวี
                        </button>
                    </StatCard.Footer>
                </StatCard>

                {/* Volume — full width */}
                <StatCard accent="cyan" style={{ gridColumn: '1 / -1', borderRadius: '18px', padding: '18px 22px' }}>
                    <StatCard.Header label="Volume Control & Shortcuts" accent="cyan" isLight={isLight} />
                    <StatCard.Body>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {volume === 0
                                    ? <VolumeX size={17} style={{ color: 'rgba(255,255,255,0.30)' }} aria-hidden />
                                    : <Volume2 size={17} className="text-cyan-400" aria-hidden />
                                }
                            </div>
                            <span className="text-[14px] font-black text-gradient-cyan">{volume}%</span>
                        </div>
                        <CustomVolumeSlider 
                            value={volume} 
                            onChange={handleVolumeChange} 
                        />
                        {/* Keyboard Shortcuts Hint */}
                        <div className="mt-5 pt-3 border-t flex flex-wrap gap-2 justify-center" style={{ borderColor: isLight ? 'rgba(6,182,212,0.1)' : 'rgba(34,211,238,0.1)' }}>
                            {[
                                'Space : Play/Pause',
                                'M : Mute',
                                '↑ / ↓ : Volume ±5%',
                                '← / → : Seek ±10s',
                                'Shift+N : Next Song',
                                'R : Reload Player',
                                '0–9 : Volume Preset',
                            ].map(hint => (
                                <span key={hint} className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-[8px] ${isLight ? 'bg-cyan-500/10 text-cyan-800' : 'bg-cyan-500/15 text-cyan-200'}`}>
                                    {hint}
                                </span>
                            ))}
                        </div>
                    </StatCard.Body>
                </StatCard>
            </div>

            {/* ═══════ TAB BAR ═══════ */}
            <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* ═══════ MAIN CONTENT ═══════ */}
            {activeTab === 'queue' ? (
                <div
                    id="panel-queue"
                    role="tabpanel"
                    aria-labelledby="tab-queue"
                    className="grid grid-cols-1 xl:grid-cols-3 gap-5"
                >
                    {/* Schedule Panel */}
                    <div
                        className="xl:col-span-1 relative overflow-hidden"
                        style={{
                            background: isLight ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.05)',
                            backdropFilter: 'blur(24px)',
                            WebkitBackdropFilter: 'blur(24px)',
                            border: isLight ? '1px solid rgba(59,130,246,0.16)' : '1px solid rgba(255,255,255,0.09)',
                            borderRadius: '24px',
                            padding: '24px',
                            boxShadow: isLight ? '0 4px 24px rgba(59,130,246,0.08)' : '0 8px 40px rgba(0,0,0,0.30)',
                        }}
                    >
                        {/* Vivid top strip */}
                        <div
                            className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[24px]"
                            style={{ background: 'linear-gradient(90deg,#3b82f6,#8b5cf6,#f43f5e)' }}
                            aria-hidden
                        />

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6 mt-2">
                            <div
                                className="w-9 h-9 min-w-[36px] rounded-[11px] flex items-center justify-center"
                                style={{ background: 'rgba(59,130,246,0.20)', border: '1px solid rgba(59,130,246,0.35)' }}
                                aria-hidden
                            >
                                <Clock size={16} className="text-blue-400" />
                            </div>
                            <div>
                                <p className="text-[15px] font-bold" style={{ color: isLight ? '#0f172a' : 'rgba(255,255,255,0.90)' }}>DJ Schedule</p>
                                <p className="text-[11px]" style={{ color: textSub }}>กำหนดเวลาเปิดเพลงประจำวัน</p>
                            </div>
                        </div>

                        <DaySelector selectedDay={selectedDay} setSelectedDay={setSelectedDay} daysTh={daysTh} />

                        <div className="space-y-3">
                            {['morning', 'noon', 'afternoon'].map(session => (
                                <SessionCard
                                    key={session}
                                    session={session}
                                    dayData={schedule[selectedDay]?.[session]}
                                    events={events}
                                    onTimeChange={handleTimeChangeSync}
                                    onModeChange={handleModeChangeSync}
                                    onToggleActive={() => toggleSessionActive(session)}
                                />
                            ))}
                        </div>

                        {/* Save button */}
                        <button
                            onClick={() => handleSaveSchedule(schedule)}
                            className="btn-primary w-full mt-5 py-3.5 rounded-[16px] text-[13px] font-bold flex items-center justify-center gap-2"
                            aria-label="บันทึกตารางเวลา"
                        >
                            <CheckCircle2 size={15} aria-hidden /> บันทึกตารางเวลา (ยืนยันค่า)
                        </button>
                    </div>

                    {/* Player + Queue */}
                    <div className="xl:col-span-2 flex flex-col gap-5">
                        {playerComponent}
                        {queueComponent}
                    </div>
                </div>
            ) : (
                <div id="panel-events" role="tabpanel" aria-labelledby="tab-events">
                    <EventPlaylistManager
                        eventPlaylists={eventPlaylists}
                        addEventPlaylist={addEventPlaylist}
                        deleteEventPlaylist={deleteEventPlaylist}
                        addSongToEvent={addSongToEvent}
                        deleteSongFromEvent={deleteSongFromEvent}
                        addRequest={addRequest}
                        playbackMode={playbackMode}
                        activeEvent={activeEvent}
                        setPlaybackMode={setPlaybackMode}
                        showToast={showToast}
                    />
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div role="dialog" aria-labelledby="history-modal" aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#020617]/80 backdrop-blur-sm transition-opacity" onClick={() => setShowHistory(false)} aria-hidden="true" />
                    <div className={`relative w-full max-w-lg rounded-[20px] p-6 shadow-2xl ${isLight ? 'bg-white/90 border-slate-200 shadow-slate-200/50' : 'bg-[#0f172a]/90 border-[#1e293b] shadow-black/50'} border backdrop-blur-md transition-all`}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <History size={20} className="text-violet-400" />
                                <h3 id="history-modal" className={`text-lg font-bold ${isLight ? 'text-slate-800' : 'text-white'}`}>ประวัติเพลงที่เล่นจบไปแล้ว</h3>
                            </div>
                            <button onClick={() => setShowHistory(false)} className={`p-2 rounded-full transition-colors ${isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/10'}`} aria-label="ปิดประวัติ">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2">
                            {history.length > 0 ? (
                                history.map((item, idx) => (
                                    <div key={item.id + idx} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isLight ? 'bg-slate-50 border-slate-100 hover:border-slate-300' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm font-bold truncate ${isLight ? 'text-slate-800' : 'text-white'}`}>{item.title}</p>
                                            <p className={`text-xs truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ขอโดย: {item.student || 'Auto-DJ'}</p>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                addRequest(item.url, item.title, "แอดมิน");
                                                showToast("เพิ่มกลับเข้าคิวแล้ว", "success");
                                            }}
                                            className="whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 rounded-lg text-[11px] font-bold transition-colors"
                                        >
                                            <Plus size={12} /> เข้าคิว
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <p className={`text-center py-6 text-sm ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีประวัติการเล่นเพลง</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManagerDashboard;
