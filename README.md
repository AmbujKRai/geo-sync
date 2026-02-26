# 🌍 GeoSync — Real-Time Map Synchronization

> A production-grade real-time geo-synchronization app where a **Tracker** controls a map and a **Tracked** viewer mirrors every pan and zoom instantly via WebSockets.

---

## How to Use

**Open two browser windows** at `http://localhost:3000` (or share the deployed URL).

**Window 1 — Tracker:**
1. Click **GEN** to generate a Session ID
2. Select **TRACKER**
3. Click **INITIATE SESSION**
4. Pan and zoom the map freely

**Window 2 — Tracked:**
1. Enter the **same Session ID** from Window 1
2. Select **TRACKED**
3. Click **INITIATE SESSION**
4. Watch the map mirror the Tracker in real-time

**Re-Sync:** If the Tracked user manually moves their map, a "DE-SYNCED" badge appears. Pressing **RE-SYNC** snaps back to the Tracker's current position.

---

## Features

- **Real-time sync** — Map movements broadcast via Socket.io in under 100ms
- **Role system** — Tracker (master) and Tracked (viewer) with distinct UIs
- **Session rooms** — Join via unique Session ID; multiple isolated rooms run concurrently
- **Floating HUD** — Live lat/lng (6 decimal precision), zoom level, connection status, and ping
- **Static single-page routing** — Seamless room joins without full page reloads

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (React 18) |
| Real-time | Socket.io 4 (WebSocket + polling fallback) |
| Map | Google Maps JavaScript API via `@react-google-maps/api` |
| Backend | Node.js + Express (custom Next.js server) |
| Styling | CSS-in-JS with CSS custom properties |

---

## Running Locally

In GeoSync, both the **Client (Next.js)** and **Server (Socket.io/Express)** run concurrently from a single combined Node process. This simplifies local development and deployment.

### Prerequisites

- **Node.js 18+**
- **npm**
- **Google Maps API Key**

### Step 1 — Install dependencies

```bash
npm install
```

### Step 2 — Set up environment variables

Copy the example env file:
```bash
cp .env.example .env.local
```

Open `.env.local` and fill in your Google Maps API key:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyB_your_actual_key_here
```

### Step 3 — Run the App (Development mode)

Since the Next.js frontend and Socket.io server are bundled together in `server.js`, you start both with one command:

```bash
npm run dev
```

The app will compile and become available at **http://localhost:3000**. The WebSocket server connects automatically on the same port.

---

## Running in Production

To test the production build locally or on a VPS:

### Step 1 — Build the Next.js App

```bash
npm run build
```

### Step 2 — Start the Production Server

```bash
npm start
```

This starts the custom `server.js` production server with both the Express backend holding the socket connections open, and Next.js serving the built static frontend assets.

---

## Deployment (Railway)

Deployed Link: https://geo-sync-production.up.railway.app/
---

## 📄 License

MIT.