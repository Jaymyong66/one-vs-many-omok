import { GameRoom } from './GameRoom';
import { Player, BOARD_SIZE } from './types';

describe('GameRoom', () => {
  let room: GameRoom;
  let host: Player;
  let challenger: Player;

  beforeEach(() => {
    host = { id: 'host-1', name: 'Host', isHost: true };
    challenger = { id: 'challenger-1', name: 'Challenger', isHost: false };
    room = new GameRoom('room-1', 'Test Room', host);
  });

  describe('Room Creation', () => {
    it('should create a room with correct initial state', () => {
      expect(room.id).toBe('room-1');
      expect(room.name).toBe('Test Room');
      expect(room.host).toEqual(host);
      expect(room.challengers).toHaveLength(0);
      expect(room.status).toBe('waiting');
    });
  });

  describe('Challenger Management', () => {
    it('should add a challenger successfully', () => {
      const result = room.addChallenger(challenger);
      expect(result).toBe(true);
      expect(room.challengers).toHaveLength(1);
      expect(room.challengers[0]).toEqual(challenger);
    });

    it('should not add duplicate challenger', () => {
      room.addChallenger(challenger);
      const result = room.addChallenger(challenger);
      expect(result).toBe(false);
      expect(room.challengers).toHaveLength(1);
    });

    it('should not add challenger when game is playing', () => {
      room.addChallenger(challenger);
      room.startGame();
      const newChallenger: Player = { id: 'challenger-2', name: 'New', isHost: false };
      const result = room.addChallenger(newChallenger);
      expect(result).toBe(false);
    });

    it('should remove a challenger successfully', () => {
      room.addChallenger(challenger);
      const result = room.removeChallenger(challenger.id);
      expect(result).toBe(true);
      expect(room.challengers).toHaveLength(0);
    });

    it('should return false when removing non-existent challenger', () => {
      const result = room.removeChallenger('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Game Start', () => {
    it('should start game with challengers', () => {
      room.addChallenger(challenger);
      const result = room.startGame();
      expect(result).toBe(true);
      expect(room.status).toBe('playing');
      expect(room.game).not.toBeNull();
    });

    it('should not start game without challengers', () => {
      const result = room.startGame();
      expect(result).toBe(false);
      expect(room.status).toBe('waiting');
    });

    it('should initialize shared board with empty cells', () => {
      room.addChallenger(challenger);
      room.startGame();

      expect(room.game!.board.cells.length).toBe(BOARD_SIZE);
      room.game!.board.cells.forEach((row: (string | null)[]) => {
        expect(row.length).toBe(BOARD_SIZE);
        row.forEach((cell: string | null) => expect(cell).toBeNull());
      });
    });

    it('should set host turn first', () => {
      room.addChallenger(challenger);
      room.startGame();
      expect(room.game!.isHostTurn).toBe(true);
    });
  });

  describe('Stone Placement', () => {
    beforeEach(() => {
      room.addChallenger(challenger);
      room.startGame();
    });

    it('should allow host to place stone on host turn', () => {
      const result = room.placeHostStone({ row: 7, col: 7 });
      expect(result).toBe(true);
      expect(room.game!.board.cells[7][7]).toBe('black');
      expect(room.game!.isHostTurn).toBe(false);
    });

    it('should allow challenger to cast a vote on challenger turn', () => {
      room.placeHostStone({ row: 7, col: 7 });
      const result = room.castVote(challenger.id, { row: 7, col: 8 });
      expect(result).toBe(true);
    });

    it('resolveVotes places white stone and returns host turn', () => {
      room.placeHostStone({ row: 7, col: 7 });
      room.castVote(challenger.id, { row: 7, col: 8 });
      const { position, method } = room.resolveVotes();

      expect(position).toEqual({ row: 7, col: 8 });
      expect(method).toBe('plurality');
      expect(room.game!.board.cells[7][8]).toBe('white');
      expect(room.game!.isHostTurn).toBe(true);
    });

    it('should not allow placing stone on occupied cell', () => {
      room.placeHostStone({ row: 7, col: 7 });
      const isValid = room.isValidMove(room.game!.board, { row: 7, col: 7 });
      expect(isValid).toBe(false);
    });

    it('should not allow placing stone outside board', () => {
      expect(room.isValidMove(room.game!.board, { row: -1, col: 0 })).toBe(false);
      expect(room.isValidMove(room.game!.board, { row: 0, col: -1 })).toBe(false);
      expect(room.isValidMove(room.game!.board, { row: BOARD_SIZE, col: 0 })).toBe(false);
      expect(room.isValidMove(room.game!.board, { row: 0, col: BOARD_SIZE })).toBe(false);
    });

    it('should not allow host to place stone on challenger turn', () => {
      room.placeHostStone({ row: 7, col: 7 }); // now challenger turn
      const result = room.placeHostStone({ row: 7, col: 8 });
      expect(result).toBe(false);
    });

    it('should not allow challenger to vote on host turn', () => {
      const result = room.castVote(challenger.id, { row: 7, col: 7 });
      expect(result).toBe(false);
    });
  });

  describe('Win Detection', () => {
    beforeEach(() => {
      room.addChallenger(challenger);
      room.startGame();
    });

    /** Helper: host places, challenger votes elsewhere, resolve. */
    function turn(hostPos: { row: number; col: number }, challengerPos: { row: number; col: number }) {
      room.placeHostStone(hostPos);
      room.castVote(challenger.id, challengerPos);
      room.resolveVotes();
    }

    it('should detect horizontal win for host', () => {
      // Black: 7,3–7,7; White: 8,3–8,6
      turn({ row: 7, col: 3 }, { row: 8, col: 3 });
      turn({ row: 7, col: 4 }, { row: 8, col: 4 });
      turn({ row: 7, col: 5 }, { row: 8, col: 5 });
      turn({ row: 7, col: 6 }, { row: 8, col: 6 });
      room.placeHostStone({ row: 7, col: 7 }); // winning move

      expect(room.game!.winner).toBe('host');
    });

    it('should detect vertical win for host', () => {
      turn({ row: 3, col: 7 }, { row: 3, col: 8 });
      turn({ row: 4, col: 7 }, { row: 4, col: 8 });
      turn({ row: 5, col: 7 }, { row: 5, col: 8 });
      turn({ row: 6, col: 7 }, { row: 6, col: 8 });
      room.placeHostStone({ row: 7, col: 7 });

      expect(room.game!.winner).toBe('host');
    });

    it('should detect diagonal win for host', () => {
      turn({ row: 3, col: 3 }, { row: 3, col: 4 });
      turn({ row: 4, col: 4 }, { row: 4, col: 5 });
      turn({ row: 5, col: 5 }, { row: 5, col: 6 });
      turn({ row: 6, col: 6 }, { row: 6, col: 7 });
      room.placeHostStone({ row: 7, col: 7 });

      expect(room.game!.winner).toBe('host');
    });

    it('should detect anti-diagonal win for host', () => {
      turn({ row: 3, col: 7 }, { row: 3, col: 8 });
      turn({ row: 4, col: 6 }, { row: 4, col: 8 });
      turn({ row: 5, col: 5 }, { row: 5, col: 8 });
      turn({ row: 6, col: 4 }, { row: 6, col: 8 });
      room.placeHostStone({ row: 7, col: 3 });

      expect(room.game!.winner).toBe('host');
    });

    it('should detect challengers win', () => {
      // White wins: 8,3–8,7
      turn({ row: 7, col: 3 }, { row: 8, col: 3 });
      turn({ row: 7, col: 4 }, { row: 8, col: 4 });
      turn({ row: 7, col: 5 }, { row: 8, col: 5 });
      turn({ row: 7, col: 6 }, { row: 8, col: 6 });
      room.placeHostStone({ row: 0, col: 0 }); // host plays elsewhere
      room.castVote(challenger.id, { row: 8, col: 7 });
      room.resolveVotes(); // challengers win here

      expect(room.game!.winner).toBe('challengers');
    });

    it('should not allow moves after game is won', () => {
      turn({ row: 7, col: 3 }, { row: 8, col: 3 });
      turn({ row: 7, col: 4 }, { row: 8, col: 4 });
      turn({ row: 7, col: 5 }, { row: 8, col: 5 });
      turn({ row: 7, col: 6 }, { row: 8, col: 6 });
      room.placeHostStone({ row: 7, col: 7 }); // host wins

      expect(room.castVote(challenger.id, { row: 0, col: 0 })).toBe(false);
      expect(room.placeHostStone({ row: 0, col: 1 })).toBe(false);
    });
  });

  describe('Voting Mechanics', () => {
    const challenger2: Player = { id: 'challenger-2', name: 'Challenger2', isHost: false };

    beforeEach(() => {
      room.addChallenger(challenger);
      room.addChallenger(challenger2);
      room.startGame();
    });

    it('host move is applied to the single shared board', () => {
      room.placeHostStone({ row: 7, col: 7 });
      expect(room.game!.board.cells[7][7]).toBe('black');
    });

    it('plurality: most-voted position wins', () => {
      room.placeHostStone({ row: 0, col: 0 });
      room.castVote(challenger.id, { row: 5, col: 5 });
      room.castVote(challenger2.id, { row: 5, col: 5 });
      const { position, method } = room.resolveVotes();

      expect(position).toEqual({ row: 5, col: 5 });
      expect(method).toBe('plurality');
    });

    it('tie-break: one of the tied positions is chosen', () => {
      room.placeHostStone({ row: 0, col: 0 });
      room.castVote(challenger.id, { row: 3, col: 3 });
      room.castVote(challenger2.id, { row: 5, col: 5 });
      const { method, position } = room.resolveVotes();

      expect(method).toBe('tiebreak');
      const chosen = JSON.stringify(position);
      expect([
        JSON.stringify({ row: 3, col: 3 }),
        JSON.stringify({ row: 5, col: 5 }),
      ]).toContain(chosen);
    });

    it('random: valid cell chosen when no votes cast', () => {
      room.placeHostStone({ row: 0, col: 0 });
      // No votes
      const { method, position } = room.resolveVotes();

      expect(method).toBe('random');
      expect(room.game!.board.cells[position.row][position.col]).toBe('white');
    });

    it('allVotesIn returns false until all challengers vote', () => {
      room.placeHostStone({ row: 7, col: 7 });
      expect(room.allVotesIn()).toBe(false);

      room.castVote(challenger.id, { row: 7, col: 8 });
      expect(room.allVotesIn()).toBe(false);

      room.castVote(challenger2.id, { row: 8, col: 7 });
      expect(room.allVotesIn()).toBe(true);
    });

    it('removing a challenger updates allVotesIn correctly', () => {
      room.placeHostStone({ row: 7, col: 7 });
      room.castVote(challenger.id, { row: 7, col: 8 });
      expect(room.allVotesIn()).toBe(false);

      room.removeChallenger(challenger2.id); // challenger2 never voted
      expect(room.allVotesIn()).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      room.addChallenger(challenger);
      room.startGame();
    });

    it('castVote rejects vote from non-challenger player ID', () => {
      room.placeHostStone({ row: 0, col: 0 });
      const result = room.castVote('not-a-challenger', { row: 5, col: 5 });
      expect(result).toBe(false);
    });

    it('castVote allows a challenger to change their vote', () => {
      room.placeHostStone({ row: 0, col: 0 });
      room.castVote(challenger.id, { row: 3, col: 3 });
      room.castVote(challenger.id, { row: 5, col: 5 });
      const { position } = room.resolveVotes();
      expect(position).toEqual({ row: 5, col: 5 }); // second vote wins
    });

    it('castVote rejects vote on an occupied cell', () => {
      room.placeHostStone({ row: 7, col: 7 }); // black at (7,7)
      const result = room.castVote(challenger.id, { row: 7, col: 7 });
      expect(result).toBe(false);
    });

    it('isGameOver returns false when game is null, true when winner is set', () => {
      expect(room.isGameOver()).toBe(false);
      room.game!.winner = 'host';
      expect(room.isGameOver()).toBe(true);
    });

    it('getVoteTally returns correct shape during voting phase', () => {
      room.placeHostStone({ row: 0, col: 0 });
      room.castVote(challenger.id, { row: 5, col: 5 });

      const tally = room.getVoteTally();
      expect(tally.totalVoters).toBe(1);
      expect(tally.votes[challenger.id]).toEqual({ row: 5, col: 5 });
      expect(tally.timeLeftMs).toBeGreaterThan(0);
    });

    it('allVotesIn returns true when no challengers remain', () => {
      room.placeHostStone({ row: 0, col: 0 });
      room.removeChallenger(challenger.id);
      expect(room.allVotesIn()).toBe(true);
    });

    it('vote timer fires callback and can be cleared before firing', () => {
      jest.useFakeTimers();
      const cb = jest.fn();
      room.startVoteTimer(cb);
      room.clearVoteTimer();
      jest.runAllTimers();
      expect(cb).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it('vote round nonce prevents stale timer from resolving a completed round', () => {
      // Simulate the race: votes resolve early (e.g., last vote came in) but the
      // already-scheduled timer callback still fires — it must be a no-op.
      jest.useFakeTimers();
      const cb = jest.fn();

      room.placeHostStone({ row: 0, col: 0 }); // voteRound → 1
      room.startVoteTimer(cb); // timer captures round 1

      // Votes resolved without cancelling the timer (simulates race condition)
      room.castVote(challenger.id, { row: 5, col: 5 });
      room.resolveVotes(); // isHostTurn = true; voteRound stays 1

      room.placeHostStone({ row: 1, col: 1 }); // voteRound → 2
      // Deliberately do NOT call startVoteTimer — old round-1 timer still pending

      jest.runAllTimers(); // old round-1 timer fires: voteRound(2) ≠ capturedRound(1) → skipped
      expect(cb).not.toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('Room Info', () => {
    it('should return correct room info', () => {
      room.addChallenger(challenger);
      const info = room.toRoomInfo();

      expect(info.id).toBe('room-1');
      expect(info.name).toBe('Test Room');
      expect(info.hostName).toBe('Host');
      expect(info.challengerCount).toBe(1);
      expect(info.status).toBe('waiting');
    });
  });
});
