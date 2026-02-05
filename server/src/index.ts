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

  socket.on('getRooms', () => {
    const rooms = gameManager.getWaitingRooms();
    socket.emit('roomList', rooms);
  });

  socket.on('createRoom', (roomName: string, playerName: string) => {
    const host: Player = {
      id: socket.id,
      name: playerName,
      isHost: true
    };

    const room = gameManager.createRoom(roomName, host);
    socket.join(room.id);
    socket.emit('roomCreated', room.toRoomInfo());
    io.emit('roomList', gameManager.getWaitingRooms());

    console.log(`Room created: ${room.id} by ${playerName}`);
  });

  socket.on('joinRoom', (roomId: string, playerName: string) => {
    const player: Player = {
      id: socket.id,
      name: playerName,
      isHost: false
    };

    const room = gameManager.joinRoom(roomId, player);
    if (room) {
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
    const room = gameManager.leaveRoom(socket.id);
    if (room) {
      socket.leave(room.id);

      if (room.host.id === socket.id) {
        // Host left, notify all challengers
        io.to(room.id).emit('error', '호스트가 방을 나갔습니다.');
        io.socketsLeave(room.id);
      } else {
        socket.to(room.id).emit('playerLeft', socket.id);
      }

      io.emit('roomList', gameManager.getWaitingRooms());
      console.log(`Player left room: ${socket.id}`);
    }
  });

  socket.on('startGame', () => {
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (!room) {
      socket.emit('error', '방을 찾을 수 없습니다.');
      return;
    }

    if (room.host.id !== socket.id) {
      socket.emit('error', '호스트만 게임을 시작할 수 있습니다.');
      return;
    }

    if (room.startGame()) {
      io.to(room.id).emit('gameStarted');

      // Send initial game state to each challenger
      for (const challenger of room.challengers) {
        const gameState = room.getGameState(challenger.id);
        if (gameState) {
          io.to(challenger.id).emit('gameState', gameState);
        }
      }

      // Send all game states to host
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
    const room = gameManager.getRoomByPlayerId(socket.id);
    if (!room || room.status !== 'playing') {
      socket.emit('error', '게임이 진행 중이 아닙니다.');
      return;
    }

    const isHost = room.host.id === socket.id;

    if (isHost) {
      // Host places stone on all boards
      room.placeHostStone(position);

      // Notify all players
      io.to(room.id).emit('hostMoved', position);

      // Send updated game states
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
      // Challenger places stone on their board
      if (room.placeChallengerStone(socket.id, position)) {
        const gameState = room.getGameState(socket.id);
        if (gameState) {
          socket.emit('gameState', gameState);
          io.to(room.host.id).emit('gameState', gameState);
          io.to(room.host.id).emit('challengerMoved', socket.id, position);

          if (gameState.winner) {
            socket.emit('gameOver', gameState);
            io.to(room.host.id).emit('gameOver', gameState);
          }
        }

        // Check if all challengers have responded
        if (room.allChallengersResponded()) {
          io.to(room.host.id).emit('allChallengersResponded');
        }
      } else {
        socket.emit('error', '잘못된 수입니다.');
      }
    }

    // Check if all games are over
    if (room.isGameOver()) {
      room.status = 'finished';
      io.emit('roomList', gameManager.getWaitingRooms());
    }
  });

  socket.on('disconnect', () => {
    const room = gameManager.leaveRoom(socket.id);
    if (room) {
      if (room.host.id === socket.id) {
        io.to(room.id).emit('error', '호스트가 연결이 끊어졌습니다.');
        io.socketsLeave(room.id);
      } else {
        socket.to(room.id).emit('playerLeft', socket.id);
      }
      io.emit('roomList', gameManager.getWaitingRooms());
    }
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
