import { useState, useEffect, useRef, useCallback } from 'react';
import { getYouTubeID } from '../services/youtubeService';

/**
 * [TH] ระบบจัดการ YouTube IFrame API Ready แบบ Multi-subscriber
 * [EN] Dispatcher pattern: multiple callbacks can register for YT API ready
 * — prevents DurationChecker from overwriting usePlayer's callback
 */
function registerYTReadyCallback(callback) {
    if (!window.__ytApiReadyCallbacks) {
        window.__ytApiReadyCallbacks = [];
    }
    window.__ytApiReadyCallbacks.push(callback);

    // If API is already loaded, fire immediately
    if (window.YT && window.YT.Player) {
        callback();
    }
}

// Set the global callback once — it dispatches to all registered subscribers
if (typeof window !== 'undefined' && !window.__ytApiDispatcherSet) {
    window.__ytApiDispatcherSet = true;
    window.onYouTubeIframeAPIReady = () => {
        (window.__ytApiReadyCallbacks || []).forEach(cb => {
            try { cb(); } catch (err) { console.error('YT API ready callback error:', err); }
        });
    };
}

/**
 * @hook usePlayer
 * @description 
 * [TH] ควบคุมการสร้างหน้าต่างเครื่องเล่น YouTube IFrame API พร้อมรองรับการแก้ปัญหาจอดำด้วยการรีเซ็ต DOM
 * [EN] Custom hook responsible for instantiating and controlling the YouTube IFrame API.
 * Handles fixing "Black Screen" issues by deliberately tearing down and rebuilding the DOM element if needed.
 * 
 * @param {Object} currentSong - The song object to play (must contain URL)
 * @param {number} volume - Volume scalar 0-100
 * @param {Function} onSongEnd - Callback triggered when a video finishes playing organically
 * @param {boolean} isSystemActive - Boolean deciding if the component is allowed to play media
 * @returns {Object} { isPlayerReady, duration, currentTime, reloadPlayer }
 */
