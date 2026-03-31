import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

/**
 * @hook useData
 * @description 
 * [TH] ศูนย์กลางควบคุมข้อมูลหลัก จัดการฟัง/เขียนข้อมูลลง Supabase Realtime
 * [EN] The backbone data controller for the application using Supabase.
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

    const requestsRef = useRef(requests);
    const processingRef = useRef(false);

    useEffect(() => { requestsRef.current = requests; }, [requests]);

    const fallbackPlaylist = React.useMemo(() => [
        { title: "Lofi Study - Chill Beats", url: "https://www.youtube.com/watch?v=jfKfPfyJRdk" },
        { title: "Relaxing Jazz Instrumental", url: "https://www.youtube.com/watch?v=Dx5qFacha3o" },
        { title: "Café Music - Background Jazz", url: "https://www.youtube.com/watch?v=-5KAN9_CzSA" },
        { title: "Chillhop Yearmix 2024", url: "https://www.youtube.com/watch?v=lTRiuFIWV54" },
        { title: "Morning Coffee - Smooth Jazz", url: "https://www.youtube.com/watch?v=3jWRrafhO7M" }
    ], []);

    // --- Helper: Process System State ---
    const updateSystemStateValue = useCallback((key, value) => {
        if (!value) return;
        switch (key) {
            case 'volume': setVolume(value); break;
            case 'current_playing': setCurrentSong(value); break;
            case 'schedule': setSchedule(value); break;
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
        const initData = async () => {
            try {
                // 1. Fetch System State
                const { data: sysData } = await supabase.from('system_state').select('*');
                sysData?.forEach(row => updateSystemStateValue(row.key, row.value));

                // 2. Fetch Requests
                const { data: reqData } = await supabase.from('requests').select('*').order('index', { ascending: true });
                if (reqData) setRequests(reqData);

                // 3. Fetch Events & Songs
                const { data: events } = await supabase.from('events').select('*');
                const { data: songs } = await supabase.from('event_songs').select('*');
                
                const playlistsObj = {};
                events?.forEach(e => {
                    playlistsObj[e.name] = { created: e.created, songs: {} };
                });
                songs?.forEach(s => {
                    if (playlistsObj[s.event_name]) {
                        playlistsObj[s.event_name].songs[s.id] = { url: s.url, title: s.title, added: s.added };
                    }
                });
                setEventPlaylists(playlistsObj);

                setLoading(false);
            } catch (err) {
                console.error('Initial fetch error:', err);
            }
        };

        initData();

        // --- Realtime Subscriptions ---
        const channel = supabase.channel('app_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'requests' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setRequests(prev => [...prev, payload.new].sort((a, b) => a.index - b.index));
                } else if (payload.eventType === 'DELETE') {
                    setRequests(prev => prev.filter(r => r.id !== payload.old.id));
                } else if (payload.eventType === 'UPDATE') {
                    setRequests(prev => prev.map(r => r.id === payload.new.id ? payload.new : r).sort((a, b) => a.index - b.index));
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'system_state' }, (payload) => {
                updateSystemStateValue(payload.new.key, payload.new.value);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, async () => {
                // Simplified: Re-fetch playlists on any event change
                const { data: events } = await supabase.from('events').select('*');
                const { data: songs } = await supabase.from('event_songs').select('*');
                const playlistsObj = {};
                events?.forEach(e => playlistsObj[e.name] = { created: e.created, songs: {} });
                songs?.forEach(s => {
                    if (playlistsObj[s.event_name]) playlistsObj[s.event_name].songs[s.id] = { url: s.url, title: s.title, added: s.added };
                });
                setEventPlaylists(playlistsObj);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'event_songs' }, async () => {
                const { data: events } = await supabase.from('events').select('*');
                const { data: songs } = await supabase.from('event_songs').select('*');
                const playlistsObj = {};
                events?.forEach(e => playlistsObj[e.name] = { created: e.created, songs: {} });
                songs?.forEach(s => {
                    if (playlistsObj[s.event_name]) playlistsObj[s.event_name].songs[s.id] = { url: s.url, title: s.title, added: s.added };
                });
                setEventPlaylists(playlistsObj);
            })
            .subscribe();

        return () => { channel.unsubscribe(); };
    }, [updateSystemStateValue]);

    // --- Actions (Mutations) ---

    /** [TH] กำหนดเพลงใหม่ | [EN] Set current song */
    const playNextSong = useCallback(async (song) => {
        if (!song) return;
        if (song.id && !song.isAutoDj && !song.isEventSong) {
            await supabase.from('requests').delete().eq('id', song.id);
        }

        await supabase.from('system_state').upsert({
            key: 'current_playing',
            value: { ...song, startedAt: Date.now() }
        });
    }, []);

    const stopSong = async () => {
        await supabase.from('system_state').upsert({ key: 'current_playing', value: null });
    };

    const handleSongEnd = useCallback((forceHalt = false) => {
        if (processingRef.current || forceHalt) return;
        processingRef.current = true;

        setTimeout(() => {
            const mode = playbackMode;
            const eventName = activeEvent;
            const currentQueue = requestsRef.current;

            if (mode === 'event' && eventName && eventPlaylists[eventName]?.songs) {
                const songsObj = eventPlaylists[eventName].songs;
                const songIds = Object.keys(songsObj);
                if (songIds.length > 0) {
                    const randomIndex = Math.floor(Math.random() * songIds.length);
                    const songId = songIds[randomIndex];
                    playNextSong({
                        ...songsObj[songId],
                        id: `event_${songId}_${Date.now()}`,
                        student: `แอดมิน (โหมด${eventName})`,
                        isEventSong: true
                    });
                    processingRef.current = false;
                    return;
                }
            }

            if (currentQueue.length > 0) {
                playNextSong(currentQueue[0]);
            } else {
                const randomIndex = Math.floor(Math.random() * fallbackPlaylist.length);
                playNextSong({ ...fallbackPlaylist[randomIndex], id: `autodj_${Date.now()}`, student: "Auto-DJ System", isAutoDj: true });
            }
            processingRef.current = false;
        }, 500);
    }, [playNextSong, fallbackPlaylist, playbackMode, activeEvent, eventPlaylists]);

    const addRequest = async (url, knownTitle, student = "Student") => {
        if (!isRequestsEnabled && student === "Student") throw new Error('REQUESTS_DISABLED');

        const timestamp = Date.now();
        const placeholderTitle = knownTitle || "กำลังโหลดชื่อเพลง...";
        const id = crypto.randomUUID();

        await supabase.from('requests').insert({
            id, url, student, 
            title: placeholderTitle, 
            timestamp, 
            index: timestamp 
        });

        if (currentSong && currentSong.isAutoDj) {
            playNextSong({ id, student, url, title: placeholderTitle, timestamp, index: timestamp });
        }

        if (!knownTitle) {
            (async () => {
                try {
                    const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
                    const data = await res.json();
                    if (data.title) await supabase.from('requests').update({ title: data.title }).eq('id', id);
                } catch {
                    console.warn('[useData] Failed to fetch video title in background');
                }
            })();
        }
    };

    const deleteRequest = async (id) => {
        const { error } = await supabase.from('requests').delete().eq('id', id);
        return error === null;
    };

    const moveInQueue = async (requestId, targetIndex) => {
        const index = requests.findIndex(r => r.id === requestId);
        if (index === -1) return;

        const updatedRequests = [...requests];
        const [movedItem] = updatedRequests.splice(index, 1);
        updatedRequests.splice(targetIndex, 0, movedItem);

        const updates = updatedRequests.map((req, i) => ({
            id: req.id,
            url: req.url,
            title: req.title,
            student: req.student,
            timestamp: req.timestamp,
            index: i
        }));

        await supabase.from('requests').upsert(updates);
    };

    const toggleRequestLock = async (enabled) => {
        const newSettings = { requestsEnabled: enabled, playbackMode, activeEvent, maxSongDuration };
        await supabase.from('system_state').upsert({ key: 'settings', value: newSettings });
    };

    const updateVolume = async (newVol) => {
        await supabase.from('system_state').upsert({ key: 'volume', value: newVol });
    };

    const updateSchedule = async (newSchedule) => {
        try {
            const { error } = await supabase.from('system_state').upsert({ key: 'schedule', value: newSchedule });
            if (error) {
                console.error("[useData] updateSchedule failed:", error);
                throw error;
            }
        } catch (err) {
            console.error("[useData] updateSchedule catch:", err);
            throw err;
        }
    };

    const addEventPlaylist = async (eventName) => {
        if (!eventName) return;
        await supabase.from('events').insert({ name: eventName, created: Date.now() });
    };

    const deleteEventPlaylist = async (eventName) => {
        await supabase.from('events').delete().eq('name', eventName);
    };

    const addSongToEvent = async (eventName, url, title) => {
        await supabase.from('event_songs').insert({
            id: crypto.randomUUID(),
            event_name: eventName,
            url, title,
            added: Date.now()
        });
    };

    const deleteSongFromEvent = async (eventName, songId) => {
        await supabase.from('event_songs').delete().eq('id', songId);
    };

    const setPlaybackModeAction = async (mode, eventName = null) => {
        const newSettings = { requestsEnabled: isRequestsEnabled, playbackMode: mode, activeEvent: eventName, maxSongDuration };
        await supabase.from('system_state').upsert({ key: 'settings', value: newSettings });

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
        const newSettings = { requestsEnabled: isRequestsEnabled, playbackMode, activeEvent, maxSongDuration: minutes };
        await supabase.from('system_state').upsert({ key: 'settings', value: newSettings });
    };

    return {
        requests, currentSong, schedule, setSchedule, volume, isRequestsEnabled, eventPlaylists, playbackMode, activeEvent, maxSongDuration, loading,
        addRequest, deleteRequest, moveInQueue, toggleRequestLock, playNextSong, stopSong, handleSongEnd, updateVolume, updateSchedule,
        addEventPlaylist, deleteEventPlaylist, addSongToEvent, deleteSongFromEvent, setPlaybackMode: setPlaybackModeAction, setMaxDuration: setMaxDurationAction
    };
};
