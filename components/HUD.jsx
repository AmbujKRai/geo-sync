import { useEffect, useState } from "react";

export default function HUD({ mapState, connectionStatus, role, roomId, roomPresence }) {
    const [pingMs, setPingMs] = useState(null);

    useEffect(() => {
        if (mapState?.timestamp) {
            setPingMs(Date.now() - mapState.timestamp);
        }
    }, [mapState]);

    const statusColor = {
        connected: "var(--accent-green)",
        connecting: "var(--accent-yellow)",
        disconnected: "var(--accent-red)",
        "tracker-offline": "var(--accent-orange)",
    }[connectionStatus] || "var(--text-dim)";

    const statusLabel = {
        connected: "CONNECTED",
        connecting: "CONNECTING...",
        disconnected: "DISCONNECTED",
        "tracker-offline": "TRACKER OFFLINE",
    }[connectionStatus] || "UNKNOWN";

    return (
        <>
            <div style={s.hud}>
                {/* Corner accents */}
                <div style={{ ...s.corner, top: 0, left: 0, borderTop: "1px solid var(--accent-cyan)", borderLeft: "1px solid var(--accent-cyan)" }} />
                <div style={{ ...s.corner, top: 0, right: 0, borderTop: "1px solid var(--accent-cyan)", borderRight: "1px solid var(--accent-cyan)" }} />
                <div style={{ ...s.corner, bottom: 0, left: 0, borderBottom: "1px solid var(--accent-cyan)", borderLeft: "1px solid var(--accent-cyan)" }} />
                <div style={{ ...s.corner, bottom: 0, right: 0, borderBottom: "1px solid var(--accent-cyan)", borderRight: "1px solid var(--accent-cyan)" }} />

                {/* Header row */}
                <div style={s.header}>
                    <span style={s.hudTitle}>SYS·HUD</span>
                    <span style={{ ...s.statusBadge, color: statusColor, borderColor: statusColor }}>
                        <span style={{ ...s.statusDot, background: statusColor, boxShadow: `0 0 5px ${statusColor}` }} />
                        <span style={s.statusText}>{statusLabel}</span>
                    </span>
                </div>

                <div style={s.sep} />

                {/* Coordinates */}
                <Row label="LAT" value={mapState?.lat != null ? mapState.lat.toFixed(6) : "─────────"} />
                <Row label="LNG" value={mapState?.lng != null ? mapState.lng.toFixed(6) : "─────────"} />
                <Row label="ZOOM" value={mapState?.zoom != null ? mapState.zoom.toFixed(1) : "──"} valueColor="var(--accent-yellow)" />

                <div style={s.sep} />

                {/* Room presence */}
                <Row label="ROOM" value={roomId || "───"} valueSize={10} />
                <Row
                    label="TRK"
                    value={roomPresence?.trackerConnected ? "ONLINE" : "OFFLINE"}
                    valueColor={roomPresence?.trackerConnected ? "var(--accent-cyan)" : "var(--text-dim)"}
                    valueSize={10}
                />
                <Row
                    label="OBS"
                    value={roomPresence?.trackedConnected ? "ONLINE" : "OFFLINE"}
                    valueColor={roomPresence?.trackedConnected ? "var(--accent-green)" : "var(--text-dim)"}
                    valueSize={10}
                />

                {/* Ping — only shown on tracked side */}
                {role === "tracked" && (
                    <>
                        <div style={s.sep} />
                        <Row
                            label="PING"
                            value={pingMs != null ? `${pingMs}ms` : "───"}
                            valueColor={
                                pingMs == null ? "var(--text-dim)" :
                                    pingMs < 50 ? "var(--accent-green)" :
                                        pingMs < 100 ? "var(--accent-yellow)" : "var(--accent-red)"
                            }
                        />
                    </>
                )}
            </div>

            <style>{`
        @keyframes hudPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
        </>
    );
}

function Row({ label, value, valueColor = "var(--accent-cyan)", valueSize = 11 }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.15em", color: "var(--text-secondary)" }}>
                {label}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: valueSize, color: valueColor, textAlign: "right" }}>
                {value}
            </span>
        </div>
    );
}

const s = {
    hud: {
        position: "relative",
        padding: "10px 14px",
        background: "rgba(5, 8, 16, 0.92)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
        width: "clamp(160px, 22vw, 210px)",
        fontFamily: "var(--font-mono)",
    },
    corner: { position: "absolute", width: 10, height: 10 },
    header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    hudTitle: { fontSize: 9, letterSpacing: "0.2em", color: "var(--accent-cyan)", fontWeight: 700 },
    statusBadge: { display: "flex", alignItems: "center", gap: 4, fontSize: 8, letterSpacing: "0.08em", border: "1px solid", padding: "2px 5px", borderRadius: 2 },
    statusDot: { width: 5, height: 5, borderRadius: "50%", flexShrink: 0 },
    statusText: { whiteSpace: "nowrap" },
    sep: { height: 1, background: "var(--border)", margin: "6px 0" },
};