import {
  Room,
  Player,
  GameState,
  Board,
  Position,
  StoneType,
  BOARD_SIZE,
  RoomInfo
} from './types';

export class GameRoom implements Room {
  id: string;
  name: string;
  host: Player;
  challengers: Player[] = [];
  games: Map<string, GameState> = new Map();
  status: 'waiting' | 'playing' | 'finished' = 'waiting';
  hostReady: boolean = false;
  private pendingChallengers: Set<string> = new Set();

  constructor(id: string, name: string, host: Player) {
    this.id = id;
    this.name = name;
    this.host = host;
  }

  private createEmptyBoard(): Board {
    const cells: StoneType[][] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      cells.push(new Array(BOARD_SIZE).fill(null));
    }
    return { cells };
  }

  addChallenger(player: Player): boolean {
    if (this.status !== 'waiting') {
      return false;
    }
    if (this.challengers.find(c => c.id === player.id)) {
      return false;
    }
    this.challengers.push(player);
    return true;
  }

  removeChallenger(playerId: string): boolean {
    const index = this.challengers.findIndex(c => c.id === playerId);
    if (index === -1) {
      return false;
    }
    this.challengers.splice(index, 1);
    this.games.delete(playerId);
    this.pendingChallengers.delete(playerId);
    return true;
  }

  startGame(): boolean {
    if (this.challengers.length === 0) {
      return false;
    }

    this.status = 'playing';
    this.games.clear();

    for (const challenger of this.challengers) {
      const gameState: GameState = {
        challengerId: challenger.id,
        board: this.createEmptyBoard(),
        isHostTurn: true,
        winner: null,
        lastMove: null
      };
      this.games.set(challenger.id, gameState);
    }

    return true;
  }

  placeHostStone(position: Position): boolean {
    if (this.status !== 'playing') {
      return false;
    }

    let allValid = true;
    this.pendingChallengers.clear();

    for (const [challengerId, game] of this.games) {
      if (game.winner) continue;

      if (!game.isHostTurn) {
        allValid = false;
        continue;
      }

      if (!this.isValidMove(game.board, position)) {
        allValid = false;
        continue;
      }

      game.board.cells[position.row][position.col] = 'black';
      game.lastMove = position;

      if (this.checkWin(game.board, position, 'black')) {
        game.winner = 'host';
      } else if (this.isBoardFull(game.board)) {
        game.winner = 'draw';
      } else {
        game.isHostTurn = false;
        this.pendingChallengers.add(challengerId);
      }
    }

    return allValid;
  }

  placeChallengerStone(challengerId: string, position: Position): boolean {
    const game = this.games.get(challengerId);
    if (!game || game.winner || game.isHostTurn) {
      return false;
    }

    if (!this.isValidMove(game.board, position)) {
      return false;
    }

    game.board.cells[position.row][position.col] = 'white';
    game.lastMove = position;
    this.pendingChallengers.delete(challengerId);

    if (this.checkWin(game.board, position, 'white')) {
      game.winner = 'challenger';
    } else if (this.isBoardFull(game.board)) {
      game.winner = 'draw';
    } else {
      game.isHostTurn = true;
    }

    return true;
  }

  allChallengersResponded(): boolean {
    return this.pendingChallengers.size === 0;
  }

  isValidMove(board: Board, position: Position): boolean {
    if (position.row < 0 || position.row >= BOARD_SIZE ||
        position.col < 0 || position.col >= BOARD_SIZE) {
      return false;
    }
    return board.cells[position.row][position.col] === null;
  }

  checkWin(board: Board, lastMove: Position, stone: StoneType): boolean {
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

  isBoardFull(board: Board): boolean {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board.cells[row][col] === null) {
          return false;
        }
      }
    }
    return true;
  }

  isGameOver(): boolean {
    for (const game of this.games.values()) {
      if (!game.winner) {
        return false;
      }
    }
    return this.games.size > 0;
  }

  getGameState(challengerId: string): GameState | undefined {
    return this.games.get(challengerId);
  }

  getAllGameStates(): GameState[] {
    return Array.from(this.games.values());
  }

  toRoomInfo(): RoomInfo {
    return {
      id: this.id,
      name: this.name,
      hostName: this.host.name,
      challengerCount: this.challengers.length,
      status: this.status
    };
  }
}
