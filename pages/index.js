import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { v4 as uuidv4 } from "uuid";

export default function Home() {
    const router = useRouter();
    const [roomId, setRoomId] = useState("");
    const [role, setRole] = useState("tracker");
    const [error, setError] = useState("");
    const [isJoining, setIsJoining] = useState(false);
    const [time, setTime] = useState("");
    const canvasRef = useRef(null);

    // Live clock
    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setTime(now.toUTCString().slice(17, 25) + " UTC");
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // Animated grid canvas background
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        let animId;
        let frame = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        const draw = () => {
            frame++;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Grid
            ctx.strokeStyle = "rgba(26, 36, 64, 0.8)";
            ctx.lineWidth = 1;
            const gridSize = 60;
            for (let x = 0; x < canvas.width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let y = 0; y < canvas.height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Moving scan line
            const scanY = (frame * 1.5) % (canvas.height + 100);
            const grad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 10);
            grad.addColorStop(0, "transparent");
            grad.addColorStop(1, "rgba(0, 212, 255, 0.04)");
            ctx.fillStyle = grad;
            ctx.fillRect(0, scanY - 60, canvas.width, 70);

            // Dots at intersections (random flicker)
            if (frame % 3 === 0) {
                for (let x = 0; x < canvas.width; x += gridSize) {
                    for (let y = 0; y < canvas.height; y += gridSize) {
                        if (Math.random() > 0.995) {
                            ctx.fillStyle = "rgba(0, 212, 255, 0.6)";
                            ctx.beginPath();
                            ctx.arc(x, y, 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    }
                }
            }

            animId = requestAnimationFrame(draw);
        };

        draw();
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", resize);
        };
    }, []);

    const generateRoomId = () => {
        const id = uuidv4().slice(0, 8).toUpperCase();
        setRoomId(id);
        setError("");
    };

    const handleJoin = () => {
        const trimmed = roomId.trim().toUpperCase();
        if (!trimmed) {
            setError("SESSION ID required to establish connection.");
            return;
        }
        if (trimmed.length < 4) {
            setError("SESSION ID must be at least 4 characters.");
            return;
        }
        setIsJoining(true);
        router.push(`/room/${trimmed}?role=${role}`);
    };

    return (
        <>
            <Head>
                <title>GeoSync — Real-Time Map Synchronization</title>
                <meta name="description" content="Real-time geo-synchronization between Tracker and Tracked users" />
            </Head>

            <div style={styles.root}>
                <canvas ref={canvasRef} style={styles.canvas} />

                {/* Header bar */}
                <div style={styles.topBar}>
                    <div style={styles.topBarLeft}>
                        <div style={styles.statusDot} />
                        <span style={styles.topBarText}>SYSTEM ONLINE</span>
                    </div>
                    <div style={styles.topBarCenter}>
                        <span style={styles.logoText}>GEO<span style={styles.logoDot}>·</span>SYNC</span>
                    </div>
                    <div style={styles.topBarRight}>
                        <span style={styles.topBarText}>{time}</span>
                    </div>
                </div>

                {/* Main content */}
                <div style={styles.main}>
                    {/* Left decorative panel */}
                    <div style={styles.sidePanel}>
                        <div style={styles.sidePanelLabel}>SYSTEM</div>
                        {["SOCKET_IO", "LEAFLET_MAP", "REAL_TIME_SYNC", "DEBOUNCED_EMIT"].map((item, i) => (
                            <div key={i} style={{ ...styles.sideItem, animationDelay: `${i * 0.1}s` }}>
                                <div style={styles.sideItemDot} />
                                <span>{item}</span>
                            </div>
                        ))}
                        <div style={styles.sideSeparator} />
                        <div style={styles.sidePanelLabel}>PROTOCOL</div>
                        <div style={styles.sideItem}><div style={{ ...styles.sideItemDot, background: "#00ff88" }} /><span>WebSocket</span></div>
                        <div style={styles.sideItem}><div style={{ ...styles.sideItemDot, background: "#ffd700" }} /><span>Polling (Fallback)</span></div>
                    </div>

                    {/* Center form */}
                    <div style={styles.card}>
                        {/* Corner decorations */}
                        <div style={{ ...styles.corner, top: 0, left: 0, borderTop: "2px solid var(--accent-cyan)", borderLeft: "2px solid var(--accent-cyan)" }} />
                        <div style={{ ...styles.corner, top: 0, right: 0, borderTop: "2px solid var(--accent-cyan)", borderRight: "2px solid var(--accent-cyan)" }} />
                        <div style={{ ...styles.corner, bottom: 0, left: 0, borderBottom: "2px solid var(--accent-cyan)", borderLeft: "2px solid var(--accent-cyan)" }} />
                        <div style={{ ...styles.corner, bottom: 0, right: 0, borderBottom: "2px solid var(--accent-cyan)", borderRight: "2px solid var(--accent-cyan)" }} />

                        <div style={styles.cardHeader}>
                            <div style={styles.cardHeaderLine} />
                            <span style={styles.cardTitle}>ESTABLISH CONNECTION</span>
                            <div style={styles.cardHeaderLine} />
                        </div>

                        <p style={styles.cardSubtitle}>
                            Enter a SESSION ID to join an existing room, or generate a new one to start a sync session.
                        </p>

                        {/* Session ID Input */}
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>SESSION ID</label>
                            <div style={styles.inputRow}>
                                <input
                                    style={styles.input}
                                    value={roomId}
                                    onChange={(e) => { setRoomId(e.target.value.toUpperCase()); setError(""); }}
                                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                                    placeholder="e.g. A3F9C12B"
                                    maxLength={20}
                                    spellCheck={false}
                                />
                                <button style={styles.genBtn} onClick={generateRoomId} title="Generate random ID">
                                    GEN
                                </button>
                            </div>
                        </div>

                        {/* Role Selection */}
                        <div style={styles.fieldGroup}>
                            <label style={styles.label}>ROLE</label>
                            <div style={styles.roleRow}>
                                <button
                                    style={{ ...styles.roleBtn, ...(role === "tracker" ? styles.roleBtnActiveTracker : {}) }}
                                    onClick={() => setRole("tracker")}
                                >
                                    <div style={styles.roleBtnIcon}>◈</div>
                                    <div>
                                        <div style={styles.roleBtnTitle}>TRACKER</div>
                                        <div style={styles.roleBtnSub}>Controls map · Broadcasts</div>
                                    </div>
                                    {role === "tracker" && <div style={styles.roleCheck}>✓</div>}
                                </button>
                                <button
                                    style={{ ...styles.roleBtn, ...(role === "tracked" ? styles.roleBtnActiveTracked : {}) }}
                                    onClick={() => setRole("tracked")}
                                >
                                    <div style={{ ...styles.roleBtnIcon, color: "var(--accent-green)" }}>◉</div>
                                    <div>
                                        <div style={styles.roleBtnTitle}>TRACKED</div>
                                        <div style={styles.roleBtnSub}>Observes map · Syncs</div>
                                    </div>
                                    {role === "tracked" && <div style={{ ...styles.roleCheck, color: "var(--accent-green)" }}>✓</div>}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={styles.errorMsg}>
                                <span style={{ color: "var(--accent-red)" }}>⚠</span> {error}
                            </div>
                        )}

                        <button
                            style={{ ...styles.joinBtn, opacity: isJoining ? 0.7 : 1 }}
                            onClick={handleJoin}
                            disabled={isJoining}
                        >
                            {isJoining ? (
                                <span>CONNECTING<span style={styles.dots}>...</span></span>
                            ) : (
                                <>INITIATE SESSION <span style={{ marginLeft: 8 }}>→</span></>
                            )}
                        </button>

                        <div style={styles.hint}>
                            Share the SESSION ID with another user so they can join as the other role.
                        </div>
                    </div>

                    {/* Right decorative panel */}
                    <div style={styles.sidePanel}>
                        <div style={styles.sidePanelLabel}>ROLES</div>
                        <div style={styles.roleInfoBlock}>
                            <div style={{ color: "var(--tracker-color)", fontSize: 11, marginBottom: 4 }}>◈ TRACKER</div>
                            <p style={{ color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.5 }}>
                                Panning, zooming, and tilting the map broadcasts these movements to all Tracked users in real-time via WebSocket.
                            </p>
                        </div>
                        <div style={{ ...styles.roleInfoBlock, borderColor: "rgba(0,255,136,0.3)" }}>
                            <div style={{ color: "var(--tracked-color)", fontSize: 11, marginBottom: 4 }}>◉ TRACKED</div>
                            <p style={{ color: "var(--text-secondary)", fontSize: 11, lineHeight: 1.5 }}>
                                Map stays synchronized to the Tracker's view. Use Re-Sync button if view drifts. Manual moves don't override Tracker.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bottom bar */}
                <div style={styles.bottomBar}>
                    <span style={styles.bottomText}>LATENCY TARGET: &lt;100ms</span>
                    <span style={styles.bottomSep}>|</span>
                    <span style={styles.bottomText}>DEBOUNCED EMIT: 50ms</span>
                    <span style={styles.bottomSep}>|</span>
                    <span style={styles.bottomText}>TRANSPORT: WebSocket</span>
                </div>
            </div>

            <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.8); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotsBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Responsive: hide side panels on tablet */
        @media (max-width: 900px) {
          .side-panel { display: none !important; }
          .main-layout { justify-content: center !important; }
        }

        /* Responsive: full-width card on mobile */
        @media (max-width: 520px) {
          .join-card {
            width: calc(100vw - 24px) !important;
            padding: 24px 18px !important;
            max-width: 100% !important;
          }
        }
      `}</style>
        </>
    );
}

const styles = {
    root: {
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: "var(--bg-deep)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
    },
    canvas: {
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
    },
    topBar: {
        position: "relative",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 44,
        borderBottom: "1px solid var(--border)",
        background: "rgba(10, 15, 30, 0.9)",
        backdropFilter: "blur(10px)",
    },
    topBarLeft: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
    topBarCenter: { flex: 1, textAlign: "center" },
    topBarRight: { flex: 1, textAlign: "right" },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: "var(--accent-green)",
        boxShadow: "0 0 8px var(--accent-green)",
        animation: "pulse 2s infinite",
    },
    topBarText: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--text-secondary)",
        letterSpacing: "0.1em",
    },
    logoText: {
        fontFamily: "var(--font-display)",
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: "0.3em",
        color: "var(--text-primary)",
    },
    logoDot: {
        color: "var(--accent-cyan)",
    },
    main: {
        position: "relative",
        zIndex: 10,
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(12px, 3vw, 32px)",
        padding: "clamp(8px, 2vw, 24px)",
        overflowY: "auto",
    },
    sidePanel: {
        width: 180,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        animation: "fadeUp 0.6s ease both",
    },
    sidePanelLabel: {
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        letterSpacing: "0.2em",
        color: "var(--text-dim)",
        marginBottom: 4,
        marginTop: 8,
    },
    sideItem: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--text-secondary)",
        animation: "fadeUp 0.5s ease both",
    },
    sideItemDot: {
        width: 6,
        height: 6,
        borderRadius: "50%",
        background: "var(--accent-cyan)",
        boxShadow: "0 0 6px var(--accent-cyan)",
        flexShrink: 0,
    },
    sideSeparator: {
        height: 1,
        background: "var(--border)",
        margin: "8px 0",
    },
    roleInfoBlock: {
        padding: 10,
        border: "1px solid rgba(0,212,255,0.2)",
        borderRadius: 4,
        marginBottom: 8,
    },
    card: {
        position: "relative",
        width: "min(440px, calc(100vw - 24px))",
        padding: "clamp(20px, 4vw, 32px) clamp(18px, 4vw, 36px)",
        background: "rgba(10, 15, 30, 0.92)",
        border: "1px solid var(--border)",
        backdropFilter: "blur(20px)",
        animation: "fadeUp 0.5s ease both",
    },
    corner: {
        position: "absolute",
        width: 16,
        height: 16,
    },
    cardHeader: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 16,
    },
    cardHeaderLine: {
        flex: 1,
        height: 1,
        background: "linear-gradient(90deg, transparent, var(--border-bright))",
    },
    cardTitle: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.2em",
        color: "var(--accent-cyan)",
        whiteSpace: "nowrap",
    },
    cardSubtitle: {
        fontSize: 13,
        color: "var(--text-secondary)",
        lineHeight: 1.6,
        marginBottom: 24,
        fontWeight: 300,
    },
    fieldGroup: {
        marginBottom: 20,
    },
    label: {
        display: "block",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.15em",
        color: "var(--text-secondary)",
        marginBottom: 8,
    },
    inputRow: {
        display: "flex",
        gap: 8,
    },
    input: {
        flex: 1,
        background: "rgba(0,0,0,0.4)",
        border: "1px solid var(--border-bright)",
        color: "var(--accent-cyan)",
        fontFamily: "var(--font-mono)",
        fontSize: 16,
        letterSpacing: "0.15em",
        padding: "10px 14px",
        outline: "none",
        transition: "all 0.2s",
    },
    genBtn: {
        background: "transparent",
        border: "1px solid var(--border-bright)",
        color: "var(--text-secondary)",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.1em",
        padding: "0 14px",
        cursor: "pointer",
        transition: "all 0.2s",
    },
    roleRow: {
        display: "flex",
        gap: 10,
    },
    roleBtn: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        background: "rgba(0,0,0,0.3)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "left",
        position: "relative",
    },
    roleBtnActiveTracker: {
        border: "1px solid var(--accent-cyan)",
        background: "rgba(0, 212, 255, 0.05)",
        boxShadow: "inset 0 0 20px rgba(0, 212, 255, 0.05)",
        color: "var(--text-primary)",
    },
    roleBtnActiveTracked: {
        border: "1px solid var(--accent-green)",
        background: "rgba(0, 255, 136, 0.05)",
        boxShadow: "inset 0 0 20px rgba(0, 255, 136, 0.05)",
        color: "var(--text-primary)",
    },
    roleBtnIcon: {
        fontSize: 22,
        color: "var(--accent-cyan)",
        lineHeight: 1,
    },
    roleBtnTitle: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.1em",
        fontWeight: 700,
    },
    roleBtnSub: {
        fontSize: 10,
        color: "var(--text-dim)",
        marginTop: 2,
        fontFamily: "var(--font-mono)",
    },
    roleCheck: {
        position: "absolute",
        top: 8,
        right: 10,
        color: "var(--accent-cyan)",
        fontSize: 12,
        fontFamily: "var(--font-mono)",
    },
    errorMsg: {
        padding: "8px 12px",
        background: "rgba(255, 51, 102, 0.1)",
        border: "1px solid rgba(255, 51, 102, 0.3)",
        color: "var(--text-secondary)",
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        marginBottom: 16,
    },
    joinBtn: {
        width: "100%",
        padding: "14px",
        background: "linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 212, 255, 0.05))",
        border: "1px solid var(--accent-cyan)",
        color: "var(--accent-cyan)",
        fontFamily: "var(--font-display)",
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: "0.2em",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: "0 0 20px rgba(0, 212, 255, 0.1)",
        marginBottom: 16,
    },
    hint: {
        textAlign: "center",
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--text-dim)",
        lineHeight: 1.6,
    },
    dots: {
        animation: "dotsBlink 1s infinite",
    },
    bottomBar: {
        position: "relative",
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        height: 32,
        borderTop: "1px solid var(--border)",
        background: "rgba(10, 15, 30, 0.9)",
    },
    bottomText: {
        fontFamily: "var(--font-mono)",
        fontSize: 9,
        color: "var(--text-dim)",
        letterSpacing: "0.1em",
    },
    bottomSep: {
        color: "var(--border-bright)",
        fontSize: 10,
    },
};