export const usePlayer = (currentSong, volume, onSongEnd, isSystemActive = true, serverTimeOffset = 0, isPrimaryBroadcaster = false) => {
    const playerRef = useRef(null);
    const activeVideoIdRef = useRef(null);
    const isSystemActiveRef = useRef(isSystemActive);
    const serverTimeOffsetRef = useRef(serverTimeOffset);
    const isPrimaryBroadcasterRef = useRef(isPrimaryBroadcaster);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlayerReady, setIsPlayerReady] = useState(false);

    // Keep refs in sync with latest props (stable references for callbacks)
    const currentSongRef = useRef(currentSong);
    const volumeRef = useRef(volume);
    const onSongEndRef = useRef(onSongEnd);

    useEffect(() => { isSystemActiveRef.current = isSystemActive; }, [isSystemActive]);
    useEffect(() => { serverTimeOffsetRef.current = serverTimeOffset; }, [serverTimeOffset]);
    useEffect(() => { isPrimaryBroadcasterRef.current = isPrimaryBroadcaster; }, [isPrimaryBroadcaster]);
    useEffect(() => { currentSongRef.current = currentSong; }, [currentSong]);
    useEffect(() => { volumeRef.current = volume; }, [volume]);
    useEffect(() => { onSongEndRef.current = onSongEnd; }, [onSongEnd]);

    // Sync Song — uses refs, so no external deps needed
    const syncSong = useCallback((song, playerInstance) => {
        if (!isSystemActiveRef.current || !song || !song.url) {
            activeVideoIdRef.current = null;
            return;
        }

        const player = playerInstance || playerRef.current;
        if (player && typeof player.loadVideoById === 'function') {
            const videoId = getYouTubeID(song.url);
            if (videoId) {
                const absoluteNow = Date.now() + serverTimeOffsetRef.current;
                let startSeconds = 0;
                
                if (song.isPlaying === false && song.pausedTime !== undefined) {
                    startSeconds = song.pausedTime;
                } else {
                    startSeconds = (absoluteNow - (song.startedAt || absoluteNow)) / 1000;
                }
                
                // If new song: load it
                if (activeVideoIdRef.current !== videoId) {
                    activeVideoIdRef.current = videoId;
                    player.loadVideoById({
                        videoId: videoId,
                        startSeconds: startSeconds > 0 ? startSeconds : 0
                    });
                    if (song.isPlaying === false) {
                        setTimeout(() => player.pauseVideo && player.pauseVideo(), 500);
                    }
                } else {
                    // Same song, just ensuring state sync
                    if (song.isPlaying === false) {
                        player.pauseVideo();
                        if (Math.abs(player.getCurrentTime() - startSeconds) > 2) {
                            player.seekTo(startSeconds, true);
                        }
                    } else {
                        const current = player.getCurrentTime();
                        // Only seek if drift is > 3 seconds to avoid constant skipping
                        if (Math.abs(current - startSeconds) > 3) {
                            player.seekTo(startSeconds, true);
                        }
                        const state = player.getPlayerState?.();
                        if (state !== 1 && state !== 3) { 
                            player.playVideo();
                        }
                    }
                }
            }
        }
    }, []);

    // Initialize Player — stable function, reads latest values from refs
    const initializePlayer = useCallback(() => {
        if (window.YT && window.YT.Player) {
            if (playerRef.current) {
                try { playerRef.current.destroy(); } catch { /* Ignore destruction errors */ }
            }

            // Ensure the container exists and inject a fresh div to prevent React DOM conflicts (Fix black screen)
            const container = document.getElementById('youtube-player-container');
            if (container) {
                const innerDiv = document.createElement('div');
                innerDiv.id = 'youtube-player-div';
                innerDiv.className = 'w-full h-full';
                container.replaceChildren(innerDiv);
            }

            playerRef.current = new window.YT.Player('youtube-player-div', {
                height: '100%',
                width: '100%',
                playerVars: {
                    autoplay: 1,
                    controls: 1,
                    rel: 0,
                    playsinline: 1,
                    iv_load_policy: 3,
                    origin: window.location.origin
                },
                events: {
                    onReady: (e) => {
                        setIsPlayerReady(true);
                        e.target.setVolume(volumeRef.current);
                        if (currentSongRef.current && isSystemActiveRef.current) {
                            syncSong(currentSongRef.current, e.target);
                        }
                    },
                    onStateChange: (e) => {
                        if (!isSystemActiveRef.current) return;
                        if (e.data === 0 && onSongEndRef.current) onSongEndRef.current(); // Ended
                        if (e.data === 1) setDuration(e.target.getDuration()); // Playing
                    },
                    onError: (e) => {
                        if (!isSystemActiveRef.current) return;
                        console.error("Player Error:", e.data);
                        // ถ้าคลิปมีปัญหา ให้ข้ามเฉพาะถ้าเป็นเครื่อง Primary Broadcaster เท่านั้น
                        if (isPrimaryBroadcasterRef.current && onSongEndRef.current) {
                            onSongEndRef.current();
                        }
                    }
                }
            });
        }
    }, [syncSong]); // Stable — syncSong has no deps either

    // Load API (Run once — initializePlayer is now stable)
    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            registerYTReadyCallback(initializePlayer);
        } else {
            initializePlayer();
        }
    }, [initializePlayer]); // initializePlayer is stable, so this truly runs once

    // Sync Song already defined above    // Sync Effects - THIS is the key for immediate stop
    useEffect(() => {
        if (!isSystemActive) {
            // FORCE STOP immediately when schedule ends
            if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
                playerRef.current.stopVideo();
            }
            return;
        }

        if (isPlayerReady && currentSong) {
            syncSong(currentSong);
        } else if (isPlayerReady && !currentSong && playerRef.current) {
            activeVideoIdRef.current = null;
            playerRef.current.stopVideo();
        }
    }, [currentSong, isPlayerReady, isSystemActive, syncSong]);

    useEffect(() => {
        if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
            playerRef.current.setVolume(volume);
        }
    }, [volume]);

    // Polling Timer for UI Progress Bar
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                setCurrentTime(playerRef.current.getCurrentTime());
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // [TH] แก้ปัญหาเบราว์เซอร์บล็อก Autoplay โดยการดักจับการคลิกครั้งแรกของระบบ
    // [EN] Bypass browser Autoplay restrictions by triggering play on the very first user interaction
    const hasInteractedRef = useRef(false);
    useEffect(() => {
        const unlockAutoplay = () => {
            if (!hasInteractedRef.current && playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
                hasInteractedRef.current = true;
                const state = playerRef.current.getPlayerState();
                if (isSystemActiveRef.current && state !== 1 && state !== 3) { // Not playing and not buffering
                    playerRef.current.playVideo();
                }
            }
        };

        const events = ['click', 'touchstart', 'keydown'];
        events.forEach(e => window.addEventListener(e, unlockAutoplay, { once: true }));

        return () => {
            events.forEach(e => window.removeEventListener(e, unlockAutoplay));
        };
    }, []);

    /**
     * [TH] ฟังก์ชันสำหรับบังคับรีโหลดรีเซ็ตตัวผู้เล่น YouTube IFrame API ทิ้งแล้วสร้างใหม่ เพื่อแก้บั๊กจอดำค้าง
     * [EN] Function to force a rebuild of the YouTube IFrame API instance.
     * Often used to recover from sticky black screen errors.
     */
    const reloadPlayer = () => {
        setIsPlayerReady(false);
        initializePlayer();
    };

    /**
     * [TH] ฟังก์ชันเล่น/หยุดวิดีโอ (Play/Pause Toggle) สำหรับ Keyboard Shortcuts
     * [EN] Toggle play/pause state of the player
     * Note: Now we just return what the intent is and the current local playback time, 
     * useKeyboardShortcuts will pass these to useData.js to broadcast.
     */
    const togglePlayPause = useCallback(() => {
        if (!playerRef.current || typeof playerRef.current.getPlayerState !== 'function') return null;
        const state = playerRef.current.getPlayerState();
        const currentTime = playerRef.current.getCurrentTime() || 0;
        
        if (state === 1) { // Playing
            return { willPlay: false, currentTime };
        } else {
            return { willPlay: true, currentTime };
        }
    }, []);

    return {
        isPlayerReady,
        duration,
        currentTime,
        reloadPlayer,
        togglePlayPause
    };
};
