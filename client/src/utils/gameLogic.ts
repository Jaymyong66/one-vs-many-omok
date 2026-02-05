import { Board, Position, StoneType, BOARD_SIZE } from '../types/game';

export function checkWin(board: Board, lastMove: Position, stone: StoneType): boolean {
  if (!stone) return false;

  const directions = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal
    [1, -1]   // anti-diagonal
  ];

  for (const [dr, dc] of directions) {
    let count = 1;

    // Check positive direction
    for (let i = 1; i < 5; i++) {
      const r = lastMove.row + dr * i;
      const c = lastMove.col + dc * i;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
      if (board.cells[r][c] !== stone) break;
      count++;
    }

    // Check negative direction
    for (let i = 1; i < 5; i++) {
      const r = lastMove.row - dr * i;
      const c = lastMove.col - dc * i;
      if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
      if (board.cells[r][c] !== stone) break;
      count++;
    }

    if (count >= 5) {
      return true;
    }
  }

  return false;
}

export function isValidMove(board: Board, position: Position): boolean {
  if (position.row < 0 || position.row >= BOARD_SIZE ||
      position.col < 0 || position.col >= BOARD_SIZE) {
    return false;
  }
  return board.cells[position.row][position.col] === null;
}

export function createEmptyBoard(): Board {
  const cells: StoneType[][] = [];
  for (let i = 0; i < BOARD_SIZE; i++) {
    cells.push(new Array(BOARD_SIZE).fill(null));
  }
  return { cells };
}
