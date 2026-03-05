"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const gameEngine_1 = require("./gameEngine");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"]
    }
});
const PORT = 3001;
// In-memory store for game rooms
const games = {};
const rollDie = () => Math.floor(Math.random() * 6) + 1;
const COLORS = [
    "bg-amber-500", "bg-blue-500", "bg-emerald-500", "bg-purple-500",
    "bg-pink-500", "bg-orange-500", "bg-cyan-500", "bg-rose-500"
];
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    socket.on('join_room', ({ roomId, playerName }) => {
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
            const joinEvent = {
                id: Date.now().toString() + Math.random(),
                message: `${playerName} joined the game.`,
                type: 'info'
            };
            game.events = [joinEvent, ...game.events].slice(0, 20);
        }
        io.to(roomId).emit('game_state_update', game);
    });
    socket.on('roll_dice', ({ roomId, isNewTurn }) => {
        const game = games[roomId];
        if (!game)
            return;
        const currentPlayer = game.players[game.currentPlayerIndex];
        // Only the current player can roll
        if (currentPlayer.socketId !== socket.id)
            return;
        game.status = "rolling";
        game.comboMessage = null;
        game.showZbarci = { show: false, type: null };
        let diceToRollCount = 6;
        let oldDice = [];
        if (!isNewTurn) {
            const bankingDice = game.dice.filter(d => d.isLocked || d.scoredThisThrow);
            oldDice = bankingDice.map(d => ({ ...d, isLocked: true, scoredThisThrow: false }));
            diceToRollCount = 6 - oldDice.length;
            if (diceToRollCount === 0) {
                oldDice = [];
                diceToRollCount = 6;
            }
        }
        const newDice = Array.from({ length: diceToRollCount }).map((_, i) => ({
            id: `die-${Date.now()}-${i}`,
            value: rollDie(),
            isLocked: false,
            scoredThisThrow: false
        }));
        const newlyRolledValues = newDice.map(d => d.value);
        const roundPoints = (0, gameEngine_1.calculatePoints)(newlyRolledValues);
        const addEventLocal = (msg, type) => {
            game.events = [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...game.events].slice(0, 20);
        };
        if (roundPoints === 0) {
            if (diceToRollCount === 6) {
                game.showZbarci = { show: true, type: "zbarci" };
                addEventLocal(`${currentPlayer.name} rolled a ZBARCI!`, 'danger');
            }
            else {
                game.showZbarci = { show: true, type: "lost" };
                addEventLocal(`${currentPlayer.name} LOST points!`, 'danger');
            }
            game.status = "zbarci";
        }
        else {
            const scoringIndices = (0, gameEngine_1.identifyScoringDice)(newlyRolledValues);
            scoringIndices.forEach(idx => {
                newDice[idx].scoredThisThrow = true;
            });
            // Encouragements
            const phrases5to20 = ["NICE!", "GOOD!", "SWEET!", "NEAT!", "COOL!"];
            const phrases25to60 = ["GREAT!", "AWESOME!", "SUPERB!", "TASTY!", "BRILLIANT!"];
            const phrasesOver60 = ["DIVINE!", "PHENOMENAL!", "SPECTACULAR!", "LEGENDARY!", "UNBELIEVABLE!"];
            let word = "";
            if (roundPoints >= 5 && roundPoints <= 20)
                word = phrases5to20[Math.floor(Math.random() * phrases5to20.length)];
            else if (roundPoints >= 25 && roundPoints <= 60)
                word = phrases25to60[Math.floor(Math.random() * phrases25to60.length)];
            else if (roundPoints > 60)
                word = phrasesOver60[Math.floor(Math.random() * phrasesOver60.length)];
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
            }
            else if (currentPlayer.score + game.currentRoundScore + roundPoints > 1000) {
                addEventLocal(`${currentPlayer.name} overstepped the finish line!`, 'danger');
                game.showZbarci = { show: true, type: "overstep" };
                game.status = "lost";
            }
            else {
                game.status = "scoring";
            }
        }
        game.dice = [...oldDice, ...newDice];
        io.to(roomId).emit('game_state_update', game);
    });
    socket.on('bank_points', ({ roomId, projectionScore }) => {
        const game = games[roomId];
        if (!game)
            return;
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer.socketId !== socket.id)
            return;
        const addEventLocal = (msg, type) => {
            game.events = [{ id: Date.now().toString() + Math.random(), message: msg, type }, ...game.events].slice(0, 20);
        };
        const totalAdded = projectionScore - currentPlayer.score;
        game.players = (0, gameEngine_1.performOvertaking)(game.players, game.currentPlayerIndex, game.currentRoundScore, addEventLocal);
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
    socket.on('end_turn', (roomId) => {
        const game = games[roomId];
        if (!game)
            return;
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
                game.events = [{ id: Date.now().toString() + Math.random(), message: `${p.name} disconnected.`, type: 'danger' }, ...game.events].slice(0, 20);
                // Optional: For now, keeping the player there so they can rejoin, or we could remove them.
                // Let's just emit the event.
                io.to(roomId).emit('game_state_update', game);
            }
        }
    });
    socket.on('reset_game', (roomId) => {
        const game = games[roomId];
        if (!game)
            return;
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
httpServer.listen(3002, () => {
    console.log(`Zbarci Server running on http://localhost:3002`);
});
