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

export interface RoomInfo {
  id: string;
  name: string;
  hostName: string;
  challengerCount: number;
  status: 'waiting' | 'playing' | 'finished';
}

export const BOARD_SIZE = 15;
