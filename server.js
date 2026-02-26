const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const rooms = new Map();

function getRoomInfo(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, { tracker: null, tracked: null, lastState: null });
    }
    return rooms.get(roomId);
}

app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    const io = new Server(httpServer, {
        cors: { origin: "*", methods: ["GET", "POST"] },
        transports: ["websocket", "polling"],
    });

    io.on("connection", (socket) => {
        console.log(`[Socket] Connected: ${socket.id}`);

        socket.on("join-room", ({ roomId, role }) => {
            const room = getRoomInfo(roomId);

            if (role === "tracker" && room.tracker && room.tracker !== socket.id) {
                socket.emit("join-error", { message: "Tracker role already taken in this room." });
                return;
            }
            if (role === "tracked" && room.tracked && room.tracked !== socket.id) {
                socket.emit("join-error", { message: "Tracked role already taken in this room." });
                return;
            }

            socket.rooms.forEach((r) => { if (r !== socket.id) socket.leave(r); });
            socket.join(roomId);
            socket.data.roomId = roomId;
            socket.data.role = role;

            if (role === "tracker") room.tracker = socket.id;
            else room.tracked = socket.id;

            console.log(`[Room ${roomId}] ${role} joined (${socket.id})`);

            socket.emit("join-success", {
                role, roomId,
                roomState: {
                    trackerConnected: !!room.tracker,
                    trackedConnected: !!room.tracked,
                    lastMapState: room.lastState,
                },
            });

            io.to(roomId).emit("room-presence", {
                trackerConnected: !!room.tracker,
                trackedConnected: !!room.tracked,
            });

            if (role === "tracked" && room.lastState) {
                socket.emit("map-sync", room.lastState);
            }
        });

        socket.on("map-update", (state) => {
            const { roomId, role } = socket.data;
            if (!roomId || role !== "tracker") return;
            const room = getRoomInfo(roomId);
            room.lastState = { ...state, timestamp: Date.now() };
            socket.to(roomId).emit("map-sync", room.lastState);
        });

        socket.on("request-sync", () => {
            const { roomId } = socket.data;
            if (!roomId) return;
            const room = getRoomInfo(roomId);
            if (room.lastState) socket.emit("map-sync", room.lastState);
        });

        socket.on("disconnect", () => {
            const { roomId, role } = socket.data;
            if (!roomId) return;
            const room = getRoomInfo(roomId);
            if (role === "tracker") {
                room.tracker = null;
                io.to(roomId).emit("tracker-disconnected");
            } else if (role === "tracked") {
                room.tracked = null;
            }
            io.to(roomId).emit("room-presence", {
                trackerConnected: !!room.tracker,
                trackedConnected: !!room.tracked,
            });
            setTimeout(() => {
                const r = rooms.get(roomId);
                if (r && !r.tracker && !r.tracked) rooms.delete(roomId);
            }, 30000);
        });
    });

    httpServer.listen(port, () => {
        console.log(`\n🌍 GeoSync Server ready on http://${hostname}:${port}\n`);
    });
});