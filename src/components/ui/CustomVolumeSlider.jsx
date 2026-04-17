import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';

/**
 * @component CustomVolumeSlider (Precision DJ Fader)
 *
 * Volume control สไตล์ mixing console — มี arc meter แสดงระดับเสียง,
 * segmented level indicators, และ haptic-feel thumb ที่ตอบสนองลื่นไหล
 *
 * Props:
 *  - value: number (0–100)
 *  - onChange: (newValue: number) => void
 *  - min / max: number
 */
const CustomVolumeSlider = ({ value = 48, onChange, min = 0, max = 100 }) => {
    const trackRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const [isHovering, setIsHovering] = useState(false);

    const pct = Math.max(0, Math.min(100, ((localValue - min) / (max - min)) * 100));

    // Sync external value
    useEffect(() => { setLocalValue(value); }, [value]);

    /* ── Pointer interaction ── */
    const commit = useCallback((clientX) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const newVal = Math.round(ratio * (max - min) + min);
        setLocalValue(newVal);
        onChange?.(newVal);
    }, [max, min, onChange]);

    const onPointerDown = (e) => {
        setIsDragging(true);
        trackRef.current?.setPointerCapture(e.pointerId);
        commit(e.clientX);
    };
    const onPointerMove = (e) => { if (isDragging) commit(e.clientX); };
    const onPointerUp = () => setIsDragging(false);

    /* ── Keyboard support ── */
    const onKeyDown = (e) => {
        let next = localValue;
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(max, localValue + 1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(min, localValue - 1);
        else if (e.key === 'Home') next = min;
        else if (e.key === 'End') next = max;
        else return;
        e.preventDefault();
        setLocalValue(next);
        onChange?.(next);
    };

    /* ── Segmented level marks ── */
    const segments = useMemo(() => {
        const count = 20;
        return Array.from({ length: count }, (_, i) => {
            const segPct = ((i + 1) / count) * 100;
            const active = pct >= segPct;
            // Color zones: green(0-60) → amber(60-80) → red(80-100)
            let hue;
            if (segPct <= 60) hue = 160 + (segPct / 60) * 20;       // teal → green
            else if (segPct <= 80) hue = 60 - ((segPct - 60) / 20) * 20; // yellow → amber
            else hue = 10 - ((segPct - 80) / 20) * 10;              // orange → red
            return { segPct, active, hue };
        });
    }, [pct]);

    /* ── Quick-set presets ── */
    const presets = [
        { label: 'Mute', val: 0, icon: '🔇' },
        { label: '25%',  val: 25 },
        { label: '50%',  val: 50 },
        { label: '75%',  val: 75 },
        { label: 'Max',  val: 100, icon: '🔊' },
    ];

    /* ── Derived colors ── */
    const accentHue = pct <= 60 ? 175 : pct <= 80 ? 45 : 5;
    const accentColor = `oklch(0.75 0.18 ${accentHue})`;
    const accentGlow  = `oklch(0.65 0.20 ${accentHue} / 0.4)`;

    return (
        <div
            style={{ width: '100%', fontFamily: "'Plus Jakarta Sans', 'Noto Sans Thai', system-ui, sans-serif" }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* ── Segmented level meter ── */}
            <div style={{
                display: 'flex',
                gap: '2px',
                marginBottom: '14px',
                height: '28px',
                alignItems: 'flex-end',
                padding: '0 2px',
            }}>
                {segments.map((seg, i) => {
                    const barHeight = 8 + (i / segments.length) * 20;
                    return (
                        <div key={i} style={{
                            flex: 1,
                            height: `${barHeight}px`,
                            borderRadius: '2px',
                            background: seg.active
                                ? `oklch(0.72 0.19 ${seg.hue})`
                                : 'var(--glass-10, rgba(255,255,255,0.06))',
                            boxShadow: seg.active
                                ? `0 0 8px oklch(0.60 0.20 ${seg.hue} / 0.5)`
                                : 'none',
                            transition: 'background 0.12s ease, box-shadow 0.12s ease, height 0.15s ease',
                            opacity: seg.active ? 1 : 0.35,
                        }} />
                    );
                })}
            </div>

            {/* ── Main slider track ── */}
            <div
                ref={trackRef}
                role="slider"
                tabIndex={0}
                aria-valuenow={localValue}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-label="Volume"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onKeyDown={onKeyDown}
                style={{
                    position: 'relative',
                    width: '100%',
                    height: '8px',
                    borderRadius: '100px',
                    background: 'var(--glass-10, rgba(255,255,255,0.08))',
                    cursor: 'pointer',
                    touchAction: 'none',
                    outline: 'none',
                }}
            >
                {/* Filled portion */}
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: `${pct}%`,
                    borderRadius: '100px',
                    background: `linear-gradient(90deg, oklch(0.72 0.16 175), ${accentColor})`,
                    boxShadow: `0 0 16px ${accentGlow}`,
                    transition: isDragging ? 'none' : 'width 0.15s ease',
                }} />

                {/* Notch marks every 25% */}
                {[25, 50, 75].map(mark => (
                    <div key={mark} style={{
                        position: 'absolute',
                        left: `${mark}%`,
                        top: '-3px',
                        bottom: '-3px',
                        width: '1px',
                        background: 'var(--border-dim, rgba(255,255,255,0.12))',
                        pointerEvents: 'none',
                        opacity: 0.5,
                    }} />
                ))}

                {/* Thumb */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: `${pct}%`,
                    transform: `translate(-50%, -50%) scale(${isDragging ? 1.25 : isHovering ? 1.1 : 1})`,
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    background: '#fff',
                    border: `2.5px solid ${accentColor}`,
                    boxShadow: isDragging
                        ? `0 0 0 6px ${accentGlow}, 0 2px 12px rgba(0,0,0,0.35)`
                        : `0 2px 8px rgba(0,0,0,0.30), 0 0 0 2px ${accentGlow}`,
                    transition: isDragging
                        ? 'transform 0.08s ease, box-shadow 0.08s ease'
                        : 'left 0.15s ease, transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease, border-color 0.15s ease',
                    zIndex: 10,
                    cursor: 'grab',
                    pointerEvents: 'none',
                }}>
                    {/* Center grip lines */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        gap: '2px',
                    }}>
                        {[0, 1, 2].map(j => (
                            <div key={j} style={{
                                width: '1.5px',
                                height: '8px',
                                borderRadius: '1px',
                                background: accentColor,
                                opacity: 0.6,
                            }} />
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Preset buttons ── */}
            <div style={{
                display: 'flex',
                gap: '6px',
                marginTop: '14px',
                justifyContent: 'center',
            }}>
                {presets.map((p) => {
                    const isActive = localValue === p.val;
                    return (
                        <button
                            key={p.val}
                            onClick={() => { setLocalValue(p.val); onChange?.(p.val); }}
                            aria-label={`ตั้งเสียง ${p.label}`}
                            style={{
                                flex: 1,
                                maxWidth: '72px',
                                padding: '6px 0',
                                borderRadius: '8px',
                                border: isActive
                                    ? `1.5px solid ${accentColor}`
                                    : '1px solid var(--border-dim, rgba(255,255,255,0.10))',
                                background: isActive
                                    ? `color-mix(in oklch, ${accentColor} 15%, transparent)`
                                    : 'var(--glass-10, rgba(255,255,255,0.04))',
                                color: isActive
                                    ? accentColor
                                    : 'var(--text-50, rgba(255,255,255,0.40))',
                                fontSize: '11px',
                                fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.18s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '3px',
                                lineHeight: 1,
                                minHeight: '32px',
                            }}
                        >
                            {p.icon && <span style={{ fontSize: '12px' }}>{p.icon}</span>}
                            {p.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CustomVolumeSlider;