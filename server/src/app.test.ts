import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import { createApp } from './app';
import { SharedGameState, VoteTally, RoomInfo, Player, Board } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

const GRACE_MS = 50;
const VOTE_MS = 100; // short vote timeout for timer tests

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
function waitForReconnected(
  s: Socket
): Promise<[RoomInfo, Player, SharedGameState | null, Player[], VoteTally | null]> {
  return new Promise(resolve =>
    s.once(
      'reconnected' as never,
      (
        room: RoomInfo,
        player: Player,
        gameState: SharedGameState | null,
        challengers: Player[],
        voteTally: VoteTally | null
      ) => resolve([room, player, gameState, challengers, voteTally])
    )
  );
}

/** Wait for the multi-argument `gameOver` event. */
function waitForGameOver(s: Socket): Promise<['host' | 'challengers' | 'draw', Board]> {
  return new Promise(resolve =>
    s.once(
      'gameOver' as never,
      (winner: 'host' | 'challengers' | 'draw', board: Board) => resolve([winner, board])
    )
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(done => {
  const app = createApp({ gracePeriodMs: GRACE_MS, voteTimeoutMs: VOTE_MS });
  httpServer = app.httpServer;
  httpServer.listen(0, () => {
    port = (httpServer.address() as AddressInfo).port;
    done();
  });
});

afterAll(done => {
  for (const s of sockets) s.disconnect();
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

    const gameStateP = waitFor(hostSock, 'gameState');
    hostSock.emit('placeStone', { row: 7, col: 7 });
    await gameStateP;

    hostSock.disconnect();
    await delay(10);

    const hostSock2 = connect();
    const [reconnPayload] = await Promise.all([
      waitForReconnected(hostSock2),
      registerSession(hostSock2, hostSid),
    ]);

    const [, , gameState] = reconnPayload;
    expect(gameState).not.toBeNull();
    expect(gameState!.board.cells[7][7]).toBe('black');
  });
});

// ── Test 7: Host permanently disconnects → challengers get gameOver ───────────

describe('host permanent disconnect', () => {
  it('sends gameOver with winner=challengers to all challengers', async () => {
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

    const [winner] = await waitForGameOver(challSock);
    expect(winner).toBe('challengers');
  });
});

// ── Test 8: Challenger permanently disconnects → vote resolves early ──────────

describe('challenger permanent disconnect', () => {
  it('resolves vote early when sole challenger disconnects after host move', async () => {
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

    // Register initial state listeners BEFORE emit so no events are missed
    const initHostP = waitFor<SharedGameState>(hostSock, 'gameState');
    const initChallP = waitFor<SharedGameState>(challSock, 'gameState');
    hostSock.emit('startGame');
    await Promise.all([initHostP, initChallP]); // consume initial gameState on both sockets

    // Register post-move listeners BEFORE placing stone
    const hostMovedP = waitFor(hostSock, 'hostMoved');
    const postMoveHostP = waitFor<SharedGameState>(hostSock, 'gameState');
    const postMoveChallP = waitFor<SharedGameState>(challSock, 'gameState');
    hostSock.emit('placeStone', { row: 0, col: 0 });
    const [, , votingState] = await Promise.all([hostMovedP, postMoveHostP, postMoveChallP]);
    expect(votingState.isHostTurn).toBe(false); // challSock sees voting phase

    // Register resolution listeners BEFORE disconnecting
    const resolvedP = waitFor(hostSock, 'voteResolved');
    const afterResolveP = waitFor<SharedGameState>(hostSock, 'gameState');

    challSock.disconnect(); // grace period fires after 50ms → resolves with 0 votes

    const [state] = await Promise.all([afterResolveP, resolvedP]);
    expect(state.isHostTurn).toBe(true);
  });
});

// ── Test 9: Happy-path voting flow ────────────────────────────────────────────

