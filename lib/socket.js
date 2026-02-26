import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
    if (!socket) {
        const url = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
        socket = io(url, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
    }
    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}