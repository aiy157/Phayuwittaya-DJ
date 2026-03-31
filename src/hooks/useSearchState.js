import { useState, useRef, useCallback, useEffect } from 'react';
import { searchYouTube, getYouTubeSuggestions, getYouTubeID } from '../services/youtubeService';

export const useSearchState = () => {
    const [songUrl, setSongUrl] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const suggestTimerRef = useRef(null);

    const isUrlInput = getYouTubeID(songUrl) !== null;

    // Debounced suggestion fetch — fires 300ms after user stops typing
    const handleInputChange = useCallback((value) => {
        setSongUrl(value);
        clearTimeout(suggestTimerRef.current);
        if (getYouTubeID(value) || value.trim().length < 2) {
            setSuggestions([]);
            return;
        }
        suggestTimerRef.current = setTimeout(async () => {
            const results = await getYouTubeSuggestions(value);
            setSuggestions(results);
        }, 300);
    }, []);

    const clearSuggestions = useCallback(() => setSuggestions([]), []);

    // doSearch accepts an optional query override (used when clicking a suggestion)
    const doSearch = useCallback(async (showToast, queryOverride) => {
        const q = (queryOverride || songUrl).trim();
        if (!q) return;
        setSuggestions([]);
        setIsSearching(true);
        setSearchResults([]);
        if (queryOverride) setSongUrl(queryOverride);
        try {
            const results = await searchYouTube(q);
            if (!results.length) showToast('ไม่พบวิดีโอที่ค้นหา ลองค้นหาด้วยคำอื่น', 'info');
            else setSearchResults(results);
        } catch {
            showToast('เกิดข้อผิดพลาดในการค้นหา', 'error');
        } finally {
            setIsSearching(false);
        }
    }, [songUrl]);

    // Cleanup debounce timer on unmount
    useEffect(() => () => clearTimeout(suggestTimerRef.current), []);

    return {
        songUrl, setSongUrl, handleInputChange,
        suggestions, clearSuggestions,
        searchResults, setSearchResults,
        isSearching, isUrlInput, doSearch,
    };
};
