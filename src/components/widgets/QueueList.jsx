import React, { useState } from 'react';
import { ListMusic, Play, Trash2, GripVertical, Headphones } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const ACCENT_GRADIENTS = [
    'linear-gradient(135deg,#3b82f6,#8b5cf6)',
    'linear-gradient(135deg,#8b5cf6,#f43f5e)',
    'linear-gradient(135deg,#f43f5e,#f59e0b)',
];

const ACCENT_BORDER = [
    'rgba(59,130,246,0.55)',
    'rgba(139,92,246,0.55)',
    'rgba(244,63,94,0.55)',
];

const QueueList = ({ requests, playNextSong, moveInQueue, handleDeleteRequest, isAdmin = false }) => {
    const [draggedId, setDraggedId] = useState(null);
    const [overId, setOverId] = useState(null);
    const { isLight } = useTheme();

    const handleDragStart = (e, id) => { setDraggedId(id); e.dataTransfer.effectAllowed = 'move'; };
    const handleDragOver = (e, id) => { e.preventDefault(); if (id !== overId) setOverId(id); };
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        const idx = requests.findIndex(r => r.id === targetId);
        if (draggedId && idx !== -1) moveInQueue(draggedId, idx);
        setDraggedId(null); setOverId(null);
    };

    const cardBg = isLight ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.05)';
    const cardBorder = isLight ? 'rgba(59,130,246,0.14)' : 'rgba(255,255,255,0.08)';
    const headerBorder = isLight ? 'rgba(59,130,246,0.10)' : 'rgba(255,255,255,0.07)';
    const textMain = isLight ? '#0f172a' : 'rgba(255,255,255,0.85)';
    const textDim = isLight ? '#94a3b8' : 'rgba(255,255,255,0.28)';
    const emptyColor = isLight ? 'rgba(59,130,246,0.22)' : 'rgba(255,255,255,0.18)';

    return (
        <div
            className="flex flex-col overflow-hidden"
            style={{
                height: 460,
                background: cardBg,
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: `1px solid ${cardBorder}`,
                borderRadius: '20px',
                boxShadow: isLight ? '0 4px 24px rgba(59,130,246,0.08)' : '0 8px 40px rgba(0,0,0,0.30)',
                position: 'relative',
            }}
            role="region"
            aria-label="รายการรอเล่น"
        >
            {/* Vivid top strip */}
            <div
                className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[20px]"
                style={{ background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #f43f5e)' }}
                aria-hidden
            />

            {/* Header */}
            <div
                className="px-5 pt-5 pb-4 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: `1px solid ${headerBorder}` }}
            >
                <div className="flex items-center gap-2.5">
                    <div
                        className="w-8 h-8 min-w-[32px] rounded-[9px] flex items-center justify-center"
                        style={{ background: 'rgba(59,130,246,0.20)', border: '1px solid rgba(59,130,246,0.35)' }}
                        aria-hidden
                    >
                        <ListMusic size={14} className="text-blue-400" />
                    </div>
                    <p className="text-[14px] font-bold" style={{ color: textMain }}>รายการรอเล่น</p>
                </div>
                <span className="badge badge-blue" aria-label={`${requests.length} คิว`}>{requests.length} คิว</span>
            </div>

            {/* List */}
            <div
                className="flex-1 overflow-y-auto p-3 space-y-1.5"
                onDragOver={e => e.preventDefault()}
                role="list"
            >
                {requests.length === 0 ? (
                    <div
                        className="h-full flex flex-col items-center justify-center gap-3 animate-fade-in"
                        style={{ color: emptyColor }}
                        aria-live="polite"
                    >
                        <Headphones size={36} aria-hidden />
                        <p className="text-[11px] font-black uppercase tracking-widest">ยังไม่มีคำขอเพลง</p>
                    </div>
                ) : (
                    requests.map((req, idx) => {
                        const isDragging = draggedId === req.id;
                        const isTarget = overId === req.id && draggedId !== req.id;
                        const accentIdx = idx % 3;

                        return (
                            <div
                                key={req.id}
                                role="listitem"
                                aria-label={`ลำดับที่ ${idx + 1}: ${req.title || req.url}`}
                                draggable={isAdmin}
                                onDragStart={e => handleDragStart(e, req.id)}
                                onDragOver={e => handleDragOver(e, req.id)}
                                onDrop={e => handleDrop(e, req.id)}
                                onDragEnd={() => { setDraggedId(null); setOverId(null); }}
                                className={`
                  group flex items-center p-3 gap-3 rounded-[14px]
                  transition-all duration-150
                  animate-fade-in-up
                  ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''}
                `}
                                style={{
                                    background: isDragging
                                        ? (isLight ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.02)')
                                        : isTarget
                                            ? 'rgba(139,92,246,0.10)'
                                            : (isLight ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.04)'),
                                    border: isTarget
                                        ? '1px solid rgba(139,92,246,0.40)'
                                        : (isLight ? '1px solid rgba(59,130,246,0.10)' : '1px solid rgba(255,255,255,0.06)'),
                                    borderLeft: `3px solid ${ACCENT_BORDER[accentIdx]}`,
                                    opacity: isDragging ? 0.40 : 1,
                                    animationDelay: `${idx * 45}ms`,
                                }}
                            >
                                {/* Drag handle */}
                                {isAdmin && (
                                    <GripVertical
                                        size={14}
                                        style={{ color: isLight ? '#cbd5e1' : 'rgba(255,255,255,0.15)' }}
                                        className="hidden sm:block flex-shrink-0"
                                        aria-hidden
                                    />
                                )}

                                {/* Index badge */}
                                <span
                                    className="flex-shrink-0 w-7 h-7 min-w-[28px] rounded-[8px] flex items-center justify-center text-white font-black text-[11px]"
                                    style={{ background: ACCENT_GRADIENTS[accentIdx] }}
                                    aria-hidden
                                >
                                    {idx + 1}
                                </span>

                                {/* Song info */}
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-semibold truncate" style={{ color: textMain }}>
                                        {req.title || req.url}
                                    </p>
                                    <p className="text-[11px] mt-0.5" style={{ color: textDim }}>
                                        จาก: <span className="text-violet-500 font-medium">{req.student || 'นักเรียน'}</span>
                                    </p>
                                </div>

                                {/* Admin action buttons */}
                                {isAdmin && (
                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all flex-shrink-0">
                                        <button
                                            onClick={e => { e.stopPropagation(); playNextSong(req); }}
                                            aria-label={`เล่น ${req.title || req.url} ตอนนี้`}
                                            className="btn-icon btn-icon-emerald w-8 h-8 min-w-[32px] rounded-[8px] text-emerald-300 border border-emerald-500/25 bg-emerald-500/15"
                                        >
                                            <Play size={13} fill="currentColor" aria-hidden />
                                        </button>
                                        <button
                                            onClick={e => { e.stopPropagation(); handleDeleteRequest(req.id); }}
                                            aria-label={`ลบ ${req.title || req.url}`}
                                            className="btn-icon btn-icon-rose w-8 h-8 min-w-[32px] rounded-[8px] text-rose-300 border border-rose-500/25 bg-rose-500/15"
                                        >
                                            <Trash2 size={13} aria-hidden />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default QueueList;
