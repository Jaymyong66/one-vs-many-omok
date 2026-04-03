# Requirements — One vs Many Omok

## Overview

A real-time multiplayer game where one host plays Omok (Korean 5-in-a-row / Gomoku) against a group of challengers on a **single shared board**. The host plays black stones individually; challengers collectively decide where to place white stones through a voting system.

---

## Players & Roles

| Role | Description |
|---|---|
| **Host** | Creates the room. Plays black stones and moves first each round. |
| **Challenger** | Joins an existing room. Votes on where to place the shared white stone each round. |

- Multiple challengers share one board — they are one team against the host.
- All challengers vote simultaneously; the majority-vote position is chosen.

---

## Game Rules

- **Board size:** 15 × 15
- **Win condition:** 5 consecutive stones in any direction — horizontal, vertical, diagonal, or anti-diagonal
- Black (host) moves first

---

## Turn Flow

1. The host places a black stone on the shared board.
2. A 30-second voting timer starts. Each challenger clicks a cell to cast their vote (can change vote during the window).
3. Live vote tallies are visible to everyone in real-time.
4. When the timer expires (or all challengers have voted), the position with the most votes is chosen:
   - **Plurality:** most-voted cell wins outright.
   - **Tie-break:** random pick among tied cells.
   - **No votes:** a random empty cell is chosen automatically.
5. The winning white stone is placed. If no winner, it is the host's turn again.

A challenger who disconnects is removed from the voter pool; the voting resolves early if all remaining challengers have voted.

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
| `placeStone` | Host places a stone **or** challenger casts a vote |
| `getRooms` | Request the current room list |

### Server → Client

| Event | Description |
|---|---|
| `roomCreated` | Confirmation that a room was created |
| `roomJoined` | Confirmation that a player joined |
| `roomUpdated` | Room state changed (e.g. new player joined) |
| `roomList` | Current list of open rooms |
| `gameStarted` | Game has begun |
| `gameState` | Full shared game state snapshot |
| `hostMoved` | Host placed a stone |
| `voteUpdate` | Live vote tally update (challenger voted or changed vote) |
| `voteResolved` | Voting resolved: winning position + method (`plurality` / `tiebreak` / `random`) |
| `gameOver` | Game ended — includes winner and final board |
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
