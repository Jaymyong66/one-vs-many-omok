import { Board as BoardType, Position, BOARD_SIZE, VoteMap } from '../types/game';
import { Stone } from './Stone';

interface BoardProps {
  board: BoardType;
  lastMove: Position | null;
  onCellClick: (position: Position) => void;
  disabled?: boolean;
  votes?: VoteMap;
  myVote?: Position | null;
}

export function Board({ board, lastMove, onCellClick, disabled, votes, myVote }: BoardProps) {
  const cellSize = 32;
  const boardPadding = 20;
  const boardSize = cellSize * (BOARD_SIZE - 1) + boardPadding * 2;

  const handleClick = (row: number, col: number) => {
    if (!disabled) {
      onCellClick({ row, col });
    }
  };

  // Build a per-cell vote count map for rendering
  const voteCounts: Record<string, number> = {};
  if (votes) {
    for (const pos of Object.values(votes)) {
      const key = `${pos.row},${pos.col}`;
      voteCounts[key] = (voteCounts[key] || 0) + 1;
    }
  }

  const renderGridLines = () => {
    const lines = [];

    for (let i = 0; i < BOARD_SIZE; i++) {
      lines.push(
        <line
          key={`h-${i}`}
          x1={boardPadding}
          y1={boardPadding + i * cellSize}
          x2={boardPadding + (BOARD_SIZE - 1) * cellSize}
          y2={boardPadding + i * cellSize}
          stroke="#8b7355"
          strokeWidth={1}
        />
      );
    }

    for (let i = 0; i < BOARD_SIZE; i++) {
      lines.push(
        <line
          key={`v-${i}`}
          x1={boardPadding + i * cellSize}
          y1={boardPadding}
          x2={boardPadding + i * cellSize}
          y2={boardPadding + (BOARD_SIZE - 1) * cellSize}
          stroke="#8b7355"
          strokeWidth={1}
        />
      );
    }

    // Star points (화점)
    const starPoints = [
      [3, 3], [3, 7], [3, 11],
      [7, 3], [7, 7], [7, 11],
      [11, 3], [11, 7], [11, 11],
    ];

    starPoints.forEach(([row, col], index) => {
      lines.push(
        <circle
          key={`star-${index}`}
          cx={boardPadding + col * cellSize}
          cy={boardPadding + row * cellSize}
          r={4}
          fill="#8b7355"
        />
      );
    });

    return lines;
  };

  const renderStones = () => {
    const cells = [];

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const stone = board.cells[row][col];
        const isLast = lastMove?.row === row && lastMove?.col === col;
        const key = `${row},${col}`;
        const voteCount = voteCounts[key] || 0;
        const isMyVoteCell = myVote?.row === row && myVote?.col === col;

        cells.push(
          <div
            key={`cell-${row}-${col}`}
            onClick={() => handleClick(row, col)}
            style={{
              position: 'absolute',
              left: boardPadding + col * cellSize - cellSize / 2,
              top: boardPadding + row * cellSize - cellSize / 2,
              width: cellSize,
              height: cellSize,
              cursor: disabled || stone ? 'default' : 'pointer',
            }}
          >
            <Stone type={stone} isLastMove={isLast} />

            {/* My vote highlight (ring under any stone) */}
            {isMyVoteCell && !stone && (
              <div style={{
                position: 'absolute',
                inset: 3,
                borderRadius: '50%',
                border: '2px solid #f59e0b',
                pointerEvents: 'none',
              }} />
            )}

            {/* Vote count badge (only on empty cells with votes) */}
            {voteCount > 0 && !stone && (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: isMyVoteCell ? '#f59e0b' : 'rgba(59,130,246,0.85)',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {voteCount}
                </div>
              </div>
            )}
          </div>
        );
      }
    }

    return cells;
  };

  return (
    <div
      style={{
        position: 'relative',
        width: boardSize,
        height: boardSize,
        backgroundColor: '#dcb35c',
        borderRadius: 4,
        boxShadow: '4px 4px 8px rgba(0,0,0,0.3)',
      }}
    >
      <svg
        width={boardSize}
        height={boardSize}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {renderGridLines()}
      </svg>
      {renderStones()}
    </div>
  );
}
