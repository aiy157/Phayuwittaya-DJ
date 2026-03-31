import React, { useEffect, useRef } from 'react';

/**
 * [TH] คอมโพเนนต์อรรถประโยชน์แบบซ่อนตัว (Hidden) ที่เรียกใช้ YouTube IFrame Player API
 * เพื่อทำหน้าที่แค่ดึงข้อมูล Metadata เช่น ตรวจสอบความยาวของคลิปวิดีโอ โดยไม่ต้องใช้คีย์ API
 * 
 * [EN] A hidden utility component that uses the YouTube IFrame Player API
 * to fetch video metadata (duration) without an API key.
 */
const DurationChecker = ({ onReady }) => {
    const playerRef = useRef(null);
    const containerRef = useRef(null);

    useEffect(() => {
        // [TH] โหลดสคริปต์ YouTube IFrame API เพื่อใช้งานลับหลัง | [EN] Load YouTube API script
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        // [EN] Use shared dispatcher pattern — no longer overwrites onYouTubeIframeAPIReady
        function registerYTCallback(cb) {
            if (!window.__ytApiReadyCallbacks) window.__ytApiReadyCallbacks = [];
            window.__ytApiReadyCallbacks.push(cb);
            if (window.YT && window.YT.Player) cb();
        }

        registerYTCallback(initPlayer);

        function initPlayer() {
            playerRef.current = new window.YT.Player(containerRef.current, {
                height: '0',
                width: '0',
                videoId: '',
                playerVars: {
                    'autoplay': 0,
                    'controls': 0,
                },
                events: {
                    'onReady': (event) => {
                        onReady({
                            getDuration: async (videoId) => {
                                return new Promise((resolve) => {
                                    event.target.cueVideoById(videoId);

                                    // [TH] วนลูปดึงความยาวเพลง เนื่องจาก API ต้องใช้เวลาโหลดเนื้อหาชั่วครู่ | [EN] Poll for duration - YT needs a moment to load metadata
                                    let attempts = 0;
                                    const interval = setInterval(() => {
                                        const duration = event.target.getDuration();
                                        if (duration > 0 || attempts > 20) {
                                            clearInterval(interval);
                                            resolve(duration);
                                        }
                                        attempts++;
                                    }, 100);
                                });
                            }
                        });
                    }
                }
            });
        }

        return () => {
            if (playerRef.current) {
                playerRef.current.destroy();
            }
        };
    }, [onReady]);

    return <div ref={containerRef} style={{ display: 'none' }} />;
};

export default DurationChecker;
