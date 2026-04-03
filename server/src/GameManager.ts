import { GameRoom } from './GameRoom';
import { Player, RoomInfo, SessionInfo } from './types';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private playerRooms: Map<string, string> = new Map();
  private sessions: Map<string, SessionInfo> = new Map();
  private socketToSession: Map<string, string> = new Map();

  generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // ─── Session management ────────────────────────────────────────────────────

  registerSession(sessionId: string, socketId: string): { isNew: boolean; session: SessionInfo } {
    const existing = this.sessions.get(sessionId);
    if (existing) {
      if (existing.gracePeriodTimer) {
        clearTimeout(existing.gracePeriodTimer);
        existing.gracePeriodTimer = null;
      }
      this.socketToSession.delete(existing.socketId);
      existing.socketId = socketId;
      this.socketToSession.set(socketId, sessionId);
      return { isNew: false, session: existing };
    }

    const session: SessionInfo = {
      sessionId,
      socketId,
      playerName: '',
      isHost: false,
      roomId: null,
      gracePeriodTimer: null,
    };
    this.sessions.set(sessionId, session);
    this.socketToSession.set(socketId, sessionId);
    return { isNew: true, session };
  }

  getSessionBySocketId(socketId: string): SessionInfo | undefined {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return undefined;
    return this.sessions.get(sessionId);
  }

  startGracePeriod(sessionId: string, onExpired: () => void, ms = 30000): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.gracePeriodTimer) clearTimeout(session.gracePeriodTimer);
    session.gracePeriodTimer = setTimeout(onExpired, ms);
  }

  clearSessionRoom(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) session.roomId = null;
  }

  deleteSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.gracePeriodTimer) clearTimeout(session.gracePeriodTimer);
      this.socketToSession.delete(session.socketId);
    }
    this.sessions.delete(sessionId);
  }

  // ─── Room management ───────────────────────────────────────────────────────

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
      // Host left — clear all challenger playerRooms and sessions
      for (const challenger of room.challengers) {
        this.playerRooms.delete(challenger.id);
        this.clearSessionRoom(challenger.id);
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
