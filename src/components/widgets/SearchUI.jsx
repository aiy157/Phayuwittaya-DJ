import React from 'react';
import { Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export const SuggestionDropdown = ({ suggestions, onSelect }) => {
    const { isLight } = useTheme();
    return (
        <div
            className={`absolute top-0 w-full left-0 right-0 z-50 rounded-[24px] overflow-hidden animate-fade-in shadow-xl ${isLight ? 'bg-white border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.08)]' : 'bg-[#181818] border border-white/5 shadow-[0_12px_40px_rgba(0,0,0,0.60)]'}`}
        >
            {suggestions.map((s, i) => (
                <button
                    key={i}
                    onMouseDown={e => { e.preventDefault(); onSelect(s); }}
                    className={`
                        w-full text-left flex items-center gap-4 px-5 py-4
                        text-[15px] font-semibold
                        transition-colors duration-150
                        ${isLight ? 'hover:bg-gray-50 focus-visible:bg-gray-50 border-b border-gray-100 last:border-0' : 'hover:bg-white/5 focus-visible:bg-white/5 border-b border-white/5 last:border-0'}
                    `}
                    tabIndex={-1}
                >
                    <Search size={16} className={`flex-shrink-0 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} aria-hidden />
                    <span className={isLight ? 'text-gray-800' : 'text-gray-200'}>{s}</span>
                </button>
            ))}
        </div>
    );
};

const formatTime = (s) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;

export const SearchResultCard = ({ video, onSelect }) => {
    const { isLight } = useTheme();
    return (
        <div
            role="button"
            tabIndex={0}
            aria-label={`เพิ่ม ${video.title}`}
            onClick={() => onSelect(video)}
            onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect(video)}
            className={`flex items-center gap-4 p-3 rounded-[20px] cursor-pointer group transition-all duration-300 ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5 bg-transparent'}`}
        >
            <div className={`relative w-[120px] sm:w-[150px] aspect-video rounded-[14px] overflow-hidden flex-shrink-0 ${isLight ? 'bg-gray-100' : 'bg-[#222]'}`}>
                <img loading="lazy" src={video.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
                <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-[6px] text-[11px] font-bold bg-black/70 text-white backdrop-blur-md">
                    {formatTime(video.lengthSeconds)}
                </div>
                <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-blue-600 scale-90 group-hover:scale-100 transition-transform duration-300">
                        <Search size={18} strokeWidth={2.5} />
                    </div>
                </div>
            </div>
            <div className="flex-1 min-w-0 py-2 pr-2">
                <p className={`text-[15px] sm:text-[16px] font-bold leading-tight line-clamp-2 mb-1.5 transition-colors ${isLight ? 'text-gray-900 group-hover:text-blue-600' : 'text-gray-100 group-hover:text-blue-400'}`}>
                    {video.title}
                </p>
                <p className={`text-[12px] sm:text-[13px] font-medium truncate flex items-center gap-1.5 ${isLight ? 'text-gray-500' : 'text-gray-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isLight ? 'bg-gray-300' : 'bg-white/20'}`}></span>
                    {video.author}
                </p>
            </div>
        </div>
    );
};
