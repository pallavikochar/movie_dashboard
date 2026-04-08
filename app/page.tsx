
"use client";

import { useEffect, useState, useMemo } from 'react';
import { Plus, LayoutGrid, Search, PieChart, Film, Tv, CheckCircle, Hourglass, Bookmark, TrendingUp, BarChart3, Clock, Star, Brain, Zap, HelpCircle, Rocket, Globe, BookOpen, Filter, ArrowUpDown, Calendar, MessageSquare, Lock, Unlock } from 'lucide-react';
import SeriesCard from '@/app/components/SeriesCard';
import AddSeriesModal from '@/app/components/AddSeriesModal';
import ConfirmDialog from '@/app/components/ConfirmDialog';
import DuplicateDialog from '@/app/components/DuplicateDialog';
import RecommendationsSection from '@/app/components/RecommendationsSection';
import DiscussionForum from '@/app/components/DiscussionForum';
import { WatchlistEntry } from '@/app/types';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const GENRE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Home() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WatchlistEntry | null>(null);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'rating' | 'length' | 'finishedDate'>('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [communityTab, setCommunityTab] = useState<'Recs' | 'Forum'>('Recs');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLockModalOpen, setIsLockModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  const toggleLock = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isAdmin) {
       setIsAdmin(false);
    } else {
       setIsLockModalOpen(true);
    }
  };

  const handleUnlock = () => {
    if (passwordInput === "P@nipuri7") {
        setIsAdmin(true);
        setIsLockModalOpen(false);
        setPasswordInput('');
        setPasswordError(false);
    } else {
        setPasswordError(true);
    }
  };
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [duplicateEntry, setDuplicateEntry] = useState<WatchlistEntry | null>(null);

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const fetchWatchlist = async () => {
    try {
      const res = await axios.get('/api/watchlist').catch(async () => {
          return await axios.get('/movie_dashboard/data/watchlist.json');
      });
      let baseData = res.data || [];
      
      try {
          const localOverrides = localStorage.getItem('local_watchlist_overrides');
          if (localOverrides) {
              const parsed = JSON.parse(localOverrides);
              // Merge local overrides with fetched data (replacing matches, appending new)
              const merged = [...baseData];
              parsed.forEach((localItem: any) => {
                  const idx = merged.findIndex(i => i.id === localItem.id);
                  if (idx >= 0) merged[idx] = localItem;
                  else merged.push(localItem);
              });
              baseData = merged;
          }
      } catch (e) {}

      setWatchlist(baseData);
    } catch (error) {
      console.error('Failed to load watchlist', error);
      try {
          const local = localStorage.getItem('local_watchlist_overrides');
          if (local) setWatchlist(JSON.parse(local));
      } catch (e) {}
    }
  };

  const handleAdd = async (entry: Omit<WatchlistEntry, 'id'> | WatchlistEntry) => {
    if (!isAdmin) return;
    const isUpdate = 'id' in entry;

    // Normalize title: strip trailing year like "(1994)" or "(1994–2004)" for comparison
    const normalizeTitle = (t: string) =>
      t.replace(/\s*\(\d{4}[–\-]?\d{0,4}\)\s*$/, '').trim().toLowerCase();

    // Check for existing entry with same title (case-insensitive, year-agnostic)
    if (!isUpdate) {
      const newNorm = normalizeTitle(entry.title);
      const existing = watchlist.find(item => normalizeTitle(item.title) === newNorm);
      if (existing) {
        setDuplicateEntry(existing);
        return;
      }
    }

    try {
      if (isUpdate) {
        await axios.put('/api/watchlist', { id: (entry as WatchlistEntry).id, updates: entry });
      } else {
        await axios.post('/api/watchlist', entry);
      }
      fetchWatchlist();
      setEditingEntry(null);
      setIsModalOpen(false); // Close modal on success
    } catch (error: any) {
      console.warn("API write failed. Storing seamlessly to Local Storage for Git Pages.");
      const submissionId = isUpdate ? (entry as WatchlistEntry).id : crypto.randomUUID();
      const finalEntry = { ...entry, id: submissionId };
      
      const updatedList = [...watchlist];
      const existingIdx = updatedList.findIndex(i => i.id === submissionId);
      if (existingIdx >= 0) updatedList[existingIdx] = finalEntry as WatchlistEntry;
      else updatedList.push(finalEntry as WatchlistEntry);
      
      try {
          const storedStr = localStorage.getItem('local_watchlist_overrides');
          const stored = storedStr ? JSON.parse(storedStr) : [];
          const storedIdx = stored.findIndex((i: any) => i.id === submissionId);
          if (storedIdx >= 0) stored[storedIdx] = finalEntry;
          else stored.push(finalEntry);
          localStorage.setItem('local_watchlist_overrides', JSON.stringify(stored));
      } catch (e) {}
      
      setWatchlist(updatedList);
      setEditingEntry(null);
      setIsModalOpen(false);
    }
  };

  const handleEdit = (entry: WatchlistEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await axios.delete('/api/watchlist', { data: { id: confirmDeleteId } });
      setWatchlist(watchlist.filter(w => w.id !== confirmDeleteId));
    } catch (error) {
      console.warn("Local Delete fallback executing.");
      const updated = watchlist.filter(w => w.id !== confirmDeleteId);
      setWatchlist(updated);
      try {
          const storedStr = localStorage.getItem('local_watchlist_overrides');
          if (storedStr) {
              const stored = JSON.parse(storedStr).filter((w: any) => w.id !== confirmDeleteId);
              localStorage.setItem('local_watchlist_overrides', JSON.stringify(stored));
          }
      } catch(e) {}
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleStatusChange = async (id: string, status: WatchlistEntry['status']) => {
    if (!isAdmin) return;
    try {
      const updates: any = { status };
      if (status === 'Finished') {
        const today = new Date();
        updates.finishedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      } else {
        updates.finishedDate = '';
      }
      
      const item = watchlist.find(w => w.id === id);
      if (!item) return;
      const newEntry = { ...item, ...updates };

      await axios.put('/api/watchlist', { id, updates }).catch((e) => {
          console.warn("Status change relying on Local Storage fallback.");
          const updatedList = watchlist.map(w => w.id === id ? newEntry : w);
          try {
              const storedStr = localStorage.getItem('local_watchlist_overrides');
              const stored = storedStr ? JSON.parse(storedStr) : [];
              const storedIdx = stored.findIndex((i: any) => i.id === id);
              if (storedIdx >= 0) stored[storedIdx] = newEntry;
              else stored.push(newEntry);
              localStorage.setItem('local_watchlist_overrides', JSON.stringify(stored));
          } catch(err) {}
          setWatchlist(updatedList);
          throw e; // Break standard execution sequence
      });
      fetchWatchlist();
    } catch (error) {
      // Intentionally consumed error to allow local fallback without crashing UI
    }
  };

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    watchlist.forEach(item => {
      (item.genre || '').split(',').forEach(g => {
        const trimmed = g.trim();
        if (trimmed) genres.add(trimmed);
      });
    });
    return ['All Genres', ...Array.from(genres).sort()];
  }, [watchlist]);

  const filteredList = useMemo(() => {
    let result = watchlist.filter(item => {
      const matchesFilter = filter === 'All' || filter === 'Stats' || filter === 'Community' || item.status === filter || (filter === 'Watched' && item.status === 'Finished');
      const matchesType = typeFilter === 'All Types' || (typeFilter === 'Movies' && item.type === 'Movie') || (typeFilter === 'Series' && item.type === 'Series');
      const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
      const matchesGenre = selectedGenre === 'All Genres' || item.genre.toLowerCase().includes(selectedGenre.toLowerCase());
      return matchesFilter && matchesType && matchesSearch && matchesGenre;
    });

    // Sorting
    result.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (sortBy === 'rating') {
        valA = parseFloat(a.rating || '0') || 0;
        valB = parseFloat(b.rating || '0') || 0;
      } else if (sortBy === 'length') {
        valA = parseRuntime(a.length || '');
        valB = parseRuntime(b.length || '');
      } else if (sortBy === 'finishedDate') {
        valA = a.finishedDate || '';
        valB = b.finishedDate || '';
      } else {
        valA = (valA || '').toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [watchlist, filter, search, selectedGenre, sortBy, sortOrder, typeFilter]);

  const parseRuntime = (runtime: string) => {
    if (!runtime) return 0;
    let total = 0;
    const hours = runtime.match(/(\d+)\s*h/);
    const minutes = runtime.match(/(\d+)\s*m/);
    if (hours) total += parseInt(hours[1]) * 60;
    if (minutes) total += parseInt(minutes[1]);
    return total;
  };

  const stats = useMemo(() => {
    const totalCount = watchlist.length;
    const seriesCount = watchlist.filter(i => i.type === 'Series').length;
    const movieCount = watchlist.filter(i => i.type === 'Movie').length;
    const finishedCount = watchlist.filter(i => i.status === 'Finished').length;
    const watchingCount = watchlist.filter(i => i.status === 'Watching').length;

    let totalEpisodes = 0;
    let totalSeasons = 0;
    let totalMinutes = 0;
    let ratingsSum = 0;
    let ratingsCount = 0;

    watchlist.forEach(item => {
      const runtimeMins = parseRuntime(item.length || '');

      if (item.type === 'Series') {
        totalEpisodes += item.episodes || 0;
        totalSeasons += item.seasons || 0;
        totalMinutes += (item.episodes || 0) * runtimeMins;
      } else {
        totalMinutes += runtimeMins;
      }

      if (item.rating && item.status === 'Finished') {
        const r = parseFloat(item.rating);
        if (!isNaN(r)) {
          ratingsSum += r;
          ratingsCount++;
        }
      }
    });

    const genres: Record<string, number> = {};
    watchlist.forEach(item => {
      (item.genre || '').split(',').forEach(g => {
        const trimmed = g.trim();
        if (trimmed) genres[trimmed] = (genres[trimmed] || 0) + 1;
      });
    });

    const topGenres = Object.entries(genres)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    const timeSpent = {
      days: Math.floor(totalMinutes / (24 * 60)),
      hours: Math.floor((totalMinutes % (24 * 60)) / 60),
      mins: totalMinutes % 60
    };

    const yearlyData: Record<string, { count: number, minutes: number, movies: number, series: number }> = {};
    watchlist.forEach(item => {
      if (item.finishedDate) {
        const year = item.finishedDate.split('-')[0];
        if (!isNaN(Number(year)) && year !== '1970' && year) {
          if (!yearlyData[year]) {
            yearlyData[year] = { count: 0, minutes: 0, movies: 0, series: 0 };
          }
          yearlyData[year].count++;
          const mins = parseRuntime(item.length || '');
          if (item.type === 'Series') {
            yearlyData[year].series++;
            yearlyData[year].minutes += (item.episodes || 0) * mins;
          } else {
            yearlyData[year].movies++;
            yearlyData[year].minutes += mins;
          }
        }
      }
    });

    const avgRating = ratingsCount > 0 ? (ratingsSum / ratingsCount).toFixed(1) : '0';

    // Mind-boggling comparisons
    const booksRead = Math.floor(totalMinutes / (5 * 60)); // Avg 5 hours per book
    const distanceWalked = Math.floor((totalMinutes / 60) * 5); // 5 km/h
    const workWeeks = (totalMinutes / (40 * 60)).toFixed(1); // 40 hour work week
    const moonTrips = (totalMinutes / (3 * 24 * 60)).toFixed(1); // ~3 days to moon

    const sortedYearly = Object.entries(yearlyData)
      .sort(([a], [b]) => b.localeCompare(a));

    return { totalCount, seriesCount, movieCount, finishedCount, watchingCount, totalEpisodes, totalSeasons, topGenres, timeSpent, avgRating, totalMinutes, booksRead, distanceWalked, workWeeks, moonTrips, sortedYearly };
  }, [watchlist]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-violet-500/30">

      {/* Navbar */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl border-b border-white/5 bg-slate-950/80 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-violet-600 p-2 rounded-xl shadow-lg shadow-violet-600/20">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            Pallavi&apos;s Watch Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search library..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-64 transition-all"
            />
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-slate-950 px-4 py-2 rounded-full font-bold text-sm hover:bg-slate-200 transition-all active:scale-95 shadow-lg flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add New
            </button>
          )}
          <button onClick={toggleLock} className="text-slate-400 hover:text-white p-2">
            {isAdmin ? <Unlock className="w-5 h-5 text-emerald-400" /> : <Lock className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8">

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {['All', 'Watching', 'Watched', 'Plan to Watch', 'Stats', 'Community'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border flex items-center gap-2 ${filter === f
                ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/25'
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                }`}
            >
              {f === 'Stats' && <PieChart className="w-4 h-4" />}
              {f === 'Community' && <MessageSquare className="w-4 h-4" />}
              {f}
            </button>
          ))}
        </div>

        {/* Secondary Filters & Sorting (Hide when in Stats or Community) */}
        {filter !== 'Stats' && filter !== 'Community' && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4 border-t border-white/5">
            <div className="flex flex-wrap gap-4 items-center">
              {/* Type Filter */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-violet-500/50 transition-colors">
                <Tv className="w-4 h-4 text-slate-500" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer pr-2"
                >
                  <option value="All Types" className="bg-slate-900">All Types</option>
                  <option value="Movies" className="bg-slate-900">Movies</option>
                  <option value="Series" className="bg-slate-900">Series</option>
                </select>
              </div>

              {/* Genre Filter */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-violet-500/50 transition-colors">
                <Filter className="w-4 h-4 text-slate-500" />
                <select
                  value={selectedGenre}
                  onChange={(e) => setSelectedGenre(e.target.value)}
                  className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer pr-2"
                >
                  {allGenres.map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 focus-within:border-violet-500/50 transition-colors">
                <ArrowUpDown className="w-4 h-4 text-slate-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-sm text-slate-300 outline-none cursor-pointer pr-2"
                >
                  <option value="title" className="bg-slate-900">Sort by Title</option>
                  <option value="rating" className="bg-slate-900">Sort by Rating</option>
                  <option value="length" className="bg-slate-900">Sort by Runtime</option>
                  <option value="finishedDate" className="bg-slate-900">Sort by Date Watched</option>
                </select>
              </div>
            </div>

            {/* Sort Order Toggle */}
            <button
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors px-4 py-2 bg-white/5 rounded-xl border border-white/10 hover:border-white/20"
            >
              <TrendingUp className={`w-4 h-4 transition-transform duration-300 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {filter === 'Stats' ? (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              {/* Section 1: The Raw Data */}
              <div className="space-y-6">
                <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-slate-500 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-500" />
                  The Truth
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">Time Invested</div>
                    <div className="text-3xl font-bold text-white tracking-tighter">
                      {stats.timeSpent.days}d {stats.timeSpent.hours}h
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Clock className="w-12 h-12" />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">Completion rate</div>
                    <div className="text-3xl font-bold text-green-400 tracking-tighter">
                      {stats.totalCount > 0 ? ((stats.finishedCount / stats.totalCount) * 100).toFixed(0) : 0}%
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <CheckCircle className="w-12 h-12" />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">Items Cataloged</div>
                    <div className="text-3xl font-bold text-white tracking-tighter">{stats.totalCount}</div>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Film className="w-12 h-12" />
                    </div>
                  </div>
                  <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:bg-white/[0.08] transition-colors relative overflow-hidden">
                    <div className="text-slate-500 text-xs font-bold uppercase mb-1">Avg IMDb</div>
                    <div className="text-3xl font-bold text-amber-400 tracking-tighter">{stats.avgRating}/10</div>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Star className="w-12 h-12 fill-amber-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: The Life Scale */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gradient-to-br from-violet-600/20 to-blue-600/20 border border-white/10 p-8 rounded-[2rem] space-y-8">
                  <div className="flex justify-between items-start">
                    <h2 className="text-2xl font-bold text-white tracking-tight">The Life Scale</h2>
                    <Brain className="w-8 h-8 text-violet-500 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <div className="p-3 bg-white/5 rounded-2xl w-fit">
                        <BookOpen className="w-6 h-6 text-blue-400" />
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        In the same time, you could have read
                        <span className="text-white font-bold mx-1">{stats.booksRead}</span>
                        full-length novels.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 bg-white/5 rounded-2xl w-fit">
                        <Globe className="w-6 h-6 text-emerald-400" />
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        You could have walked
                        <span className="text-white font-bold mx-1">{stats.distanceWalked.toLocaleString()} km</span>
                        — that's across entire countries.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 bg-white/5 rounded-2xl w-fit">
                        <Zap className="w-6 h-6 text-yellow-400" />
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        Equivalent to
                        <span className="text-white font-bold mx-1">{stats.workWeeks}</span>
                        full-time intense work weeks.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="p-3 bg-white/5 rounded-2xl w-fit">
                        <Rocket className="w-6 h-6 text-red-500" />
                      </div>
                      <p className="text-slate-400 leading-relaxed">
                        You could have reached the moon
                        <span className="text-white font-bold mx-1">{stats.moonTrips} times</span>
                        by now.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-violet-500" />
                    Top Genres
                  </h2>
                  <div className="space-y-5">
                    {stats.topGenres.map(([genre, count], idx) => (
                      <div key={genre} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-300 font-medium">{genre}</span>
                          <span className="text-slate-500 font-mono">{count} items</span>
                        </div>
                        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(count / stats.totalCount) * 100}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: GENRE_COLORS[idx % GENRE_COLORS.length] }}
                          />
                        </div>
                      </div>
                    ))}
                    {stats.topGenres.length === 0 && (
                      <p className="text-slate-500 italic">Add some content to see genre stats!</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 3: Deep Dive Questions */}
              <div className="bg-slate-900/50 border border-white/5 p-10 rounded-[2.5rem] relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-violet-600/10 blur-[100px] rounded-full" />
                <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
                  <div className="flex-1 space-y-4">
                    <h3 className="text-3xl font-bold text-white flex items-center gap-3">
                      <HelpCircle className="w-8 h-8 text-violet-500" />
                      The Deep Questions
                    </h3>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                      Your watch history is more than just data—it&apos;s a mirror of your curiosity, your escapism, and your time on this planet.
                    </p>
                  </div>
                  <div className="flex-1 grid grid-cols-1 gap-4">
                    {[
                      "Was every hour worth the memory it left behind?",
                      "If you could get these days back, would you change anything?",
                      "What's the next story that will define your time?"
                    ].map((q, i) => (
                      <div key={i} className="bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-all cursor-default group">
                        <p className="text-slate-300 group-hover:text-white transition-colors">{q}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 4: Yearly Retrospective */}
              <div className="space-y-6">
                <h2 className="text-sm uppercase tracking-[0.2em] font-bold text-slate-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-500" />
                  Yearly Retrospective
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stats.sortedYearly.map(([year, data]: [string, any]) => {
                    const yearDays = Math.floor(data.minutes / (24 * 60));
                    const yearHours = Math.floor((data.minutes % (24 * 60)) / 60);

                    return (
                      <div key={year} className="bg-white/5 border border-white/10 p-6 rounded-3xl relative overflow-hidden group hover:border-violet-500/30 transition-all">
                        <div className="absolute -right-4 -top-4 text-8xl font-black text-white/[0.03] italic group-hover:text-white/[0.05] transition-colors">
                          {year}
                        </div>

                        <div className="relative z-10 space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-white">{year}</h3>
                            <span className="text-slate-500 text-sm font-medium">{data.count} items</span>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-2xl p-3">
                              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Time spent</div>
                              <div className="text-sm font-bold text-violet-400">
                                {yearDays}d {yearHours}h
                              </div>
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3">
                              <div className="text-[10px] text-slate-500 uppercase font-bold mb-1">Ratio</div>
                              <div className="text-sm font-bold text-white">
                                {data.movies} Movies / {data.series} Series
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase">
                              <span>Movies ({((data.movies / data.count) * 100).toFixed(0)}%)</span>
                              <span>Series</span>
                            </div>
                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden flex">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${(data.movies / data.count) * 100}%` }}
                              />
                              <div
                                className="h-full bg-violet-500"
                                style={{ width: `${(data.series / data.count) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {stats.sortedYearly.length === 0 && (
                    <div className="col-span-full py-12 bg-white/5 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500">
                      <Calendar className="w-8 h-8 mb-2 opacity-20" />
                      <p className="text-sm">Finish some content with a date to see yearly stats!</p>
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          ) : filter === 'Community' ? (
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="pb-20 space-y-12"
            >
              <div className="flex justify-center">
                <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10 flex gap-2">
                  <button
                    onClick={() => setCommunityTab('Recs')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${communityTab === 'Recs' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Suggestions
                  </button>
                  <button
                    onClick={() => setCommunityTab('Forum')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${communityTab === 'Forum' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Open Forum
                  </button>
                </div>
              </div>

              <motion.div
                key={communityTab}
                initial={{ opacity: 0, x: communityTab === 'Recs' ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              >
                {communityTab === 'Recs' ? <RecommendationsSection /> : <DiscussionForum />}
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              {filteredList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-slate-600">
                    <LayoutGrid className="w-8 h-8" />
                  </div>
                  <p>No items found. Start by adding one!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredList.map(entry => (
                    <SeriesCard
                      key={entry.id}
                      entry={entry}
                      onDelete={handleDelete}
                      onEdit={handleEdit}
                      onStatusChange={handleStatusChange}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      <AddSeriesModal
        isOpen={isModalOpen}
        initialData={editingEntry}
        onClose={() => {
          setIsModalOpen(false);
          setEditingEntry(null);
        }}
        onAdd={handleAdd}
      />

      <ConfirmDialog
        isOpen={!!confirmDeleteId}
        title="Delete Entry"
        message="Are you sure you want to remove this from your library? This cannot be undone."
        confirmLabel="Yes, Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />

      <DuplicateDialog
        isOpen={!!duplicateEntry}
        title={duplicateEntry?.title || ''}
        onEdit={() => {
          setDuplicateEntry(null);
          setIsModalOpen(false);
          setTimeout(() => {
            setEditingEntry(duplicateEntry);
            setIsModalOpen(true);
          }, 100);
        }}
        onCancel={() => setDuplicateEntry(null)}
      />

      <AnimatePresence>
        {isLockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsLockModalOpen(false); setPasswordError(false); setPasswordInput(''); }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-violet-600/20 p-4 rounded-full border border-violet-500/30">
                  <Lock className="w-8 h-8 text-violet-500" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">Admin Access</h3>
              <p className="text-slate-400 text-sm text-center mb-6">Please enter the master passcode to unlock editing rights for this dashboard.</p>
              
              <form onSubmit={(e) => { e.preventDefault(); handleUnlock(); }}>
                <input
                  type="password"
                  placeholder="Enter Passcode..."
                  value={passwordInput}
                  onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                  className={`w-full bg-slate-950 border ${passwordError ? 'border-rose-500' : 'border-white/10'} rounded-2xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-all mb-4`}
                  autoFocus
                />
                {passwordError && <p className="text-rose-500 text-[10px] uppercase font-bold tracking-wider mb-4 text-center">Incorrect passcode</p>}
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setIsLockModalOpen(false); setPasswordError(false); setPasswordInput(''); }}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-white/5 text-slate-300 hover:bg-white/10 transition-colors border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-violet-600 text-white hover:bg-violet-500 transition-colors shadow-lg shadow-violet-600/20 flex justify-center items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    Unlock
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  );
}
