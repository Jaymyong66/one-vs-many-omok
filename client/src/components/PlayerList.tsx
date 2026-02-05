import { Player } from '../types/game';

interface PlayerListProps {
  host: string;
  challengers: Player[];
}

export function PlayerList({ host, challengers }: PlayerListProps) {
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
          backgroundColor: '#1a1a1a',
          marginRight: '8px',
        }} />
        <strong>호스트:</strong> {host}
      </div>

      <div style={{ borderTop: '1px solid #ddd', paddingTop: '8px' }}>
        <div style={{ marginBottom: '4px', color: '#666' }}>
          <span style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
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
              <li key={challenger.id}>{challenger.name}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
