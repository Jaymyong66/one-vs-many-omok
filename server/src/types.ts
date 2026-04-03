export type StoneType = 'black' | 'white' | null;

export interface Position {
  row: number;
  col: number;
}

export interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

export interface Board {
  cells: StoneType[][];
}

export interface SharedGameState {
  board: Board;
  isHostTurn: boolean;
  winner: 'host' | 'challengers' | 'draw' | null;
  lastMove: Position | null;
}

export type VoteMap = Record<string, Position>; // challengerId → voted position

export interface VoteTally {
  votes: VoteMap;
  timeLeftMs: number;
  totalVoters: number;
}

export interface Room {
  id: string;
  name: string;
  host: Player;
  challengers: Player[];
  game: SharedGameState | null;
  status: 'waiting' | 'playing' | 'finished';
  hostReady: boolean;
}

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  challengerCount: number;
  status: 'waiting' | 'playing' | 'finished';
}

export interface SessionInfo {
  sessionId: string;
  socketId: string;
  playerName: string;
  isHost: boolean;
  roomId: string | null;
  gracePeriodTimer: ReturnType<typeof setTimeout> | null;
}

export interface ClientToServerEvents {
  register: (sessionId: string) => void;
  createRoom: (roomName: string, playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  placeStone: (position: Position) => void;
  getRooms: () => void;
}

export interface ServerToClientEvents {
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
}

export const BOARD_SIZE = 15;
