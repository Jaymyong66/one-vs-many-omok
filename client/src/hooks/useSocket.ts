import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState, Player, Position, RoomInfo } from '../types/game';

interface ServerToClientEvents {
  roomCreated: (room: RoomInfo) => void;
  roomJoined: (room: RoomInfo, player: Player) => void;
  roomUpdated: (room: RoomInfo) => void;
  roomList: (rooms: RoomInfo[]) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  gameStarted: () => void;
  gameState: (state: GameState) => void;
  hostMoved: (position: Position) => void;
  challengerMoved: (challengerId: string, position: Position) => void;
  gameOver: (state: GameState) => void;
  allChallengersResponded: () => void;
  error: (message: string) => void;
}

interface ClientToServerEvents {
  createRoom: (roomName: string, playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  placeStone: (position: Position) => void;
  getRooms: () => void;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameStates, setGameStates] = useState<Map<string, GameState>>(new Map());
  const [challengers, setChallengers] = useState<Player[]>([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [canHostMove, setCanHostMove] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('getRooms');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('roomList', (roomList) => {
      setRooms(roomList);
    });

    socket.on('roomCreated', (room) => {
      setCurrentRoom(room);
      setPlayer({ id: socket.id!, name: '', isHost: true });
      setChallengers([]);
    });

    socket.on('roomJoined', (room, joinedPlayer) => {
      setCurrentRoom(room);
      setPlayer(joinedPlayer);
    });

    socket.on('playerJoined', (newPlayer) => {
      setChallengers(prev => [...prev, newPlayer]);
    });

    socket.on('playerLeft', (playerId) => {
      setChallengers(prev => prev.filter(p => p.id !== playerId));
    });

    socket.on('gameStarted', () => {
      setIsGameStarted(true);
      setCanHostMove(true);
    });

    socket.on('gameState', (state) => {
      setGameStates(prev => {
        const newMap = new Map(prev);
        newMap.set(state.challengerId, state);
        return newMap;
      });
    });

    socket.on('allChallengersResponded', () => {
      setCanHostMove(true);
    });

    socket.on('hostMoved', () => {
      setCanHostMove(false);
    });

    socket.on('error', (message) => {
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback((roomName: string, playerName: string) => {
    socketRef.current?.emit('createRoom', roomName, playerName);
  }, []);

  const joinRoom = useCallback((roomId: string, playerName: string) => {
    socketRef.current?.emit('joinRoom', roomId, playerName);
  }, []);

  const leaveRoom = useCallback(() => {
    socketRef.current?.emit('leaveRoom');
    setCurrentRoom(null);
    setPlayer(null);
    setGameStates(new Map());
    setChallengers([]);
    setIsGameStarted(false);
    socketRef.current?.emit('getRooms');
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('startGame');
  }, []);

  const placeStone = useCallback((position: Position) => {
    socketRef.current?.emit('placeStone', position);
  }, []);

  const refreshRooms = useCallback(() => {
    socketRef.current?.emit('getRooms');
  }, []);

  return {
    isConnected,
    rooms,
    currentRoom,
    player,
    gameStates,
    challengers,
    isGameStarted,
    canHostMove,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    placeStone,
    refreshRooms,
  };
}
