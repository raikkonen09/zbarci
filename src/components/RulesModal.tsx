"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Info, AlertTriangle, FastForward } from "lucide-react";

export function RulesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 shadow-[0_0_100px_rgba(0,0,0,0.8)] backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto glass-panel rounded-3xl p-6 md:p-8 relative border border-slate-700 shadow-2xl text-slate-200"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-800 transition-colors z-10"
                        >
                            <X size={24} className="text-slate-400" />
                        </button>

                        <h2 className="text-3xl font-black mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
                            RULES: THE 1000m TRACK RACE
                        </h2>

                        <div className="space-y-6">

                            <section>
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <Info className="text-blue-400" size={20} /> Core Mechanics
                                </h3>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                    <li>Roll 6 dice. You must score to continue.</li>
                                    <li><strong>1</strong> = 10 pts | <strong>5</strong> = 5 pts</li>
                                    <li><strong>3 of a kind</strong> = face value x 10 (e.g. 3x4 = 40 pts). <em>Except 1s (3x1 = 100 pts)</em>.</li>
                                    <li><strong>4, 5, or 6 of a kind</strong> multiply the base combination further (x20, x40, x80).</li>
                                    <li>If your roll yields 0 points, you bust (<strong>ZBARCI</strong>) and lose the round's points!</li>
                                    <li>If all 6 dice score, you get 6 fresh dice and continue accumulating!</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <AlertTriangle className="text-red-400" size={20} /> Danger Zones (Thresholds)
                                </h3>
                                <p className="text-slate-300 mb-2">
                                    There are 3 danger zones on the track: <strong>0-99</strong>, <strong>200-300</strong>, and <strong>800-900</strong>.
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                                    <li>You <strong>cannot Save Points</strong> if your new total lands inside these zones. You must continue pushing your luck!</li>
                                    <li>However, if you are stuck inside a threshold, you are protected from being overtaken.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <FastForward className="text-amber-400" size={20} /> Overtaking (Depășiri)
                                </h3>
                                <p className="text-slate-300">
                                    If your score jumps strictly <strong>past</strong> an opponent's score (e.g. you go from behind them to ahead of them):
                                </p>
                                <ul className="list-disc pl-5 space-y-1 text-slate-300 mt-2">
                                    <li>You steal a massive <strong>+50 pts</strong> bonus!</li>
                                    <li>They suffer a <strong>-50 pts</strong> penalty!</li>
                                    <li>If they fall below 100 points because of the penalty, they are sent <strong>Back to Start (0 pts)</strong>.</li>
                                    <li>Overtaking chains can trigger multiple times in one save!</li>
                                </ul>
                            </section>

                            <section className="bg-emerald-900/30 p-4 rounded-xl border border-emerald-800">
                                <h3 className="text-xl font-bold text-emerald-400 mb-1">How to Win</h3>
                                <p className="text-emerald-100">
                                    You must land on exactly <strong>1000 points</strong>. If you go over 1000, you overstep the line and lose the points for that turn!
                                </p>
                            </section>

                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
