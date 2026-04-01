/**
 * @file youtubeService.js
 * Search strategy (fastest-first, sequential fallback):
 *  1. YouTube InnerTube API  — uses YouTube's own servers; most reliable worldwide
 *  2. Piped / Invidious race — 10 alt-frontend instances in parallel
 *  3. HTML scrape via proxy  — last resort
 */

// ─── YouTube InnerTube constants ──────────────────────────────────────────────
// This key is YouTube's own public web-client key, embedded in youtube.com source
const YT_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
const YT_CLIENT_VER = '2.20241201.01.00';
// EgIQAQ%3D%3D = base64-proto that tells InnerTube to return videos only
const YT_VIDEO_PARAM = 'EgIQAQ%3D%3D';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extracts the 11-character video ID from any valid YouTube URL.
 */
export const getYouTubeID = (url) => {
    if (!url) return null;
    const m = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/);
    return (m && m[2].length === 11) ? m[2] : null;
};

/**
 * Validates a URL and fetches title via noembed.
 */
export const fetchVideoDetails = async (input) => {
    const videoId = getYouTubeID(input);
    if (videoId) {
        try {
            const r = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const d = await r.json();
            return { id: videoId, title: d.title || input, url: `https://www.youtube.com/watch?v=${videoId}`, isUrl: true };
        } catch {
            return { id: videoId, title: 'Unknown Video', url: input, isUrl: true };
        }
    }
    return { id: null, title: input, isUrl: false };
};

/**
 * Fetches real-time suggestions from YouTube's own Suggest API.
 */
export const getYouTubeSuggestions = async (query, signal) => {
    if (!query || query.trim().length < 2) return [];
    try {
        const apiUrl = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
        // Combine caller signal with internal 4s timeout
        const combinedSignal = signal 
            ? AbortSignal.any([signal, AbortSignal.timeout(4000)])
            : AbortSignal.timeout(4000);

        const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(apiUrl)}`, { signal: combinedSignal });
        const data = await res.json();
        return Array.isArray(data[1]) ? data[1].slice(0, 8) : [];
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        return [];
    }
};

// ─── Result Parsers ───────────────────────────────────────────────────────────

/** Parse a "h:mm:ss" or "m:ss" duration string into seconds */
const parseDuration = (str = '') => {
    const p = str.split(':').map(Number);
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    if (p.length === 2) return p[0] * 60 + p[1];
    return 0;
};

/** Parse YouTube InnerTube search response → standard video objects */
const parseInnerTube = (data) => {
    const results = [];
    const sections = data?.contents?.twoColumnSearchResultsRenderer
        ?.primaryContents?.sectionListRenderer?.contents ?? [];

    for (const section of sections) {
        for (const item of (section.itemSectionRenderer?.contents ?? [])) {
            const vid = item.videoRenderer;
            if (!vid?.videoId) continue;
            const dur = parseDuration(vid.lengthText?.simpleText);
            if (dur > 0) {
                results.push({
                    id: vid.videoId,
                    title: vid.title?.runs?.[0]?.text || 'Unknown Title',
                    thumbnail: `https://i.ytimg.com/vi/${vid.videoId}/hqdefault.jpg`,
                    author: vid.ownerText?.runs?.[0]?.text || 'YouTube Channel',
                    lengthSeconds: dur,
                    url: `https://www.youtube.com/watch?v=${vid.videoId}`,
                });
                if (results.length >= 10) return results;
            }
        }
    }
    return results;
};

/** Extract ID from Piped's relative URL /watch?v=ID */
const pipedId = (url = '') => {
    const m = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : url.replace('/watch?v=', '').split('&')[0];
};

const parsePiped = (items = []) =>
    items
        .filter(v => v.duration > 0 && v.type === 'stream')
        .map(v => { const id = pipedId(v.url); return { id, title: v.title || 'Unknown', thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, author: v.uploaderName || 'Channel', lengthSeconds: v.duration, url: `https://www.youtube.com/watch?v=${id}` }; })
        .filter(v => v.id?.length === 11)
        .slice(0, 10);

