import { useState, useEffect } from "react";

export default function RoleBadge({ role, isSynced, trackerConnected }) {
    const [tick, setTick] = useState(0);

    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    if (role === "tracker") {
        return (
            <div style={styles.badge}>
                <div style={styles.trackerPulseWrap}>
                    <div style={styles.trackerPulse} />
                    <div style={styles.trackerPulse2} />
                    <div style={styles.trackerDot} />
                </div>
                <div>
                    <div style={styles.roleTitle}>◈ TRACKER</div>
                    <div style={styles.roleSub}>BROADCASTING</div>
                </div>
                <style jsx>{`
          @keyframes expand1 {
            0% { transform: scale(1); opacity: 0.7; }
            100% { transform: scale(2.2); opacity: 0; }
          }
          @keyframes expand2 {
            0% { transform: scale(1); opacity: 0.5; }
            100% { transform: scale(3); opacity: 0; }
          }
        `}</style>
            </div>
        );
    }

    // Tracked role
    const statusText = !trackerConnected
        ? "TRACKER OFFLINE"
        : isSynced
            ? "IN SYNC"
            : "SYNCING...";

    const statusColor = !trackerConnected
        ? "var(--accent-red)"
        : isSynced
            ? "var(--accent-green)"
            : "var(--accent-yellow)";

    return (
        <div style={{ ...styles.badge, borderColor: "rgba(0,255,136,0.4)" }}>
            <div
                style={{
                    ...styles.syncIcon,
                    color: statusColor,
                    animation: !isSynced && trackerConnected ? "spin 1s linear infinite" : "none",
                }}
            >
                ⟳
            </div>
            <div>
                <div style={{ ...styles.roleTitle, color: "var(--accent-green)" }}>◉ TRACKED</div>
                <div style={{ ...styles.roleSub, color: statusColor }}>{statusText}</div>
            </div>
            <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

const styles = {
    badge: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        background: "rgba(5, 8, 16, 0.88)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(0,212,255,0.4)",
        fontFamily: "var(--font-mono)",
    },
    trackerPulseWrap: {
        position: "relative",
        width: 24,
        height: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    trackerDot: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--accent-cyan)",
        boxShadow: "0 0 8px var(--accent-cyan)",
        zIndex: 2,
    },
    trackerPulse: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: "50%",
        border: "1px solid var(--accent-cyan)",
        animation: "expand1 1.5s ease-out infinite",
    },
    trackerPulse2: {
        position: "absolute",
        width: 8,
        height: 8,
        borderRadius: "50%",
        border: "1px solid var(--accent-cyan)",
        animation: "expand2 1.5s ease-out 0.5s infinite",
    },
    syncIcon: {
        fontSize: 22,
        lineHeight: 1,
        display: "inline-block",
        color: "var(--accent-green)",
    },
    roleTitle: {
        fontSize: 11,
        letterSpacing: "0.1em",
        color: "var(--accent-cyan)",
        fontWeight: 700,
    },
    roleSub: {
        fontSize: 9,
        letterSpacing: "0.15em",
        color: "var(--accent-cyan)",
        marginTop: 2,
        opacity: 0.8,
    },
};