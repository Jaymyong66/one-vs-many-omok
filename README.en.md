**Language:** [한국어](README.md) | English

# One vs Many Omok

A real-time multiplayer game where one host plays Omok (5-in-a-row / Gomoku) against a team of challengers on a **single shared board**. Challengers collectively decide each move through voting.

## How to Play

- **Host**: Creates the room and selects a stone color (black, white, or random) before the game starts
- **Challengers**: Join the room and vote together as a team on each move
- **Board**: 15×15 grid (single shared board)
- **Win condition**: 5 consecutive stones horizontally, vertically, or diagonally

### Turn Flow

1. Black moves first — if the host plays black, the host moves; if the host plays white, challengers vote first
2. A 30-second voting timer starts — each challenger clicks a cell to cast or change their vote
3. Live vote tallies are visible to everyone in real-time
4. When the timer expires (or all challengers have voted), the majority-vote position is chosen; ties are broken randomly; no votes → a random empty cell is chosen
5. If no winner, it becomes the other side's turn

## Tech Stack

### Client
- React 18 + TypeScript
- Vite
- Socket.io-client
- Appintos WebView game

### Server
- Node.js + Express
- Socket.io
- TypeScript

## Running the App

### Start the Server

```bash
cd server
npm install
npm run dev
```

The server runs at `http://localhost:3001`.

### Start the Client

```bash
cd client
npm install
npm run dev
```

The client runs at `http://localhost:5173`.

## Testing

### Server Tests

```bash
cd server
npm test
```

### Client Tests

```bash
cd client
npm run test:run
```

## Build

### Client Build

```bash
cd client
npm run build
```

### Server Build

```bash
cd server
npm run build
npm start
```
