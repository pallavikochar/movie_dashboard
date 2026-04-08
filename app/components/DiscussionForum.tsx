
"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, MessageCircle, Heart, Clock, Hash } from 'lucide-react';

interface DiscussionPost {
    id: string;
    userName: string;
    userAvatar: string;
    topic: string;
    content: string;
    timestamp: string;
    likes: number;
}

export default function DiscussionForum() {
    const [posts, setPosts] = useState<DiscussionPost[]>([]);
    const [name, setName] = useState('');
    const [isNameSet, setIsNameSet] = useState(false);
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [likedPosts, setLikedPosts] = useState<string[]>([]);

    useEffect(() => {
        const savedName = localStorage.getItem('community_alias');
        if (savedName) {
            setName(savedName);
            setIsNameSet(true);
        }
        const savedLikes = localStorage.getItem('likedPosts');
        if (savedLikes) setLikedPosts(JSON.parse(savedLikes));
    }, []);

    useEffect(() => {
        localStorage.setItem('likedPosts', JSON.stringify(likedPosts));
    }, [likedPosts]);

    const fetchPosts = async () => {
        try {
            const res = await axios.get('/api/discussions');
            setPosts(res.data);
        } catch (error: any) {
            console.warn('API missing, falling back to local files & cache');
            try {
                // Fetch static initial
                const res = await axios.get('/movie_dashboard/data/discussions.json');
                const staticData = res.data || [];
                // Merge with client-side local additions
                const localStr = localStorage.getItem('local_discussions') || '[]';
                const localData = JSON.parse(localStr);
                const combined = [...localData, ...staticData].sort((a: any, b: any) => 
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
                setPosts(combined);
            } catch (e) {
                console.error(e);
            }
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !content) return;

        setIsSubmitting(true);
        try {
            await axios.post('/api/discussions', {
                userName: name,
                topic: topic || 'General Talk',
                content: content
            });
        } catch (error) {
            console.warn('Failed API post, falling back to LocalStorage mock');
            const newPost: DiscussionPost = {
                id: crypto.randomUUID(),
                userName: name,
                userAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
                topic: topic || 'General Talk',
                content: content,
                timestamp: new Date().toISOString(),
                likes: 0
            };
            const localStr = localStorage.getItem('local_discussions') || '[]';
            const localData = JSON.parse(localStr);
            localStorage.setItem('local_discussions', JSON.stringify([newPost, ...localData]));
        } finally {
            localStorage.setItem('community_alias', name);
            setIsNameSet(true);
            setTopic('');
            setContent('');
            fetchPosts();
            setIsSubmitting(false);
        }
    };

    const handleLike = async (id: string) => {
        const isLiked = likedPosts.includes(id);
        const action = isLiked ? 'unlike' : 'like';

        try {
            await axios.put('/api/discussions', { id, action });
        } catch (error) {
            console.warn('Failed API like, updating local only');
        } finally {
            setLikedPosts(prev => isLiked ? prev.filter(item => item !== id) : [...prev, id]);
            setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: Math.max(0, (p.likes || 0) + (isLiked ? -1 : 1)) } : p));
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
                <h2 className="text-4xl font-bold text-white tracking-tight">Cinephile Lounge</h2>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    The place for open theories, reviews, and general geek-speak about anything on screen.
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
                            <div className="bg-emerald-600/20 p-2 rounded-xl">
                                <MessageCircle className="w-5 h-5 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">Start a Discussion</h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Your Alias</label>
                                {isNameSet ? (
                                    <div className="flex items-center justify-between bg-slate-950 border border-white/10 rounded-2xl py-3 px-4 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-600/20 flex items-center justify-center">
                                                <User className="w-4 h-4 text-emerald-500" />
                                            </div>
                                            <span className="text-sm font-bold text-white">Posting as {name}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsNameSet(false);
                                                setName('');
                                            }}
                                            className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-tighter"
                                        >
                                            Change
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Who are you?"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Topic / Show / Movie</label>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="e.g. Inception ending theories"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">What's on your mind?</label>
                                <textarea
                                    placeholder="Share your thoughts, theories or rants..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-white min-h-[150px] resize-none"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Post to Forum
                                    </>
                                )}
                            </button>
                        </form>
                    </motion.div>
                </div>

                <div className="lg:col-span-3 space-y-6">
                    <div className="space-y-4">
                        <AnimatePresence initial={false}>
                            {posts.map((post) => (
                                <motion.div
                                    key={post.id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] hover:bg-white/[0.08] transition-all group"
                                >
                                    <div className="flex gap-4">
                                        <img src={post.userAvatar} alt="" className="w-12 h-12 rounded-2xl bg-slate-800 p-1" />
                                        <div className="flex-1 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-white">{post.userName}</h4>
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{formatDate(post.timestamp)}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                                    <button
                                                        onClick={() => handleLike(post.id)}
                                                        className="text-slate-500 hover:text-rose-500 transition-colors"
                                                    >
                                                        <Heart className={`w-4 h-4 ${likedPosts.includes(post.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                                                    </button>
                                                    <span className="text-xs font-bold text-slate-400">{post.likes || 0}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-emerald-600/20 text-emerald-400 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-tighter border border-emerald-500/20">
                                                        #{post.topic}
                                                    </span>
                                                </div>
                                                <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {post.content}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {posts.length === 0 && (
                            <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                                <p className="text-slate-500 italic">No discussions yet. Spark a conversation!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
