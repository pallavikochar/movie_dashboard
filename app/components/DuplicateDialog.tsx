
"use client";

import { AlertCircle, Pencil, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DuplicateDialogProps {
    isOpen: boolean;
    title: string;
    onEdit: () => void;
    onCancel: () => void;
}

export default function DuplicateDialog({ isOpen, title, onEdit, onCancel }: DuplicateDialogProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    onClick={onCancel}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 10 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 10 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button
                            onClick={onCancel}
                            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Icon */}
                        <div className="flex items-center justify-center w-14 h-14 bg-amber-500/10 border border-amber-500/20 rounded-full mx-auto">
                            <AlertCircle className="w-7 h-7 text-amber-400" />
                        </div>

                        {/* Text */}
                        <div className="text-center space-y-2">
                            <h2 className="text-lg font-bold text-white">Already in Library</h2>
                            <p className="text-sm text-slate-400">
                                <span className="text-white font-semibold">"{title}"</span> already exists in your library.
                            </p>
                            <p className="text-sm text-slate-500">Do you want to edit the existing entry instead?</p>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-1">
                            <button
                                onClick={onCancel}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold text-sm transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onEdit}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-all shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit Entry
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
