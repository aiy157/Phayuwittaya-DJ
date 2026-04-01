import React, { useState } from 'react';
import {
    Send, Loader2, Radio, SkipForward, ChevronDown, ChevronUp,
    ListMusic, Music2, Lock, Headphones, Search, Play, Clock, CheckCircle2,
    Sun, Moon
} from 'lucide-react';
import DurationChecker from '../widgets/DurationChecker';
import { getYouTubeID } from '../../services/youtubeService';
import { SuggestionDropdown, SearchResultCard } from '../widgets/SearchUI';
import { useSearchState } from '../../hooks/useSearchState';

import { useTheme } from '../../context/ThemeContext';

/* ─────────────────────────────────────────────
 * Sub-components (single-responsibility)
 * ─────────────────────────────────────────── */

/** Animated equalizer bars — playing indicator */
const Equalizer = () => (
    <div className="flex items-end gap-[3px] h-4" aria-hidden>
        {['animate-eq-1', 'animate-eq-2', 'animate-eq-3', 'animate-eq-4'].map((cls, i) => (
            <span
                key={i}
                className={`w-[4px] rounded-full bg-blue-500 ${cls}`}
                style={{ minHeight: 4 }}
            />
        ))}
    </div>
);

/** Now-playing card displayed below the input */
const NowPlayingCard = ({ currentSong }) => {
    const { isLight } = useTheme();
    return (
        <div className="mt-8 animate-fade-in-up w-full max-w-[560px] mx-auto">
            <p className="text-[12px] font-bold tracking-widest uppercase mb-3 text-blue-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-heartbeat" />กำลังเล่น
            </p>
            <div className="flex items-center gap-4 p-4 lg:p-5 rounded-[24px] transition-all duration-300 card-interactive shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div
                    className="w-12 h-12 min-w-[48px] rounded-[14px] flex items-center justify-center bg-blue-500/10 border border-blue-500/20 shadow-inner relative z-10"
                    aria-hidden
                >
                    <Equalizer />
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-[16px] lg:text-[18px] font-bold truncate ${isLight ? 'text-black' : 'text-white'}`}>
                        {currentSong.title || 'กำลังโหลด...'}
                    </p>
                    <p className="text-[13px] text-gray-400 font-medium truncate mt-0.5">PhayuWittaya DJ Channel</p>
                </div>
            </div>
        </div>
    );
};

/** Read-only queue item for student view */
const QueueItem = ({ req, index }) => (
    <div
        className="flex items-center gap-4 px-4 py-4 rounded-[16px] animate-fade-in-up transition-all hover:bg-black/5 dark:hover:bg-white/5 border-b border-black/5 dark:border-white/5 last:border-0 hover:scale-[1.01]"
        style={{ animationDelay: `${index * 55}ms` }}
    >
        <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-[12px] bg-black/5 dark:bg-white/10 text-gray-500 dark:text-gray-400 shadow-inner" aria-label={`ลำดับที่ ${index + 1}`}>
            {index + 1}
        </span>
        <div className="flex items-center gap-3 min-w-0 flex-1">
            <p className="text-[15px] font-semibold truncate text-gray-900 dark:text-gray-100">
                {req.title || 'กำลังโหลด...'}
            </p>
        </div>
    </div>
);

/* ─────────────────────────────────────────────
 * Main Component
 * ─────────────────────────────────────────── */
const StudentView = ({
    handleRequest, isSubmitting, currentSong,
    isSystemActive = true, isRequestsEnabled = true,
    requests = [], maxSongDuration = 10, showToast,
}) => {
    const {
        songUrl, setSongUrl, handleInputChange,
        suggestions, clearSuggestions,
        searchResults, setSearchResults,
        isSearching, isUrlInput, doSearch,
    } = useSearchState();

    const [showQueue, setShowQueue] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [localSubmitting, setLocalSubmitting] = useState(false);
    const isProcessingRef = React.useRef(false);
    const checkerRef = React.useRef(null);

    const handleSelectVideo = async (video) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setLocalSubmitting(true);
        try {
            setSearchResults([]);
            // Duration already known from search — check instantly, no DurationChecker polling needed
            if (maxSongDuration > 0 && video.lengthSeconds > maxSongDuration * 60)
                return showToast(`เพลงยาวเกินไป! จำกัดไม่เกิน ${maxSongDuration} นาที`, 'error');
            // Pass video.title so addRequest skips noembed fetch entirely — queue updates instantly
            await handleRequest(video.url, video.title);
            setSongUrl('');
        } finally {
            isProcessingRef.current = false;
            setLocalSubmitting(false);
        }
    };

    const onSubmit = async () => {
        if (!songUrl || !isRequestsEnabled || isProcessingRef.current) return;
        isProcessingRef.current = true;
        setLocalSubmitting(true);
        try {
            const videoId = getYouTubeID(songUrl);
            if (!videoId) return showToast('ลิงก์ YouTube ไม่ถูกต้อง', 'error');
            // Duration check for manual URL input (DurationChecker may not be ready yet — skip if not)
            if (checkerRef.current && maxSongDuration > 0) {
                const dur = await checkerRef.current.getDuration(videoId);
                if (dur > maxSongDuration * 60)
                    return showToast(`เพลงยาวเกินไป! จำกัดไม่เกิน ${maxSongDuration} นาที`, 'error');
            }
            // No knownTitle for manual URL — addRequest fetches in background, queue appears immediately
            await handleRequest(songUrl, null);
            setSongUrl('');
            setSubmitSuccess(true);
            setTimeout(() => setSubmitSuccess(false), 1800);
        } finally {
            isProcessingRef.current = false;
            setLocalSubmitting(false);
        }
    };

    const { isLight } = useTheme();
    // isBusy tracks if we are actually 'busy' with a transaction (submitting)
    const isBusy = isSubmitting || localSubmitting;
    // isWaiting tracks both submission and background searching for UI indicators (spinners)
    const isWaiting = isBusy || isSearching;
    const isDisabled = isBusy || !isRequestsEnabled;

    return (
        <div className="flex flex-col items-center pt-8 sm:pt-16 pb-32 min-h-[80vh] animate-fade-in relative z-10 w-full px-4 sm:px-6">
            <DurationChecker onReady={(ref) => (checkerRef.current = ref)} />

            {/* ── HERO ── */}
            <div className="text-center mb-12 sm:mb-16 w-full max-w-[600px] mt-4">
                {/* ── Vibrant Icon ── */}
                <div className="inline-flex items-center justify-center mb-7 relative mt-4">
                    <div className="absolute -inset-12 rounded-full animate-glow-pulse pointer-events-none opacity-80"
                         style={{ background: isLight ? 'radial-gradient(ellipse, rgba(59,130,246,0.25) 0%, transparent 70%)' : 'radial-gradient(ellipse, rgba(139,92,246,0.45) 0%, rgba(59,130,246,0.2) 60%, transparent 70%)' }} />
                    <div className="absolute -inset-5 rounded-full animate-spin-slow pointer-events-none"
                         style={{ border: isLight ? '2px dashed rgba(59,130,246,0.25)' : '2px dashed rgba(139,92,246,0.5)', borderRight: '2px dashed transparent' }} />
                    
                    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-[28px] flex items-center justify-center text-white overflow-hidden"
                         style={{ 
                             background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #f43f5e 100%)', 
                             boxShadow: isLight ? '0 16px 40px -8px rgba(59,130,246,0.5), inset 0 2px 4px rgba(255,255,255,0.4)' : '0 0 80px rgba(139,92,246,0.6), 0 16px 40px -8px rgba(59,130,246,0.6), inset 0 2px 4px rgba(255,255,255,0.4)' 
                         }}>
                        <Radio size={40} strokeWidth={1.8} className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)] relative z-10" />
                        <div className="absolute inset-0 z-0" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)' }} />
                    </div>
                </div>

                <h1 className={`text-[38px] sm:text-[60px] font-black tracking-tight leading-[1.05] mb-4 sm:mb-5 ${isLight ? 'text-gray-900 drop-shadow-sm' : 'text-white drop-shadow-lg'}`}>
                    ขอเพลง<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500">ออนไลน์✨</span>
                </h1>
                <p className={`text-[14px] sm:text-[17px] max-w-md mx-auto leading-relaxed font-semibold px-4 ${isLight ? 'text-slate-600' : 'text-gray-300'}`}>
                    {isRequestsEnabled
                        ? "ค้นหาชื่อเพลงหรือวางลิงก์ YouTube ที่นึกออก ระบบจะจัดการเพิ่มลงคิวให้คุณเอง"
                        : <span className="flex items-center justify-center gap-2 text-rose-500 font-bold"><Lock size={18} aria-hidden /> ปิดรับคำขอเพลงชั่วคราว</span>
                    }
                </p>
            </div>

            <div className="w-full max-w-[640px] relative z-20">
            {/* ── INPUT BLOCK ── */}
            <div className={`transition-all duration-300 ${!isRequestsEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                {/* Relative wrapper — anchors the dropdown correctly below the input box */}
                <div className="relative">
                    {/* Glowing thick gradient border wrapper */}
                    <div className={`p-[2px] rounded-[24px] sm:rounded-[30px] transition-all duration-500 ${isLight ? 'shadow-[0_8px_40px_rgba(0,0,0,0.06)] hover:shadow-[0_16px_60px_rgba(59,130,246,0.15)]' : 'shadow-[0_8px_40px_rgba(0,0,0,0.3)] hover:shadow-[0_16px_60px_rgba(139,92,246,0.3)]'}`}
                         style={{ background: isLight ? 'linear-gradient(135deg, rgba(255,255,255,1), rgba(255,255,255,0.4))' : 'linear-gradient(135deg, rgba(59,130,246,0.8), rgba(139,92,246,0.6), rgba(244,63,94,0.5))' }}>
                        
                        <div className={`relative rounded-[22px] sm:rounded-[28px] overflow-hidden backdrop-blur-2xl ${isLight ? 'bg-white/60 shadow-[inset_0_2px_15px_rgba(255,255,255,0.8)]' : 'glass-strong'}`}>
                            {/* Inner top shimmer */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 pointer-events-none" style={{ background: 'linear-gradient(90deg,transparent,rgba(167,139,250,0.8),transparent)' }} />
                            <div
                                className={`absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200 ${songUrl ? 'text-purple-500' : isLight ? 'text-gray-500' : 'text-gray-400'}`}
                                aria-hidden
                            >
                                {isRequestsEnabled ? <Search size={22} strokeWidth={2.5} className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]"/> : <Lock size={22} className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px]"/>}
                            </div>
                            <input
                                type="text"
                                id="song-url-input"
                                autoComplete="off"
                                placeholder={isRequestsEnabled ? 'ค้นหาชื่อเพลง หรือวางลิงก์ YouTube' : 'ขณะนี้งดรับคิวเพลง'}
                                className={`w-full pl-11 sm:pl-16 pr-[100px] sm:pr-32 py-4 sm:py-6 rounded-[22px] sm:rounded-[28px] text-[15px] sm:text-[18px] font-bold transition-all duration-300 focus:outline-none focus:ring-[4px] focus:ring-purple-500/20 bg-transparent ${isLight ? 'text-gray-900 placeholder-gray-500/80' : 'text-white placeholder-gray-400/80'}`}
                                value={songUrl}
                                onChange={e => handleInputChange(e.target.value)}
                                onBlur={() => setTimeout(clearSuggestions, 150)}
                                disabled={isBusy || !isRequestsEnabled}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') { clearSuggestions(); isUrlInput ? onSubmit() : doSearch(showToast); }
                                    if (e.key === 'Escape') clearSuggestions();
                                }}
                                aria-label="ค้นหาเพลง"
                            />
                        
                            {/* Right inline button */}
                             <button
                                id="submit-song-btn"
                                onClick={() => isUrlInput ? onSubmit() : doSearch(showToast)}
                                disabled={isDisabled}
                                className={`absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 px-4 sm:px-5 py-2.5 sm:py-3.5 rounded-[16px] sm:rounded-[20px] font-bold text-[13px] sm:text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95 ${isDisabled ? (isLight ? 'bg-white/50 text-gray-400 shadow-inner' : 'bg-white/5 text-gray-600 shadow-inner') : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/40'}`}
                            >
                                {isWaiting && <Loader2 className="animate-spin" size={16} aria-hidden />}
                                {!isWaiting && submitSuccess && <CheckCircle2 size={16} aria-hidden />}
                                {!isWaiting && !submitSuccess && isUrlInput && <span className="hidden sm:block">เพิ่มเพลง</span>}
                                {!isWaiting && !submitSuccess && !isUrlInput && <span className="hidden sm:block">ค้นหา</span>}
                                {!isWaiting && !submitSuccess && (isUrlInput ? <Send size={16} strokeWidth={2.5} className="sm:hidden"/> : <Search size={16} strokeWidth={2.5} className="sm:hidden" />)}
                            </button>
                        </div>
                    </div>

                    {/* Suggestion dropdown — anchored to the search box via position:absolute on a relative parent */}
                    {suggestions.length > 0 && !isUrlInput && !isBusy && (
                        <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50">
                           <SuggestionDropdown
                               suggestions={suggestions}
                               onSelect={(s) => { doSearch(showToast, s); }}
                           />
                        </div>
                    )}
                </div>

                {/* Duration hint */}
                {maxSongDuration > 0 && isRequestsEnabled && (
                    <p className={`text-center text-[12px] sm:text-[13px] font-semibold mt-4 sm:mt-5 flex items-center justify-center gap-1.5 ${isLight ? 'text-slate-500' : 'text-gray-500'}`}>
                        รองรับความยาวไม่เกิน {maxSongDuration} นาที
                    </p>
                )}
            </div>

                {/* ── SEARCH RESULTS ── */}
                {searchResults.length > 0 && (
                    <div className="mt-3 space-y-2 animate-fade-in" role="list" aria-label="ผลการค้นหา">
                        {searchResults.map(video => (
                            <SearchResultCard key={video.id} video={video} onSelect={handleSelectVideo} />
                        ))}
                    </div>
                )}

                {/* ── NOW PLAYING ── only show when system is actually broadcasting */}
                {currentSong && isSystemActive && <NowPlayingCard currentSong={currentSong} />}

                {/* ── QUEUE LIST ACCORDION ── */}
                <div className="mt-6 sm:mt-8">
                    <button
                        id="toggle-queue-btn"
                        onClick={() => setShowQueue(!showQueue)}
                        aria-expanded={showQueue}
                        aria-controls="queue-list"
                        className={`w-full flex items-center justify-between p-4 sm:p-5 rounded-[20px] sm:rounded-[24px] transition-all hover:scale-[1.01] active:scale-[0.99] backdrop-blur-xl ${isLight ? 'bg-white/60 border border-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.04)]' : 'bg-white/[0.04] border border-white/5 hover:border-purple-500/30'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-purple-500/20" aria-hidden>
                                <ListMusic size={20} className="text-purple-500" />
                            </div>
                            <div className="text-left">
                                <p className={`text-[16px] font-bold ${isLight ? 'text-gray-900' : 'text-white'}`}>คิวเพลงรอ</p>
                                <p className={`text-[13px] font-medium mt-0.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>{requests.length} เพลงที่รอเล่น</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                           {requests.length > 0 && (
                               <span className="px-3 py-1 rounded-full text-[12px] font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/20">
                                   {requests.length}
                               </span>
                           )}
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 ${showQueue ? 'rotate-180' : ''} ${isLight ? 'bg-gray-100' : 'bg-white/10'}`}>
                                <ChevronDown size={18} className={isLight ? 'text-gray-600' : 'text-gray-300'} aria-hidden />
                           </div>
                        </div>
                    </button>

                    {/* Queue list items */}
                    {showQueue && (
                        <div id="queue-list" className={`mt-3 py-2 rounded-[24px] backdrop-blur-2xl ${isLight ? 'bg-white/60 border border-white/70 shadow-lg' : 'bg-[#111]/80 border border-white/5 shadow-2xl'} overflow-hidden`}>
                            {requests.length > 0 ? (
                                requests.map((req, i) => <QueueItem key={req.id} req={req} index={i} isLight={isLight}/>)
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 px-4 animate-fade-in text-center">
                                    <ListMusic size={32} className={`mb-3 ${isLight ? 'text-gray-300' : 'text-white/10'}`} aria-hidden />
                                    <p className={`text-[15px] font-semibold ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>ยังไม่มีเพลงในคิว</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default StudentView;
