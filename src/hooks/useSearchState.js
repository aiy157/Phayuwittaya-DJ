import { useState, useRef, useCallback, useEffect } from 'react';
import { searchYouTube, getYouTubeSuggestions, getYouTubeID } from '../services/youtubeService';

export const useSearchState = () => {
    const [songUrl, setSongUrl] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const suggestTimerRef = useRef(null);
    const autoSearchTimerRef = useRef(null);
    const abortControllerRef = useRef(null);

    // Helper to cancel any ongoing search
    const cancelOngoingSearch = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    const isUrlInput = getYouTubeID(songUrl) !== null;

    // Debounced suggestion fetch — fires 300ms after user stops typing
    const handleInputChange = useCallback((value) => {
        setSongUrl(value);
        clearTimeout(suggestTimerRef.current);
        clearTimeout(autoSearchTimerRef.current);
        
        // Don't clear search results immediately to avoid flickering. 
        // We only clear if input is very short or a URL.
        if (getYouTubeID(value) || value.trim().length < 2) {
            cancelOngoingSearch();
            setSearchResults([]);
            setSuggestions([]);
            setIsSearching(false);
            return;
        }

        // Auto-complete suggestions: 300ms debounce
        suggestTimerRef.current = setTimeout(async () => {
            try {
                const results = await getYouTubeSuggestions(value);
                setSuggestions(results);
            } catch { /* silent */ }
        }, 300);

        // Auto-search results: 500ms debounce (Faster feel)
        autoSearchTimerRef.current = setTimeout(async () => {
            cancelOngoingSearch();
            const controller = new AbortController();
            abortControllerRef.current = controller;

            setSuggestions([]);
            setIsSearching(true);
            try {
                const results = await searchYouTube(value.trim(), controller.signal);
                setSearchResults(results);
            } catch (err) {
                if (err.name !== 'AbortError') console.error('Auto-search error:', err);
            } finally {
                if (!controller.signal.aborted) {
                    setIsSearching(false);
                }
            }
        }, 500);
    }, [cancelOngoingSearch]);

    const clearSuggestions = useCallback(() => setSuggestions([]), []);

    // doSearch accepts an optional query override (used when clicking a suggestion)
    const doSearch = useCallback(async (showToast, queryOverride) => {
        const q = (queryOverride || songUrl).trim();
        if (!q) return;

        cancelOngoingSearch();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setSuggestions([]);
        setIsSearching(true);
        if (queryOverride) setSongUrl(queryOverride);

        try {
            const results = await searchYouTube(q, controller.signal);
            if (!results.length) {
                showToast('ไม่พบวิดีโอที่ค้นหา ลองค้นหาด้วยคำอื่น', 'info');
            } else {
                setSearchResults(results);
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                showToast('เกิดข้อผิดพลาดในการค้นหา', 'error');
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsSearching(false);
            }
        }
    }, [songUrl, cancelOngoingSearch]);

    // Cleanup debounce timers and controllers on unmount
    useEffect(() => () => {
        clearTimeout(suggestTimerRef.current);
        clearTimeout(autoSearchTimerRef.current);
        cancelOngoingSearch();
    }, [cancelOngoingSearch]);

    return {
        songUrl, setSongUrl, handleInputChange,
        suggestions, clearSuggestions,
        searchResults, setSearchResults,
        isSearching, isUrlInput, doSearch,
    };
};
