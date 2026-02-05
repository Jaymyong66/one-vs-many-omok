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

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  challengerCount: number;
  status: 'waiting' | 'playing' | 'finished';
}

export const BOARD_SIZE = 15;
