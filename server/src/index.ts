import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './GameManager';
import { Player, ClientToServerEvents, ServerToClientEvents, Position } from './types';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const gameManager = new GameManager();

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // ── Session registration (must be first event sent by client) ─────────────

  socket.on('register', (sessionId: string) => {
    const { isNew, session } = gameManager.registerSession(sessionId, socket.id);

    // Join a personal socket.io room keyed by sessionId for targeted emits
    socket.join(session.sessionId);

    if (!isNew && session.roomId) {
      const room = gameManager.getRoom(session.roomId);
      if (room && room.status !== 'finished') {
        socket.join(room.id);

        const playerInfo: Player = {
          id: session.sessionId,
          name: session.playerName,
          isHost: session.isHost,
        };

        const gameStates = session.isHost
          ? room.getAllGameStates()
          : (room.getGameState(session.sessionId) ? [room.getGameState(session.sessionId)!] : []);

        socket.emit('reconnected', room.toRoomInfo(), playerInfo, gameStates, room.challengers);
        socket.to(room.id).emit('playerReconnected', session.sessionId);

        console.log(`Player reconnected: ${session.playerName} (${session.sessionId})`);
        return;
      }
      // Room gone during grace period — treat as fresh session
      session.roomId = null;
    }

    socket.emit('sessionRegistered', sessionId);
  });

  // ── Room discovery ─────────────────────────────────────────────────────────

  socket.on('getRooms', () => {
    socket.emit('roomList', gameManager.getWaitingRooms());
  });

  // ── Room lifecycle ─────────────────────────────────────────────────────────

  socket.on('createRoom', (roomName: string, playerName: string) => {
    const session = gameManager.getSessionBySocketId(socket.id);
    if (!session) {
      socket.emit('error', '세션이 없습니다. 페이지를 새로고침하세요.');
      return;
    }

    session.playerName = playerName;
    session.isHost = true;

    const host: Player = { id: session.sessionId, name: playerName, isHost: true };
    const room = gameManager.createRoom(roomName, host);
    session.roomId = room.id;

    socket.join(room.id);
    socket.emit('roomCreated', room.toRoomInfo(), host);
    io.emit('roomList', gameManager.getWaitingRooms());

    console.log(`Room created: ${room.id} by ${playerName}`);
  });

  socket.on('joinRoom', (roomId: string, playerName: string) => {
    const session = gameManager.getSessionBySocketId(socket.id);
    if (!session) {
      socket.emit('error', '세션이 없습니다. 페이지를 새로고침하세요.');
      return;
    }

    session.playerName = playerName;
    session.isHost = false;

    const player: Player = { id: session.sessionId, name: playerName, isHost: false };
    const room = gameManager.joinRoom(roomId, player);

    if (room) {
      session.roomId = room.id;
      socket.join(room.id);
      socket.emit('roomJoined', room.toRoomInfo(), player);
      socket.to(room.id).emit('playerJoined', player);
      io.emit('roomList', gameManager.getWaitingRooms());

      console.log(`${playerName} joined room: ${roomId}`);
    } else {
      socket.emit('error', '방에 참가할 수 없습니다.');
    }
  });

  socket.on('leaveRoom', () => {
    const session = gameManager.getSessionBySocketId(socket.id);
    if (!session) return;

    const roomId = session.roomId;
    session.roomId = null;

    const room = roomId ? gameManager.leaveRoom(session.sessionId) : undefined;
    if (room) {
      socket.leave(room.id);

      if (room.host.id === session.sessionId) {
        io.to(room.id).emit('error', '호스트가 방을 나갔습니다.');
        io.socketsLeave(room.id);
      } else {
        socket.to(room.id).emit('playerLeft', session.sessionId);
      }
    }

    io.emit('roomList', gameManager.getWaitingRooms());
    console.log(`Player left room: ${session.sessionId}`);
  });

  // ── Game lifecycle ─────────────────────────────────────────────────────────

  socket.on('startGame', () => {
    const session = gameManager.getSessionBySocketId(socket.id);
    if (!session) return;

    const room = gameManager.getRoomByPlayerId(session.sessionId);
    if (!room) {
      socket.emit('error', '방을 찾을 수 없습니다.');
      return;
    }

    if (room.host.id !== session.sessionId) {
      socket.emit('error', '호스트만 게임을 시작할 수 있습니다.');
      return;
    }

    if (room.startGame()) {
      io.to(room.id).emit('gameStarted');

      for (const challenger of room.challengers) {
        const gameState = room.getGameState(challenger.id);
        if (gameState) {
          io.to(challenger.id).emit('gameState', gameState);
        }
      }

      const allStates = room.getAllGameStates();
      for (const state of allStates) {
        io.to(room.host.id).emit('gameState', state);
      }

      io.emit('roomList', gameManager.getWaitingRooms());
      console.log(`Game started in room: ${room.id}`);
    } else {
      socket.emit('error', '게임을 시작할 수 없습니다. 도전자가 필요합니다.');
    }
  });

  socket.on('placeStone', (position: Position) => {
    const session = gameManager.getSessionBySocketId(socket.id);
    if (!session) return;

    const room = gameManager.getRoomByPlayerId(session.sessionId);
    if (!room || room.status !== 'playing') {
      socket.emit('error', '게임이 진행 중이 아닙니다.');
      return;
    }

    const isHost = room.host.id === session.sessionId;

    if (isHost) {
      room.placeHostStone(position);
      io.to(room.id).emit('hostMoved', position);

      for (const challenger of room.challengers) {
        const gameState = room.getGameState(challenger.id);
        if (gameState) {
          io.to(challenger.id).emit('gameState', gameState);
          io.to(room.host.id).emit('gameState', gameState);

          if (gameState.winner) {
            io.to(challenger.id).emit('gameOver', gameState);
            io.to(room.host.id).emit('gameOver', gameState);
          }
        }
      }
    } else {
      if (room.placeChallengerStone(session.sessionId, position)) {
        const gameState = room.getGameState(session.sessionId);
        if (gameState) {
          socket.emit('gameState', gameState);
          io.to(room.host.id).emit('gameState', gameState);
          io.to(room.host.id).emit('challengerMoved', session.sessionId, position);

          if (gameState.winner) {
            socket.emit('gameOver', gameState);
            io.to(room.host.id).emit('gameOver', gameState);
          }
        }

        if (room.allChallengersResponded()) {
          io.to(room.host.id).emit('allChallengersResponded');
        }
      } else {
        socket.emit('error', '잘못된 수입니다.');
      }
    }

    if (room.isGameOver()) {
      room.status = 'finished';
      io.emit('roomList', gameManager.getWaitingRooms());
    }
  });

  // ── Disconnect with grace period ───────────────────────────────────────────

  socket.on('disconnect', () => {
    const session = gameManager.getSessionBySocketId(socket.id);
    if (!session) {
      console.log(`Disconnected (no session): ${socket.id}`);
      return;
    }

    const { sessionId } = session;
    console.log(`Client disconnected: ${sessionId} — starting 30s grace period`);

    gameManager.startGracePeriod(sessionId, () => {
      console.log(`Grace period expired: ${sessionId}`);

      const expiredSession = session; // same reference, timer only fires if not reconnected
      const expiredRoom = expiredSession.roomId
        ? gameManager.getRoom(expiredSession.roomId)
        : undefined;

      if (expiredRoom) {
        if (expiredSession.isHost) {
          // Host forfeits all unfinished games
          if (expiredRoom.status === 'playing') {
            for (const [challengerId, game] of expiredRoom.games) {
              if (!game.winner) game.winner = 'challenger';
              io.to(challengerId).emit('gameOver', game);
            }
          }
          io.to(expiredRoom.id).emit('error', '호스트가 연결을 끊었습니다.');
          io.socketsLeave(expiredRoom.id);
        } else {
          // Challenger expired — unblock host if needed
          const wasPlaying = expiredRoom.status === 'playing';
          gameManager.leaveRoom(sessionId);
          io.to(expiredRoom.host.id).emit('playerLeft', sessionId);
          if (wasPlaying && expiredRoom.allChallengersResponded()) {
            io.to(expiredRoom.host.id).emit('allChallengersResponded');
          }
        }
      }

      if (expiredSession.isHost) {
        gameManager.leaveRoom(sessionId); // cleans up room + playerRooms for all
      }
      gameManager.deleteSession(sessionId);
      io.emit('roomList', gameManager.getWaitingRooms());
    });
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
