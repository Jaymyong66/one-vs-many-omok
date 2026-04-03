import { Player, HostColorPreference } from '../types/game';

interface PlayerListProps {
  host: string;
  challengers: Player[];
  isCurrentPlayerHost: boolean;
  currentPlayerId: string;
  hostStoneColor?: HostColorPreference | 'black' | 'white';
}

export function PlayerList({ host, challengers, isCurrentPlayerHost, currentPlayerId, hostStoneColor = 'black' }: PlayerListProps) {
  const resolvedHostColor = hostStoneColor === 'random' ? 'black' : hostStoneColor;
  const challengerColor = resolvedHostColor === 'black' ? 'white' : 'black';

  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px',
      marginBottom: '16px',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>참가자</h3>

      <div style={{ marginBottom: '8px' }}>
        <span style={{
          display: 'inline-block',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: resolvedHostColor === 'black' ? '#1a1a1a' : '#fff',
          border: resolvedHostColor === 'white' ? '1px solid #ccc' : 'none',
          marginRight: '8px',
        }} />
        <strong>호스트:</strong>{' '}
        {isCurrentPlayerHost ? <strong style={{ backgroundColor: '#e3f2fd', borderRadius: '3px', padding: '1px 4px' }}>{host}</strong> : host}
      </div>

      <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px' }}>
        <div style={{ marginBottom: '4px', color: '#666' }}>
          <span style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: challengerColor === 'black' ? '#1a1a1a' : '#fff',
            border: challengerColor === 'white' ? '1px solid #ccc' : 'none',
            marginRight: '8px',
          }} />
          도전자 ({challengers.length}명):
        </div>
        {challengers.length === 0 ? (
          <div style={{ color: '#999', marginLeft: '20px' }}>
            대기 중...
          </div>
        ) : (
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {challengers.map((challenger) => (
              <li key={challenger.id}>
                {challenger.id === currentPlayerId
                  ? <strong style={{ backgroundColor: '#e3f2fd', borderRadius: '3px', padding: '1px 4px' }}>{challenger.name}</strong>
                  : challenger.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
