
"use client";

import { Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmLabel = "Delete",
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
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
                        {/* Icon */}
                        <div className="flex items-center justify-center w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-full mx-auto">
                            <Trash2 className="w-7 h-7 text-red-400" />
                        </div>

                        {/* Text */}
                        <div className="text-center space-y-1.5">
                            <h2 className="text-lg font-bold text-white">{title}</h2>
                            <p className="text-sm text-slate-400">{message}</p>
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
                                onClick={onConfirm}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                {confirmLabel}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
