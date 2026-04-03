import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import { createApp } from './app';
import { GameState, RoomInfo, Player } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const GRACE_MS = 50;

let port: number;
let httpServer: ReturnType<typeof createServer>;
const sockets: Socket[] = [];

function connect(): Socket {
  const s = ioClient(`http://localhost:${port}`, { reconnection: false });
  sockets.push(s);
  return s;
}

/** Register a session on a socket. Resolves once connected + registered. */
function registerSession(s: Socket, sessionId: string): Promise<void> {
  return new Promise(resolve => {
    if (s.connected) {
      s.emit('register', sessionId);
      resolve();
    } else {
      s.once('connect', () => {
        s.emit('register', sessionId);
        resolve();
      });
    }
  });
}

/** Wait for a single-argument event. */
function waitFor<T>(s: Socket, event: string): Promise<T> {
  return new Promise(resolve => s.once(event as never, (arg: T) => resolve(arg)));
}

/** Wait for the multi-argument `reconnected` event. */
function waitForReconnected(s: Socket): Promise<[RoomInfo, Player, GameState[], Player[]]> {
  return new Promise(resolve =>
    s.once(
      'reconnected' as never,
      (room: RoomInfo, player: Player, states: GameState[], challengers: Player[]) =>
        resolve([room, player, states, challengers])
    )
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(done => {
  const app = createApp({ gracePeriodMs: GRACE_MS });
  httpServer = app.httpServer;
  httpServer.listen(0, () => {
    port = (httpServer.address() as AddressInfo).port;
    done();
  });
});

afterAll(done => {
  for (const s of sockets) s.disconnect();
  // Wait for in-flight grace period timers before closing
  setTimeout(() => httpServer.close(done), GRACE_MS * 3);
});

afterEach(() => {
  for (const s of [...sockets]) s.disconnect();
  sockets.length = 0;
});

// ── Test 4: Fresh connection receives sessionRegistered ────────────────────────

describe('fresh connection', () => {
  it('emits sessionRegistered with the provided sessionId', async () => {
    const s = connect();
    const received = await Promise.all([
      waitFor<string>(s, 'sessionRegistered'),
      registerSession(s, 'sid-t4-fresh'),
    ]);
    expect(received[0]).toBe('sid-t4-fresh');
  });
});

// ── Test 4b: Reconnect with no room still gets sessionRegistered ──────────────

describe('reconnect with no active room', () => {
  it('emits sessionRegistered (not reconnected) on the new socket', async () => {
    const sid = 'sid-t4b';
    const s1 = connect();
    await Promise.all([waitFor(s1, 'sessionRegistered'), registerSession(s1, sid)]);
    s1.disconnect();

    await delay(10); // reconnect before grace period

    const s2 = connect();
    const received = await Promise.all([
      waitFor<string>(s2, 'sessionRegistered'),
      registerSession(s2, sid),
    ]);
    expect(received[0]).toBe(sid);
  });
});

// ── Test 5: Host reconnects to waiting room ────────────────────────────────────

describe('host reconnects to waiting room', () => {
  it('receives reconnected event with correct room info', async () => {
    const sid = 'sid-t5a';
    const s1 = connect();
    await Promise.all([waitFor(s1, 'sessionRegistered'), registerSession(s1, sid)]);

    s1.emit('createRoom', 'TestRoom', 'Host');
    const roomInfo = await waitFor<RoomInfo>(s1, 'roomCreated');

    s1.disconnect();
    await delay(10);

    const s2 = connect();
    const [reconnPayload] = await Promise.all([
      waitForReconnected(s2),
      registerSession(s2, sid),
    ]);

    const [room] = reconnPayload;
    expect(room.id).toBe(roomInfo.id);
    expect(room.name).toBe('TestRoom');
  });

  it('includes challengers in the reconnected payload', async () => {
    const hostSid = 'sid-t5b-host';
    const challSid = 'sid-t5b-chall';

    const hostSock = connect();
    await Promise.all([waitFor(hostSock, 'sessionRegistered'), registerSession(hostSock, hostSid)]);
    hostSock.emit('createRoom', 'Room', 'Host');
    const roomInfo = await waitFor<RoomInfo>(hostSock, 'roomCreated');

    const challSock = connect();
    await Promise.all([waitFor(challSock, 'sessionRegistered'), registerSession(challSock, challSid)]);
    challSock.emit('joinRoom', roomInfo.id, 'Challenger');
    await waitFor(challSock, 'roomJoined');

    hostSock.disconnect();
    await delay(10);

    const hostSock2 = connect();
    const [reconnPayload] = await Promise.all([
      waitForReconnected(hostSock2),
      registerSession(hostSock2, hostSid),
    ]);

    const [, , , challengers] = reconnPayload;
    expect(challengers).toHaveLength(1);
    expect(challengers[0].id).toBe(challSid);
  });
});

// ── Test 6: Host reconnects mid-game, game state restored ─────────────────────

describe('host reconnects mid-game', () => {
  it('receives reconnected event with board state including placed stones', async () => {
    const hostSid = 'sid-t6-host';
    const challSid = 'sid-t6-chall';

    const hostSock = connect();
    await Promise.all([waitFor(hostSock, 'sessionRegistered'), registerSession(hostSock, hostSid)]);
    hostSock.emit('createRoom', 'GameRoom', 'Host');
    const roomInfo = await waitFor<RoomInfo>(hostSock, 'roomCreated');

    const challSock = connect();
    await Promise.all([waitFor(challSock, 'sessionRegistered'), registerSession(challSock, challSid)]);
    challSock.emit('joinRoom', roomInfo.id, 'Challenger');
    await waitFor(challSock, 'roomJoined');

    hostSock.emit('startGame');
    await waitFor(hostSock, 'gameStarted');

    hostSock.emit('placeStone', { row: 7, col: 7 });
    await waitFor(hostSock, 'gameState');

    hostSock.disconnect();
    await delay(10);

    const hostSock2 = connect();
    const [reconnPayload] = await Promise.all([
      waitForReconnected(hostSock2),
      registerSession(hostSock2, hostSid),
    ]);

    const [, , gameStates] = reconnPayload;
    expect(gameStates).toHaveLength(1);
    expect(gameStates[0].board.cells[7][7]).toBe('black');
  });
});

// ── Test 7: Host permanently disconnects → challengers get gameOver ───────────

describe('host permanent disconnect', () => {
  it('sends gameOver with winner=challenger to all challengers', async () => {
    const hostSid = 'sid-t7-host';
    const challSid = 'sid-t7-chall';

    const hostSock = connect();
    await Promise.all([waitFor(hostSock, 'sessionRegistered'), registerSession(hostSock, hostSid)]);
    hostSock.emit('createRoom', 'PermRoom', 'Host');
    const roomInfo = await waitFor<RoomInfo>(hostSock, 'roomCreated');

    const challSock = connect();
    await Promise.all([waitFor(challSock, 'sessionRegistered'), registerSession(challSock, challSid)]);
    challSock.emit('joinRoom', roomInfo.id, 'Challenger');
    await waitFor(challSock, 'roomJoined');

    hostSock.emit('startGame');
    await waitFor(challSock, 'gameStarted');

    // Host disconnects and does NOT reconnect → grace period fires
    hostSock.disconnect();

    const gameOver = await waitFor<GameState>(challSock, 'gameOver');
    expect(gameOver.winner).toBe('challenger');
  });
});

// ── Test 8: Challenger permanently disconnects → host's turn unblocked ────────

describe('challenger permanent disconnect', () => {
  it('sends allChallengersResponded to host after grace period expires', async () => {
    const hostSid = 'sid-t8-host';
    const challSid = 'sid-t8-chall';

    const hostSock = connect();
    await Promise.all([waitFor(hostSock, 'sessionRegistered'), registerSession(hostSock, hostSid)]);
    hostSock.emit('createRoom', 'UnblockRoom', 'Host');
    const roomInfo = await waitFor<RoomInfo>(hostSock, 'roomCreated');

    const challSock = connect();
    await Promise.all([waitFor(challSock, 'sessionRegistered'), registerSession(challSock, challSid)]);
    challSock.emit('joinRoom', roomInfo.id, 'Challenger');
    await waitFor(challSock, 'roomJoined');

    hostSock.emit('startGame');
    await waitFor(hostSock, 'gameStarted');

    // Host places stone — challenger becomes pending
    hostSock.emit('placeStone', { row: 0, col: 0 });
    await waitFor(challSock, 'gameState');

    // Challenger disconnects permanently → host should be unblocked
    challSock.disconnect();

    await waitFor(hostSock, 'allChallengersResponded');
  });
});
