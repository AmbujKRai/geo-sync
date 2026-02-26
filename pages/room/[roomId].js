import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import dynamic from "next/dynamic";
import HUD from "../../components/HUD";
import RoleBadge from "../../components/RoleBadge";
import { getSocket } from "../../lib/socket";

const MapView = dynamic(() => import("../../components/MapView"), {
    ssr: false,
    loading: () => (
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#060d1a", gap: 16 }}>
            <div style={{ width: 40, height: 40, border: "2px solid #1a2440", borderTop: "2px solid #00d4ff", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.2em", color: "#6a7a9a" }}>INITIALIZING MAP ENGINE</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    ),
});

export default function RoomPage() {
    const router = useRouter();


    const { isReady } = router;

    const [connectionStatus, setConnectionStatus] = useState("connecting");
    const [joinError, setJoinError] = useState(null);
    const [mapState, setMapState] = useState(null);
    const [syncTarget, setSyncTarget] = useState(null);
    const [roomPresence, setRoomPresence] = useState({ trackerConnected: false, trackedConnected: false });
    const [trackerDisconnectedAlert, setTrackerDisconnectedAlert] = useState(false);
    const [isSynced, setIsSynced] = useState(true);
    const [notification, setNotification] = useState(null);
    const [copied, setCopied] = useState(false);

    const notifTimerRef = useRef(null);

    const showNotification = useCallback((msg, type = "info") => {
        setNotification({ msg, type });
        clearTimeout(notifTimerRef.current);
        notifTimerRef.current = setTimeout(() => setNotification(null), 3500);
    }, []);


    useEffect(() => {
        if (!router.isReady) return;

        const { roomId, role: roleParam } = router.query;
        const role = roleParam === "tracked" ? "tracked" : "tracker";

        if (!roomId) return;

        const socket = getSocket();


        function onConnect() {
            setConnectionStatus("connected");
            socket.emit("join-room", { roomId, role });
        }

        function onDisconnect(reason) {
            setConnectionStatus("disconnected");
            if (reason !== "io client disconnect") {
                showNotification("Connection lost. Reconnecting...", "error");
            }
        }

        function onReconnect() {
            setConnectionStatus("connected");
            socket.emit("join-room", { roomId, role });
            showNotification("Reconnected to session", "success");
        }

        function onJoinSuccess({ roomState }) {
            setRoomPresence({
                trackerConnected: roomState.trackerConnected,
                trackedConnected: roomState.trackedConnected,
            });
            if (role === "tracked" && roomState.lastMapState) {
                setSyncTarget(roomState.lastMapState);
                setMapState(roomState.lastMapState);
            }
            showNotification(`Joined as ${role.toUpperCase()}`, "success");
        }

        function onJoinError({ message }) {
            setJoinError(message);
            setConnectionStatus("disconnected");
        }

        function onMapSync(state) {
            setSyncTarget(state);
            setMapState(state);
            setIsSynced(true);
        }

        function onRoomPresence(presence) {
            setRoomPresence(presence);
            if (presence.trackerConnected) {
                setTrackerDisconnectedAlert(false);
                setConnectionStatus("connected");
            }
        }

        function onTrackerDisconnected() {
            setTrackerDisconnectedAlert(true);
            if (role === "tracked") {
                setConnectionStatus("tracker-offline");
            }
            showNotification("Tracker disconnected — map frozen at last position", "warning");
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("reconnect", onReconnect);
        socket.on("join-success", onJoinSuccess);
        socket.on("join-error", onJoinError);
        socket.on("map-sync", onMapSync);
        socket.on("room-presence", onRoomPresence);
        socket.on("tracker-disconnected", onTrackerDisconnected);

        if (socket.connected) {
            onConnect();
        }

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("reconnect", onReconnect);
            socket.off("join-success", onJoinSuccess);
            socket.off("join-error", onJoinError);
            socket.off("map-sync", onMapSync);
            socket.off("room-presence", onRoomPresence);
            socket.off("tracker-disconnected", onTrackerDisconnected);
            clearTimeout(notifTimerRef.current);
        };
    }, [router.isReady]);

    const handleMapMove = useCallback((state) => {
        const socket = getSocket();
        setMapState(state);
        socket.emit("map-update", state);
    }, []);

    const handleReSync = useCallback(() => {
        const socket = getSocket();
        setIsSynced(false);
        socket.emit("request-sync");
        showNotification("Re-syncing to Tracker...", "info");
    }, [showNotification]);

    const handleCopyId = useCallback(() => {
        const id = router.query?.roomId || "";
        navigator.clipboard.writeText(id).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [router.query]);

    const handleLeave = useCallback(() => {
        router.push("/");
    }, [router]);

    if (!router.isReady) {
        return (
            <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-deep)" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.2em", color: "var(--text-secondary)" }}>
                    INITIALIZING SESSION...
                </div>
            </div>
        );
    }

    const roomId = router.query.roomId;
    const currentRole = router.query.role === "tracked" ? "tracked" : "tracker";
    const isTracker = currentRole === "tracker";
    const accentColor = isTracker ? "var(--tracker-color)" : "var(--tracked-color)";

    if (joinError) {
        return (
            <div style={{ width: "100vw", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-deep)", padding: "0 20px" }}>
                <div style={{ padding: "32px 40px", background: "var(--bg-panel)", border: "1px solid rgba(255,51,102,0.4)", textAlign: "center", maxWidth: 380, width: "100%" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, letterSpacing: "0.2em", color: "var(--accent-red)", marginBottom: 12 }}>⚠ JOIN ERROR</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>{joinError}</div>
                    <button onClick={() => router.push("/")} style={{ background: "transparent", border: "1px solid var(--accent-cyan)", color: "var(--accent-cyan)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.15em", padding: "10px 20px", cursor: "pointer" }}>
                        ← RETURN TO BASE
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <Head>
                <title>{roomId} — {currentRole.toUpperCase()} | GeoSync</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Head>

            <div style={styles.root}>
                <header style={{ ...styles.topBar, borderBottomColor: `${accentColor}44` }}>
                    <div style={styles.topBarLeft}>
                        <button style={styles.logoBtn} onClick={handleLeave} aria-label="Return home">
                            <span style={styles.logoText}>GEO<span style={{ color: accentColor }}>·</span>SYNC</span>
                        </button>
                        <div style={styles.topBarSep} />
                        <div style={styles.sessionInfo}>
                            <span style={styles.sessionLabel}>SESSION</span>
                            <button style={styles.sessionId} onClick={handleCopyId} title="Click to copy">
                                {roomId} <span style={{ color: accentColor }}>{copied ? "✓" : "⧉"}</span>
                            </button>
                        </div>
                    </div>

                    <div style={styles.topBarCenter}>
                        <RoleBadge
                            role={currentRole}
                            isSynced={isSynced}
                            trackerConnected={roomPresence.trackerConnected}
                        />
                    </div>

                    <div style={styles.topBarRight}>
                        {!isTracker && (
                            <button
                                style={{ ...styles.actionBtn, borderColor: accentColor, color: accentColor }}
                                onClick={handleReSync}
                                aria-label="Re-sync to tracker"
                            >
                                <span style={styles.btnIcon}>⟳</span>
                                <span style={styles.btnLabel}>RE-SYNC</span>
                            </button>
                        )}
                        <button style={styles.leaveBtn} onClick={handleLeave} aria-label="Leave session">
                            <span style={styles.btnIcon}>✕</span>
                            <span style={styles.btnLabel}>LEAVE</span>
                        </button>
                    </div>
                </header>

                <main style={styles.mapContainer}>
                    <MapView
                        role={currentRole}
                        onMapMove={isTracker ? handleMapMove : undefined}
                        syncTarget={!isTracker ? syncTarget : undefined}
                    />

                    <div style={styles.hudWrapper}>
                        <HUD
                            mapState={mapState}
                            connectionStatus={connectionStatus}
                            role={currentRole}
                            roomId={roomId}
                            roomPresence={roomPresence}
                        />
                    </div>

                    {isTracker && !mapState && connectionStatus === "connected" && (
                        <div style={styles.instructionOverlay}>
                            <div style={styles.instructionBox}>
                                <div style={{ fontSize: 28, color: "var(--accent-cyan)", marginBottom: 10 }}>◈</div>
                                <div style={styles.instructionTitle}>YOU ARE THE TRACKER</div>
                                <div style={styles.instructionText}>
                                    Pan or zoom the map. All movements broadcast to connected Tracked users in real-time.
                                </div>
                            </div>
                        </div>
                    )}

                    {trackerDisconnectedAlert && !isTracker && (
                        <div style={styles.alertBanner} role="alert">
                            <span style={{ color: "var(--accent-red)" }}>⚠</span>
                            <span style={styles.alertText}>TRACKER OFFLINE — map frozen at last position</span>
                            <button style={styles.alertDismiss} onClick={() => setTrackerDisconnectedAlert(false)} aria-label="Dismiss">✕</button>
                        </div>
                    )}

                    {!isTracker && !isSynced && (
                        <div style={styles.deSyncedBadge}>
                            ⚠ DE-SYNCED — press RE-SYNC to snap back
                        </div>
                    )}

                    {notification && (
                        <div style={{ ...styles.toast, borderColor: toastColor(notification.type), color: toastColor(notification.type) }} role="status">
                            {notification.msg}
                        </div>
                    )}

                    <div style={{ ...styles.mapBorder, borderColor: `${accentColor}22` }} aria-hidden="true" />
                </main>

                <footer style={styles.bottomBar}>
                    <div style={styles.bottomLeft}>
                        <span style={{
                            ...styles.bottomDot, background:
                                connectionStatus === "connected" ? "var(--accent-green)" :
                                    connectionStatus === "tracker-offline" ? "var(--accent-orange)" :
                                        "var(--accent-red)"
                        }} />
                        <span style={{
                            ...styles.bottomText, color:
                                connectionStatus === "connected" ? "var(--text-dim)" :
                                    connectionStatus === "tracker-offline" ? "var(--accent-orange)" :
                                        "var(--accent-red)"
                        }}>
                            {connectionStatus === "tracker-offline" ? "TRACKER OFFLINE" : connectionStatus.toUpperCase()}
                        </span>
                        <span style={styles.bottomSep}>|</span>
                        <span style={styles.bottomText}>TRK: {roomPresence.trackerConnected ? "ON" : "OFF"}</span>
                        <span style={styles.bottomSep}>|</span>
                        <span style={styles.bottomText}>OBS: {roomPresence.trackedConnected ? "ON" : "OFF"}</span>
                    </div>
                    <div style={styles.bottomRight}>
                        {mapState && (
                            <>
                                <span style={styles.bottomText}>{mapState.lat?.toFixed(4)}°, {mapState.lng?.toFixed(4)}°</span>
                                <span style={styles.bottomSep}>|</span>
                                <span style={styles.bottomText}>Z {mapState.zoom?.toFixed(1)}</span>
                            </>
                        )}
                    </div>
                </footer>
            </div>

            <style>{`
        @keyframes slideInUp {
          from { transform: translate(-50%, 10px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(10px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ── Responsive overrides ── */

        /* Tablet (≤768px): hide session label text, shrink logo */
        @media (max-width: 768px) {
          .session-label { display: none !important; }
          .logo-text { font-size: 15px !important; letter-spacing: 0.2em !important; }
          .top-bar-sep { display: none !important; }
          .btn-label { display: none !important; }
          .btn-icon { margin: 0 !important; }
        }

        /* Mobile (≤480px): stack HUD smaller, hide role badge in header */
        @media (max-width: 480px) {
          .top-bar-center { display: none !important; }
          .hud-wrapper { bottom: 8px !important; left: 8px !important; transform: scale(0.85) !important; transform-origin: bottom left !important; }
          .bottom-text { font-size: 8px !important; }
          .session-id-btn { font-size: 11px !important; }
        }
      `}</style>
        </>
    );
}

function toastColor(type) {
    return { error: "var(--accent-red)", success: "var(--accent-green)", warning: "var(--accent-yellow)", info: "var(--accent-cyan)" }[type] || "var(--accent-cyan)";
}

const styles = {
    root: {
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-deep)",
        overflow: "hidden",
    },

    topBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(8px, 2vw, 16px)",
        height: "clamp(44px, 6vh, 56px)",
        background: "rgba(5, 8, 16, 0.97)",
        borderBottom: "1px solid",
        backdropFilter: "blur(10px)",
        zIndex: 100,
        flexShrink: 0,
        gap: 8,
    },
    topBarLeft: {
        display: "flex",
        alignItems: "center",
        gap: "clamp(6px, 1.5vw, 12px)",
        flex: 1,
        minWidth: 0,
    },
    topBarCenter: {
        flexShrink: 0,
        className: "top-bar-center",
    },
    topBarRight: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "clamp(4px, 1vw, 8px)",
    },
    logoBtn: {
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px 0",
        flexShrink: 0,
    },
    logoText: {
        fontFamily: "var(--font-display)",
        fontSize: "clamp(14px, 2vw, 18px)",
        fontWeight: 700,
        letterSpacing: "0.3em",
        color: "var(--text-primary)",
        className: "logo-text",
    },
    topBarSep: {
        width: 1,
        height: 20,
        background: "var(--border-bright)",
        flexShrink: 0,
        className: "top-bar-sep",
    },
    sessionInfo: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        overflow: "hidden",
    },
    sessionLabel: {
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.15em",
        color: "var(--text-dim)",
        flexShrink: 0,
        className: "session-label",
    },
    sessionId: {
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(11px, 1.5vw, 13px)",
        letterSpacing: "0.1em",
        color: "var(--text-primary)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "2px 6px",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "clamp(80px, 15vw, 160px)",
        className: "session-id-btn",
    },
    actionBtn: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.1em",
        background: "transparent",
        border: "1px solid",
        padding: "clamp(4px, 1vh, 7px) clamp(8px, 1.5vw, 12px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0,
        whiteSpace: "nowrap",
    },
    leaveBtn: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.1em",
        background: "transparent",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        padding: "clamp(4px, 1vh, 7px) clamp(8px, 1.5vw, 12px)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 5,
        flexShrink: 0,
        whiteSpace: "nowrap",
    },
    btnIcon: { fontSize: 12, lineHeight: 1 },
    btnLabel: { className: "btn-label" },

    mapContainer: {
        position: "relative",
        flex: 1,
        overflow: "hidden",
        minHeight: 0,
    },
    mapBorder: {
        position: "absolute",
        inset: 0,
        border: "2px solid",
        pointerEvents: "none",
        zIndex: 10,
    },
    hudWrapper: {
        position: "absolute",
        bottom: "clamp(8px, 1.5vh, 16px)",
        left: "clamp(8px, 1.5vw, 16px)",
        zIndex: 20,
        animation: "slideInRight 0.4s ease both",
        className: "hud-wrapper",
    },

    instructionOverlay: {
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 15,
        pointerEvents: "none",
        animation: "fadeIn 0.5s ease both",
    },
    instructionBox: {
        padding: "clamp(16px, 3vw, 24px) clamp(20px, 4vw, 32px)",
        background: "rgba(5, 8, 16, 0.88)",
        border: "1px solid rgba(0, 212, 255, 0.3)",
        backdropFilter: "blur(12px)",
        textAlign: "center",
        maxWidth: "min(360px, 90vw)",
    },
    instructionTitle: {
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(10px, 1.5vw, 13px)",
        letterSpacing: "0.2em",
        color: "var(--accent-cyan)",
        marginBottom: 10,
    },
    instructionText: {
        fontFamily: "var(--font-display)",
        fontSize: "clamp(12px, 1.5vw, 14px)",
        color: "var(--text-secondary)",
        lineHeight: 1.6,
    },
    alertBanner: {
        position: "absolute",
        top: "clamp(8px, 2vh, 16px)",
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "clamp(8px, 1.5vh, 10px) clamp(12px, 2.5vw, 20px)",
        background: "rgba(255, 51, 102, 0.1)",
        border: "1px solid rgba(255, 51, 102, 0.4)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(9px, 1.2vw, 11px)",
        letterSpacing: "0.05em",
        zIndex: 30,
        backdropFilter: "blur(8px)",
        animation: "slideInUp 0.3s ease both",
        whiteSpace: "nowrap",
        maxWidth: "calc(100vw - 32px)",
    },
    alertText: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    alertDismiss: {
        background: "none",
        border: "none",
        color: "var(--text-secondary)",
        cursor: "pointer",
        fontSize: 12,
        padding: "0 4px",
        flexShrink: 0,
    },
    toast: {
        position: "absolute",
        top: "clamp(8px, 2vh, 16px)",
        right: "clamp(8px, 2vw, 16px)",
        padding: "10px 16px",
        background: "rgba(5, 8, 16, 0.92)",
        border: "1px solid",
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(9px, 1.2vw, 11px)",
        letterSpacing: "0.05em",
        zIndex: 30,
        backdropFilter: "blur(8px)",
        animation: "slideInRight 0.3s ease both",
        maxWidth: "clamp(200px, 40vw, 320px)",
    },
    deSyncedBadge: {
        position: "absolute",
        top: "clamp(8px, 2vh, 16px)",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 16px",
        background: "rgba(255, 107, 53, 0.15)",
        border: "1px solid rgba(255, 107, 53, 0.5)",
        color: "var(--accent-orange)",
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(8px, 1.1vw, 10px)",
        letterSpacing: "0.1em",
        zIndex: 25,
        backdropFilter: "blur(8px)",
        animation: "slideInUp 0.3s ease both",
        whiteSpace: "nowrap",
    },

    bottomBar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 clamp(8px, 2vw, 16px)",
        height: "clamp(24px, 4vh, 30px)",
        background: "rgba(5, 8, 16, 0.97)",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
        zIndex: 100,
        gap: 8,
        overflow: "hidden",
    },
    bottomLeft: { display: "flex", alignItems: "center", gap: "clamp(4px, 1vw, 10px)", overflow: "hidden" },
    bottomRight: { display: "flex", alignItems: "center", gap: "clamp(4px, 1vw, 10px)", flexShrink: 0 },
    bottomDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
    bottomText: {
        fontFamily: "var(--font-mono)",
        fontSize: "clamp(8px, 1vw, 9px)",
        color: "var(--text-dim)",
        letterSpacing: "0.08em",
        whiteSpace: "nowrap",
        className: "bottom-text",
    },
    bottomSep: { color: "var(--border-bright)", fontSize: 10, flexShrink: 0 },
};