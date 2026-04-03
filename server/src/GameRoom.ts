import {
  Room,
  Player,
  SharedGameState,
  Board,
  Position,
  StoneType,
  BOARD_SIZE,
  RoomInfo,
  VoteMap,
  VoteTally,
  HostColorPreference
} from './types';

export const DEFAULT_VOTE_TIMEOUT_MS = 30000;

export class GameRoom implements Room {
  id: string;
  name: string;
  host: Player;
  challengers: Player[] = [];
  game: SharedGameState | null = null;
  status: 'waiting' | 'playing' | 'finished' = 'waiting';
  hostReady: boolean = false;
  hostStoneColor: HostColorPreference = 'black';
  private resolvedHostColor: 'black' | 'white' = 'black';
  private votes: Map<string, Position> = new Map();
  private voteTimer: ReturnType<typeof setTimeout> | null = null;
  private voteStartTime: number = 0;
  private voteRound: number = 0;
  private readonly voteTimeoutMs: number;

  constructor(id: string, name: string, host: Player, voteTimeoutMs = DEFAULT_VOTE_TIMEOUT_MS) {
    this.id = id;
    this.name = name;
    this.host = host;
    this.voteTimeoutMs = voteTimeoutMs;
  }

  private createEmptyBoard(): Board {
    const cells: StoneType[][] = [];
    for (let i = 0; i < BOARD_SIZE; i++) {
      cells.push(new Array(BOARD_SIZE).fill(null));
    }
    return { cells };
  }

  addChallenger(player: Player): boolean {
    if (this.status !== 'waiting') return false;
    if (this.challengers.find(c => c.id === player.id)) return false;
    this.challengers.push(player);
    return true;
  }

  removeChallenger(playerId: string): boolean {
    const index = this.challengers.findIndex(c => c.id === playerId);
    if (index === -1) return false;
    this.challengers.splice(index, 1);
    this.votes.delete(playerId);
    return true;
  }

  setHostColor(color: HostColorPreference): boolean {
    if (this.status !== 'waiting') return false;
    this.hostStoneColor = color;
    return true;
  }

  startGame(): boolean {
    if (this.challengers.length === 0) return false;
    this.resolvedHostColor =
      this.hostStoneColor === 'random'
        ? Math.random() < 0.5 ? 'black' : 'white'
        : this.hostStoneColor;
    this.status = 'playing';
    this.game = {
      board: this.createEmptyBoard(),
      isHostTurn: this.resolvedHostColor === 'black',
      winner: null,
      lastMove: null,
      hostStoneColor: this.resolvedHostColor,
    };
    this.votes.clear();
    return true;
  }

  placeHostStone(position: Position): boolean {
    if (!this.game || this.status !== 'playing') return false;
    if (!this.game.isHostTurn || this.game.winner) return false;
    if (!this.isValidMove(this.game.board, position)) return false;

    this.game.board.cells[position.row][position.col] = this.resolvedHostColor;
    this.game.lastMove = position;

    if (this.checkWin(this.game.board, position, this.resolvedHostColor)) {
      this.game.winner = 'host';
    } else if (this.isBoardFull(this.game.board)) {
      this.game.winner = 'draw';
    } else {
      this.game.isHostTurn = false;
      this.votes.clear();
      this.voteRound++;
    }

    return true;
  }

  castVote(challengerId: string, position: Position): boolean {
    if (!this.game || this.game.isHostTurn || this.game.winner) return false;
    if (!this.challengers.find(c => c.id === challengerId)) return false;
    if (!this.isValidMove(this.game.board, position)) return false;

    this.votes.set(challengerId, position);
    return true;
  }

  allVotesIn(): boolean {
    return this.challengers.every(c => this.votes.has(c.id));
  }

