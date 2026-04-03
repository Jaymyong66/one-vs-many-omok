# Requirements — One vs Many Omok

## Overview

A real-time multiplayer game where one host plays Omok (Korean 5-in-a-row / Gomoku) simultaneously against multiple challengers. Each challenger has their own isolated board; the host's moves are applied to all boards at once.

---

## Players & Roles

| Role | Description |
|---|---|
| **Host** | Creates the room. Plays black stones and moves first. |
| **Challenger** | Joins an existing room. Plays white stones on their own 1-on-1 board against the host. |

- Multiple challengers can be in one room at the same time.
- Each challenger's board is independent — challengers do not interact with each other.

---

## Game Rules

- **Board size:** 15 × 15
- **Win condition:** 5 consecutive stones in any direction — horizontal, vertical, diagonal, or anti-diagonal
- Black (host) moves first

---

## Turn Flow

1. The host places a black stone → it is applied to **every** challenger's board simultaneously.
2. Each challenger places a white stone on **their own** board independently (in parallel).
3. Once **all** challengers have responded, it becomes the host's turn again.

A challenger who has already won or lost is excluded from the pending set and does not block the host's next turn.

---

## Real-time Communication

All game state lives on the server. The client drives state changes through Socket.io events.

### Client → Server

| Event | Description |
|---|---|
| `createRoom` | Host creates a new room |
| `joinRoom` | Challenger joins an existing room |
| `leaveRoom` | Player leaves the room |
| `startGame` | Host starts the game |
| `placeStone` | Player places a stone |
| `getRooms` | Request the current room list |

### Server → Client

| Event | Description |
|---|---|
| `roomCreated` | Confirmation that a room was created |
| `roomJoined` | Confirmation that a player joined |
| `roomUpdated` | Room state changed (e.g. new player joined) |
| `roomList` | Current list of open rooms |
| `gameStarted` | Game has begun |
| `gameState` | Full game state snapshot |
| `hostMoved` | Host placed a stone |
| `challengerMoved` | A challenger placed a stone |
| `allChallengersResponded` | All challengers have responded; host may move again |
| `gameOver` | A board's game has ended (win/loss) |
| `error` | An error occurred |

---

## Platform & Environment

### Client
- React 18 + TypeScript
- Vite (dev server: `http://localhost:5173`)
- Socket.io-client
- Appintos WebView game

### Server
- Node.js + Express
- Socket.io
- TypeScript (dev server: `http://localhost:3001`)

### Environment Variables
| Variable | Default | Description |
|---|---|---|
| `VITE_SERVER_URL` | `http://localhost:3001` | Server URL for the client |
