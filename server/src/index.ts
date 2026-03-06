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

const THRESHOLDS = [
    { start: 0, end: 100 },
    { start: 200, end: 300 },
    { start: 800, end: 900 },
];

function addEventLocal(game: GameState, msg: string, type: GameEvent["type"]) {
    game.events = [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...game.events].slice(0, 20);
}

function handleRoll(roomId: string, playerId: string | number, isNewTurn: boolean) {
    const game = games[roomId];
    if (!game) return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

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

    if (roundPoints === 0) {
        if (diceToRollCount === 6) {
            game.showZbarci = { show: true, type: "zbarci" };
            addEventLocal(game, `${currentPlayer.name} rolled a ZBARCI!`, 'danger');
        } else {
            game.showZbarci = { show: true, type: "lost" };
            addEventLocal(game, `${currentPlayer.name} LOST points!`, 'danger');
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

        if (currentPlayer.score + game.currentRoundScore === 1000) {
            addEventLocal(game, `${currentPlayer.name} HAS FINISHED!!!`, 'success');
            game.showZbarci = { show: true, type: "win" };
            game.status = "won";
        } else if (currentPlayer.score + game.currentRoundScore > 1000) {
            addEventLocal(game, `${currentPlayer.name} overstepped the finish line!`, 'danger');
            game.showZbarci = { show: true, type: "overstep" };
            game.status = "lost";
        } else {
            game.status = "scoring";
        }
    }

    game.dice = [...oldDice, ...newDice];
    io.to(roomId).emit('game_state_update', game);
    checkBotTurn(roomId);
}

function handleBank(roomId: string, playerId: string | number) {
    const game = games[roomId];
    if (!game) return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    let projectionScore = currentPlayer.score + game.currentRoundScore;

    // Simulate backend overtaking calculation
    const overtakes: string[] = [];
    const clonedPlayers = JSON.parse(JSON.stringify(game.players)) as Player[];
    const p = clonedPlayers[game.currentPlayerIndex];
    p.score += game.currentRoundScore;

    const checkOvertook = () => {
        let pointsToAssignToP = game.currentRoundScore;
        for (let i = 0; i < clonedPlayers.length; i++) {
            if (i === game.currentPlayerIndex) continue;
            const victim = clonedPlayers[i];
            const victimThreshold = THRESHOLDS.some(t => victim.score > t.start && victim.score < t.end);

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
    projectionScore = p.score;

    game.players = clonedPlayers;

    const totalAdded = projectionScore - currentPlayer.score;
    if (overtakes.length > 0) {
        addEventLocal(game, `${currentPlayer.name} overtook ${overtakes.join(", ")}!`, 'overtake');
    }

    addEventLocal(game, `${currentPlayer.name} BANKED +${totalAdded} points!`, "success");

    // Let the end turn handle the rest
    handleEndTurn(roomId, playerId, true);
}

function handleEndTurn(roomId: string, playerId: string | number, force = false) {
    const game = games[roomId];
    if (!game) return;

    // Anyone can technically end turn if state is zbarci/lost/won on the frontend timeout, but usually it comes from the current player
    const currentPlayer = game.players[game.currentPlayerIndex];

    game.currentRoundScore = 0;
    game.dice = [];
    game.status = "rolling";
    game.showZbarci = { show: false, type: null };
    game.comboMessage = null;
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

    io.to(roomId).emit('game_state_update', game);

    checkBotTurn(roomId);
}

function checkBotTurn(roomId: string) {
    const game = games[roomId];
    if (!game) return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer && currentPlayer.isBot) {
        if (game.status === 'won') return;

        if (game.status === 'zbarci' || game.status === 'lost') {
            setTimeout(() => {
                // Check if still same state just in case
                if (games[roomId]?.currentPlayerIndex === game.currentPlayerIndex) {
                    handleEndTurn(roomId, currentPlayer.id, true);
                }
            }, 3000);
            return;
        }

        // Action timer (delay for thought & animation reading)
        setTimeout(() => {
            const currentGame = games[roomId];
            if (!currentGame || currentGame.currentPlayerIndex !== game.players.findIndex(p => p.id === currentPlayer.id)) return;

            const inDangerZone = THRESHOLDS.some(t => {
                const pos = currentPlayer.score + currentGame.currentRoundScore;
                return pos > t.start && pos < t.end;
            });
            const canSave = currentGame.currentRoundScore >= 100 && !inDangerZone;

            // Simple basic bot strategy
            const distanceToFinish = 1000 - currentPlayer.score;
            if (canSave) {
                if (currentGame.currentRoundScore >= 350 || currentGame.currentRoundScore >= distanceToFinish) {
                    handleBank(roomId, currentPlayer.id);
                    return;
                }
            }

            const isNewTurn = currentGame.dice.length === 0;
            handleRoll(roomId, currentPlayer.id, isNewTurn);
        }, 2000);
    }
}

io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', ({ roomId: rawRoomId, playerName, botCount }: { roomId: string, playerName: string, botCount?: number }) => {
        const roomId = rawRoomId.toUpperCase();
        console.log(`Socket ${socket.id} trying to join room ${roomId} as ${playerName} with ${botCount} bots.`);
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

        if (!game.players.find(p => p.socketId === socket.id)) {
            // Human player
            game.players.push({
                id: socket.id,
                socketId: socket.id,
                name: playerName,
                score: 0,
                color: COLORS[game.players.length % COLORS.length],
                isReady: true
            });
            addEventLocal(game, `${playerName} joined the game.`, 'info');

            // Insert Bots if they were passed and only if human is first one
            if (botCount && game.players.length === 1) {
                for (let i = 1; i <= botCount; i++) {
                    game.players.push({
                        id: `bot-${roomId}-${i}`,
                        socketId: `bot-${roomId}-${i}`,
                        name: `CPU ${i}`,
                        score: 0,
                        color: COLORS[game.players.length % COLORS.length],
                        isReady: true,
                        isBot: true
                    });
                }
                addEventLocal(game, `Added ${botCount} CPUs.`, 'info');
            }
        }

        socket.emit('game_state_update', game);
        socket.broadcast.to(roomId).emit('game_state_update', game);

        checkBotTurn(roomId);
    });

    socket.on('roll_dice', ({ roomId, isNewTurn }: { roomId: string, isNewTurn: boolean }) => {
        handleRoll(roomId, socket.id, isNewTurn);
    });

    socket.on('bank_points', ({ roomId }: { roomId: string, projectionScore: number }) => {
        handleBank(roomId, socket.id);
    });

    socket.on('end_turn', (roomId: string) => {
        handleEndTurn(roomId, socket.id);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        for (const roomId in games) {
            const game = games[roomId];
            const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
            if (playerIndex !== -1) {
                const p = game.players[playerIndex];
                addEventLocal(game, `${p.name} disconnected.`, 'danger');
                io.to(roomId).emit('game_state_update', game);
            }
        }
    });

    socket.on('reset_game', (roomId: string) => {
        const game = games[roomId];
        if (!game) return;

        // Ensure if bots are present they don't break logic on restart 
        game.players = game.players.map(p => ({ ...p, score: 0 }));
        game.currentPlayerIndex = 0;
        game.currentRoundScore = 0;
        game.dice = [];
        game.status = "rolling";
        game.events = [];
        game.showZbarci = { show: false, type: null };
        game.comboMessage = null;

        io.to(roomId).emit('game_state_update', game);
        checkBotTurn(roomId);
    });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;
httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Zbarci Server running on http://0.0.0.0:${PORT}`);
});
