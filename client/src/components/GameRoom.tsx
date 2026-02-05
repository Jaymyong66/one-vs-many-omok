import { GameState, Player, Position } from '../types/game';
import { Board } from './Board';
import { PlayerList } from './PlayerList';

interface GameRoomProps {
  roomName: string;
  hostName: string;
  player: Player;
  challengers: Player[];
  gameStates: Map<string, GameState>;
  isGameStarted: boolean;
  canHostMove: boolean;
  onStartGame: () => void;
  onPlaceStone: (position: Position) => void;
  onLeaveRoom: () => void;
}

export function GameRoom({
  roomName,
  hostName,
  player,
  challengers,
  gameStates,
  isGameStarted,
  canHostMove,
  onStartGame,
  onPlaceStone,
  onLeaveRoom,
}: GameRoomProps) {
  const isHost = player.isHost;

  const renderHostView = () => {
    if (!isGameStarted) {
      return (
        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '20px', color: '#666' }}>
            도전자가 참가하면 게임을 시작할 수 있습니다.
          </p>
          <button
            onClick={onStartGame}
            disabled={challengers.length === 0}
            style={{
              padding: '14px 28px',
              fontSize: '18px',
              backgroundColor: challengers.length > 0 ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: challengers.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            게임 시작
          </button>
        </div>
      );
    }

    const allStates = Array.from(gameStates.values());
    const activeGames = allStates.filter(g => !g.winner);
    const finishedGames = allStates.filter(g => g.winner);

    return (
      <div>
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: canHostMove ? '#e8f5e9' : '#fff3e0',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          {canHostMove
            ? '⚫ 당신의 차례입니다. 돌을 놓으세요!'
            : '⏳ 도전자들의 응수를 기다리는 중...'}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
        }}>
          {activeGames.map((game) => {
            const challengerName = challengers.find(c => c.id === game.challengerId)?.name || '???';
            return (
              <div key={game.challengerId} style={{
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
              }}>
                <h4 style={{ margin: '0 0 12px 0' }}>vs {challengerName}</h4>
                <Board
                  board={game.board}
                  lastMove={game.lastMove}
                  onCellClick={onPlaceStone}
                  disabled={!canHostMove}
                />
              </div>
            );
          })}
        </div>

        {finishedGames.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <h3>종료된 게임</h3>
            {finishedGames.map((game) => {
              const challengerName = challengers.find(c => c.id === game.challengerId)?.name || '???';
              const resultText = game.winner === 'host' ? '승리!' : game.winner === 'challenger' ? '패배' : '무승부';
              const resultColor = game.winner === 'host' ? '#4CAF50' : game.winner === 'challenger' ? '#f44336' : '#FF9800';
              return (
                <div key={game.challengerId} style={{
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  marginBottom: '8px',
                }}>
                  vs {challengerName}: <span style={{ color: resultColor, fontWeight: 'bold' }}>{resultText}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderChallengerView = () => {
    if (!isGameStarted) {
      return (
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p>호스트가 게임을 시작할 때까지 기다려주세요...</p>
        </div>
      );
    }

    const game = gameStates.get(player.id);
    if (!game) {
      return <div>게임 정보를 불러오는 중...</div>;
    }

    const isMyTurn = !game.isHostTurn && !game.winner;

    return (
      <div>
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          backgroundColor: game.winner
            ? game.winner === 'challenger' ? '#e8f5e9' : '#ffebee'
            : isMyTurn ? '#e8f5e9' : '#fff3e0',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          {game.winner
            ? game.winner === 'challenger'
              ? '🎉 승리!'
              : game.winner === 'host'
                ? '😢 패배...'
                : '🤝 무승부'
            : isMyTurn
              ? '⚪ 당신의 차례입니다. 돌을 놓으세요!'
              : '⏳ 호스트의 차례입니다...'}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Board
            board={game.board}
            lastMove={game.lastMove}
            onCellClick={onPlaceStone}
            disabled={!isMyTurn}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '20px',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h1 style={{ margin: 0 }}>{roomName}</h1>
        <button
          onClick={onLeaveRoom}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          나가기
        </button>
      </div>

      <PlayerList host={hostName} challengers={challengers} />

      {isHost ? renderHostView() : renderChallengerView()}
    </div>
  );
}
