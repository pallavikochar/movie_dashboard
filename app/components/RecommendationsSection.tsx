
"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, MessageSquare, Heart, Clock, Film } from 'lucide-react';

interface Recommendation {
    id: string;
    userName: string;
    userAvatar: string;
    movieTitle: string;
    comment: string;
    timestamp: string;
    likes: number;
}

export default function RecommendationsSection() {
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [name, setName] = useState('');
    const [isNameSet, setIsNameSet] = useState(false);
    const [title, setTitle] = useState('');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [likedRecs, setLikedRecs] = useState<string[]>([]);

    useEffect(() => {
        const savedName = localStorage.getItem('community_alias');
        if (savedName) {
            setName(savedName);
            setIsNameSet(true);
        }
        const savedLikes = localStorage.getItem('likedRecs');
        if (savedLikes) setLikedRecs(JSON.parse(savedLikes));
    }, []);

    useEffect(() => {
        localStorage.setItem('likedRecs', JSON.stringify(likedRecs));
    }, [likedRecs]);

    const fetchRecommendations = async () => {
        try {
            const res = await axios.get('/api/recommendations');
            setRecommendations(res.data);
        } catch (error: any) {
            console.warn('API missing, falling back to local files & cache');
            try {
                const res = await axios.get('/movie_dashboard/data/recommendations.json');
                const staticData = res.data || [];
                const localStr = localStorage.getItem('local_recommendations') || '[]';
                const localData = JSON.parse(localStr);
                const combined = [...localData, ...staticData].sort((a: any, b: any) => 
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                setRecommendations(combined);
            } catch (e) {
                console.error(e);
            }
        }
    };

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !title) return;

        setIsSubmitting(true);
        try {
            await axios.post('/api/recommendations', {
                userName: name,
                movieTitle: title,
                comment: comment
            });
        } catch (error) {
            console.warn('Failed API post, falling back to LocalStorage mock');
            const newRec: Recommendation = {
                id: crypto.randomUUID(),
                userName: name,
                userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                movieTitle: title,
                comment: comment,
                timestamp: new Date().toISOString(),
                likes: 0
            };
            const localStr = localStorage.getItem('local_recommendations') || '[]';
            const localData = JSON.parse(localStr);
            localStorage.setItem('local_recommendations', JSON.stringify([newRec, ...localData]));
        } finally {
            localStorage.setItem('community_alias', name);
            setIsNameSet(true);
            setTitle('');
            setComment('');
            fetchRecommendations();
            setIsSubmitting(false);
        }
    };

    const handleLike = async (id: string) => {
        const isLiked = likedRecs.includes(id);
        const action = isLiked ? 'unlike' : 'like';

        try {
            await axios.put('/api/recommendations', { id, action });
        } catch (error) {
            console.warn('Failed API like, updating local only');
        } finally {
            setLikedRecs(prev => isLiked ? prev.filter(item => item !== id) : [...prev, id]);
            setRecommendations(prev => prev.map(r => r.id === id ? { ...r, likes: Math.max(0, (r.likes || 0) + (isLiked ? -1 : 1)) } : r));
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-12">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold text-white tracking-tight">Curated Suggestions</h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    Know a masterpiece I've missed? Tell me what to watch next and why it deserves a spot in the history books.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
                <div className="lg:col-span-2">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="sticky top-24 bg-white/5 border border-white/10 p-8 rounded-[2.5rem] shadow-2xl space-y-6"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-violet-600/20 p-2 rounded-xl">
                                <Film className="w-5 h-5 text-violet-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Make a Recommendation</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Your Identity</label>
                                {isNameSet ? (
                                    <div className="flex items-center justify-between bg-slate-950 border border-white/10 rounded-2xl py-3 px-4 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-violet-600/20 flex items-center justify-center">
                                                <User className="w-4 h-4 text-violet-500" />
                                            </div>
                                            <span className="text-sm font-bold text-white">Posting as {name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsNameSet(false);
                                                setName('');
                                            }}
                                            className="text-[10px] font-bold text-violet-500 hover:text-violet-400 uppercase tracking-tighter"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Enter your name"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-white"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">What should I watch?</label>
                                <input
                                    type="text"
                                    placeholder="Movie or Series title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-white"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Why? (Optional)</label>
                                <textarea
                                    placeholder="Give me a reason to binge it..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all text-white min-h-[120px] resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Drop Recommendation
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <div className="space-y-4">
                        <AnimatePresence initial={false}>
                            {recommendations.map((rec) => (
                                <motion.div
                                    key={rec.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white/5 border border-white/10 p-6 rounded-[2rem] hover:bg-white/[0.08] transition-all group"
                                >
                                    <div className="flex gap-4">
                                        <img src={rec.userAvatar} alt="" className="w-12 h-12 rounded-2xl bg-slate-800 p-1" />
                                        <div className="flex-1 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-white">{rec.userName}</h4>
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{formatDate(rec.timestamp)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                                    <button
                                                        onClick={() => handleLike(rec.id)}
                                                        className="text-slate-500 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Heart className={`w-4 h-4 ${likedRecs.includes(rec.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                    </button>
                                                    <span className="text-xs font-bold text-slate-400">{rec.likes || 0}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-tighter">Suggests:</span>
                                                <p className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">{rec.movieTitle}</p>
                                            </div>

                                            {rec.comment && (
                                                <p className="text-slate-400 text-sm leading-relaxed italic bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                                                    &quot;{rec.comment}&quot;
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {recommendations.length === 0 && (
                            <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                <p className="text-slate-500 italic">No recommendations yet. Be the first!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
