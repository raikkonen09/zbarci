export type Player = {
    id: number | string;
    socketId?: string;
    name: string;
    score: number;
    color: string;
};

export type DiceData = {
    id: string; // unique ID for animation tracking
    value: number; // 1-6
    isLocked: boolean; // locked for scoring
    scoredThisThrow: boolean; // temporarily visual highlight when newly locked
};

export type GameEvent = {
    id: string;
    message: string;
    type: "info" | "success" | "danger" | "overtake";
};

export type GameStatus = "rolling" | "scoring" | "zbarci" | "lost" | "won";
