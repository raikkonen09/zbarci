export type GameStatus = "rolling" | "scoring" | "zbarci" | "won" | "lost";

export interface Player {
    id: number | string; // support string sockets
    socketId?: string;
    name: string;
    score: number;
    color: string;
    isReady?: boolean;
}

export interface DiceData {
    id: string;
    value: number;
    isLocked: boolean;
    scoredThisThrow: boolean;
}

export interface GameEvent {
    id: string;
    message: string;
    type: 'success' | 'danger' | 'info' | 'overtake';
}

export interface GameState {
    roomId: string;
    status: GameStatus;
    players: Player[];
    currentPlayerIndex: number;
    dice: DiceData[];
    currentRoundScore: number;
    events: GameEvent[];
    showZbarci: { show: boolean, type: 'zbarci' | 'lost' | 'overstep' | 'win' | null };
    comboMessage: { text: string, id: string } | null;
}
