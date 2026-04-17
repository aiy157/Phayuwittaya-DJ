import { useEffect } from 'react';

/**
 * @hook useKeyboardShortcuts
 * @description
 * [TH] จัดการการกดคีย์บอร์ดลัด (Global Shortcuts) เพื่อความรวดเร็วในการควบคุมของ DJ
 * [EN] Global keyboard shortcuts for the DJ Manager
 * 
 * @param {boolean} isManager - Is the current view the Manager Dashboard
 * @param {Object} controls - Methods: { togglePlayPause, updateVolume, playNextSong, volume }
 */
export const useKeyboardShortcuts = (isManager, controls) => {
    useEffect(() => {
        if (!isManager) return;

        const handleKeyDown = (e) => {
            // Ignore if typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }

            const { togglePlayPause, updateVolume, playNextSong, volume, showToast } = controls;

            switch (e.key) {
                case ' ': // Spacebar
                    e.preventDefault();
                    if (togglePlayPause) {
                        const isPlaying = togglePlayPause();
                        showToast?.(isPlaying ? '▶️ เล่นเพลง (Play)' : '⏸️ หยุดชั่วคราว (Pause)', 'info');
                    }
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    if (updateVolume) {
                        const newVol = Math.min(100, volume + 5);
                        updateVolume(newVol);
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (updateVolume) {
                        const newVol = Math.max(0, volume - 5);
                        updateVolume(newVol);
                    }
                    break;
                case 'N':
                case 'n':
                case '์': // Shift + N in Thai Kedmanee
                case 'ื': // n in Thai Kedmanee
                    if (e.shiftKey) {
                        e.preventDefault();
                        if (playNextSong) {
                            showToast?.('กำลังข้ามไปเพลงถัดไป... ⏩', 'success');
                            playNextSong();
                        }
                    }
                    break;
                case 'm':
                case 'M':
                case 'ท': // m in Thai Kedmanee
                case '?': // Shift + M in Thai Kedmanee
                    e.preventDefault();
                    if (updateVolume) {
                        updateVolume(volume === 0 ? 50 : 0);
                        showToast?.(volume === 0 ? '🔊 เสียงเปิดแล้ว (Unmuted)' : '🔇 ปิดเสียง (Muted)', 'info');
                    }
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isManager, controls]);
};
