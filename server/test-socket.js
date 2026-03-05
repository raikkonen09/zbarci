const { io } = require("socket.io-client");
const socket = io("http://localhost:3002", {
    reconnectionDelayMax: 10000,
});

socket.on("connect_error", (err) => {
    console.log(`connect_error due to ${err.message}`);
});

socket.io.on("error", (error) => {
    console.log("engine error", error);
});

socket.io.on("ping", () => {
    console.log("ping");
});

socket.on("connect", () => {
    console.log("Connected, sending join_room...");
    socket.emit("join_room", { roomId: "public", playerName: "TerminalTest" });
});

socket.on("game_state_update", (state) => {
    console.log("Received state:", JSON.stringify(state, null, 2));
    process.exit(0);
});

setTimeout(() => {
    console.log("Timeout waiting for state");
    process.exit(1);
}, 6000);
