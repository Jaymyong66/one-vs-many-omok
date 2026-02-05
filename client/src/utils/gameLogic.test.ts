import { describe, it, expect, beforeEach } from 'vitest';
import { checkWin, isValidMove, createEmptyBoard } from './gameLogic';
import { Board, BOARD_SIZE } from '../types/game';

describe('gameLogic', () => {
  describe('createEmptyBoard', () => {
    it('should create a 15x15 board', () => {
      const board = createEmptyBoard();
      expect(board.cells.length).toBe(BOARD_SIZE);
      board.cells.forEach(row => {
        expect(row.length).toBe(BOARD_SIZE);
      });
    });

    it('should create board with all null cells', () => {
      const board = createEmptyBoard();
      board.cells.forEach(row => {
        row.forEach(cell => {
          expect(cell).toBeNull();
        });
      });
    });
  });

  describe('isValidMove', () => {
    it('should return true for empty cell', () => {
      const board = createEmptyBoard();
      expect(isValidMove(board, { row: 7, col: 7 })).toBe(true);
    });

    it('should return false for occupied cell', () => {
      const board = createEmptyBoard();
      board.cells[7][7] = 'black';
      expect(isValidMove(board, { row: 7, col: 7 })).toBe(false);
    });

    it('should return false for out of bounds positions', () => {
      const board = createEmptyBoard();
      expect(isValidMove(board, { row: -1, col: 0 })).toBe(false);
      expect(isValidMove(board, { row: 0, col: -1 })).toBe(false);
      expect(isValidMove(board, { row: BOARD_SIZE, col: 0 })).toBe(false);
      expect(isValidMove(board, { row: 0, col: BOARD_SIZE })).toBe(false);
    });
  });

  describe('checkWin', () => {
    let board: Board;

    beforeEach(() => {
      board = createEmptyBoard();
    });

    it('should detect horizontal win', () => {
      // Place 5 black stones horizontally
      for (let i = 0; i < 5; i++) {
        board.cells[7][3 + i] = 'black';
      }
      expect(checkWin(board, { row: 7, col: 5 }, 'black')).toBe(true);
    });

    it('should detect vertical win', () => {
      // Place 5 black stones vertically
      for (let i = 0; i < 5; i++) {
        board.cells[3 + i][7] = 'black';
      }
      expect(checkWin(board, { row: 5, col: 7 }, 'black')).toBe(true);
    });

    it('should detect diagonal win', () => {
      // Place 5 black stones diagonally
      for (let i = 0; i < 5; i++) {
        board.cells[3 + i][3 + i] = 'black';
      }
      expect(checkWin(board, { row: 5, col: 5 }, 'black')).toBe(true);
    });

    it('should detect anti-diagonal win', () => {
      // Place 5 black stones anti-diagonally
      for (let i = 0; i < 5; i++) {
        board.cells[3 + i][7 - i] = 'black';
      }
      expect(checkWin(board, { row: 5, col: 5 }, 'black')).toBe(true);
    });

    it('should not detect win with only 4 stones', () => {
      // Place 4 black stones horizontally
      for (let i = 0; i < 4; i++) {
        board.cells[7][3 + i] = 'black';
      }
      expect(checkWin(board, { row: 7, col: 5 }, 'black')).toBe(false);
    });

    it('should not detect win when stones are not connected', () => {
      board.cells[7][3] = 'black';
      board.cells[7][4] = 'black';
      board.cells[7][5] = 'white'; // Different color breaks the line
      board.cells[7][6] = 'black';
      board.cells[7][7] = 'black';
      expect(checkWin(board, { row: 7, col: 4 }, 'black')).toBe(false);
    });

    it('should return false for null stone', () => {
      expect(checkWin(board, { row: 7, col: 7 }, null)).toBe(false);
    });
  });
});
