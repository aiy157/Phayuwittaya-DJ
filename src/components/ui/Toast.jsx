import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X, Info } from 'lucide-react';

/**
 * @component Toast
 * Premium dark-glass notification with:
 * - CSS progress bar countdown
 * - Smooth slide-up-fade entrance / scale-out exit
 * - All hover/focus states in pure Tailwind (no inline JS handlers)
 * - Proper ARIA (role=alert, live region)
 */
const TOAST_CONFIG = {
    success: {
        bar: 'linear-gradient(90deg, #22c55e, #16a34a)',
        iconColor: '#86efac',
        Icon: CheckCircle2,
        title: 'ทำรายการสำเร็จ',
        titleColor: '#86efac',
        glow: 'rgba(34,197,94,0.10)',
        border: 'rgba(34,197,94,0.22)',
        barBg: 'rgba(34,197,94,0.25)',
    },
    error: {
        bar: 'linear-gradient(90deg, #ef4444, #dc2626)',
        iconColor: '#fca5a5',
        Icon: AlertCircle,
        title: 'พบข้อผิดพลาด',
        titleColor: '#fca5a5',
        glow: 'rgba(239,68,68,0.10)',
        border: 'rgba(239,68,68,0.22)',
        barBg: 'rgba(239,68,68,0.25)',
    },
    info: {
        bar: 'linear-gradient(90deg, #60a5fa, #3b82f6)',
        iconColor: '#93c5fd',
        Icon: Info,
        title: 'ข้อความจากระบบ',
        titleColor: '#93c5fd',
        glow: 'rgba(59,130,246,0.10)',
        border: 'rgba(59,130,246,0.22)',
        barBg: 'rgba(59,130,246,0.25)',
    },
};

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Tick to trigger CSS transition
        const showTimer = requestAnimationFrame(() => setIsVisible(true));
        const hideTimer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 320);
        }, duration);
        return () => {
            cancelAnimationFrame(showTimer);
            clearTimeout(hideTimer);
        };
    }, [duration, onClose]);

    const c = TOAST_CONFIG[type] || TOAST_CONFIG.info;

    return (
        <div
            className={`
        fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[100]
        transition-all duration-300 ease-out
        ${isVisible
                    ? 'translate-y-0 opacity-100 scale-100'
                    : '-translate-y-3 opacity-0 scale-95 pointer-events-none'
                }
      `}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
        >
            <div
                className="relative flex gap-3.5 px-5 pt-4 pb-5 overflow-hidden min-w-[300px] max-w-sm sm:max-w-md"
                style={{
                    background: 'rgba(10,18,38,0.93)',
                    backdropFilter: 'blur(28px)',
                    WebkitBackdropFilter: 'blur(28px)',
                    border: `1px solid ${c.border}`,
                    boxShadow: `0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.05), 0 4px 24px ${c.glow}`,
                    borderRadius: '18px',
                }}
            >
                {/* Top shimmer */}
                <div
                    className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)' }}
                    aria-hidden
                />

                {/* Left color bar */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-[3.5px] rounded-l-[18px]"
                    style={{ background: c.bar }}
                    aria-hidden
                />

                {/* Icon */}
                <div className="ml-1 flex-shrink-0 mt-0.5" style={{ color: c.iconColor }}>
                    <c.Icon size={18} aria-hidden />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[13px] mb-0.5 leading-tight" style={{ color: c.titleColor }}>
                        {c.title}
                    </h4>
                    <p className="text-[13px] font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.72)' }}>
                        {message}
                    </p>
                </div>

                {/* Close button */}
                <button
                    onClick={() => { setIsVisible(false); setTimeout(onClose, 320); }}
                    aria-label="ปิดการแจ้งเตือน"
                    className="
            flex-shrink-0 mt-0.5 p-1 rounded-md
            text-white/30
            hover:text-white/75 hover:bg-white/10
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40
            active:scale-90
            transition-all duration-150
          "
                >
                    <X size={15} aria-hidden />
                </button>

                {/* Progress bar countdown */}
                <div
                    className="absolute bottom-0 left-[3.5px] right-0 h-[3px] rounded-br-[18px] overflow-hidden"
                    style={{ background: c.barBg }}
                    aria-hidden
                >
                    <div
                        className="h-full origin-left"
                        style={{
                            background: c.bar,
                            animation: `progressToast ${duration}ms linear forwards`,
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Toast;