describe('happy-path voting flow', () => {
  it('host moves → challenger votes → vote resolved → host can move again', async () => {
    const hostSid = 'sid-t9-host';
    const challSid = 'sid-t9-chall';

    const hostSock = connect();
    await Promise.all([waitFor(hostSock, 'sessionRegistered'), registerSession(hostSock, hostSid)]);
    hostSock.emit('createRoom', 'HappyRoom', 'Host');
    const roomInfo = await waitFor<RoomInfo>(hostSock, 'roomCreated');

    const challSock = connect();
    await Promise.all([waitFor(challSock, 'sessionRegistered'), registerSession(challSock, challSid)]);
    challSock.emit('joinRoom', roomInfo.id, 'Challenger');
    await waitFor(challSock, 'roomJoined');

    // Consume initial gameState on BOTH sockets before registering post-move listeners
    const initHostP = waitFor<SharedGameState>(hostSock, 'gameState');
    const initChallP = waitFor<SharedGameState>(challSock, 'gameState');
    hostSock.emit('startGame');
    const [initialState] = await Promise.all([initHostP, initChallP]);
    expect(initialState.isHostTurn).toBe(true);

    // Register listeners for BOTH sockets before placeStone to consume voting phase
    const hostMovedP = waitFor(hostSock, 'hostMoved');
    const postMoveHostP = waitFor<SharedGameState>(hostSock, 'gameState');
    const votingStateP = waitFor<SharedGameState>(challSock, 'gameState');
    hostSock.emit('placeStone', { row: 7, col: 7 });
    const [, postMoveState] = await Promise.all([hostMovedP, postMoveHostP, votingStateP]);
    expect(postMoveState.board.cells[7][7]).toBe('black');
    expect(postMoveState.isHostTurn).toBe(false);

    // Register resolution listeners only after voting phase consumed on both sockets
    const tallyP = waitFor<VoteTally>(challSock, 'voteUpdate');
    const resolvedP = waitFor(hostSock, 'voteResolved');
    const afterVoteP = waitFor<SharedGameState>(hostSock, 'gameState');

    challSock.emit('placeStone', { row: 7, col: 8 });
    const [tally, , afterVote] = await Promise.all([tallyP, resolvedP, afterVoteP]);
    expect(Object.keys(tally.votes)).toHaveLength(1);
    expect(afterVote.board.cells[7][8]).toBe('white');
    expect(afterVote.isHostTurn).toBe(true);
  });

  it('vote resolves via timer expiry when challenger does not vote', async () => {
    const hostSid = 'sid-t9b-host';
    const challSid = 'sid-t9b-chall';

    const hostSock = connect();
    await Promise.all([waitFor(hostSock, 'sessionRegistered'), registerSession(hostSock, hostSid)]);
    hostSock.emit('createRoom', 'TimerRoom', 'Host');
    const roomInfo = await waitFor<RoomInfo>(hostSock, 'roomCreated');

    const challSock = connect();
    await Promise.all([waitFor(challSock, 'sessionRegistered'), registerSession(challSock, challSid)]);
    challSock.emit('joinRoom', roomInfo.id, 'Challenger');
    await waitFor(challSock, 'roomJoined');

    // Consume initial gameState on BOTH sockets
    const initHostP = waitFor<SharedGameState>(hostSock, 'gameState');
    const initChallP = waitFor<SharedGameState>(challSock, 'gameState');
    hostSock.emit('startGame');
    await Promise.all([initHostP, initChallP]);

    // Consume voting phase gameState on BOTH sockets before registering timer listeners
    const postMoveHostP = waitFor<SharedGameState>(hostSock, 'gameState');
    const votingPhaseP = waitFor<SharedGameState>(challSock, 'gameState');
    hostSock.emit('placeStone', { row: 7, col: 7 });
    await Promise.all([postMoveHostP, votingPhaseP]);

    // Register timer-resolution listeners only after voting phase is fully consumed
    const resolvedP = waitFor(hostSock, 'voteResolved');
    const afterTimerP = waitFor<SharedGameState>(hostSock, 'gameState');

    // Challenger does NOT vote — timer fires after VOTE_MS
    const state = await afterTimerP;
    await resolvedP;
    expect(state.isHostTurn).toBe(true);
    const hasWhite = state.board.cells.some((row: (string | null)[]) => row.some(cell => cell === 'white'));
    expect(hasWhite).toBe(true);
  }, 2000);

  it('voteUpdate is broadcast after each vote', async () => {
    const hostSid = 'sid-t9c-host';
    const challSid1 = 'sid-t9c-c1';
    const challSid2 = 'sid-t9c-c2';

    const hostSock = connect();
    await Promise.all([waitFor(hostSock, 'sessionRegistered'), registerSession(hostSock, hostSid)]);
    hostSock.emit('createRoom', 'MultiRoom', 'Host');
    const roomInfo = await waitFor<RoomInfo>(hostSock, 'roomCreated');

    const c1 = connect();
    await Promise.all([waitFor(c1, 'sessionRegistered'), registerSession(c1, challSid1)]);
    c1.emit('joinRoom', roomInfo.id, 'Chall1');
    await waitFor(c1, 'roomJoined');

    const c2 = connect();
    await Promise.all([waitFor(c2, 'sessionRegistered'), registerSession(c2, challSid2)]);
    c2.emit('joinRoom', roomInfo.id, 'Chall2');
    await waitFor(c2, 'roomJoined');

    hostSock.emit('startGame');
    await waitFor(hostSock, 'gameStarted');

    // Register before emit to avoid missing events
    const votingP = waitFor<SharedGameState>(c1, 'gameState');
    hostSock.emit('placeStone', { row: 0, col: 0 });
    await votingP;

    // c1 votes — register listeners before emit
    const tally1P = waitFor<VoteTally>(hostSock, 'voteUpdate');
    c1.emit('placeStone', { row: 5, col: 5 });
    const tally1 = await tally1P;
    expect(Object.keys(tally1.votes)).toHaveLength(1);
    expect(tally1.totalVoters).toBe(2);

    // c2 votes → all votes in, resolves immediately — register before emit
    const resolvedP = waitFor(hostSock, 'voteResolved');
    const finalStateP = waitFor<SharedGameState>(hostSock, 'gameState');
    c2.emit('placeStone', { row: 5, col: 5 }); // same position → plurality
    const finalState = await finalStateP;
    await resolvedP;
    expect(finalState.board.cells[5][5]).toBe('white');
    expect(finalState.isHostTurn).toBe(true);
  });
});