const parseInvidious = (data = []) =>
    data
        .filter(v => v.type === 'video' && v.lengthSeconds > 0)
        .map(v => ({ id: v.videoId, title: v.title || 'Unknown', thumbnail: v.videoThumbnails?.find(t => t.quality === 'hqdefault')?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`, author: v.author || 'Channel', lengthSeconds: v.lengthSeconds, url: `https://www.youtube.com/watch?v=${v.videoId}` }))
        .slice(0, 10);


// ─── Strategy 1: YouTube HTML scrape via CORS proxy (Most Reliable for GET) ─────────────

const searchScrape = async (query, timeout, signal) => {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&gl=TH`;
    const proxies = [
        `https://api.allow-any-origin.appspot.com/${ytUrl}`,          // Extremely fast Google Cloud proxy
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(ytUrl)}`, // Backup
        `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(ytUrl)}`,
    ];

    for (const proxy of proxies) {
        try {
            const combinedSignal = signal 
                ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
                : AbortSignal.timeout(timeout);

            const res = await fetch(proxy, { signal: combinedSignal });
            if (!res.ok) continue;
            const ct = res.headers.get('content-type') || '';
            let html = ct.includes('json') ? (await res.json()).contents || '' : await res.text();
            
            // Allow-any-origin appspot sometimes wraps HTML in JSON body differently
            if (!html && typeof html !== 'string') html = JSON.stringify(html);

            if (!html.includes('ytInitialData')) continue;

            const match = html.match(/var ytInitialData\s*=\s*(\{.*?\});\s*<\/script>/s);
            if (!match) continue;
            const ytData = JSON.parse(match[1]);
            const sections = ytData?.contents?.twoColumnSearchResultsRenderer
                ?.primaryContents?.sectionListRenderer?.contents ?? [];
            const results = [];
            for (const sec of sections) {
                for (const item of (sec.itemSectionRenderer?.contents ?? [])) {
                    const vid = item.videoRenderer;
                    if (!vid?.videoId || !vid.lengthText?.simpleText) continue;
                    const dur = parseDuration(vid.lengthText.simpleText);
                    if (dur > 0) {
                        results.push({ id: vid.videoId, title: vid.title?.runs?.[0]?.text || 'Unknown', thumbnail: `https://i.ytimg.com/vi/${vid.videoId}/hqdefault.jpg`, author: vid.ownerText?.runs?.[0]?.text || 'Channel', lengthSeconds: dur, url: `https://www.youtube.com/watch?v=${vid.videoId}` });
                        if (results.length >= 10) return results;
                    }
                }
            }
            if (results.length) return results;
        } catch { /* try next proxy */ }
    }
    throw new Error('Scrape failed');
};

// ─── Strategy 2: Piped + Invidious race ──────────────────────────────────────

const PIPED = [
    'https://pipedapi.kavin.rocks',
    'https://api.piped.projectsegfau.lt',
    'https://pipedapi.lunar.icu',
    'https://pipedapi.smnz.de'
];

const INVIDIOUS = [
    'https://invidious.jing.rocks',
    'https://inv.tux.pizza',
    'https://yewtu.be',
    'https://invidious.privacyredirect.com'
];

const searchAltFrontends = async (query, timeout, signal) => {
    const q = encodeURIComponent(query);
    const pipedReqs = PIPED.map(async b => {
        const combinedSignal = signal 
            ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
            : AbortSignal.timeout(timeout);

        const r = await fetch(`${b}/search?q=${q}`, { signal: combinedSignal });
        if (!r.ok) throw new Error();
        const j = await r.json();
        const res = parsePiped(j.items || []);
        if (!res.length) throw new Error('empty');
        return res;
    });
    const invReqs = INVIDIOUS.map(async b => {
        const combinedSignal = signal 
            ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
            : AbortSignal.timeout(timeout);

        const r = await fetch(`${b}/api/v1/search?q=${q}&type=video`, { signal: combinedSignal });
        if (!r.ok) throw new Error();
        const d = await r.json();
        const res = parseInvidious(Array.isArray(d) ? d : []);
        if (!res.length) throw new Error('empty');
        return res;
    });
    return Promise.any([...pipedReqs, ...invReqs]);
};

// ─── Strategy 3: YouTube InnerTube API (Requires POST proxy) ───────────────────────

const CORS_PROXIES = [
    (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`, // Note: allorigins often strips POST, acting as fallback
];

const searchInnerTube = async (query, timeout, signal) => {
    const apiUrl = `https://www.youtube.com/youtubei/v1/search?key=${YT_KEY}&prettyPrint=false`;
    const body = JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: YT_CLIENT_VER, hl: 'th', gl: 'TH' } },
        query,
        params: YT_VIDEO_PARAM,
    });

    for (const makeProxy of CORS_PROXIES) {
        try {
            const combinedSignal = signal 
                ? AbortSignal.any([signal, AbortSignal.timeout(timeout)])
                : AbortSignal.timeout(timeout);

            const res = await fetch(makeProxy(apiUrl), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body,
                signal: combinedSignal,
            });
            if (!res.ok) continue;
            const text = await res.text();
            let json;
            try { json = JSON.parse(text); } catch { continue; }
            if (json?.contents && typeof json.contents === 'string') {
                try { json = JSON.parse(json.contents); } catch { continue; }
            }
            const results = parseInnerTube(json);
            if (results.length > 0) return results;
        } catch { /* try next proxy */ }
    }
    throw new Error('InnerTube failed');
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Searches YouTube using a 3-tier fallback strategy.
 */
export const searchYouTube = async (query, signal) => {
    if (!query?.trim()) return [];
    const q = query.trim();

    // ── Tier 1: Scrape (Safest for Production CORS) ─────────────────────────
    try {
        const r = await searchScrape(q, 7000, signal);
        if (r.length) return r;
    } catch (e) { 
        if (e.name === 'AbortError') throw e;
        console.warn("Tier 1 scrape failed", e);
    }

    // ── Tier 2: Alt frontends ────────────────────────────────────────────────
    try {
        const r = await searchAltFrontends(q, 6000, signal);
        if (r.length) return r;
    } catch (e) { 
        if (e.name === 'AbortError') throw e;
        console.warn("Tier 2 alt frontends failed", e);
    }

    // ── Tier 3: InnerTube ────────────────────────────────────────────────────
    try {
        return await searchInnerTube(q, 6000, signal);
    } catch (e) {
        if (e.name === 'AbortError') throw e;
        console.error('[searchYouTube] All search methods failed for:', q);
        return [];
    }
};
