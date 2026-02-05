import { GameRoom } from './GameRoom';
import { Player, RoomInfo } from './types';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map();

  generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom(roomName: string, host: Player): GameRoom {
    const roomId = this.generateRoomId();
    const room = new GameRoom(roomId, roomName, host);
    this.rooms.set(roomId, room);
    this.playerRooms.set(host.id, roomId);
    return room;
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByPlayerId(playerId: string): GameRoom | undefined {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  joinRoom(roomId: string, player: Player): GameRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    if (room.addChallenger(player)) {
      this.playerRooms.set(player.id, roomId);
      return room;
    }
    return undefined;
  }

  leaveRoom(playerId: string): GameRoom | undefined {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return undefined;

    const room = this.rooms.get(roomId);
    if (!room) return undefined;

    this.playerRooms.delete(playerId);

    if (room.host.id === playerId) {
      // Host left, close the room
      for (const challenger of room.challengers) {
        this.playerRooms.delete(challenger.id);
      }
      this.rooms.delete(roomId);
      return room;
    } else {
      room.removeChallenger(playerId);
      return room;
    }
  }

  deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      this.playerRooms.delete(room.host.id);
      for (const challenger of room.challengers) {
        this.playerRooms.delete(challenger.id);
      }
      this.rooms.delete(roomId);
    }
  }

  getAllRooms(): RoomInfo[] {
    return Array.from(this.rooms.values()).map(room => room.toRoomInfo());
  }

  getWaitingRooms(): RoomInfo[] {
    return Array.from(this.rooms.values())
      .filter(room => room.status === 'waiting')
      .map(room => room.toRoomInfo());
  }
}
