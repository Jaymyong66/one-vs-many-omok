import { StoneType } from '../types/game';

interface StoneProps {
  type: StoneType;
  isLastMove?: boolean;
}

export function Stone({ type, isLastMove }: StoneProps) {
  if (!type) return null;

  const baseStyle: React.CSSProperties = {
    width: '90%',
    height: '90%',
    borderRadius: '50%',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
  };

  const colorStyle: React.CSSProperties = type === 'black'
    ? { backgroundColor: '#1a1a1a', border: '1px solid #000' }
    : { backgroundColor: '#fff', border: '1px solid #ccc' };

  const lastMoveIndicator = isLastMove ? (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '30%',
      height: '30%',
      borderRadius: '50%',
      backgroundColor: type === 'black' ? '#ff6b6b' : '#e74c3c',
    }} />
  ) : null;

  return (
    <div style={{ ...baseStyle, ...colorStyle }}>
      {lastMoveIndicator}
    </div>
  );
}
