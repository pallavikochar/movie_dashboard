
"use client";

import { WatchlistEntry } from "@/app/types";
import { Star, Calendar, Clock, Film, Tv, CheckCircle, Hourglass, Bookmark, MonitorPlay, Pencil, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export default function SeriesCard({ entry, onDelete, onEdit, onStatusChange, isAdmin }: {
    entry: WatchlistEntry,
    onDelete: (id: string) => void,
    onEdit: (entry: WatchlistEntry) => void,
    onStatusChange: (id: string, status: WatchlistEntry['status']) => void,
    isAdmin: boolean
}) {
    const isSeries = entry.type === 'Series';

    const statusColor = {
        'Finished': 'text-green-400 bg-green-400/10 border-green-400/20',
        'Watching': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
        'Plan to Watch': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    }[entry.status];

    const StatusIcon = {
        'Finished': CheckCircle,
        'Watching': Hourglass,
        'Plan to Watch': Bookmark
    }[entry.status];

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            return date.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            layout
            className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-violet-500/20"
        >
            {/* Poster */}
            <div className="aspect-[2/3] relative overflow-hidden">
                {entry.thumbnail ? (
                    <img
                        src={entry.thumbnail}
                        alt={entry.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                        <Film className="w-12 h-12 text-slate-600" />
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

                {/* Admin hover overlay with large Edit/Delete buttons */}
                {isAdmin && (
                    <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-black/40 backdrop-blur-[2px]">
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 border border-blue-400/30"
                        >
                            <Pencil className="w-4 h-4" />
                            Edit
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-xl shadow-2xl transition-all hover:scale-105 active:scale-95 border border-red-400/30"
                        >
                            <Trash2 className="w-4 h-4" />
                            Delete
                        </button>
                    </div>
                )}

                {/* Status badge */}
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border backdrop-blur-md flex items-center gap-1.5 ${statusColor}`}>
                        <StatusIcon className="w-3 h-3" />
                        {entry.status === 'Finished' ? 'Watched' : entry.status}
                    </span>
                </div>

                {/* Title area at bottom of poster */}
                <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform z-10">
                    <h3 className="text-xl font-bold text-white mb-1 line-clamp-1">{entry.title}</h3>
                    <div className="flex items-center gap-4 text-slate-300 text-sm mb-3">
                        <span className="flex items-center gap-1.5">
                            {isSeries ? <Tv className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
                            {isSeries ? `${entry.seasons || 0} Seasons` : 'Movie'}
                        </span>
                        {entry.rating && (
                            <span className="flex items-center gap-1.5 text-amber-400">
                                <Star className="w-3.5 h-3.5 fill-amber-400" />
                                {entry.rating}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Card body */}
            <div className="p-4 space-y-3">
                <div className="text-sm text-slate-400 space-y-1.5">
                    {entry.length && (
                        <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{entry.length}</span>
                        </div>
                    )}
                    {isSeries && entry.episodes ? (
                        <div className="flex items-center gap-2">
                            <MonitorPlay className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{entry.episodes} Episodes</span>
                        </div>
                    ) : null}
                    {entry.finishedDate && (
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Watched: {formatDate(entry.finishedDate)}</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                    {entry.genre?.split(',').slice(0, 3).map((g, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-white/5 rounded-full text-slate-400 border border-white/5">
                            {g.trim()}
                        </span>
                    ))}
                </div>

                {/* Admin footer controls */}
                {isAdmin && (
                    <div className="pt-3 flex justify-between items-center border-t border-white/5">
                        <div className="flex gap-2">
                            <button
                                onClick={() => onEdit(entry)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/15 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white text-xs font-semibold rounded-lg transition-all duration-200"
                            >
                                <Pencil className="w-3 h-3" />
                                Edit
                            </button>
                            <button
                                onClick={() => onDelete(entry.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/15 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white text-xs font-semibold rounded-lg transition-all duration-200"
                            >
                                <Trash2 className="w-3 h-3" />
                                Delete
                            </button>
                        </div>

                        {entry.status !== 'Finished' && (
                            <button
                                onClick={() => onStatusChange(entry.id, 'Finished')}
                                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-lg transition-colors"
                            >
                                Mark Watched
                            </button>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}
