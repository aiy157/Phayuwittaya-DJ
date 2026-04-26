import React, { useState, useEffect } from 'react';
import { getYouTubeID } from '../../services/youtubeService';
import { useTheme } from '../../context/ThemeContext';
import { Play, SkipForward, Info, Mic } from 'lucide-react';

export default function DisplayView({ currentSong, requests, isSystemActive, playbackMode }) {
    const { isLight } = useTheme();
    const [elapsed, setElapsed] = useState(0);

    // Track elapsed time for the progress bar animation visually
    useEffect(() => {
        let interval;
        if (isSystemActive && currentSong) {
            interval = setInterval(() => {
                if (currentSong.isPlaying !== false) {
                    const elapsedSecs = (Date.now() - (currentSong.startedAt || Date.now())) / 1000;
                    setElapsed(elapsedSecs > 0 ? elapsedSecs : 0);
                }
            }, 1000);
        } else {
            setElapsed(0);
        }
        return () => clearInterval(interval);
    }, [currentSong, isSystemActive]);

    const videoId = currentSong?.url ? getYouTubeID(currentSong.url) : null;
    const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : '';

    return (
        <div className="fixed inset-0 w-full h-full overflow-hidden select-none" style={{ backgroundColor: isLight ? '#f8fafc' : '#020617' }}>
            
            {/* Dynamic Background */}
            <div 
                className="absolute inset-0 w-full h-full transition-all duration-1000 bg-cover bg-center opacity-40 blur-3xl scale-110"
                style={{ 
                    backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : 'none',
                    backgroundColor: isLight ? '#e2e8f0' : '#0f172a'
                }}
            />
            <div className={`absolute inset-0 w-full h-full bg-gradient-to-t ${isLight ? 'from-slate-100/90 to-slate-100/40' : 'from-[#020617] to-[#020617]/50'}`} />

            <div className="relative z-10 w-full h-full flex flex-col p-8 lg:p-16">
                
                {/* Header */}
                <div className="flex items-center justify-between animate-fade-in">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
                            <Mic className="text-white" size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-500 to-indigo-500 tracking-tight">
                                PhayuWittaya DJ
                            </h1>
                            <p className={`text-sm font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                OFFICIAL BROADCAST DISPLAY
                            </p>
                        </div>
                    </div>

                    <div className={`flex items-center gap-3 px-5 py-2.5 rounded-full backdrop-blur-md border ${
                        isSystemActive 
                        ? (isLight ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400')
                        : (isLight ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-400')
                    } font-bold tracking-widest uppercase text-sm shadow-sm`}>
                        <span className={`w-2.5 h-2.5 rounded-full ${isSystemActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                        {isSystemActive ? 'ON AIR' : 'OFFLINE'}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col justify-center items-center text-center mt-8 -translate-y-8 animate-slide-up">
                    
                    {!isSystemActive ? (
                        <div className="flex flex-col items-center">
                            <div className="w-32 h-32 mb-8 rounded-full bg-slate-500/10 flex items-center justify-center backdrop-blur-xl">
                                <Play size={48} className={isLight ? 'text-slate-400' : 'text-slate-600'} />
                            </div>
                            <h2 className={`text-3xl font-black mb-4 ${isLight ? 'text-slate-800' : 'text-white'}`}>ระบบปิดทำการ</h2>
                            <p className={`text-xl ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>ขณะนี้ไม่ได้อยู่ในช่วงเวลาออกอากาศ</p>
                        </div>
                    ) : currentSong ? (
                        <div className="flex flex-col items-center max-w-5xl w-full">
                            <div className="relative group w-64 h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 rounded-3xl overflow-hidden shadow-2xl mb-10 ring-4 ring-white/10 ring-offset-4 ring-offset-transparent transition-transform hover:scale-105 duration-500">
                                {thumbnailUrl ? (
                                    <img src={thumbnailUrl} alt="Cover" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                                        <Play size={64} className="text-slate-600" />
                                    </div>
                                )}
                                
                                {/* Audio Visualizer Overlay */}
                                {currentSong.isPlaying !== false && (
                                    <div className="absolute bottom-0 left-0 w-full h-1/4 bg-gradient-to-t from-[#020617]/90 to-transparent flex items-end justify-center pb-4 gap-1.5 opacity-90 transition-opacity duration-300">
                                        {[...Array(12)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="w-1.5 md:w-2.5 bg-brand-400 rounded-t-sm eq-bar" 
                                                style={{ 
                                                    animationDelay: `${i * 0.1}s`,
                                                    animationDuration: `${0.8 + Math.random() * 0.5}s`
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}

                                <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] pointer-events-none" />
                            </div>

                            <p className="text-xl md:text-2xl font-semibold text-brand-500 mb-3 uppercase tracking-widest flex items-center gap-2">
                                <Info size={20} />
                                ตอนนี้กำลังเล่น
                            </p>
                            <h2 className={`text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight line-clamp-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {currentSong.title}
                            </h2>
                            
                            <div className={`px-6 py-3 rounded-2xl backdrop-blur-xl border ${isLight ? 'bg-slate-900/5 text-slate-700 border-slate-900/10' : 'bg-white/5 text-white/80 border-white/10'} font-medium text-lg lg:text-xl`}>
                                ขอโดย: <span className={`font-bold ${isLight ? 'text-brand-600' : 'text-brand-400'}`}>{currentSong.student}</span>
                            </div>

                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <h2 className={`text-4xl font-black mb-4 ${isLight ? 'text-slate-300' : 'text-slate-700'}`}>ไม่มีเพลงที่กำลังเล่น</h2>
                        </div>
                    )}
                </div>

                {/* Next Track Footer */}
                {isSystemActive && requests.length > 0 && (
                    <div className="mt-auto flex items-center gap-6 animate-fade-in">
                        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800/20 backdrop-blur-md border border-slate-700/30">
                            <SkipForward className={isLight ? 'text-slate-500' : 'text-white/60'} size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-white/40'}`}>คิวต่อไป</p>
                            <p className={`text-xl font-bold truncate ${isLight ? 'text-slate-800' : 'text-white/90'}`}>{requests[0].title}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
