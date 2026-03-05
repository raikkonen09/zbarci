import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { GameState, Player, DiceData, GameEvent } from './types';
import { calculatePoints, identifyScoringDice, performOvertaking } from './gameEngine';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});

// In-memory store for game rooms
const games: Record<string, GameState> = {};

const rollDie = () => Math.floor(Math.random() * 6) + 1;

const COLORS = [
    "bg-amber-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500",
    "bg-pink-500", "bg-orange-500", "bg-cyan-500", "bg-rose-500"
];

io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ roomId: rawRoomId, playerName }: { roomId: string, playerName: string }) => {
        const roomId = rawRoomId.toUpperCase();
        console.log(`Socket ${socket.id} trying to join room ${roomId} as ${playerName}`);
        socket.join(roomId);

        // Initialize room if it doesn't exist
        if (!games[roomId]) {
            games[roomId] = {
                roomId,
                status: "rolling",
                players: [],
                currentPlayerIndex: 0,
                dice: [],
                currentRoundScore: 0,
                events: [],
                showZbarci: { show: false, type: null },
                comboMessage: null
            };
        }

        const game = games[roomId];

        // Prevent duplicate joins from same socket
        if (!game.players.find(p => p.socketId === socket.id)) {
            const nextColor = COLORS[game.players.length % COLORS.length];
            game.players.push({
                id: socket.id,
                socketId: socket.id,
                name: playerName,
                score: 0,
                color: nextColor,
                isReady: true
            });

            const joinEvent: GameEvent = {
                id: Date.now().toString() + Math.random(),
                message: `${playerName} joined the game.`,
                type: 'info'
            };
            game.events = [joinEvent, ...game.events].slice(0, 20);
        }

        console.log(`Sending game_state_update to ${socket.id} with ${game.players.length} players.`);
        socket.emit('game_state_update', game); // directly to joining socket
        socket.broadcast.to(roomId).emit('game_state_update', game); // broadcast to rest of room
    });

    socket.on('roll_dice', ({ roomId, isNewTurn }: { roomId: string, isNewTurn: boolean }) => {
        const game = games[roomId];
        if (!game) return;

        const currentPlayer = game.players[game.currentPlayerIndex];

        // Only the current player can roll
        if (currentPlayer.socketId !== socket.id) return;

        game.status = "rolling";
        game.comboMessage = null;
        game.showZbarci = { show: false, type: null };

        let diceToRollCount = 6;
        let oldDice: DiceData[] = [];

        if (!isNewTurn) {
            const bankingDice = game.dice.filter(d => d.isLocked || d.scoredThisThrow);
            oldDice = bankingDice.map(d => ({ ...d, isLocked: true, scoredThisThrow: false }));

            diceToRollCount = 6 - oldDice.length;
            if (diceToRollCount === 0) {
                oldDice = [];
                diceToRollCount = 6;
            }
        }

        const newDice: DiceData[] = Array.from({ length: diceToRollCount }).map((_, i) => ({
            id: `die-${Date.now()}-${i}`,
            value: rollDie(),
            isLocked: false,
            scoredThisThrow: false
        }));

        const newlyRolledValues = newDice.map(d => d.value);
        const roundPoints = calculatePoints(newlyRolledValues);

        const addEventLocal = (msg: string, type: GameEvent["type"]) => {
            game.events = [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...game.events].slice(0, 20);
        };

        if (roundPoints === 0) {
            if (diceToRollCount === 6) {
                game.showZbarci = { show: true, type: "zbarci" };
                addEventLocal(`${currentPlayer.name} rolled a ZBARCI!`, 'danger');
            } else {
                game.showZbarci = { show: true, type: "lost" };
                addEventLocal(`${currentPlayer.name} LOST points!`, 'danger');
            }
            game.status = "zbarci";
        } else {
            const scoringIndices = identifyScoringDice(newlyRolledValues);
            scoringIndices.forEach(idx => {
                newDice[idx].scoredThisThrow = true;
            });

            // Encouragements
            const phrases5to20 = ["NICE!", "GOOD!", "SWEET!", "NEAT!", "COOL!"];
            const phrases25to60 = ["GREAT!", "AWESOME!", "SUPERB!", "TASTY!", "BRILLIANT!"];
            const phrasesOver60 = ["DIVINE!", "PHENOMENAL!", "SPECTACULAR!", "LEGENDARY!", "UNBELIEVABLE!"];

            let word = "";
            if (roundPoints >= 5 && roundPoints <= 20) word = phrases5to20[Math.floor(Math.random() * phrases5to20.length)];
            else if (roundPoints >= 25 && roundPoints <= 60) word = phrases25to60[Math.floor(Math.random() * phrases25to60.length)];
            else if (roundPoints > 60) word = phrasesOver60[Math.floor(Math.random() * phrasesOver60.length)];

            if (word) {
                game.comboMessage = { text: word, id: Date.now().toString() };
                setTimeout(() => {
                    if (games[roomId]) {
                        games[roomId].comboMessage = null;
                        io.to(roomId).emit('game_state_update', games[roomId]);
                    }
                }, 1500);
            }

            game.currentRoundScore += roundPoints;

            if (currentPlayer.score + game.currentRoundScore + roundPoints === 1000) {
                addEventLocal(`${currentPlayer.name} HAS FINISHED!!!`, 'success');
                game.showZbarci = { show: true, type: "win" };
                game.status = "won";
            } else if (currentPlayer.score + game.currentRoundScore + roundPoints > 1000) {
                addEventLocal(`${currentPlayer.name} overstepped the finish line!`, 'danger');
                game.showZbarci = { show: true, type: "overstep" };
                game.status = "lost";
            } else {
                game.status = "scoring";
            }
        }

        game.dice = [...oldDice, ...newDice];
        io.to(roomId).emit('game_state_update', game);
    });

    socket.on('bank_points', ({ roomId, projectionScore }: { roomId: string, projectionScore: number }) => {
        const game = games[roomId];
        if (!game) return;

        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.socketId !== socket.id) return;

        const addEventLocal = (msg: string, type: GameEvent["type"]) => {
            game.events = [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...game.events].slice(0, 20);
        };

        const totalAdded = projectionScore - currentPlayer.score;

        game.players = performOvertaking(game.players, game.currentPlayerIndex, game.currentRoundScore, addEventLocal);

        addEventLocal(`${currentPlayer.name} BANKED +${totalAdded} points!`, "success");

        // End turn automatically
        game.currentRoundScore = 0;
        game.dice = [];
        game.status = "rolling";
        game.showZbarci = { show: false, type: null };
        game.comboMessage = null;
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

        io.to(roomId).emit('game_state_update', game);
    });

    socket.on('end_turn', (roomId: string) => {
        const game = games[roomId];
        if (!game) return;

        const currentPlayer = game.players[game.currentPlayerIndex];
        // If zbarci/lost, anyone can end turn or server can end. But usually client sends it after timeout.

        game.currentRoundScore = 0;
        game.dice = [];
        game.status = "rolling";
        game.showZbarci = { show: false, type: null };
        game.comboMessage = null;
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

        io.to(roomId).emit('game_state_update', game);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Find which room they were in and notify
        for (const roomId in games) {
            const game = games[roomId];
            const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                const p = game.players[playerIndex];
                game.events = [{ id: Date.now().toString() + Math.random(), message: `${p.name} disconnected.`, type: 'danger' as const }, ...game.events].slice(0, 20);

                // Optional: For now, keeping the player there so they can rejoin, or we could remove them.
                // Let's just emit the event.
                io.to(roomId).emit('game_state_update', game);
            }
        }
    });

    socket.on('reset_game', (roomId: string) => {
        const game = games[roomId];
        if (!game) return;

        game.players = game.players.map(p => ({ ...p, score: 0 }));
        game.currentPlayerIndex = 0;
        game.currentRoundScore = 0;
        game.dice = [];
        game.status = "rolling";
        game.events = [];
        game.showZbarci = { show: false, type: null };
        game.comboMessage = null;

        io.to(roomId).emit('game_state_update', game);
    });
});

const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Zbarci Server running on http://0.0.0.0:${PORT}`);
});
