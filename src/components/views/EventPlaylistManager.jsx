import React, { useState } from 'react';
import { Music, Plus, Trash2, Send, FolderPlus, ListMusic, ChevronRight, Sparkles, Play, Shuffle, X, Loader2, Search } from 'lucide-react';
import { getYouTubeID } from '../../services/youtubeService';
import { useSearchState } from '../../hooks/useSearchState';
import { SuggestionDropdown, SearchResultCard } from '../widgets/SearchUI';

/**
 * @component EventPlaylistManager
 * @description 
 * [TH] คอมโพเนนต์ย่อยของ ManagerDashboard ใช้สำหรับจัดการคลังเพลงแยกตามหมวดหมู่งานเทศกาล
 * รองรับการเพิ่มเพลงเดี่ยวด้วยลิงก์ และการดึงข้อมูลทั้ง Playlist พร้อมกันด้วย Proxy
 * 
 * [EN] A sub-component of ManagerDashboard used for managing categorized playlists for events.
 * Provides bulk-import logic which silently spins up proxy fetchers to scrape thousands of songs.
 */
const EventPlaylistManager = ({
    eventPlaylists,
    addEventPlaylist,
    deleteEventPlaylist,
    addSongToEvent,
    deleteSongFromEvent,
    showToast,
    playbackMode,
    activeEvent,
    setPlaybackMode
}) => {
    const {
        songUrl, setSongUrl, handleInputChange,
        suggestions, clearSuggestions,
        searchResults, setSearchResults,
        isSearching, isUrlInput, doSearch,
    } = useSearchState();

    const [newEventName, setNewEventName] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [importMode, setImportMode] = useState('single'); // 'single' or 'bulk'

    const handleCreateEvent = () => {
        if (!newEventName) return;
        const cleanName = newEventName.replace(/[.#$[\]]/g, '').trim();
        if (!cleanName) return showToast('ชื่อหมวดหมู่ไม่ถูกต้อง (ห้ามใช้ . # $ [ ])', 'error');
        
        addEventPlaylist(cleanName);
        setNewEventName('');
        showToast(`สร้างหมวดหมู่ ${cleanName} เรียบร้อย`, 'success');
    };

    const fetchVideoTitle = async (url) => {
        try {
            const response = await fetch(`https://noembed.com/embed?url=${url}`);
            const data = await response.json();
            return data.title || url;
        } catch { return url; }
    };

    const handleSelectVideo = async (video) => {
        if (isSubmitting || !selectedEvent) return;
        const videoId = video.id;

        if (eventPlaylists[selectedEvent]?.songs) {
            const existingIds = Object.values(eventPlaylists[selectedEvent].songs).map(s => getYouTubeID(s.url));
            if (existingIds.includes(videoId)) {
                return showToast('เพลงนี้มีอยู่ใน Playlist แล้ว', 'error');
            }
        }

        setIsSubmitting(true);
        try {
            setSearchResults([]);
            addSongToEvent(selectedEvent, video.url, video.title);
            setSongUrl('');
            showToast('เพิ่มเพลงลงในคลังเรียบร้อย', 'success');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddSong = async () => {
        if (!songUrl || !selectedEvent) return;
        
        if (!isUrlInput && importMode === 'single') {
            doSearch(showToast);
            return;
        }

        const videoId = getYouTubeID(songUrl);
        if (!videoId) return showToast('ลิงก์ YouTube ไม่ถูกต้อง', 'error');

        // [TH] ตรวจสอบว่าเพลงนี้มีอยู่แล้วหรือไม่ | [EN] Check for duplicates
        if (eventPlaylists[selectedEvent]?.songs) {
            const existingIds = Object.values(eventPlaylists[selectedEvent].songs).map(s => getYouTubeID(s.url));
            if (existingIds.includes(videoId)) {
                return showToast('เพลงนี้มีอยู่ใน Playlist แล้ว', 'error');
            }
        }

        setIsSubmitting(true);
        const title = await fetchVideoTitle(songUrl);
        addSongToEvent(selectedEvent, songUrl, title);
        setSongUrl('');
        setIsSubmitting(false);
        showToast('เพิ่มเพลงลงในคลังเรียบร้อย', 'success');
    };

    const handleBulkImport = async () => {
        if (!songUrl || !selectedEvent) return;

        let playlistId = null;
        try {
            const url = new URL(songUrl);
            playlistId = url.searchParams.get('list');
        } catch {
            return showToast('ลิงก์ Playlist ไม่ถูกต้อง', 'error');
        }
        if (!playlistId) return showToast('ไม่พบ Playlist ID ในลิงก์', 'error');

        setIsSubmitting(true);
        showToast('กำลังดึงข้อมูล Playlist... รอสักครู่', 'info');

        const targetUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
        const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
        ];

        let html = null;
        for (const proxy of proxies) {
            try {
                const res = await fetch(proxy, { signal: AbortSignal.timeout(10000) });
                if (!res.ok) continue;
                const ct = res.headers.get('content-type') || '';
                if (ct.includes('json')) {
                    const json = await res.json();
                    html = json.contents || json.data;
                } else {
                    html = await res.text();
                }
                if (html && html.length > 5000) break; // got valid content
                html = null;
            } catch { continue; }
        }

        if (!html) {
            setIsSubmitting(false);
            return showToast('ไม่สามารถดึงข้อมูล Playlist ได้ ลองอีกครั้ง', 'error');
        }

        try {
            // [TH] สกัดรหัสวิดีโอจาก ytInitialData ที่ฝังอยู่ใน HTML | [EN] Extract video IDs from ytInitialData embedded in HTML
            const seen = new Set();
            const idRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
            const titleRegex = /"title":\{"runs":\[\{"text":"((?:[^"\\]|\\.)*)"\}\]/g;

            const ids = [];
            let m;
            while ((m = idRegex.exec(html)) !== null) {
                if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]); }
                if (ids.length >= 50) break;
            }

            // [TH] สกัดชื่อคลิปวิดีโอ | [EN] Extract titles
            const titles = [];
            let t;
            while ((t = titleRegex.exec(html)) !== null) {
                try { titles.push(decodeURIComponent(JSON.parse(`"${t[1]}"`))); } catch { titles.push(t[1]); }
            }

            if (ids.length === 0) {
                setIsSubmitting(false);
                return showToast('ไม่พบวิดีโอใน Playlist (ต้องเป็น Playlist แบบ Public)', 'error');
            }

            // [TH] ดึงรหัสวิดีโอเดิมในคลังออกมาเทียบเพื่อไม่ให้ดึงซ้ำ | [EN] Get existing video IDs to prevent duplicates
            const existingIds = [];
            if (eventPlaylists[selectedEvent]?.songs) {
                Object.values(eventPlaylists[selectedEvent].songs).forEach(s => {
                    const id = getYouTubeID(s.url);
                    if (id) existingIds.push(id);
                });
            }

            let count = 0;
            let skipped = 0;

            for (let i = 0; i < ids.length; i++) {
                const videoId = ids[i];
                const title = titles[i] || `YouTube Video ${i + 1}`;
                if (title === '[Private video]' || title === '[Deleted video]') continue;

                if (existingIds.includes(videoId)) {
                    skipped++;
                    continue;
                }

                addSongToEvent(selectedEvent, `https://www.youtube.com/watch?v=${videoId}`, title);
                count++;
            }

            if (count > 0) {
                showToast(`นำเข้าสำเร็จ ${count} เพลง! (ข้ามเพลงซ้ำ ${skipped} เพลง)`, 'success');
                setSongUrl('');
            } else if (skipped > 0) {
                showToast(`เพลงทั้งหมดอยู่ใน Playlist นี้อยู่แล้ว (ข้าม ${skipped} เพลง)`, 'info');
                setSongUrl('');
            } else {
                showToast('ไม่พบเพลงที่ดึงได้ใน Playlist', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('เกิดข้อผิดพลาดในการวิเคราะห์ข้อมูล Playlist', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startPlayback = () => {
        setPlaybackMode('event', selectedEvent);
        showToast(`เริ่มเล่นโหมดเทศกาล: ${selectedEvent}`, 'success');
    };

    const stopPlayback = () => {
        setPlaybackMode('queue');
        showToast('คืนสู่โหมดเล่นคิวปกติ', 'info');
    };

    const events = Object.keys(eventPlaylists || {}).sort();
    const isThisEventActive = playbackMode === 'event' && activeEvent === selectedEvent;

    return (
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 animate-fade-in relative z-10">
            {/* [TH] แถบด้านข้าง: รายการเทศกาล | [EN] Sidebar: Event List */}
            <div className="lg:col-span-1 space-y-4 order-2 lg:order-1">
                <div className="bg-white/[0.03] backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/10">
                    <h3 className="font-bold text-white/90 mb-4 flex items-center gap-2">
                        <FolderPlus size={18} className="text-brand-400" />
                        หมวดหมู่งานเทศกาล
                    </h3>

                    <div className="flex gap-2 mb-6">
                        <input
                            type="text"
                            placeholder="เช่น ปัจฉิม, วันครู"
                            className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm focus:border-brand-500 focus:bg-white/10 outline-none transition-all focus:ring-4 focus:ring-brand-500/10"
                            value={newEventName}
                            onChange={(e) => setNewEventName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()}
                        />
                        <button
                            onClick={handleCreateEvent}
                            className="p-2 bg-gradient-to-r from-brand-500 to-violet-600 text-white rounded-xl hover:opacity-90 shadow-lg shadow-brand-500/20 transition-all flex-shrink-0"
                        >
                            <Plus size={20} />
                        </button>
                    </div>

                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                        {events.length === 0 ? (
                            <p className="text-xs text-white/40 text-center py-4 italic">ยังไม่มีหมวดหมู่</p>
                        ) : (
                            events.map(ev => (
                                <button
                                    key={ev}
                                    onClick={() => setSelectedEvent(ev)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl text-[13px] font-bold transition-all
                                        ${selectedEvent === ev
                                            ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                                            : 'text-white/60 hover:bg-white/5 hover:text-white/90 border border-transparent hover:border-white/5'
                                        }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Music size={14} className={playbackMode === 'event' && activeEvent === ev ? 'text-brand-400 animate-pulse' : ''} />
                                        <span className="truncate max-w-[120px]">{ev}</span>
                                    </span>
                                    {playbackMode === 'event' && activeEvent === ev ? (
                                        <span className="text-[9px] bg-brand-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">Playing</span>
                                    ) : (
                                        <ChevronRight size={14} className={selectedEvent === ev ? 'opacity-100' : 'opacity-0'} />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* [TH] ส่วนหลัก: รายการเพลงในเทศกาล | [EN] Main: Playlist Content */}
            <div className="lg:col-span-2 space-y-4 order-1 lg:order-2">
                {selectedEvent ? (
                    <div className="bg-white/[0.02] backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 flex flex-col min-h-[400px] overflow-hidden">
                        {/* [TH] ส่วนหัว | [EN] Header */}
                        <div className="p-6 border-b border-white/[0.05] bg-white/[0.01] flex flex-wrap justify-between items-center gap-4 relative">
                            {/* Accent highlight */}
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand-500/50 to-transparent"></div>
                            
                            <div className="min-w-0">
                                <h3 className="text-[16px] font-bold text-white/95 truncate">คลังเพลง: <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-indigo-300 drop-shadow-sm">{selectedEvent}</span></h3>
                                <p className="text-[12px] text-white/40 mt-1">จัดการเพลงสำหรับงาน {selectedEvent}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                {isThisEventActive ? (
                                    <button
                                        onClick={stopPlayback}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-[12px] font-bold rounded-xl hover:opacity-90 shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all"
                                    >
                                        <X size={14} strokeWidth={2.5} /> หยุดเล่นโหมดนี้
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => startPlayback('event')}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-500 to-violet-500 text-white text-[12px] font-bold rounded-xl hover:opacity-90 shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all"
                                    >
                                        <Play size={14} fill="currentColor" /> เริ่มเล่นโหมดนี้
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        if (window.confirm(`ลบหมวดหมู่ ${selectedEvent}?`)) {
                                            deleteEventPlaylist(selectedEvent);
                                            setSelectedEvent(null);
                                        }
                                    }}
                                    className="p-2 w-10 h-10 flex items-center justify-center text-white/30 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-all"
                                    title="ลบหมวดหมู่นี้"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>

                        {/* [TH] ฟอร์มเพิ่มเพลง / แท็บนำเข้า | [EN] Add Form / Import Tabs */}
                        <div className="px-6 pt-5 bg-black/20 border-b border-white/[0.05]">
                            <div className="flex gap-6 mb-4">
                                <button
                                    onClick={() => setImportMode('single')}
                                    className={`text-[11px] font-black uppercase tracking-[0.15em] pb-3 border-b-2 transition-all ${importMode === 'single' ? 'border-brand-400 text-brand-300' : 'border-transparent text-white/40 hover:text-white/70'}`}
                                >
                                    Single Add
                                </button>
                                <button
                                    onClick={() => setImportMode('bulk')}
                                    className={`text-[11px] font-black uppercase tracking-[0.15em] pb-3 border-b-2 transition-all ${importMode === 'bulk' ? 'border-brand-400 text-brand-300' : 'border-transparent text-white/40 hover:text-white/70'}`}
                                >
                                    Bulk Import (Playlist)
                                </button>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pb-6 items-stretch relative">
                                <div className="relative flex-1 group">
                                    <div className={`absolute inset-0 bg-brand-500/20 blur-xl rounded-full transition-opacity duration-300 ${songUrl ? 'opacity-100' : 'opacity-0'} pointer-events-none`}></div>
                                    <input
                                        type="text"
                                        placeholder={importMode === 'single' ? "ค้นหาเพลง หรือ วางลิงก์ YouTube" : "วางลิงก์ YouTube Playlist"}
                                        className="relative w-full pl-11 pr-4 py-3 rounded-xl border border-white/10 bg-white/[0.04] text-white placeholder-white/30 text-[14px] focus:border-brand-400 focus:bg-white/[0.08] focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        value={songUrl}
                                        onChange={(e) => importMode === 'single' ? handleInputChange(e.target.value) : setSongUrl(e.target.value)}
                                        onBlur={() => setTimeout(clearSuggestions, 200)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Escape') clearSuggestions();
                                            if (e.key === 'Enter') importMode === 'single' ? handleAddSong() : handleBulkImport();
                                        }}
                                        disabled={isSubmitting || isSearching}
                                    />
                                    <Sparkles size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${songUrl ? 'text-brand-400' : 'text-white/30'}`} />
                                    {importMode === 'single' && suggestions.length > 0 && (
                                        <SuggestionDropdown suggestions={suggestions} onSelect={(s) => doSearch(showToast, s)} />
                                    )}
                                </div>
                                <button
                                    onClick={importMode === 'single' ? handleAddSong : handleBulkImport}
                                    disabled={isSubmitting || isSearching || !songUrl}
                                    className="px-6 py-3 text-white text-[13px] font-bold rounded-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2 flex-shrink-0 relative overflow-hidden"
                                    style={{
                                        background: importMode === 'single' && !isUrlInput && songUrl 
                                            ? 'linear-gradient(135deg, rgba(59,130,246,0.8), rgba(139,92,246,0.8))' 
                                            : 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    {isSubmitting || isSearching ? <Loader2 size={16} className="animate-spin" /> : (importMode === 'single' && !isUrlInput && songUrl ? <Search size={16} /> : <Plus size={16} />)}
                                    {importMode === 'single' && !isUrlInput && songUrl ? 'ค้นหาเพลง' : (importMode === 'single' ? 'เก็บเข้าคลัง' : 'ดึงเพลงทั้งลิสต์')}
                                </button>
                            </div>
                        </div>

                        {/* [TH] รายการเพลง หรือ ผลการค้นหา | [EN] List or Search Results */}
                        {importMode === 'single' && searchResults.length > 0 ? (
                            <div className="flex-1 p-6 space-y-2 overflow-y-auto max-h-[450px] custom-scrollbar bg-black/40 relative">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-brand-300 font-bold text-[12px] flex items-center gap-2 uppercase tracking-[0.1em]">
                                        <Search size={14} />
                                        ผลการค้นหา {searchResults.length} รายการ
                                    </h4>
                                    <button onClick={() => setSearchResults([])} className="text-white/30 hover:text-white/80 text-[11px] font-bold uppercase tracking-wider transition-colors border-b border-white/20 hover:border-white/80 pb-0.5">
                                        ยกเลิก
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {searchResults.map(video => (
                                        <SearchResultCard key={video.id} video={video} onSelect={handleSelectVideo} />
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 p-6 space-y-2.5 overflow-y-auto max-h-[450px] custom-scrollbar">
                                {!eventPlaylists[selectedEvent]?.songs ? (
                                    <div className="py-16 flex flex-col items-center justify-center text-center animate-fade-in">
                                        <div className="w-16 h-16 rounded-[20px] bg-white/[0.03] border border-white/5 flex items-center justify-center mb-4 text-white/20 shadow-inner">
                                            <ListMusic size={28} />
                                        </div>
                                        <p className="text-white/50 text-[14px] font-medium">คลังเทศกาลนี้ยังไม่มีเพลงเลย</p>
                                        <p className="text-white/30 text-[12px] mt-1.5 max-w-[200px]">วางลิงก์ YouTube เพื่อเริ่มเก็บเพลงเข้าคลังได้ทันที</p>
                                    </div>
                                ) : (
                                    Object.entries(eventPlaylists[selectedEvent].songs).reverse().map(([id, song], i) => (
                                        <div key={id} className="group flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.06] hover:border-white/10 transition-all sm:flex-row flex-col gap-3 sm:gap-0 text-center sm:text-left animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                                            <div className="flex items-center gap-4 overflow-hidden w-full sm:w-auto">
                                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500/20 to-violet-500/10 flex items-center justify-center text-brand-300 flex-shrink-0 border border-brand-500/20 shadow-inner">
                                                    <Music size={14} />
                                                </div>
                                                <p className="text-[13px] font-semibold text-white/85 truncate group-hover:text-white transition-colors">{song.title}</p>
                                            </div>
                                            <button
                                                onClick={() => deleteSongFromEvent(selectedEvent, id)}
                                                className="w-8 h-8 flex items-center justify-center text-white/30 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 rounded-lg transition-all opacity-100 sm:opacity-50 group-hover:opacity-100 flex-shrink-0"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full bg-white/[0.02] backdrop-blur-md rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-white/40 p-8 text-center min-h-[400px]">
                        <div className="w-16 h-16 bg-white/[0.03] outline outline-1 outline-white/5 rounded-full flex items-center justify-center mb-5 relative group">
                            <ListMusic size={28} className="text-brand-300/50" />
                            <div className="absolute inset-0 rounded-full bg-brand-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                        </div>
                        <h4 className="font-bold text-white/70 text-[15px] mb-2">เลือกหมวดหมู่เพื่อเริ่มจัดการ</h4>
                        <p className="max-w-[280px] text-[13px] text-white/30 leading-relaxed">เลือกหมวดหมู่ทางซ้ายมือ เพื่อเตรียมเพลงพิเศษสำหรับงานต่างๆ ให้พร้อมแยกจากคิวหลักของนักเรียน</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EventPlaylistManager;
