import { useSocket } from './hooks/useSocket';
import { Lobby } from './components/Lobby';
import { GameRoom } from './components/GameRoom';

function App() {
  const {
    isConnected,
    rooms,
    currentRoom,
    player,
    gameStates,
    challengers,
    isGameStarted,
    canHostMove,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    startGame,
    placeStone,
    refreshRooms,
  } = useSocket();

  if (!isConnected) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#666',
      }}>
        서버에 연결 중...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa' }}>
      {error && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          backgroundColor: '#f44336',
          color: 'white',
          borderRadius: '8px',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          {error}
        </div>
      )}

      {!currentRoom || !player ? (
        <Lobby
          rooms={rooms}
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          onRefresh={refreshRooms}
        />
      ) : (
        <GameRoom
          roomName={currentRoom.name}
          hostName={currentRoom.hostName}
          player={player}
          challengers={challengers}
          gameStates={gameStates}
          isGameStarted={isGameStarted}
          canHostMove={canHostMove}
          onStartGame={startGame}
          onPlaceStone={placeStone}
          onLeaveRoom={leaveRoom}
        />
      )}
    </div>
  );
}

export default App;
