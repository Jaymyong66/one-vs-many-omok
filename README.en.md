**Language:** [한국어](README.md) | English

# One vs Many Omok

A real-time multiplayer game where one host plays Omok (5-in-a-row / Gomoku) simultaneously against multiple challengers.

## How to Play

- **Host**: Creates the room and plays with black stones (moves first)
- **Challengers**: Join the room and each play white stones against the host in a 1-on-1 board
- **Board**: 15×15 grid
- **Win condition**: 5 consecutive stones horizontally, vertically, or diagonally

### Turn Flow

1. The host places a stone — it is applied to every challenger's board simultaneously
2. Each challenger responds on their own board independently
3. Once all challengers have responded, it becomes the host's turn again

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

## Project Structure

```
one-vs-many-omok/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Board.tsx        # Omok board UI
│   │   │   ├── Stone.tsx        # Stone component
│   │   │   ├── GameRoom.tsx     # Game room UI
│   │   │   ├── Lobby.tsx        # Lobby / room list
│   │   │   └── PlayerList.tsx   # Participant list
│   │   ├── hooks/
│   │   │   └── useSocket.ts     # WebSocket connection hook
│   │   ├── utils/
│   │   │   └── gameLogic.ts     # Win detection logic
│   │   └── types/
│   │       └── game.ts          # Type definitions
│   ├── granite.config.ts        # Appintos configuration
│   └── vite.config.ts
│
└── server/
    └── src/
        ├── index.ts             # Server entry point
        ├── GameRoom.ts          # Game room class
        ├── GameManager.ts       # Room manager
        └── types.ts             # Server types
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
