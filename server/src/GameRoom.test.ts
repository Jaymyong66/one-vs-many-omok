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
      expect(room.games.size).toBe(1);
    });

    it('should not start game without challengers', () => {
      const result = room.startGame();
      expect(result).toBe(false);
      expect(room.status).toBe('waiting');
    });

    it('should create separate board for each challenger', () => {
      const challenger2: Player = { id: 'challenger-2', name: 'Challenger2', isHost: false };
      room.addChallenger(challenger);
      room.addChallenger(challenger2);
      room.startGame();

      expect(room.games.size).toBe(2);
      expect(room.getGameState(challenger.id)).toBeDefined();
      expect(room.getGameState(challenger2.id)).toBeDefined();
    });

    it('should initialize board with empty cells', () => {
      room.addChallenger(challenger);
      room.startGame();
      const gameState = room.getGameState(challenger.id);

      expect(gameState?.board.cells.length).toBe(BOARD_SIZE);
      gameState?.board.cells.forEach(row => {
        expect(row.length).toBe(BOARD_SIZE);
        row.forEach(cell => expect(cell).toBeNull());
      });
    });

    it('should set host turn first', () => {
      room.addChallenger(challenger);
      room.startGame();
      const gameState = room.getGameState(challenger.id);

      expect(gameState?.isHostTurn).toBe(true);
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

      const gameState = room.getGameState(challenger.id);
      expect(gameState?.board.cells[7][7]).toBe('black');
      expect(gameState?.isHostTurn).toBe(false);
    });

    it('should allow challenger to place stone on challenger turn', () => {
      room.placeHostStone({ row: 7, col: 7 });
      const result = room.placeChallengerStone(challenger.id, { row: 7, col: 8 });
      expect(result).toBe(true);

      const gameState = room.getGameState(challenger.id);
      expect(gameState?.board.cells[7][8]).toBe('white');
      expect(gameState?.isHostTurn).toBe(true);
    });

    it('should not allow placing stone on occupied cell', () => {
      room.placeHostStone({ row: 7, col: 7 });
      room.placeChallengerStone(challenger.id, { row: 7, col: 8 });

      // Host tries to place on occupied cell
      const gameState = room.getGameState(challenger.id);
      const isValid = room.isValidMove(gameState!.board, { row: 7, col: 7 });
      expect(isValid).toBe(false);
    });

    it('should not allow placing stone outside board', () => {
      const gameState = room.getGameState(challenger.id);
      expect(room.isValidMove(gameState!.board, { row: -1, col: 0 })).toBe(false);
      expect(room.isValidMove(gameState!.board, { row: 0, col: -1 })).toBe(false);
      expect(room.isValidMove(gameState!.board, { row: BOARD_SIZE, col: 0 })).toBe(false);
      expect(room.isValidMove(gameState!.board, { row: 0, col: BOARD_SIZE })).toBe(false);
    });

    it('should not allow challenger to place stone on host turn', () => {
      const result = room.placeChallengerStone(challenger.id, { row: 7, col: 7 });
      expect(result).toBe(false);
    });
  });

  describe('Win Detection', () => {
    beforeEach(() => {
      room.addChallenger(challenger);
      room.startGame();
    });

    it('should detect horizontal win', () => {
      // Black: 7,3 - 7,4 - 7,5 - 7,6 - 7,7
      // White: 8,3 - 8,4 - 8,5 - 8,6
      room.placeHostStone({ row: 7, col: 3 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 3 });
      room.placeHostStone({ row: 7, col: 4 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 4 });
      room.placeHostStone({ row: 7, col: 5 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 5 });
      room.placeHostStone({ row: 7, col: 6 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 6 });
      room.placeHostStone({ row: 7, col: 7 });

      const gameState = room.getGameState(challenger.id);
      expect(gameState?.winner).toBe('host');
    });

    it('should detect vertical win', () => {
      // Black: 3,7 - 4,7 - 5,7 - 6,7 - 7,7
      room.placeHostStone({ row: 3, col: 7 });
      room.placeChallengerStone(challenger.id, { row: 3, col: 8 });
      room.placeHostStone({ row: 4, col: 7 });
      room.placeChallengerStone(challenger.id, { row: 4, col: 8 });
      room.placeHostStone({ row: 5, col: 7 });
      room.placeChallengerStone(challenger.id, { row: 5, col: 8 });
      room.placeHostStone({ row: 6, col: 7 });
      room.placeChallengerStone(challenger.id, { row: 6, col: 8 });
      room.placeHostStone({ row: 7, col: 7 });

      const gameState = room.getGameState(challenger.id);
      expect(gameState?.winner).toBe('host');
    });

    it('should detect diagonal win', () => {
      // Black: 3,3 - 4,4 - 5,5 - 6,6 - 7,7
      room.placeHostStone({ row: 3, col: 3 });
      room.placeChallengerStone(challenger.id, { row: 3, col: 4 });
      room.placeHostStone({ row: 4, col: 4 });
      room.placeChallengerStone(challenger.id, { row: 4, col: 5 });
      room.placeHostStone({ row: 5, col: 5 });
      room.placeChallengerStone(challenger.id, { row: 5, col: 6 });
      room.placeHostStone({ row: 6, col: 6 });
      room.placeChallengerStone(challenger.id, { row: 6, col: 7 });
      room.placeHostStone({ row: 7, col: 7 });

      const gameState = room.getGameState(challenger.id);
      expect(gameState?.winner).toBe('host');
    });

    it('should detect anti-diagonal win', () => {
      // Black: 3,7 - 4,6 - 5,5 - 6,4 - 7,3
      room.placeHostStone({ row: 3, col: 7 });
      room.placeChallengerStone(challenger.id, { row: 3, col: 8 });
      room.placeHostStone({ row: 4, col: 6 });
      room.placeChallengerStone(challenger.id, { row: 4, col: 8 });
      room.placeHostStone({ row: 5, col: 5 });
      room.placeChallengerStone(challenger.id, { row: 5, col: 8 });
      room.placeHostStone({ row: 6, col: 4 });
      room.placeChallengerStone(challenger.id, { row: 6, col: 8 });
      room.placeHostStone({ row: 7, col: 3 });

      const gameState = room.getGameState(challenger.id);
      expect(gameState?.winner).toBe('host');
    });

    it('should detect challenger win', () => {
      // White wins: 8,3 - 8,4 - 8,5 - 8,6 - 8,7
      room.placeHostStone({ row: 7, col: 3 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 3 });
      room.placeHostStone({ row: 7, col: 4 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 4 });
      room.placeHostStone({ row: 7, col: 5 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 5 });
      room.placeHostStone({ row: 7, col: 6 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 6 });
      room.placeHostStone({ row: 0, col: 0 }); // Host plays elsewhere
      room.placeChallengerStone(challenger.id, { row: 8, col: 7 });

      const gameState = room.getGameState(challenger.id);
      expect(gameState?.winner).toBe('challenger');
    });

    it('should not allow moves after game is won', () => {
      // Create winning condition for host
      room.placeHostStone({ row: 7, col: 3 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 3 });
      room.placeHostStone({ row: 7, col: 4 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 4 });
      room.placeHostStone({ row: 7, col: 5 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 5 });
      room.placeHostStone({ row: 7, col: 6 });
      room.placeChallengerStone(challenger.id, { row: 8, col: 6 });
      room.placeHostStone({ row: 7, col: 7 }); // Host wins

      // Try to place more stones
      const result = room.placeChallengerStone(challenger.id, { row: 0, col: 0 });
      expect(result).toBe(false);
    });
  });

  describe('Multiple Challengers', () => {
    const challenger2: Player = { id: 'challenger-2', name: 'Challenger2', isHost: false };

    beforeEach(() => {
      room.addChallenger(challenger);
      room.addChallenger(challenger2);
      room.startGame();
    });

    it('should apply host move to all boards', () => {
      room.placeHostStone({ row: 7, col: 7 });

      const game1 = room.getGameState(challenger.id);
      const game2 = room.getGameState(challenger2.id);

      expect(game1?.board.cells[7][7]).toBe('black');
      expect(game2?.board.cells[7][7]).toBe('black');
    });

    it('should keep boards independent for challenger moves', () => {
      room.placeHostStone({ row: 7, col: 7 });

      room.placeChallengerStone(challenger.id, { row: 7, col: 8 });
      room.placeChallengerStone(challenger2.id, { row: 8, col: 7 });

      const game1 = room.getGameState(challenger.id);
      const game2 = room.getGameState(challenger2.id);

      expect(game1?.board.cells[7][8]).toBe('white');
      expect(game1?.board.cells[8][7]).toBeNull();
      expect(game2?.board.cells[8][7]).toBe('white');
      expect(game2?.board.cells[7][8]).toBeNull();
    });

    it('should track pending challengers', () => {
      room.placeHostStone({ row: 7, col: 7 });
      expect(room.allChallengersResponded()).toBe(false);

      room.placeChallengerStone(challenger.id, { row: 7, col: 8 });
      expect(room.allChallengersResponded()).toBe(false);

      room.placeChallengerStone(challenger2.id, { row: 8, col: 7 });
      expect(room.allChallengersResponded()).toBe(true);
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
