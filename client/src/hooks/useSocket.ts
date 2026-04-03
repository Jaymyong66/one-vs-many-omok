import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { SharedGameState, Player, Position, RoomInfo, VoteTally, Board, HostColorPreference } from '../types/game';

interface ServerToClientEvents {
  sessionRegistered: (sessionId: string) => void;
  reconnected: (
    room: RoomInfo,
    player: Player,
    gameState: SharedGameState | null,
    challengers: Player[],
    voteTally: VoteTally | null
  ) => void;
  playerReconnected: (playerId: string) => void;
  roomCreated: (room: RoomInfo, player: Player) => void;
  roomJoined: (room: RoomInfo, player: Player) => void;
  roomUpdated: (room: RoomInfo) => void;
  roomList: (rooms: RoomInfo[]) => void;
  playerJoined: (player: Player) => void;
  playerLeft: (playerId: string) => void;
  gameStarted: () => void;
  gameState: (state: SharedGameState) => void;
  hostMoved: (position: Position) => void;
  voteUpdate: (tally: VoteTally) => void;
  voteResolved: (position: Position, method: 'plurality' | 'tiebreak' | 'random') => void;
  gameOver: (winner: 'host' | 'challengers' | 'draw', board: Board) => void;
  error: (message: string) => void;
  hostColorChanged: (color: HostColorPreference) => void;
}

interface ClientToServerEvents {
  register: (sessionId: string) => void;
  createRoom: (roomName: string, playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  placeStone: (position: Position) => void;
  getRooms: () => void;
  setHostColor: (color: HostColorPreference) => void;
}

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

function getOrCreateSessionId(): string {
  let id = localStorage.getItem('omok_session_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('omok_session_id', id);
  }
  return id;
}

export function useSocket() {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<SharedGameState | null>(null);
  const [challengers, setChallengers] = useState<Player[]>([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [voteTally, setVoteTally] = useState<VoteTally | null>(null);
  const [myVote, setMyVote] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hostColorPreference, setHostColorPreference] = useState<HostColorPreference>('black');

  const currentRoomRef = useRef<RoomInfo | null>(null);
  currentRoomRef.current = currentRoom;

  useEffect(() => {
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      const sessionId = getOrCreateSessionId();
      socket.emit('register', sessionId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      if (currentRoomRef.current) {
        setIsReconnecting(true);
      } else {
        setPlayer(null);
        setGameState(null);
        setChallengers([]);
        setIsGameStarted(false);
        setVoteTally(null);
        setMyVote(null);
      }
    });

    socket.on('sessionRegistered', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setCurrentRoom(null);
      setPlayer(null);
      setGameState(null);
      setChallengers([]);
      setIsGameStarted(false);
      setVoteTally(null);
      setMyVote(null);
      socket.emit('getRooms');
    });

    socket.on('reconnected', (room, restoredPlayer, restoredGameState, restoredChallengers, restoredVoteTally) => {
      setIsConnected(true);
      setIsReconnecting(false);
      setCurrentRoom(room);
      setPlayer(restoredPlayer);
      setChallengers(restoredChallengers);
      setHostColorPreference(restoredGameState?.hostStoneColor ?? room.hostStoneColor);
      if (restoredGameState) {
        setIsGameStarted(true);
        setGameState(restoredGameState);
      }
      if (restoredVoteTally) {
        setVoteTally(restoredVoteTally);
        // Fix #5: restore my vote highlight from the tally
        const myVotePos = restoredVoteTally.votes[restoredPlayer.id];
        if (myVotePos) setMyVote(myVotePos);
      }
    });

    socket.on('playerReconnected', (_playerId) => {
      // Peer came back — no state change needed
    });

    socket.on('roomList', (roomList) => {
      setRooms(roomList);
    });

    socket.on('hostColorChanged', (color) => {
      setHostColorPreference(color);
    });

    socket.on('roomCreated', (room, createdPlayer) => {
      setCurrentRoom(room);
      setPlayer(createdPlayer);
      setChallengers([]);
      setHostColorPreference('black');
    });

    socket.on('roomJoined', (room, joinedPlayer) => {
      setCurrentRoom(room);
      setPlayer(joinedPlayer);
      setHostColorPreference(room.hostStoneColor);
    });

    socket.on('playerJoined', (newPlayer) => {
      setChallengers(prev => [...prev, newPlayer]);
    });

    socket.on('playerLeft', (playerId) => {
      setChallengers(prev => prev.filter(p => p.id !== playerId));
    });

    socket.on('gameStarted', () => {
      setIsGameStarted(true);
      setVoteTally(null);
      setMyVote(null);
    });

    socket.on('gameState', (state) => {
      setGameState(state);
      if (state.isHostTurn) {
        setVoteTally(null);
        setMyVote(null);
      }
    });

    socket.on('hostMoved', () => {
      // gameState event carries full state; just clear any lingering vote UI
      setMyVote(null);
    });

    socket.on('voteUpdate', (tally) => {
      setVoteTally(tally);
    });

    socket.on('voteResolved', (_position, _method) => {
      // gameState event follows with the updated board; clear vote state
      setVoteTally(null);
      setMyVote(null);
    });

    socket.on('gameOver', (_winner, _board) => {
      setVoteTally(null);
      setMyVote(null);
    });

    socket.on('error', (message) => {
      setError(message);
      setMyVote(null); // Fix #6: roll back optimistic vote on rejection
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
    setGameState(null);
    setChallengers([]);
    setIsGameStarted(false);
    setVoteTally(null);
    setMyVote(null);
    setHostColorPreference('black');
    socketRef.current?.emit('getRooms');
  }, []);

  const startGame = useCallback(() => {
    socketRef.current?.emit('startGame');
  }, []);

  const placeStone = useCallback((position: Position) => {
    socketRef.current?.emit('placeStone', position);
  }, []);

  const castVote = useCallback((position: Position) => {
    setMyVote(position);
    socketRef.current?.emit('placeStone', position);
  }, []);

  const refreshRooms = useCallback(() => {
    socketRef.current?.emit('getRooms');
  }, []);

  const setHostColor = useCallback((color: HostColorPreference) => {
    setHostColorPreference(color);
    socketRef.current?.emit('setHostColor', color);
  }, []);

  return {
    isConnected,
    isReconnecting,
    rooms,
    currentRoom,
    player,
    gameState,
    challengers,
    isGameStarted,
    voteTally,
    myVote,
    error,
    hostColorPreference,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    placeStone,
    castVote,
    refreshRooms,
    setHostColor,
  };
}
