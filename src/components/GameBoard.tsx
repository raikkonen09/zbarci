"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, Medal } from "lucide-react";
import { useZbarci } from "@/hooks/useZbarci";
import { Dice } from "@/components/Dice";
import { RulesModal } from "@/components/RulesModal";

const THRESHOLDS = [
    { start: 0, end: 100, label: "Danger Zone 1" },
    { start: 200, end: 300, label: "Danger Zone 2" },
    { start: 800, end: 900, label: "Danger Zone 3" },
];

export function GameBoard() {
    const [showRules, setShowRules] = useState(false);
    const {
        players,
        currentPlayer,
        dice,
        currentRoundScore,
        gameStatus,
        events,
        showZbarci,
        comboMessage,
        canSave,
        projection, // Added projection here
        rollDice,
        savePoints,
        endTurn,
        resetGame
    } = useZbarci();

    const eventsEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [events]);

    useEffect(() => {
        if (showZbarci.show && (showZbarci.type === "zbarci" || showZbarci.type === "lost" || showZbarci.type === "overstep")) {
            const timer = setTimeout(() => {
                endTurn();
            }, 3500);
            return () => clearTimeout(timer);
        }
    }, [showZbarci, endTurn]);

    const handleRoll = () => {
        const isNewTurn = dice.length === 0;
        rollDice(isNewTurn);
    };

    const calculateLeftOffset = (score: number) => {
        return `${Math.max(0, Math.min((score / 1000) * 100, 100))}%`;
    };

    const lockedDice = dice.filter(d => d.isLocked);
    const activeDice = dice.filter(d => !d.isLocked);

    return (
        <div className="w-full max-w-6xl mx-auto flex flex-col items-center justify-start p-4 min-h-screen gap-4 text-white font-sans overflow-x-hidden">

            {/* ROW 0: HEADER */}
            <div className="w-full flex justify-between items-end px-2">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl lg:text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                        ZBARCI 1000m
                    </h1>
                    <button
                        onClick={() => setShowRules(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors text-white text-xs font-bold tracking-wider cursor-pointer"
                        aria-label="View Game Rules"
                    >
                        <Info size={14} className="text-blue-400" aria-hidden="true" /> RULES
                    </button>
                </div>
                <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-widest">Current Turn</p>
                    <p className="text-lg font-bold flex items-center justify-end gap-2">
                        <span className={`w-3 h-3 rounded-full ${currentPlayer.color} shadow-[0_0_8px_currentColor]`} />
                        {currentPlayer.name}
                    </p>
                </div>
            </div>

            {/* ROW 1: TRACK UI */}
            <div className="w-full glass-panel rounded-2xl p-4 relative overflow-hidden ring-1 ring-slate-800">
                <div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em] flex justify-between">
                    <span>Start Zone</span>
                    <span>1000m Finish Line</span>
                </div>
                <div className="relative w-full h-32 md:h-43 border-l-[3px] border-r-[3px] border-white/50 shrink-0 overflow-hidden rounded shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] bg-[#bd3a33]">
                    {/* Background Texture / Dirt pattern (Subtle CSS grain) */}
                    <div className="absolute inset-0 opacity-20 mix-blend-overlay noise-bg pointer-events-none" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')" }}></div>

                    {/* Lanes */}
                    <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
                        {players.map((_, i) => (
                            <div key={`lane-${i}`} className="flex-1 border-b-2 border-white/40 last:border-b-0" />
                        ))}
                    </div>

                    {/* Thresholds / Danger Zones */}
                    {THRESHOLDS.map((t, idx) => (
                        <div
                            key={`thresh-${idx}`}
                            className="absolute top-0 bottom-0 bg-red-900/60 border-x-4 border-yellow-500/80 striped-bg pointer-events-none z-0"
                            style={{
                                left: `${(t.start / 1000) * 100}%`,
                                width: `${((t.end - t.start) / 1000) * 100}%`
                            }}
                        >
                            <div className="absolute inset-0 flex items-center justify-center opacity-30">
                                <span className="rotate-[-90deg] uppercase font-black text-[10px] tracking-widest text-yellow-300">Hurdles</span>
                            </div>
                        </div>
                    ))}

                    {/* Finish Line (Checkered Flag) */}
                    <div className="absolute top-0 bottom-0 right-0 w-6 border-l-4 border-white z-0 opacity-90"
                        style={{
                            backgroundImage: "repeating-linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), repeating-linear-gradient(45deg, #000 25%, #fff 25%, #fff 75%, #000 75%, #000)",
                            backgroundPosition: "0 0, 8px 8px",
                            backgroundSize: "16px 16px"
                        }}>
                    </div>

                    {/* Players */}
                    {players.map((p, idx) => {
                        const laneHeight = 100 / players.length;
                        const topOffset = `${(idx * laneHeight) + (laneHeight / 2)}%`;
                        return (
                            <motion.div
                                key={p.id}
                                className="absolute flex flex-col items-center -ml-3 -translate-y-1/2"
                                animate={{ left: calculateLeftOffset(p.score) }}
                                transition={{ type: "spring", stiffness: 60, damping: 12 }}
                                style={{ top: topOffset, zIndex: currentPlayer.id === p.id ? 20 : 10 }}
                            >
                                <div className="relative group">
                                    {/* Player Avatar */}
                                    <div className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white/80 ${p.color} ${currentPlayer.id === p.id ? "ring-4 ring-white shadow-[0_0_15px_rgba(255,255,255,1)] scale-110" : "shadow-[0_2px_10px_rgba(0,0,0,0.5)]"} flex items-center justify-center text-[10px] md:text-xs font-black text-black drop-shadow-sm`}>
                                        {p.name.charAt(0)}
                                    </div>
                                    <div className={`absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[10px] md:text-xs font-bold px-2 py-1 rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity ${currentPlayer.id === p.id ? "opacity-100" : ""}`}>
                                        {p.score} pt
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            {/* ROW 2: LEADERBOARD | GAME BOARD | LOCKED DICE */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-4 gap-4">

                {/* LEADERBOARD (Col 1) */}
                <div className="lg:col-span-1 glass-panel rounded-2xl p-4 ring-1 ring-slate-800 flex flex-col min-h-[350px] lg:min-h-[400px]">
                    <h3 className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Medal size={16} className="text-amber-400" /> Leaderboard
                    </h3>
                    <div className="flex flex-col gap-2">
                        {[...players].sort((a, b) => b.score - a.score).map((p, idx) => (
                            <div key={`lb-${p.id}`} className="flex justify-between items-center bg-slate-900/50 px-3 py-2 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-black opacity-50 ${idx === 0 ? 'text-amber-400 opacity-100' : ''}`}>{idx + 1}.</span>
                                    <span className="text-sm font-semibold">{p.name}</span>
                                </div>
                                <span className="font-mono font-bold text-blue-300 text-sm">{p.score}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ACTIVE ROLL BOARD (Col 2 & 3) */}
                <div className="lg:col-span-2 relative w-full glass-panel rounded-2xl p-6 flex flex-col items-center justify-center overflow-hidden ring-1 ring-slate-800 bg-slate-900/30 min-h-[350px] lg:min-h-[400px]">
                    <div className="flex flex-wrap gap-4 sm:gap-6 justify-center max-w-lg">
                        <AnimatePresence>
                            {activeDice.map((d) => (
                                <Dice key={d.id} data={d} />
                            ))}
                        </AnimatePresence>
                    </div>

                    <AnimatePresence>
                        {comboMessage && !showZbarci.show && (
                            <motion.div
                                key={comboMessage.id}
                                initial={{ opacity: 0, scale: 0.5, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 1.1, y: -20 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                className="absolute top-6 z-40 pointer-events-none"
                            >
                                <h2 className="text-3xl md:text-4xl font-black text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.9)] uppercase tracking-tighter">
                                    {comboMessage.text}
                                </h2>
                            </motion.div>
                        )}

                        {showZbarci.show && showZbarci.type !== "win" && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                className="absolute top-6 z-50 pointer-events-none bg-slate-900/90 px-8 py-3 rounded-full border-2 border-red-500/50 backdrop-blur-md shadow-[0_4px_30px_rgba(239,68,68,0.5)] flex items-center justify-center"
                            >
                                <h1 className="text-2xl md:text-3xl font-black text-red-500 uppercase tracking-widest text-center leading-none m-0">
                                    {showZbarci.type === "zbarci" && "ZBARCI!"}
                                    {showZbarci.type === "lost" && "YOU LOST!"}
                                    {showZbarci.type === "overstep" && "OVERSTEPPED!"}
                                </h1>
                            </motion.div>
                        )}

                        {showZbarci.show && showZbarci.type === "win" && (
                            <motion.div
                                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                                className="absolute top-6 z-50 pointer-events-none bg-slate-900/90 px-8 py-3 rounded-full border-2 border-emerald-500/50 backdrop-blur-md shadow-[0_4px_30px_rgba(16,185,129,0.5)] flex items-center justify-center"
                            >
                                <h1 className="text-2xl md:text-3xl font-black text-emerald-400 uppercase tracking-widest text-center leading-none m-0">
                                    {currentPlayer.name} WINS!
                                </h1>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* LOCKED DICE BANK (Col 4) */}
                <div className="lg:col-span-1 glass-panel rounded-2xl p-4 ring-1 ring-emerald-500/20 bg-emerald-900/10 flex flex-col items-center min-h-[350px] lg:min-h-[400px]">
                    <h3 className="text-xs text-emerald-500/70 font-bold uppercase tracking-widest mb-4">Locked Dice</h3>
                    {lockedDice.length === 0 ? (
                        <div className="flex-grow flex items-center justify-center text-emerald-500/30 text-sm font-semibold max-w-[120px] text-center">
                            Dice from previous rolls will appear here.
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3 content-start">
                            <AnimatePresence>
                                {lockedDice.map((d) => (
                                    <div key={d.id} className="scale-75 origin-top">
                                        <Dice data={d} />
                                    </div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

            </div>

            {/* ROW 3: LIVE FEED | ACTION AREA */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* LIVE FEED (Col 1) */}
                <div className="lg:col-span-1 glass-panel rounded-2xl h-32 sm:h-40 flex flex-col ring-1 ring-slate-800 relative overflow-hidden">
                    <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 border-b border-slate-700/50 z-10 w-full shrink-0">
                        <h3 className="text-xs text-slate-500 font-bold uppercase tracking-widest">Live Feed</h3>
                    </div>
                    <div className="flex flex-col gap-2 flex-grow overflow-y-auto scroll-smooth p-4 pt-2">
                        <AnimatePresence initial={false}>
                            {events.map((ev) => (
                                <motion.div
                                    key={ev.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`text-sm px-3 py-1.5 rounded-lg border-l-2
                            ${ev.type === "info" ? "bg-slate-800/50 border-slate-400 text-slate-300" : ""}
                            ${ev.type === "danger" ? "bg-red-900/30 border-red-500 text-red-200" : ""}
                            ${ev.type === "success" ? "bg-emerald-900/30 border-emerald-500 text-emerald-200" : ""}
                            ${ev.type === "overtake" ? "bg-amber-900/30 border-amber-500 text-amber-200 font-bold" : ""}
                        `}
                                >
                                    {ev.message}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        <div ref={eventsEndRef} />
                    </div>
                </div>

                {/* ACTION AREA (Col 2 & 3) */}
                <div className="lg:col-span-2 flex flex-col sm:flex-row items-center justify-between bg-slate-900/50 p-4 sm:p-6 rounded-2xl ring-1 ring-slate-800 backdrop-blur-md gap-6 sm:gap-4 h-auto sm:h-43">

                    <div className="text-left flex-shrink-0 flex gap-4 sm:gap-8 items-start">
                        {/* PROJECTED SCORE (Left) */}
                        <div className="flex flex-col min-w-[70px]">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Potential Total</p>
                            <div className={`text-4xl lg:text-5xl font-black tracking-tighter drop-shadow-xl leading-none ${currentRoundScore > 0 && !canSave ? "text-red-500" : "text-blue-400"}`}>
                                {currentRoundScore > 0 ? projection.score : currentPlayer.score}
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase tracking-wider">
                                {1000 - (currentRoundScore > 0 ? projection.score : currentPlayer.score)}m TO FINISH
                            </div>
                            {currentRoundScore > 0 && projection.overtakes.length > 0 && canSave && (
                                <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="mt-2 inline-flex items-center text-[10px] font-black text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)] uppercase border border-amber-500/50 bg-amber-950/40 px-2 py-1 rounded-md"
                                >
                                    ⚠️ OVERTAKING <br /> {projection.overtakes.join(", ")}
                                </motion.div>
                            )}
                        </div>

                        {/* ROUND SCORE (Right) */}
                        <div className="flex flex-col border-l border-slate-700 pl-4 sm:pl-8">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1">Round Points</p>
                            <div className={`text-4xl lg:text-5xl font-black leading-none ${currentRoundScore > 0 ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "text-slate-600"}`}>
                                +{currentRoundScore}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-end w-full">

                        <button
                            onClick={handleRoll}
                            disabled={showZbarci.show || showZbarci.type === 'win'}
                            className="px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-sm sm:text-lg font-black uppercase tracking-widest shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed flex-grow cursor-pointer"
                        >
                            {dice.length === 0 ? "START TURN!" : "ROLL REMAINING"}
                        </button>

                        <div className="flex-shrink-0 min-w-[120px] w-full sm:w-auto">
                            <AnimatePresence>
                                {dice.length > 0 && currentRoundScore > 0 && !showZbarci.show && (
                                    <motion.button
                                        initial={{ opacity: 0, scale: 0.8, x: 20 }}
                                        animate={{ opacity: 1, scale: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.8, x: 20 }}
                                        onClick={savePoints}
                                        disabled={!canSave}
                                        className={`rounded-xl transition-all px-4 py-4 font-black uppercase tracking-widest border-b-4 active:border-b-0 active:translate-y-1 w-full text-sm sm:text-base
                        ${canSave
                                                ? "bg-emerald-600 border-emerald-800 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-white"
                                                : "bg-slate-800 border-slate-900 text-slate-500 cursor-not-allowed opacity-50 shadow-none"
                                            }
                        `}
                                    >
                                        BANK IT
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                </div>

            </div>

            <RulesModal isOpen={showRules} onClose={() => setShowRules(false)} />
        </div>
    );
}