  resolveVotes(): { position: Position; method: 'plurality' | 'tiebreak' | 'random' } {
    if (!this.game) throw new Error('No game in progress');

    let resolvedPosition: Position;
    let method: 'plurality' | 'tiebreak' | 'random';

    if (this.votes.size === 0) {
      resolvedPosition = this.randomValidPosition(this.game.board);
      method = 'random';
    } else {
      const tally = new Map<string, { position: Position; count: number }>();
      for (const pos of this.votes.values()) {
        const key = `${pos.row},${pos.col}`;
        const existing = tally.get(key);
        if (existing) {
          existing.count++;
        } else {
          tally.set(key, { position: pos, count: 1 });
        }
      }

      let maxCount = 0;
      for (const { count } of tally.values()) {
        if (count > maxCount) maxCount = count;
      }

      const winners = Array.from(tally.values()).filter(v => v.count === maxCount);
      if (winners.length === 1) {
        resolvedPosition = winners[0].position;
        method = 'plurality';
      } else {
        resolvedPosition = winners[Math.floor(Math.random() * winners.length)].position;
        method = 'tiebreak';
      }
    }

    const challengerColor: StoneType = this.resolvedHostColor === 'black' ? 'white' : 'black';
    this.game.board.cells[resolvedPosition.row][resolvedPosition.col] = challengerColor;
    this.game.lastMove = resolvedPosition;
    this.votes.clear();

    if (this.checkWin(this.game.board, resolvedPosition, challengerColor)) {
      this.game.winner = 'challengers';
    } else if (this.isBoardFull(this.game.board)) {
      this.game.winner = 'draw';
    } else {
      this.game.isHostTurn = true;
    }

    return { position: resolvedPosition, method };
  }

  startVoteTimer(callback: () => void): void {
    this.clearVoteTimer();
    this.voteStartTime = Date.now();
    const capturedRound = this.voteRound;
    this.voteTimer = setTimeout(() => {
      if (this.voteRound === capturedRound) {
        callback();
      }
    }, this.voteTimeoutMs);
  }

  clearVoteTimer(): void {
    if (this.voteTimer) {
      clearTimeout(this.voteTimer);
      this.voteTimer = null;
    }
  }

  getVoteTally(): VoteTally {
    const votes: VoteMap = {};
    for (const [challengerId, pos] of this.votes) {
      votes[challengerId] = pos;
    }
    const elapsed = this.voteStartTime ? Date.now() - this.voteStartTime : 0;
    const timeLeftMs = Math.max(0, this.voteTimeoutMs - elapsed);
    return {
      votes,
      timeLeftMs,
      totalVoters: this.challengers.length,
    };
  }

  private randomValidPosition(board: Board): Position {
    const empty: Position[] = [];
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board.cells[row][col] === null) {
          empty.push({ row, col });
        }
      }
    }
    if (empty.length === 0) throw new Error('No valid positions: board is full');
    return empty[Math.floor(Math.random() * empty.length)];
  }

  isValidMove(board: Board, position: Position): boolean {
    if (
      position.row < 0 || position.row >= BOARD_SIZE ||
      position.col < 0 || position.col >= BOARD_SIZE
    ) {
      return false;
    }
    return board.cells[position.row][position.col] === null;
  }

  checkWin(board: Board, lastMove: Position, stone: StoneType): boolean {
    const directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];

    for (const [dr, dc] of directions) {
      let count = 1;

      for (let i = 1; i < 5; i++) {
        const r = lastMove.row + dr * i;
        const c = lastMove.col + dc * i;
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
        if (board.cells[r][c] !== stone) break;
        count++;
      }

      for (let i = 1; i < 5; i++) {
        const r = lastMove.row - dr * i;
        const c = lastMove.col - dc * i;
        if (r < 0 || r >= BOARD_SIZE || c < 0 || c >= BOARD_SIZE) break;
        if (board.cells[r][c] !== stone) break;
        count++;
      }

      if (count >= 5) return true;
    }

    return false;
  }

  isBoardFull(board: Board): boolean {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board.cells[row][col] === null) return false;
      }
    }
    return true;
  }

  isGameOver(): boolean {
    return this.game?.winner != null;
  }

  toRoomInfo(): RoomInfo {
    return {
      id: this.id,
      name: this.name,
      hostName: this.host.name,
      challengerCount: this.challengers.length,
      status: this.status,
      hostStoneColor: this.hostStoneColor,
    };
  }
}
