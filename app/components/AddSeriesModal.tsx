
"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, Loader2, Save } from 'lucide-react';
import { WatchlistEntry } from '@/app/types';
import Image from 'next/image';

interface AddSeriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (entry: Omit<WatchlistEntry, 'id'> | WatchlistEntry) => Promise<void>;
    initialData?: WatchlistEntry | null;
}

export default function AddSeriesModal({ isOpen, onClose, onAdd, initialData }: AddSeriesModalProps) {
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [preview, setPreview] = useState<Partial<WatchlistEntry> | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        type: 'Series' as 'Series' | 'Movie',
        seasons: 0,
        episodes: 0,
        length: '',
        genre: '',
        rating: '',
        finishedDate: '',
        status: 'Plan to Watch' as WatchlistEntry['status'],
        thumbnail: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                title: initialData.title || '',
                type: initialData.type || 'Series',
                seasons: initialData.seasons || 0,
                episodes: initialData.episodes || 0,
                length: initialData.length || '',
                genre: initialData.genre || '',
                rating: initialData.rating || '',
                finishedDate: initialData.finishedDate || '',
                status: initialData.status || 'Plan to Watch',
                thumbnail: initialData.thumbnail || '',
            });
        } else {
            setFormData({
                title: '',
                type: 'Series',
                seasons: 0,
                episodes: 0,
                length: '',
                genre: '',
                rating: '',
                finishedDate: '',
                status: 'Plan to Watch',
                thumbnail: '',
            });
            setSearchResults([]);
            setSearchQuery('');
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleFetch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        setSearchResults([]);
        try {
            // Priority 1: Native Scraper (Local)
            const res = await axios.get(`/api/scrape?title=${encodeURIComponent(searchQuery)}&list=true`);
            if (res.data.results) {
                setSearchResults(res.data.results);
                return;
            }
        } catch (error) {
            // Priority 2: Live Proxy Search (GitHub Pages) - Scrape official IMDb search results
            try {
                const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.imdb.com/find?q=${encodeURIComponent(searchQuery)}&s=tt`)}`;
                const proxyRes = await axios.get(proxyUrl);
                const html = proxyRes.data.contents;
                
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const items = doc.querySelectorAll('.ipc-metadata-list-summary-item');
                
                const results: any[] = [];
                items.forEach((item: any) => {
                    const idLink = item.querySelector('a.ipc-metadata-list-summary-item__t');
                    const idMatch = idLink?.getAttribute('href')?.match(/\/title\/(tt\d+)\//);
                    const title = item.querySelector('.ipc-metadata-list-summary-item__t')?.textContent;
                    const year = item.querySelector('.ipc-metadata-list-summary-item__li')?.textContent;
                    const rating = item.querySelector('.ipc-rating-star--imdb')?.textContent;
                    const img = item.querySelector('img.ipc-image')?.getAttribute('src');
                    
                    if (idMatch && title) {
                        results.push({
                            id: idMatch[1],
                            l: title.trim(),
                            y: year?.trim() || '',
                            q: item.textContent.includes('TV Series') ? 'TV Series' : 'Movie',
                            rating: rating?.trim() || '',
                            i: { imageUrl: img || '' },
                            s: ''
                        });
                    }
                });
                
                if (results.length > 0) {
                    setSearchResults(results);
                    return;
                }
            } catch (fallbackError) {
                console.warn('Proxy search failed, falling back to TMDb', fallbackError);
            }
            
            // Priority 3: TMDb Search (Third-choice Fallback)
            try {
                const tmdbKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
                const res = await axios.get(`https://api.themoviedb.org/3/search/multi?api_key=${tmdbKey}&query=${encodeURIComponent(searchQuery)}`);
                const filtered = (res.data.results || []).filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
                if (filtered.length > 0) {
                    const mapped = filtered.map((r: any) => ({
                        id: r.id.toString(),
                        l: r.title || r.name,
                        y: (r.release_date || r.first_air_date || '').split('-')[0],
                        q: r.media_type === 'tv' ? 'TV Series' : 'Movie',
                        s: r.overview || '',
                        i: { imageUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '' },
                        rating: r.vote_average ? r.vote_average.toFixed(1).toString() : '',
                    }));
                    setSearchResults(mapped);
                    return;
                }
            } catch (e) {}
            
            alert('No results found on IMDb or TMDb.');
        } finally {
            setLoading(false);
        }
    };

    const formatRuntime = (minutesStr: string | number) => {
        if (!minutesStr) return '';
        const strVal = String(minutesStr);
        if (strVal.includes('h')) return strVal; // Already physically formatted natively by IMDb
        const mins = parseInt(strVal.replace(/[^0-9]/g, ''));
        if (isNaN(mins) || mins === 0) return '';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        const remaining = mins % 60;
        return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
    };

    const fetchImdbRating = async (imdbId: string): Promise<string | null> => {
        if (!imdbId) return null;
        
        // Strategy A: Native Scraper (Local)
        try {
            const res = await axios.get(`/api/scrape?imdbId=${imdbId}`, { timeout: 3000 });
            if (res.data.rating) return res.data.rating.toString();
        } catch (e) { }

        // Strategy B: Multi-Proxy JSON-LD Parsing (Live Site)
        const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(`https://www.imdb.com/title/${imdbId}/`)}`,
            `https://corsproxy.io/?${encodeURIComponent(`https://www.imdb.com/title/${imdbId}/`)}`
        ];

        for (const url of proxies) {
            try {
                const res = await axios.get(url, { timeout: 7000 });
                const html = res.data.contents || res.data;
                
                // Extract official JSON-LD block
                const jsonMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/i);
                if (jsonMatch) {
                    try {
                        const json = JSON.parse(jsonMatch[1]);
                        const rating = json.aggregateRating?.ratingValue || json.ratingValue;
                        if (rating) return rating.toString();
                    } catch (e) {}
                }
                
                // Fallback Regex
                const regMatch = html.match(/"ratingValue":\s*"([\d.]+)"/i) || html.match(/"ratingValue":\s*([\d.]+)/i);
                if (regMatch) return regMatch[1];
            } catch (err) { }
        }
        return null;
    };

    const handleSelectResult = async (fetchId: string, itemTitle: string) => {
        setLoading(true);
        const selectedObj = searchResults.find(r => r.id === fetchId);
        setSearchResults([]);
        
        // 1. ATTEMPT HIGH-FIDELITY LOCAL SCRAPE
        if (fetchId.startsWith('tt')) {
            try {
                const res = await axios.get(`/api/scrape?imdbId=${encodeURIComponent(fetchId)}`);
                const d = res.data;
                if (d && !d.error) {
                    const finalData = {
                        ...formData,
                        title: d.title || itemTitle,
                        type: d.type || 'Movie',
                        seasons: d.seasons || 0,
                        episodes: d.episodes || 0,
                        length: formatRuntime(d.runtime),
                        genre: d.genres || '',
                        rating: d.rating || '',
                        thumbnail: d.poster || '',
                        status: 'Watching' as const,
                        finishedDate: ''
                    };
                    setFormData(finalData);
                    setPreview({ title: finalData.title, type: finalData.type, thumbnail: finalData.thumbnail });
                    setSearchQuery('');
                    setLoading(false);
                    return;
                }
            } catch (e) { console.warn('Local scrape bypassed'); }
        }

        // 2. LIVE SITE FALLBACK (TMDB + IMDb SYNC)
        try {
            const isSeries = selectedObj?.q === 'TV Series' || (selectedObj?.q || '').includes('Series');
            const tmdbKey = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
            
            // Get base data from TMDB
            let baseData: any = null;
            if (fetchId.startsWith('tt')) {
                const findRes = await axios.get(`https://api.themoviedb.org/3/find/${fetchId}?api_key=${tmdbKey}&external_source=imdb_id`);
                baseData = findRes.data.tv_results?.[0] || findRes.data.movie_results?.[0];
            } else {
                const getRes = await axios.get(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${fetchId}?api_key=${tmdbKey}`);
                baseData = getRes.data;
            }

            if (!baseData) throw new Error('No base data');

            // Deep fetch for full details (run-times, etc)
            const fullRes = await axios.get(`https://api.themoviedb.org/3/${isSeries ? 'tv' : 'movie'}/${baseData.id}?api_key=${tmdbKey}&append_to_response=external_ids`);
            const tmdb = fullRes.data;

            const imdbId = tmdb.external_ids?.imdb_id || tmdb.imdb_id || (fetchId.startsWith('tt') ? fetchId : null);
            let verifiedRating = '';
            
            // RUNTIME LOGIC: Detect sitcoms and prefer < 30m if 48m finale detected
            let finalRuntime = '';
            const runtimes = tmdb.episode_run_time || [];
            if (!isSeries && tmdb.runtime) finalRuntime = `${tmdb.runtime}m`;
            else if (isSeries) {
                const typical = runtimes.find((r: number) => r > 15 && r < 35);
                if (typical) finalRuntime = `${typical}m`;
                else if (runtimes.length > 0) finalRuntime = `${runtimes[0]}m`;
                else if (tmdb.last_episode_to_air?.runtime < 40) finalRuntime = `${tmdb.last_episode_to_air.runtime}m`;
                else finalRuntime = '22m'; 
            }
            
            // Set basic data first (instantly)
            setFormData({
                ...formData,
                title: tmdb.name || tmdb.title || itemTitle,
                type: isSeries ? 'Series' : 'Movie',
                seasons: tmdb.number_of_seasons || 0,
                episodes: tmdb.number_of_episodes || 0,
                length: formatRuntime(finalRuntime),
                genre: tmdb.genres?.map((g: any) => g.name).join(', ') || '',
                rating: verifiedRating || 'Syncing...', // Use search rating if we have it
                thumbnail: tmdb.poster_path ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}` : (selectedObj?.i?.imageUrl || '')
            });

            // If we don't have a verified rating yet (e.g. searching via local route without ratings), sync it
            if (!verifiedRating && imdbId) {
                const r = await fetchImdbRating(imdbId);
                if (r) setFormData(prev => ({ ...prev, rating: r }));
                else if (tmdb.vote_average) setFormData(prev => ({ ...prev, rating: tmdb.vote_average.toFixed(1) }));
            }

            setPreview({
                title: tmdb.name || tmdb.title || itemTitle,
                type: isSeries ? 'Series' : 'Movie',
                thumbnail: tmdb.poster_path ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}` : (selectedObj?.i?.imageUrl || '')
            });

            setSearchQuery('');
        } catch (error) {
            console.error('Unified fetch failed', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const submissionData = initialData ? { ...formData, id: initialData.id } : formData;
            await onAdd(submissionData as any);
            onClose();
            // Reset form only on success
            if (!initialData) {
                setFormData({
                    title: '',
                    type: 'Series',
                    seasons: 0,
                    episodes: 0,
                    length: '',
                    genre: '',
                    rating: '',
                    finishedDate: '',
                    status: 'Plan to Watch',
                    thumbnail: '',
                });
            }
            setPreview(null);
            setSearchQuery('');
            setSearchResults([]);
        } catch (error) {
            // Error handled by the parent handleAdd (alert shown)
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-950">
                    <h2 className="text-xl font-bold text-white">{initialData ? 'Edit Entry' : 'Add New Entry'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="text-white w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Search Section (Only show when adding new) */}
                    {!initialData && (
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search IMDB for title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleFetch()}

                                    onFocus={(e) => e.target.select()}
                                    className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 pl-10 text-white placeholder-slate-500 focus:ring-2 focus:ring-violet-500"

                                />
                                <Search className="absolute left-3 top-3.5 text-slate-500 w-5 h-5" />
                            </div>
                            <button
                                onClick={handleFetch}
                                disabled={loading || !searchQuery}
                                className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white px-6 rounded-xl font-medium transition-colors flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Search'}
                            </button>
                        </div>
                    )}

                    {/* Search Results */}
                    {!initialData && searchResults.length > 0 && (
                        <div className="bg-slate-800 rounded-xl border border-white/5 overflow-hidden shadow-lg border-violet-500/20">
                            <div className="px-4 py-2 bg-slate-800/50 border-b border-white/5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Select a Result
                            </div>
                            <ul className="max-h-[300px] overflow-y-auto divide-y divide-white/5">
                                {searchResults.map((result: any) => (
                                    <li key={result.id}>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectResult(result.id, result.l)}
                                            className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-4"
                                        >
                                            {result.i?.imageUrl ? (
                                                <img src={result.i.imageUrl} alt={result.l} className="w-12 h-16 object-cover rounded bg-slate-900 border border-white/10" />
                                            ) : (
                                                <div className="w-12 h-16 bg-slate-900 rounded flex items-center justify-center text-xs text-slate-500 border border-white/5 flex-shrink-0">No Img</div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white truncate">{result.l}</div>
                                                <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                                                    {result.y && <span className="bg-white/10 px-1.5 py-0.5 rounded">{result.y}</span>}
                                                    {result.q && <span className="text-violet-400">{result.q}</span>}
                                                </div>
                                                {result.s && <div className="text-xs text-slate-500 mt-1 truncate">{result.s}</div>}
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Preview / Form */}
                    <form id="add-form" onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column (Image) */}
                            <div className="space-y-4">
                                <div className="aspect-[2/3] bg-slate-800 rounded-xl overflow-hidden relative border border-white/5 shadow-inner">
                                    {formData.thumbnail ? (
                                        <img src={formData.thumbnail} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-600">
                                            No Image
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Thumbnail URL</label>
                                    <input
                                        type="text"
                                        placeholder="Image URL"
                                        value={formData.thumbnail}
                                        onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                                        className="w-full bg-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 border border-white/5 focus:border-violet-500/50 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Right Column (Fields) */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Title</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white border border-white/5 focus:ring-1 focus:ring-violet-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'Series' | 'Movie' })}
                                            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white border border-white/5 outline-none"
                                        >
                                            <option value="Series">Series</option>
                                            <option value="Movie">Movie</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                                        <select
                                            value={formData.status}
                                            onChange={(e) => {
                                                const newStatus = e.target.value as any;
                                                const updates = { status: newStatus } as any;
                                                if (newStatus === 'Finished' && !formData.finishedDate) {
                                                    const today = new Date();
                                                    updates.finishedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                                } else if (newStatus !== 'Finished') {
                                                    updates.finishedDate = '';
                                                }
                                                setFormData({ ...formData, ...updates });
                                            }}
                                            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white border border-white/5 outline-none"
                                        >
                                            <option value="Watching">Watching</option>
                                            <option value="Finished">Watched</option>
                                            <option value="Plan to Watch">Plan to Watch</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Seasons</label>
                                        <input
                                            type="number"
                                            value={formData.seasons}
                                            onChange={(e) => setFormData({ ...formData, seasons: parseInt(e.target.value) })}
                                            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white border-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Episodes</label>
                                        <input
                                            type="number"
                                            value={formData.episodes}
                                            onChange={(e) => setFormData({ ...formData, episodes: parseInt(e.target.value) })}
                                            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white border-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">Runtime</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. 45m"
                                            value={formData.length}
                                            onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                                            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white border-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-400 mb-1">IMDB Rating</label>
                                        <input
                                            type="text"
                                            value={formData.rating}
                                            onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                                            className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white border-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Genre</label>
                                    <input
                                        type="text"
                                        value={formData.genre}
                                        onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                                        className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white border-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">Date Watched (Optional)</label>
                                    <input
                                        type="date"
                                        value={formData.finishedDate}
                                        onChange={(e) => setFormData({ ...formData, finishedDate: e.target.value })}
                                        className="w-full bg-slate-800 rounded-lg px-3 py-2 text-white border-none"
                                    />
                                </div>

                            </div>
                        </div>
                    </form>

                </div>

                <div className="p-4 border-t border-white/10 bg-slate-950 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors">
                        Cancel
                    </button>
                    <button
                        form="add-form"
                        type="submit"
                        className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Save Entry
                    </button>
                </div>

            </div>
        </div>
    );
}
