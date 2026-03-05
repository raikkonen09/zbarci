"use client";
import { useState } from "react";
import { GameBoard } from "@/components/GameBoard";

export default function PlayPage() {
    const [playerName, setPlayerName] = useState("");
    const [roomId, setRoomId] = useState("PUBLIC");
    const [hasJoined, setHasJoined] = useState(false);

    if (!hasJoined) {
        return (
            <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-white">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full flex flex-col gap-6">
                    <h1 className="text-3xl font-black text-center text-emerald-500 uppercase tracking-widest">Join Game</h1>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Name</label>
                        <input
                            type="text"
                            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors"
                            placeholder="Guest123"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Room Code</label>
                        <input
                            type="text"
                            className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors uppercase"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                        />
                    </div>

                    <button
                        onClick={() => {
                            if (playerName.trim() && roomId.trim()) setHasJoined(true);
                        }}
                        disabled={!playerName.trim() || !roomId.trim()}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                        Join Lobby
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-transparent flex items-center justify-center p-4">
            <GameBoard initialPlayerName={playerName} initialRoomId={roomId} />
        </main>
    );
}
