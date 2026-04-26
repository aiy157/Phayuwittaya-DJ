import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const DISMISSED_KEY = 'pwa_install_dismissed';

/**
 * @component PWAInstallPrompt
 * @description
 * [TH] แถบแจ้งเตือนสวยงามเพื่อเชิญชวนให้ติดตั้งแอปเป็น PWA
 *      ซ่อนอัตโนมัติถ้า user ปฏิเสธหรือติดตั้งแล้ว
 * [EN] Install banner for Progressive Web App. Hides on dismiss (stored in localStorage).
 */
const PWAInstallPrompt = () => {
    const { isLight } = useTheme();
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [show, setShow] = useState(false);

    useEffect(() => {
        // Don't show if dismissed before
        if (localStorage.getItem(DISMISSED_KEY) === 'true') return;

        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShow(true);
        };

        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShow(false);
            localStorage.setItem(DISMISSED_KEY, 'true');
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShow(false);
        localStorage.setItem(DISMISSED_KEY, 'true');
    };

    if (!show) return null;

    return (
        <div
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9000] w-[calc(100%-2rem)] max-w-[420px] animate-slide-up"
            role="alertdialog"
            aria-label="ติดตั้งแอป PhayuWittaya DJ"
        >
            <div
                className="relative rounded-[20px] overflow-hidden"
                style={{
                    background: isLight
                        ? 'rgba(255,255,255,0.90)'
                        : 'rgba(10,14,28,0.92)',
                    backdropFilter: 'blur(32px)',
                    WebkitBackdropFilter: 'blur(32px)',
                    border: isLight
                        ? '1.5px solid rgba(99,102,241,0.20)'
                        : '1.5px solid rgba(139,92,246,0.35)',
                    boxShadow: isLight
                        ? '0 16px 48px rgba(99,102,241,0.18), 0 4px 16px rgba(0,0,0,0.06)'
                        : '0 16px 56px rgba(139,92,246,0.35), 0 4px 20px rgba(0,0,0,0.50)',
                }}
            >
                {/* Top gradient line */}
                <div className="h-[2px] w-full"
                    style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)' }} />

                <div className="flex items-center gap-4 px-5 py-4">
                    {/* App icon */}
                    <div
                        className="w-12 h-12 min-w-[48px] rounded-[16px] flex items-center justify-center text-2xl"
                        style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6,#f43f5e)' }}
                        aria-hidden
                    >
                        🎧
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-black"
                            style={{ color: isLight ? '#0f172a' : 'rgba(255,255,255,0.95)' }}>
                            ติดตั้งแอป PhayuWittaya DJ
                        </p>
                        <p className="text-[11px] font-medium"
                            style={{ color: isLight ? '#64748b' : 'rgba(255,255,255,0.45)' }}>
                            เล่นออฟไลน์ได้ · เปิดเร็วขึ้น · ไม่มี browser bar
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            onClick={handleInstall}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-[12px] text-[12px] font-black text-white transition-all duration-150 hover:brightness-110 active:scale-95"
                            style={{
                                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                boxShadow: '0 4px 16px rgba(99,102,241,0.40)',
                            }}
                        >
                            <Download size={13} />
                            ติดตั้ง
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95"
                            style={{
                                background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                                color: isLight ? '#94a3b8' : 'rgba(255,255,255,0.40)',
                            }}
                            aria-label="ปิด"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
