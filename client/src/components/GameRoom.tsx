import { useEffect, useState } from 'react';
import { SharedGameState, Player, Position, VoteTally } from '../types/game';
import { Board } from './Board';
import { PlayerList } from './PlayerList';

interface GameRoomProps {
  roomName: string;
  hostName: string;
  player: Player;
  challengers: Player[];
  gameState: SharedGameState | null;
  isGameStarted: boolean;
  voteTally: VoteTally | null;
  myVote: Position | null;
  onStartGame: () => void;
  onPlaceStone: (position: Position) => void;
  onCastVote: (position: Position) => void;
  onLeaveRoom: () => void;
}

function useCountdown(timeLeftMs: number | null): number {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (timeLeftMs === null) {
      setSecondsLeft(0);
      return;
    }
    setSecondsLeft(Math.ceil(timeLeftMs / 1000));
    const interval = setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeftMs]);

  return secondsLeft;
}

export function GameRoom({
  roomName,
  hostName,
  player,
  challengers,
  gameState,
  isGameStarted,
  voteTally,
  myVote,
  onStartGame,
  onPlaceStone,
  onCastVote,
  onLeaveRoom,
}: GameRoomProps) {
  const isHost = player.isHost;
  const isVotingPhase = !!voteTally && gameState && !gameState.isHostTurn && !gameState.winner;
  const secondsLeft = useCountdown(isVotingPhase ? voteTally!.timeLeftMs : null);

  const voteCount = isVotingPhase ? Object.keys(voteTally!.votes).length : 0;
  const totalVoters = isVotingPhase ? voteTally!.totalVoters : 0;

  const renderStatus = () => {
    if (!gameState) return null;

    if (gameState.winner) {
      const winnerText =
        gameState.winner === 'host'
          ? isHost ? '🎉 승리! 모든 도전자를 이겼습니다!' : '😢 패배... 호스트가 이겼습니다.'
          : gameState.winner === 'challengers'
            ? isHost ? '😢 패배... 도전자들이 이겼습니다.' : '🎉 승리! 도전자들이 이겼습니다!'
            : '🤝 무승부';
      const bgColor =
        (gameState.winner === 'host' && isHost) || (gameState.winner === 'challengers' && !isHost)
          ? '#e8f5e9'
          : gameState.winner === 'draw'
            ? '#fff3e0'
            : '#ffebee';
      return (
        <div style={{ padding: '12px', backgroundColor: bgColor, borderRadius: '8px', textAlign: 'center', marginBottom: 16 }}>
          {winnerText}
        </div>
      );
    }

    if (isHost) {
      if (gameState.isHostTurn) {
        return (
          <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', textAlign: 'center', marginBottom: 16 }}>
            ⚫ 당신의 차례입니다. 돌을 놓으세요!
          </div>
        );
      }
      return (
        <div style={{ padding: '12px', backgroundColor: '#fff3e0', borderRadius: '8px', textAlign: 'center', marginBottom: 16 }}>
          ⏳ 도전자들이 투표 중... ({voteCount}/{totalVoters} 투표) — {secondsLeft}초 남음
        </div>
      );
    }

    // Challenger view
    if (gameState.isHostTurn) {
      return (
        <div style={{ padding: '12px', backgroundColor: '#fff3e0', borderRadius: '8px', textAlign: 'center', marginBottom: 16 }}>
          ⏳ 호스트의 차례입니다...
        </div>
      );
    }
    if (myVote) {
      return (
        <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '8px', textAlign: 'center', marginBottom: 16 }}>
          ⚪ 투표 완료! ({voteCount}/{totalVoters} 투표) — {secondsLeft}초 남음 (다른 칸을 클릭해 변경 가능)
        </div>
      );
    }
    return (
      <div style={{ padding: '12px', backgroundColor: '#e8f5e9', borderRadius: '8px', textAlign: 'center', marginBottom: 16 }}>
        ⚪ 돌을 놓을 위치에 투표하세요! ({voteCount}/{totalVoters} 투표) — {secondsLeft}초 남음
      </div>
    );
  };

  const handleBoardClick = (position: Position) => {
    if (!gameState || gameState.winner) return;
    if (gameState.board.cells[position.row][position.col] !== null) return; // Fix #7: occupied cell
    if (isHost && gameState.isHostTurn) {
      onPlaceStone(position);
    } else if (!isHost && !gameState.isHostTurn) {
      onCastVote(position);
    }
  };

  const renderBoard = () => {
    if (!isGameStarted) {
      if (isHost) {
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
      return (
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p>호스트가 게임을 시작할 때까지 기다려주세요...</p>
        </div>
      );
    }

    if (!gameState) return <div>게임 정보를 불러오는 중...</div>;

    const boardDisabled = isHost
      ? !gameState.isHostTurn || !!gameState.winner
      : gameState.isHostTurn || !!gameState.winner;

    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Board
          board={gameState.board}
          lastMove={gameState.lastMove}
          onCellClick={handleBoardClick}
          disabled={boardDisabled}
          votes={isVotingPhase ? voteTally!.votes : undefined}
          myVote={!isHost ? myVote : undefined}
        />
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
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

      {renderStatus()}
      {renderBoard()}
    </div>
  );
}
