import { GameManager } from './GameManager';
import { Player } from './types';

describe('GameManager', () => {
  let manager: GameManager;
  let host: Player;
  let challenger: Player;

  beforeEach(() => {
    manager = new GameManager();
    host = { id: 'host-1', name: 'Host', isHost: true };
    challenger = { id: 'challenger-1', name: 'Challenger', isHost: false };
  });

  describe('Room Creation', () => {
    it('should create a room', () => {
      const room = manager.createRoom('Test Room', host);
      expect(room).toBeDefined();
      expect(room.name).toBe('Test Room');
      expect(room.host).toEqual(host);
    });

    it('should generate unique room IDs', () => {
      const room1 = manager.createRoom('Room 1', host);
      const host2: Player = { id: 'host-2', name: 'Host2', isHost: true };
      const room2 = manager.createRoom('Room 2', host2);

      expect(room1.id).not.toBe(room2.id);
    });

    it('should track player room association', () => {
      const room = manager.createRoom('Test Room', host);
      const foundRoom = manager.getRoomByPlayerId(host.id);

      expect(foundRoom).toBeDefined();
      expect(foundRoom?.id).toBe(room.id);
    });
  });

  describe('Room Retrieval', () => {
    it('should get room by ID', () => {
      const room = manager.createRoom('Test Room', host);
      const foundRoom = manager.getRoom(room.id);

      expect(foundRoom).toBeDefined();
      expect(foundRoom?.name).toBe('Test Room');
    });

    it('should return undefined for non-existent room', () => {
      const room = manager.getRoom('non-existent');
      expect(room).toBeUndefined();
    });

    it('should return undefined for non-existent player', () => {
      const room = manager.getRoomByPlayerId('non-existent');
      expect(room).toBeUndefined();
    });
  });

  describe('Joining Room', () => {
    it('should allow player to join room', () => {
      const room = manager.createRoom('Test Room', host);
      const joinedRoom = manager.joinRoom(room.id, challenger);

      expect(joinedRoom).toBeDefined();
      expect(joinedRoom?.challengers).toHaveLength(1);
      expect(joinedRoom?.challengers[0]).toEqual(challenger);
    });

    it('should track challenger room association', () => {
      const room = manager.createRoom('Test Room', host);
      manager.joinRoom(room.id, challenger);

      const foundRoom = manager.getRoomByPlayerId(challenger.id);
      expect(foundRoom?.id).toBe(room.id);
    });

    it('should return undefined when joining non-existent room', () => {
      const result = manager.joinRoom('non-existent', challenger);
      expect(result).toBeUndefined();
    });
  });

  describe('Leaving Room', () => {
    it('should allow challenger to leave room', () => {
      const room = manager.createRoom('Test Room', host);
      manager.joinRoom(room.id, challenger);

      const leftRoom = manager.leaveRoom(challenger.id);
      expect(leftRoom).toBeDefined();
      expect(leftRoom?.challengers).toHaveLength(0);
    });

    it('should delete room when host leaves', () => {
      const room = manager.createRoom('Test Room', host);
      manager.joinRoom(room.id, challenger);

      manager.leaveRoom(host.id);

      expect(manager.getRoom(room.id)).toBeUndefined();
      expect(manager.getRoomByPlayerId(challenger.id)).toBeUndefined();
    });

    it('should return undefined when non-existent player leaves', () => {
      const result = manager.leaveRoom('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('Room List', () => {
    it('should return all rooms', () => {
      manager.createRoom('Room 1', host);
      const host2: Player = { id: 'host-2', name: 'Host2', isHost: true };
      manager.createRoom('Room 2', host2);

      const rooms = manager.getAllRooms();
      expect(rooms).toHaveLength(2);
    });

    it('should return only waiting rooms', () => {
      const room1 = manager.createRoom('Room 1', host);
      manager.joinRoom(room1.id, challenger);
      room1.startGame();

      const host2: Player = { id: 'host-2', name: 'Host2', isHost: true };
      manager.createRoom('Room 2', host2);

      const waitingRooms = manager.getWaitingRooms();
      expect(waitingRooms).toHaveLength(1);
      expect(waitingRooms[0].name).toBe('Room 2');
    });
  });

  describe('Delete Room', () => {
    it('should delete room and clean up player associations', () => {
      const room = manager.createRoom('Test Room', host);
      manager.joinRoom(room.id, challenger);

      manager.deleteRoom(room.id);

      expect(manager.getRoom(room.id)).toBeUndefined();
      expect(manager.getRoomByPlayerId(host.id)).toBeUndefined();
      expect(manager.getRoomByPlayerId(challenger.id)).toBeUndefined();
    });
  });
});
