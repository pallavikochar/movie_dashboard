
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

    const TMDB_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
    const OMDB_KEY = 'thewdb';

    const handleFetch = async () => {
        if (!searchQuery.trim()) return;
        setLoading(true);
        setSearchResults([]);
        try {
            // Priority 1: Native Server Scraper (local dev only)
            const res = await axios.get(`/api/scrape?title=${encodeURIComponent(searchQuery)}&list=true`, { timeout: 4000 });
            const results = res.data.results || [];
            if (results.length === 0) alert('No results found.');
            else setSearchResults(results);
        } catch {
            // Priority 2: TMDb search — reliable, no rate limits, CORS-enabled
            try {
                const res = await axios.get(
                    `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US`
                );
                const items = (res.data.results || []).filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv');
                if (!items.length) { alert('No results found.'); return; }
                const mapped = items.slice(0, 8).map((r: any) => ({
                    id: r.id.toString(),
                    tmdbId: r.id,
                    mediaType: r.media_type,
                    l: r.title || r.name,
                    y: (r.release_date || r.first_air_date || '').slice(0, 4),
                    q: r.media_type === 'tv' ? 'TV Series' : 'Movie',
                    i: { imageUrl: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : '' },
                    s: r.overview || '',
                }));
                setSearchResults(mapped);
            } catch (fallbackError) {
                console.error('Search failed', fallbackError);
                alert('Search failed. Please check your connection and try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const formatRuntime = (mins: number) => {
        if (!mins || isNaN(mins) || mins <= 0) return '';
        if (mins < 60) return `${mins}m`;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const handleSelectResult = async (fetchId: string, itemTitle: string) => {
        setLoading(true);
        const selectedObj = searchResults.find(r => r.id === fetchId);
        setSearchResults([]);

        // 1. Local high-fidelity scraper (local dev only — skipped silently on live site)
        if (fetchId.startsWith('tt')) {
            try {
                const res = await axios.get(`/api/scrape?imdbId=${encodeURIComponent(fetchId)}`, { timeout: 4000 });
                const d = res.data;
                if (d && !d.error && d.rating) {
                    setFormData({ ...formData, title: d.title || itemTitle, type: d.type || 'Movie', seasons: d.seasons || 0, episodes: d.episodes || 0, length: d.runtime || '', genre: d.genres || '', rating: d.rating || '', thumbnail: d.poster || selectedObj?.i?.imageUrl || '', status: formData.status, finishedDate: formData.finishedDate });
                    setPreview({ title: d.title || itemTitle, type: d.type || 'Movie', thumbnail: d.poster || '' });
                    setSearchQuery('');
                    setLoading(false);
                    return;
                }
            } catch { /* fall through */ }
        }

        // 2. TMDb for metadata + OMDb for IMDb rating + TVMaze for episodes
        try {
            const isTv = selectedObj?.mediaType === 'tv' || selectedObj?.q === 'TV Series';
            const tmdbType = isTv ? 'tv' : 'movie';
            const tmdbId = selectedObj?.tmdbId || fetchId;

            // Fetch full TMDb details + external IDs in one call
            const [detailRes, extRes] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`),
                axios.get(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/external_ids?api_key=${TMDB_KEY}`)
            ]);
            const tmdb = detailRes.data;
            const imdbId: string = extRes.data.imdb_id || fetchId;

            // Runtime: for series prefer typical episode length
            let runtime = 0;
            if (!isTv) {
                runtime = tmdb.runtime || 0;
            } else {
                const runtimes: number[] = tmdb.episode_run_time || [];
                const typical = runtimes.find((r: number) => r > 15 && r < 35);
                runtime = typical || runtimes[0] || 22;
            }

            const genre = (tmdb.genres || []).map((g: any) => g.name).join(', ');
            const poster = tmdb.poster_path ? `https://image.tmdb.org/t/p/w500${tmdb.poster_path}` : (selectedObj?.i?.imageUrl || '');
            const seasons = isTv ? (tmdb.number_of_seasons || 0) : 0;

            // TMDb fallback rating (for new movies not yet indexed by OMDb/IMDb)
            const tmdbRating = tmdb.vote_average && tmdb.vote_count > 50
                ? tmdb.vote_average.toFixed(1)
                : '';

            // Set form immediately with TMDb data (rating pre-filled if available)
            setFormData({
                ...formData,
                title: tmdb.title || tmdb.name || itemTitle,
                type: isTv ? 'Series' : 'Movie',
                seasons,
                episodes: 0,
                length: formatRuntime(runtime),
                genre,
                rating: tmdbRating, // pre-filled; overwritten by OMDb if official score exists
                thumbnail: poster,
                status: formData.status,
                finishedDate: formData.finishedDate,
            });
            setPreview({ title: tmdb.title || tmdb.name || itemTitle, type: isTv ? 'Series' : 'Movie', thumbnail: poster });
            setSearchQuery('');

            // Fetch official IMDb rating from OMDb — overwrites TMDb rating if available
            if (imdbId) {
                axios.get(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`)
                    .then(res => {
                        const rating = res.data.imdbRating;
                        if (rating && rating !== 'N/A') setFormData(prev => ({ ...prev, rating }));
                    }).catch(() => {});
            }

            // Fetch exact episode count from TVMaze (background — series only)
            if (isTv && imdbId) {
                axios.get(`https://api.tvmaze.com/lookup/shows?imdb=${imdbId}`)
                    .then(tvr => axios.get(`https://api.tvmaze.com/shows/${tvr.data.id}?embed=episodes`))
                    .then(tvr => {
                        const eps = tvr.data._embedded?.episodes || [];
                        if (eps.length > 0) setFormData(prev => ({ ...prev, episodes: eps.length }));
                    }).catch(() => {});
            }

        } catch (error) {
            console.error('Fetch failed', error);
            if (selectedObj) {
                setFormData({ ...formData, title: selectedObj.l || itemTitle, type: selectedObj.q === 'TV Series' ? 'Series' : 'Movie', thumbnail: selectedObj.i?.imageUrl || '' });
            }
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
