"use client";
import { useState } from "react";
import { GameBoard } from "@/components/GameBoard";

export default function PlayPage() {
    const [mode, setMode] = useState<"single" | "multi">("single");
    const [playerName, setPlayerName] = useState("");
    const [botCount, setBotCount] = useState<number>(3);
    const [roomId, setRoomId] = useState("PUBLIC");
    const [hasJoined, setHasJoined] = useState(false);

    if (!hasJoined) {
        return (
            <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col gap-6">
                    <h1 className="text-3xl font-black text-center text-emerald-500 uppercase tracking-widest">Join Game</h1>

                    <div className="flex bg-slate-950 p-1 rounded-xl">
                        <button
                            onClick={() => setMode("single")}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${mode === "single" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                        >
                            Single Player
                        </button>
                        <button
                            onClick={() => setMode("multi")}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${mode === "multi" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
                        >
                            Multiplayer
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Name</label>
                        <input
                            type="text"
                            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                            placeholder="Player1"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                        />
                    </div>

                    {mode === "multi" ? (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Code</label>
                            <input
                                type="text"
                                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors uppercase"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Opponents (Bots)</label>
                            <select
                                className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                                value={botCount}
                                onChange={(e) => setBotCount(Number(e.target.value))}
                            >
                                <option value={1}>1 CPU</option>
                                <option value={2}>2 CPUs</option>
                                <option value={3}>3 CPUs</option>
                            </select>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            if (playerName.trim()) {
                                if (mode === "single") {
                                    setRoomId(`SP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
                                }
                                setHasJoined(true);
                            }
                        }}
                        disabled={!playerName.trim() || (mode === "multi" && !roomId.trim())}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                        {mode === "single" ? "Start Game" : "Join Room"}
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-transparent flex items-center justify-center p-4">
            <GameBoard initialPlayerName={playerName} initialRoomId={roomId} initialBotCount={mode === "single" ? botCount : 0} />
        </main>
    );
}
