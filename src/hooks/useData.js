import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { 
    ref, onValue, get, set, push, remove, update, 
    query, orderByChild, serverTimestamp 
} from 'firebase/database';

/**
 * @hook useData
 * @description 
 * [TH] ศูนย์กลางควบคุมข้อมูลหลัก จัดการฟัง/เขียนข้อมูลลง Firebase Realtime Database
 * [EN] The backbone data controller for the application using Firebase Realtime Database.
 */
export const useData = () => {
    // --- State Variables ---
    const [requests, setRequests] = useState([]);
    const [currentSong, setCurrentSong] = useState(null);
    const [schedule, setSchedule] = useState({});
    const [volume, setVolume] = useState(100);
    const [isRequestsEnabled, setIsRequestsEnabled] = useState(true);
    const [eventPlaylists, setEventPlaylists] = useState({});
    const [playbackMode, setPlaybackMode] = useState('queue');
    const [activeEvent, setActiveEvent] = useState(null);
    const [maxSongDuration, setMaxSongDuration] = useState(10);
    const [loading, setLoading] = useState(true);
    const [serverTimeOffset, setServerTimeOffset] = useState(0);

    const requestsRef = useRef(requests);
    const processingRef = useRef(false);
    const playbackModeRef = useRef(playbackMode);
    const activeEventRef = useRef(activeEvent);
    const eventPlaylistsRef = useRef(eventPlaylists);
    const fallbackPlaylistRef = useRef(null);
    const serverTimeOffsetRef = useRef(serverTimeOffset);

    useEffect(() => { requestsRef.current = requests; }, [requests]);
    useEffect(() => { playbackModeRef.current = playbackMode; }, [playbackMode]);
    useEffect(() => { activeEventRef.current = activeEvent; }, [activeEvent]);
    useEffect(() => { eventPlaylistsRef.current = eventPlaylists; }, [eventPlaylists]);
    useEffect(() => { serverTimeOffsetRef.current = serverTimeOffset; }, [serverTimeOffset]);

    const fallbackPlaylist = React.useMemo(() => [
        { title: "Lofi Study - Chill Beats", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
        { title: "Relaxing Jazz Instrumental", url: "https://www.youtube.com/watch?v=Dx5qFacha3o" },
        { title: "Café Music - Background Jazz", url: "https://www.youtube.com/watch?v=-5KAN9_CzSA" },
        { title: "Chillhop Yearmix 2024", url: "https://www.youtube.com/watch?v=lTRiuFIWV54" },
        { title: "Morning Coffee - Smooth Jazz", url: "https://www.youtube.com/watch?v=3jWRrafhO7M" }
    ], []);
    useEffect(() => { fallbackPlaylistRef.current = fallbackPlaylist; }, [fallbackPlaylist]);

    // --- Helper: Process System State ---
    const updateSystemStateValue = useCallback((key, value) => {
        if (value === undefined || value === null) return;
        switch (key) {
            case 'volume': setVolume(value); break;
            case 'currentSong': setCurrentSong(value); break;
            case 'schedule': setSchedule(value || {}); break;
            case 'settings':
                setIsRequestsEnabled(value.requestsEnabled !== false);
                setPlaybackMode(value.playbackMode || 'queue');
                setActiveEvent(value.activeEvent || null);
                setMaxSongDuration(value.maxSongDuration || 10);
                break;
            default: break;
        }
    }, []);

    // --- Initial Data Fetch & Realtime Subscriptions ---
    useEffect(() => {
        // 1. Listen to System State
        const stateKeys = ['volume', 'currentSong', 'schedule', 'settings'];
        const stateUnsubs = stateKeys.map(key => {
            return onValue(ref(db, key), (snapshot) => {
                updateSystemStateValue(key, snapshot.val());
                if (key === 'settings') setLoading(false); // Assume done when settings load
            });
        });

        // 2. Listen to Requests (Ordered by index)
        const requestsQuery = query(ref(db, 'requests'), orderByChild('index'));
        const requestsUnsub = onValue(requestsQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                // Convert object to sorted array
                const list = Object.entries(data).map(([id, val]) => ({ id, ...val }));
                setRequests(list.sort((a, b) => a.index - b.index));
            } else {
                setRequests([]);
            }
        });

        // 3. Listen to Events & Songs
        const eventsUnsub = onValue(ref(db, 'eventPlaylists'), (snapshot) => {
            setEventPlaylists(snapshot.val() || {});
        });

        // 4. Listen to Server Time Offset
        const offsetRef = ref(db, '.info/serverTimeOffset');
        const offsetUnsub = onValue(offsetRef, (snap) => {
            setServerTimeOffset(snap.val() || 0);
        });

        return () => {
            stateUnsubs.forEach(unsub => unsub());
            requestsUnsub();
            eventsUnsub();
            offsetUnsub();
        };
    }, [updateSystemStateValue]);

    // --- Actions (Mutations) ---

    const playNextSong = useCallback(async (song) => {
        if (!song) return;
        
        // If it's a request from the queue, remove it from queue first
        if (song.id && !song.isAutoDj && !song.isEventSong) {
            await remove(ref(db, `requests/${song.id}`));
        }

        // Set current playing song
        await set(ref(db, 'currentSong'), { 
            ...song, 
            startedAt: Date.now() + serverTimeOffsetRef.current,
            isPlaying: true 
        });
    }, []);

    const stopSong = async () => {
        await set(ref(db, 'currentSong'), null);
    };

    const toggleGlobalPlayPause = async (willPlay, currentTimeSeconds) => {
        if (!currentSong) return;
        const currentRef = ref(db, 'currentSong');
        if (willPlay) {
            // Resuming: re-calculate startedAt so that (Date.now() + offset - startedAt) = currentTimeSeconds
            const newStartedAt = (Date.now() + serverTimeOffsetRef.current) - (currentTimeSeconds * 1000);
            await update(currentRef, { isPlaying: true, startedAt: newStartedAt });
        } else {
            // Pausing
            await update(currentRef, { isPlaying: false, pausedTime: currentTimeSeconds });
        }
    };

    const handleSongEnd = useCallback((forceHalt = false) => {
        if (forceHalt) {
            processingRef.current = false;
            return;
        }
        if (processingRef.current) return;
        processingRef.current = true;

        setTimeout(() => {
            const mode = playbackModeRef.current;
            const eventName = activeEventRef.current;
            const currentQueue = requestsRef.current;
            const playlists = eventPlaylistsRef.current;
            const fallback = fallbackPlaylistRef.current || [];

            if (mode === 'event' && eventName && playlists[eventName]?.songs) {
                const songsObj = playlists[eventName].songs;
                const songIds = Object.keys(songsObj);
                if (songIds.length > 0) {
                    const songId = songIds[Math.floor(Math.random() * songIds.length)];
                    playNextSong({
                        ...songsObj[songId],
                        id: `event_${songId}_${Date.now()}`,
                        student: `แอดมิน (โหมด${eventName})`,
                        isEventSong: true,
                    });
                    processingRef.current = false;
                    return;
                }
            }

            if (currentQueue.length > 0) {
                playNextSong(currentQueue[0]);
            } else {
                const song = fallback[Math.floor(Math.random() * fallback.length)];
                playNextSong({ ...song, id: `autodj_${Date.now()}`, student: 'Auto-DJ System', isAutoDj: true });
            }
            processingRef.current = false;
        }, 500);
    }, [playNextSong]);

    const addRequest = async (url, knownTitle, student = "Student") => {
        if (!isRequestsEnabled && student === "Student") throw new Error('REQUESTS_DISABLED');

        const timestamp = Date.now();
        const placeholderTitle = knownTitle || "กำลังโหลดชื่อเพลง...";
        const newRequestRef = push(ref(db, 'requests'));
        const id = newRequestRef.key;

        await set(newRequestRef, {
            url, student, 
            title: placeholderTitle, 
            timestamp, 
            index: timestamp 
        });

        if (currentSong && currentSong.isAutoDj) {
            playNextSong({ id, student, url, title: placeholderTitle, timestamp, index: timestamp });
        }

        if (!knownTitle) {
            try {
                const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
                const data = await res.json();
                if (data.title) await update(ref(db, `requests/${id}`), { title: data.title });
            } catch {
                console.warn('[useData] Failed to fetch video title');
            }
        }
    };

    const deleteRequest = async (id) => {
        await remove(ref(db, `requests/${id}`));
        return true;
    };

    const moveInQueue = async (requestId, targetIndex) => {
        const index = requests.findIndex(r => r.id === requestId);
        if (index === -1) return;

        const updatedRequests = [...requests];
        const [movedItem] = updatedRequests.splice(index, 1);
        updatedRequests.splice(targetIndex, 0, movedItem);

        const updates = {};
        updatedRequests.forEach((req, i) => {
            updates[`requests/${req.id}/index`] = i;
        });

        await update(ref(db), updates);
    };

    const toggleRequestLock = async (enabled) => {
        await update(ref(db, 'settings'), { requestsEnabled: enabled });
    };

    const updateVolume = async (newVol) => {
        await set(ref(db, 'volume'), newVol);
    };

    const updateSchedule = async (newSchedule) => {
        await set(ref(db, 'schedule'), newSchedule);
    };

    const addEventPlaylist = async (eventName) => {
        if (!eventName) return;
        await set(ref(db, `eventPlaylists/${eventName}`), { created: Date.now(), songs: {} });
    };

    const deleteEventPlaylist = async (eventName) => {
        await remove(ref(db, `eventPlaylists/${eventName}`));
    };

    const addSongToEvent = async (eventName, url, title) => {
        const newSongRef = push(ref(db, `eventPlaylists/${eventName}/songs`));
        await set(newSongRef, {
            url, title,
            added: Date.now()
        });
    };

    const deleteSongFromEvent = async (eventName, songId) => {
        await remove(ref(db, `eventPlaylists/${eventName}/songs/${songId}`));
    };

    const setPlaybackModeAction = async (mode, eventName = null) => {
        await update(ref(db, 'settings'), { playbackMode: mode, activeEvent: eventName });

        if (mode === 'event' && eventName) {
            const songsObj = eventPlaylists[eventName]?.songs;
            if (songsObj) {
                const songIds = Object.keys(songsObj);
                const song = songsObj[songIds[Math.floor(Math.random() * songIds.length)]];
                playNextSong({ ...song, id: `event_${Date.now()}`, student: `แอดมิน (โหมด${eventName})`, isEventSong: true });
            }
        }
    };

    const setMaxDurationAction = async (minutes) => {
        await update(ref(db, 'settings'), { maxSongDuration: minutes });
    };

    return {
        requests, currentSong, schedule, setSchedule, volume, isRequestsEnabled, eventPlaylists, playbackMode, activeEvent, maxSongDuration, loading, serverTimeOffset,
        addRequest, deleteRequest, moveInQueue, toggleRequestLock, playNextSong, stopSong, toggleGlobalPlayPause, handleSongEnd, updateVolume, updateSchedule,
        addEventPlaylist, deleteEventPlaylist, addSongToEvent, deleteSongFromEvent, setPlaybackMode: setPlaybackModeAction, setMaxDuration: setMaxDurationAction
    };
};
