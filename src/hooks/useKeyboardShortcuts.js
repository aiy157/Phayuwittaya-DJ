import { useEffect, useRef } from 'react';

/**
 * @hook useKeyboardShortcuts
 * @description
 * [TH] จัดการการกดคีย์บอร์ดลัด (Global Shortcuts) เพื่อความรวดเร็วในการควบคุมของ DJ
 *      ใช้ useRef เพื่อป้องกัน stale closure — listener ลงทะเบียนเพียงครั้งเดียวต่อ session
 * [EN] Global keyboard shortcuts for the DJ Manager.
 *      Uses useRef for controls to prevent re-registration on every render.
 *
 * @param {boolean} isManager - Is the current view the authenticated Manager Dashboard
 * @param {Object} controls   - Methods: { togglePlayPause, updateVolume, playNextSong,
 *                                         reloadPlayer, seekRelative, volume, showToast }
 *
 * Shortcuts:
 *   Space       → Play / Pause
 *   ↑ / ↓       → Volume +5 / -5
 *   ← / →       → Seek -10s / +10s
 *   M / ท       → Mute Toggle (ภาษาไทย Kedmanee รองรับ)
 *   Shift+N / ์  → Next Song
 *   R / ๆ       → Reload Player (แก้จอดำ)
 *   0–9         → Volume Preset (0=100%, 1=10%, 2=20%, ..., 9=90%)
 */
export const useKeyboardShortcuts = (isManager, controls) => {
    // [TH] เก็บ controls ล่าสุดใน ref — ป้องกัน stale closure อย่างมีประสิทธิภาพ
    // [EN] Always keep the latest controls ref in sync without re-registering the listener
    const controlsRef = useRef(controls);
    useEffect(() => {
        controlsRef.current = controls;
    });

    useEffect(() => {
        if (!isManager) return;

        const handleKeyDown = (e) => {
            // [TH] ข้ามถ้า user กำลังพิมพ์ใน input
            // [EN] Ignore if focus is inside a text input/select
            const tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            const {
                togglePlayPause,
                updateVolume,
                playNextSong,
                reloadPlayer,
                seekRelative,
                volume,
                showToast,
            } = controlsRef.current;

            switch (e.key) {
                // ── Play / Pause ──────────────────────────────────────────────
                case ' ':
                    e.preventDefault();
                    if (togglePlayPause) {
                        const state = togglePlayPause();
                        showToast?.(state?.willPlay ? '▶️ เล่นเพลง (Play)' : '⏸️ หยุดชั่วคราว (Pause)', 'info');
                    }
                    break;

                // ── Volume ↑↓ ────────────────────────────────────────────────
                case 'ArrowUp':
                    e.preventDefault();
                    if (updateVolume) {
                        const v = Math.min(100, (volume ?? 100) + 5);
                        updateVolume(v);
                        showToast?.(`🔊 ระดับเสียง ${v}%`, 'info');
                    }
                    break;

                case 'ArrowDown':
                    e.preventDefault();
                    if (updateVolume) {
                        const v = Math.max(0, (volume ?? 0) - 5);
                        updateVolume(v);
                        showToast?.(v === 0 ? '🔇 ปิดเสียงแล้ว' : `🔉 ระดับเสียง ${v}%`, 'info');
                    }
                    break;

                // ── Seek ← → ─────────────────────────────────────────────────
                case 'ArrowLeft':
                    e.preventDefault();
                    seekRelative?.(-10);
                    showToast?.('⏪ ย้อนหลัง 10 วินาที', 'info');
                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    seekRelative?.(10);
                    showToast?.('⏩ ข้ามไป 10 วินาที', 'info');
                    break;

                // ── Mute Toggle — M / ท (Kedmanee) ──────────────────────────
                case 'm':
                case 'M':
                case 'ท': // m in Thai Kedmanee
                    e.preventDefault();
                    if (updateVolume) {
                        const newVol = volume === 0 ? 50 : 0;
                        updateVolume(newVol);
                        showToast?.(newVol === 0 ? '🔇 ปิดเสียง (Muted)' : '🔊 เปิดเสียงแล้ว (Unmuted)', 'info');
                    }
                    break;

                // ── Next Song — Shift+N / ์ (Kedmanee Shift+N) ──────────────
                case 'N':
                case '์': // Shift+N in Thai Kedmanee
                    if (e.shiftKey) {
                        e.preventDefault();
                        if (playNextSong) {
                            showToast?.('⏭️ กำลังข้ามไปเพลงถัดไป...', 'success');
                            // playNextSong() here triggers handleSongEnd from App.jsx
                            playNextSong();
                        }
                    }
                    break;

                // ── Reload Player — R / ๆ (Kedmanee R) ──────────────────────
                case 'r':
                case 'R':
                case 'ๆ': // r in Thai Kedmanee
                    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                        e.preventDefault();
                        if (reloadPlayer) {
                            showToast?.('🔄 รีโหลด Player... (แก้จอดำ)', 'info');
                            reloadPlayer();
                        }
                    }
                    break;

                // ── Volume Presets — 0–9 ─────────────────────────────────────
                // 0 = 100%, 1 = 10%, 2 = 20%, ..., 9 = 90%
                case '0': case '1': case '2': case '3': case '4':
                case '5': case '6': case '7': case '8': case '9': {
                    if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) break;
                    e.preventDefault();
                    if (updateVolume) {
                        const preset = e.key === '0' ? 100 : parseInt(e.key) * 10;
                        updateVolume(preset);
                        showToast?.(`🎚️ ระดับเสียง ${preset}% (Preset ${e.key})`, 'info');
                    }
                    break;
                }

                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);

        // [TH] isManager เท่านั้นที่อยู่ใน deps — controls ใช้ ref แทนเพื่อหลีกเลี่ยงการ re-register
        // [EN] Only isManager in deps — controls are accessed via ref to prevent re-registration
    }, [isManager]);
};
