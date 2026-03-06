import { useState, useEffect, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Player, DiceData, GameStatus, GameEvent } from "../utils/types";

interface GameState {
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

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3002";
let socketInstance: Socket | null = null;

export function useZbarci(initialPlayerName: string = "Guest", initialRoomId: string = "PUBLIC", initialBotCount: number = 0) {
    console.log("useZbarci hook called!", { initialPlayerName, initialRoomId, initialBotCount });
    const [socket, setSocket] = useState<Socket | null>(null);
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [roomId, setRoomId] = useState<string>(initialRoomId);
    const [playerName, setPlayerName] = useState<string>(initialPlayerName);
    const [botCount, setBotCount] = useState<number>(initialBotCount);

    useEffect(() => {
        console.log("useZbarci useEffect mounted!");
        console.log("Current socketInstance:", !!socketInstance);
        // Initialize socket only once
        if (!socketInstance) {
            console.log("Creating new socket instance to:", SOCKET_SERVER_URL);
            socketInstance = io(SOCKET_SERVER_URL, {
                transports: ['websocket', 'polling'],
            });
        }

        setSocket(socketInstance);

        const handleConnect = () => {
            console.log("Connected to Zbarci Server, joining room: ", roomId, "bots:", botCount);
            socketInstance?.emit("join_room", { roomId, playerName, botCount });
        };

        socketInstance.on("connect", handleConnect);

        const handleStateUpdate = (state: GameState) => {
            setGameState(state);
        };

        socketInstance.on("game_state_update", handleStateUpdate);

        // If the socket is already connected when this effect runs (e.g., room changed),
        // we must emit join_room manually since 'connect' won't fire again.
        if (socketInstance.connected) {
            handleConnect();
        }

        return () => {
            socketInstance?.off("connect", handleConnect);
            socketInstance?.off("game_state_update", handleStateUpdate);
        };
    }, [roomId, playerName]);

    const rollDice = useCallback((isNewTurn: boolean = false) => {
        if (!socket) return;
        socket.emit("roll_dice", { roomId, isNewTurn });
    }, [socket, roomId]);

    const savePoints = useCallback((projectionScore: number) => {
        if (!socket) return;
        socket.emit("bank_points", { roomId, projectionScore });
    }, [socket, roomId]);

    const endTurn = useCallback(() => {
        if (!socket) return;
        socket.emit("end_turn", roomId);
    }, [socket, roomId]);

    const resetGame = useCallback(() => {
        if (!socket) return;
        socket.emit("reset_game", roomId);
    }, [socket, roomId]);

    // Derived state for the UI so GameBoard doesn't break
    // If we're waiting for server response, provide fallback defaults

    const players = gameState?.players || [];
    const currentPlayerIndex = gameState?.currentPlayerIndex || 0;
    const currentPlayer = players[currentPlayerIndex] || { id: 0, name: "Waiting...", score: 0, color: "bg-gray-500" };

    // Determine if it's the localized client's turn natively by id matching
    // (For now, since we auto-assign sockets, we can say if current player matches local socket id)
    const isMyTurn = socket ? currentPlayer.socketId === socket.id : false;

    const dice = gameState?.dice || [];
    const currentRoundScore = gameState?.currentRoundScore || 0;
    const events = gameState?.events || [];
    const showZbarci = gameState?.showZbarci || { show: false, type: null };
    const comboMessage = gameState?.comboMessage || null;
    const gameStatus = gameState?.status || "rolling";

    // Local projections (We still do this UI preview calculation locally, or derive from server state)
    // To maintain existing GameBoard compatibility, we re-calculate prediction locally.

    const THRESHOLDS = [
        { start: 0, end: 100 },
        { start: 200, end: 300 },
        { start: 800, end: 900 },
    ];
    const GET_THRESHOLD = (score: number) => THRESHOLDS.find(t => score >= t.start && score <= t.end);
    const startThreshold = GET_THRESHOLD(currentPlayer.score);

    const canSave = currentRoundScore > 0 &&
        (!startThreshold || (currentPlayer.score + currentRoundScore > startThreshold.end));

    const projection = (() => {
        if (currentRoundScore === 0) return { score: currentPlayer.score, overtakes: [] as string[] };
        if (!gameState) return { score: 0, overtakes: [] };

        const clonedPlayers = players.map(p => ({ ...p }));
        let p = clonedPlayers[currentPlayerIndex];
        let pointsToAssignToP = currentRoundScore;
        let overtakes: string[] = [];

        p.score += pointsToAssignToP;

        const checkOvertook = () => {
            for (let i = 0; i < clonedPlayers.length; i++) {
                if (i === currentPlayerIndex) continue;
                const victim = clonedPlayers[i];
                const victimThreshold = GET_THRESHOLD(victim.score);

                if (!victimThreshold && victim.score < 900) {
                    if (p.score - pointsToAssignToP < victim.score && p.score > victim.score) {
                        pointsToAssignToP = 50;
                        p.score += 50;
                        victim.score -= 50;
                        if (victim.score < 100) victim.score = 0;
                        overtakes.push(victim.name);
                        return true;
                    }
                }
            }
            return false;
        };

        while (checkOvertook()) { }

        return { score: p.score, overtakes };
    })();

    // Helper wrapper so GameBoard doesn't need to change signature
    const savePointsWrapper = useCallback(() => {
        savePoints(projection.score);
    }, [savePoints, projection.score]);


    return {
        players,
        currentPlayer,
        dice,
        currentRoundScore,
        gameStatus,
        events,
        showZbarci,
        comboMessage,
        canSave,
        projection,
        isMyTurn, // New property GameBoard can use to lock UI
        rollDice,
        savePoints: savePointsWrapper,
        endTurn,
        resetGame,
        setPlayerName, // Let the ui change it if they want
        setRoomId
    };
}
