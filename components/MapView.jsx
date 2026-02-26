import { useEffect, useRef, useCallback } from "react";
import { GoogleMap, useJsApiLoader } from "@react-google-maps/api";

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };
const DEFAULT_ZOOM = 13;

const DARK_STYLE = [
    { elementType: "geometry", stylers: [{ color: "#0a0f1e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#050810" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#3a4a6a" }] },
    { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#1a2440" }] },
    { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#0a0f1e" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#0f1629" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#2a3a60" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0a1420" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1a2440" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f1629" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#3a4a6a" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e2e50" }] },
    { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#4a5a7a" }] },
    { featureType: "transit", elementType: "geometry", stylers: [{ color: "#0f1629" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#060d1a" }] },
    { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#1a2a4a" }] },
];

const MAP_OPTIONS = {
    styles: DARK_STYLE,
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    gestureHandling: "greedy",
    clickableIcons: false,
};

const CONTAINER_STYLE = { width: "100%", height: "100%" };

export default function MapView({ role, onMapMove, syncTarget }) {
    const mapRef = useRef(null);
    const lastEmit = useRef(0);
    const isSyncing = useRef(false);

    // ─── FIX 1: Stale frame prevention ───────────────────────────────────────
    // pendingSync always holds the LATEST incoming state.
    // rafId ensures we only apply it once per animation frame — skipping
    // any intermediate states that arrived while the frame was pending.
    const pendingSync = useRef(null);
    const rafId = useRef(null);

    const { isLoaded, loadError } = useJsApiLoader({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        id: "geo-sync-google-map",
    });

    const onLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
        // Cancel any pending animation frame on unmount
        if (rafId.current) cancelAnimationFrame(rafId.current);
    }, []);

    // ─── Tracker: emit on center/zoom change (50ms throttle) ─────────────────
    const emitState = useCallback(() => {
        if (!mapRef.current || role !== "tracker" || isSyncing.current) return;
        const now = Date.now();
        if (now - lastEmit.current < 50) return;
        lastEmit.current = now;
        const center = mapRef.current.getCenter();
        const zoom = mapRef.current.getZoom();
        if (!center) return;
        onMapMove?.({ lat: center.lat(), lng: center.lng(), zoom });
    }, [role, onMapMove]);

    // ─── FIX 2: Atomic pan+zoom in a single rAF ───────────────────────────────
    // Instead of calling panTo() then setZoom() separately (which causes a
    // visible two-step jump), we batch them inside one requestAnimationFrame.
    // We also only ever apply the LATEST pending state — if 5 updates arrive
    // before the next frame, we skip 4 of them and only render the freshest one.
    useEffect(() => {
        if (!syncTarget || role !== "tracked") return;

        // Overwrite pendingSync with the latest state — older ones are discarded
        pendingSync.current = syncTarget;

        // Cancel any already-scheduled frame (it would apply a stale state)
        if (rafId.current) cancelAnimationFrame(rafId.current);

        // Schedule exactly one frame to apply the latest state
        rafId.current = requestAnimationFrame(() => {
            const map = mapRef.current;
            const state = pendingSync.current;
            if (!map || !state) return;

            isSyncing.current = true;

            // ── The key fix: move center AND zoom atomically ──
            // moveCamera() is the only Google Maps API call that updates
            // center + zoom + tilt + heading in a single render pass —
            // no two-step jump, no intermediate frames.
            if (map.moveCamera) {
                map.moveCamera({
                    center: { lat: state.lat, lng: state.lng },
                    zoom: state.zoom,
                });
            } else {
                // Fallback for older API versions that don't have moveCamera
                map.setCenter({ lat: state.lat, lng: state.lng });
                map.setZoom(state.zoom);
            }

            // Release the syncing lock after the map settles
            setTimeout(() => {
                isSyncing.current = false;
            }, 100);

            rafId.current = null;
            pendingSync.current = null;
        });

        return () => {
            if (rafId.current) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
        };
    }, [syncTarget, role]);

    if (loadError) {
        return (
            <div style={errorStyle}>
                <div style={{ fontSize: 32, color: "#ff3366" }}>⚠</div>
                <div style={{ fontSize: 13, letterSpacing: "0.2em", color: "#ff3366", fontFamily: "var(--font-mono)" }}>
                    MAPS API ERROR
                </div>
                <div style={{ fontSize: 12, color: "#6a7a9a", lineHeight: 1.7, maxWidth: 480, fontFamily: "var(--font-mono)", textAlign: "center" }}>
                    {loadError.message?.includes("ApiNotActivatedMapError")
                        ? "Maps JavaScript API not enabled. Go to Google Cloud Console → APIs & Services → Enable 'Maps JavaScript API'."
                        : loadError.message?.includes("InvalidKeyMapError") || loadError.message?.includes("MissingKeyMapError")
                            ? "Invalid or missing API key. Check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your .env.local file."
                            : `API Error: ${loadError.message}`}
                </div>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div style={loadingStyle}>
                <div style={spinnerStyle} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.2em", color: "#6a7a9a" }}>
                    LOADING MAPS ENGINE
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={CONTAINER_STYLE}
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            options={MAP_OPTIONS}
            onLoad={onLoad}
            onUnmount={onUnmount}
            onCenterChanged={role === "tracker" ? emitState : undefined}
            onZoomChanged={role === "tracker" ? emitState : undefined}
        />
    );
}

const loadingStyle = {
    width: "100%", height: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#060d1a", gap: 16,
};
const spinnerStyle = {
    width: 40, height: 40, border: "2px solid #1a2440",
    borderTop: "2px solid #00d4ff", borderRadius: "50%",
    animation: "spin 1s linear infinite",
};
const errorStyle = {
    width: "100%", height: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#060d1a",
    gap: 12, padding: "0 40px",
};