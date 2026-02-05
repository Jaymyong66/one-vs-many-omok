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

export interface GameState {
  challengerId: string;
  board: Board;
  isHostTurn: boolean;
  winner: 'host' | 'challenger' | 'draw' | null;
  lastMove: Position | null;
}

export interface Room {
  id: string;
  name: string;
  host: Player;
  challengers: Player[];
  games: Map<string, GameState>;
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

export interface ClientToServerEvents {
  createRoom: (roomName: string, playerName: string) => void;
  joinRoom: (roomId: string, playerName: string) => void;
  leaveRoom: () => void;
  startGame: () => void;
  placeStone: (position: Position) => void;
  getRooms: () => void;
}

export interface ServerToClientEvents {
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

export const BOARD_SIZE = 15;
