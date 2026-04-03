import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './GameManager';
import { GameRoom, DEFAULT_VOTE_TIMEOUT_MS } from './GameRoom';
import { Player, ClientToServerEvents, ServerToClientEvents, Position, HostColorPreference } from './types';

interface AppOptions {
  gracePeriodMs?: number;
  voteTimeoutMs?: number;
}

export function createApp(options: AppOptions = {}) {
  const gracePeriodMs = options.gracePeriodMs ?? 30000;
  const voteTimeoutMs = options.voteTimeoutMs ?? DEFAULT_VOTE_TIMEOUT_MS;

  const app = express();
  app.use(cors());

  const httpServer = createServer(app);
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const gameManager = new GameManager(voteTimeoutMs);

  function resolveAndBroadcast(room: GameRoom) {
    if (!room.game || room.game.winner !== null || room.game.isHostTurn) return;

    const { position, method } = room.resolveVotes();
    io.to(room.id).emit('voteResolved', position, method);
    io.to(room.id).emit('gameState', room.game);

    if (room.game.winner) {
      io.to(room.id).emit('gameOver', room.game.winner, room.game.board);
      room.status = 'finished';
      io.emit('roomList', gameManager.getWaitingRooms());
    }
  }

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // ── Session registration (must be first event sent by client) ───────────

    socket.on('register', (sessionId: string) => {
      const { isNew, session } = gameManager.registerSession(sessionId, socket.id);

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

          const voteTally =
            room.game && !room.game.isHostTurn && !room.game.winner
              ? room.getVoteTally()
              : null;

          socket.emit('reconnected', room.toRoomInfo(), playerInfo, room.game, room.challengers, voteTally);
          socket.to(room.id).emit('playerReconnected', session.sessionId);

          console.log(`Player reconnected: ${session.playerName} (${session.sessionId})`);
          return;
        }
        // Room gone during grace period — treat as fresh session
        session.roomId = null;
      }

      socket.emit('sessionRegistered', sessionId);
    });

    // ── Room discovery ───────────────────────────────────────────────────────

    socket.on('getRooms', () => {
      socket.emit('roomList', gameManager.getWaitingRooms());
    });

    // ── Room lifecycle ───────────────────────────────────────────────────────

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
          // Fix #3: clear vote timer before disbanding the room
          room.clearVoteTimer();
          io.to(room.id).emit('error', '호스트가 방을 나갔습니다.');
          io.socketsLeave(room.id);
        } else {
          socket.to(room.id).emit('playerLeft', session.sessionId);

          // Fix #2: if challenger leaves during voting, check if remaining challengers all voted
          if (room.status === 'playing' && room.game && !room.game.isHostTurn && !room.game.winner) {
            if (room.allVotesIn()) {
              room.clearVoteTimer();
              resolveAndBroadcast(room);
            }
          }
        }
      }

      io.emit('roomList', gameManager.getWaitingRooms());
      console.log(`Player left room: ${session.sessionId}`);
    });

    // ── Game lifecycle ───────────────────────────────────────────────────────

    socket.on('setHostColor', (color: HostColorPreference) => {
      const session = gameManager.getSessionBySocketId(socket.id);
      if (!session) return;

      const room = gameManager.getRoomByPlayerId(session.sessionId);
      if (!room) return;

      if (room.host.id !== session.sessionId) {
        socket.emit('error', '호스트만 돌 색상을 변경할 수 있습니다.');
        return;
      }

      if (room.setHostColor(color)) {
        io.to(room.id).emit('hostColorChanged', color);
      }
    });

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
        io.to(room.id).emit('gameState', room.game!);
        io.emit('roomList', gameManager.getWaitingRooms());
        console.log(`Game started in room: ${room.id}`);

        // If host plays white, challengers (black) go first — start vote timer immediately
        if (!room.game!.isHostTurn) {
          room.startVoteTimer(() => {
            resolveAndBroadcast(room);
          });
        }
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
        if (!room.game?.isHostTurn) {
          socket.emit('error', '아직 당신의 차례가 아닙니다.');
          return;
        }

        const success = room.placeHostStone(position);
        if (!success) {
          socket.emit('error', '잘못된 수입니다.');
          return;
        }

        io.to(room.id).emit('hostMoved', position);
        io.to(room.id).emit('gameState', room.game!);

        if (room.game!.winner) {
          io.to(room.id).emit('gameOver', room.game!.winner, room.game!.board);
          room.status = 'finished';
          io.emit('roomList', gameManager.getWaitingRooms());
          return;
        }

        room.startVoteTimer(() => {
          resolveAndBroadcast(room);
        });
      } else {
        // Challenger casting a vote
        if (!room.game || room.game.isHostTurn || room.game.winner) {
          socket.emit('error', '지금은 투표 시간이 아닙니다.');
          return;
        }

        const success = room.castVote(session.sessionId, position);
        if (!success) {
          socket.emit('error', '잘못된 수입니다.');
          return;
        }

        io.to(room.id).emit('voteUpdate', room.getVoteTally());

        if (room.allVotesIn()) {
          room.clearVoteTimer();
          resolveAndBroadcast(room);
        }
      }
    });

    // ── Disconnect with grace period ─────────────────────────────────────────

    socket.on('disconnect', () => {
      const session = gameManager.getSessionBySocketId(socket.id);
      if (!session) {
        console.log(`Disconnected (no session): ${socket.id}`);
        return;
      }

      const { sessionId } = session;
      console.log(`Client disconnected: ${sessionId} — starting grace period (${gracePeriodMs}ms)`);

      gameManager.startGracePeriod(sessionId, () => {
        console.log(`Grace period expired: ${sessionId}`);

        const expiredSession = session;
        const expiredRoom = expiredSession.roomId
          ? gameManager.getRoom(expiredSession.roomId)
          : undefined;

        if (expiredRoom) {
          if (expiredSession.isHost) {
            if (expiredRoom.status === 'playing' && expiredRoom.game && !expiredRoom.game.winner) {
              expiredRoom.clearVoteTimer();
              expiredRoom.game.winner = 'challengers';
              expiredRoom.status = 'finished'; // Fix #10
              io.to(expiredRoom.id).emit('gameOver', 'challengers', expiredRoom.game.board);
            }
            io.to(expiredRoom.id).emit('error', '호스트가 연결을 끊었습니다.');
            io.socketsLeave(expiredRoom.id);
          } else {
            const wasPlaying = expiredRoom.status === 'playing';
            gameManager.leaveRoom(sessionId);
            io.to(expiredRoom.id).emit('playerLeft', sessionId); // Fix #4: broadcast to whole room

            // If a challenger disconnects during voting, check if remaining challengers all voted
            if (wasPlaying && expiredRoom.game && !expiredRoom.game.isHostTurn && !expiredRoom.game.winner) {
              if (expiredRoom.allVotesIn()) {
                expiredRoom.clearVoteTimer();
                resolveAndBroadcast(expiredRoom);
              }
            }
          }
        }

        if (expiredSession.isHost) {
          gameManager.leaveRoom(sessionId);
        }
        gameManager.deleteSession(sessionId);
        io.emit('roomList', gameManager.getWaitingRooms());
      }, gracePeriodMs);
    });
  });

  return { httpServer, io };
}
