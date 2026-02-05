import { useState } from 'react';
import { RoomInfo } from '../types/game';

interface LobbyProps {
  rooms: RoomInfo[];
  onCreateRoom: (roomName: string, playerName: string) => void;
  onJoinRoom: (roomId: string, playerName: string) => void;
  onRefresh: () => void;
}

export function Lobby({ rooms, onCreateRoom, onJoinRoom, onRefresh }: LobbyProps) {
  const [playerName, setPlayerName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreateRoom = () => {
    if (playerName.trim() && roomName.trim()) {
      onCreateRoom(roomName.trim(), playerName.trim());
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (playerName.trim()) {
      onJoinRoom(roomId, playerName.trim());
    } else {
      alert('이름을 입력해주세요.');
    }
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
    }}>
      <h1 style={{ textAlign: 'center', marginBottom: '24px' }}>
        🎮 일대다 오목
      </h1>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          내 이름
        </label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="이름을 입력하세요"
          style={{
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginBottom: '20px',
          }}
        >
          방 만들기
        </button>
      ) : (
        <div style={{
          padding: '16px',
          backgroundColor: '#f9f9f9',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="방 이름"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              marginBottom: '12px',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleCreateRoom}
              disabled={!playerName.trim() || !roomName.trim()}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                opacity: (!playerName.trim() || !roomName.trim()) ? 0.5 : 1,
              }}
            >
              생성
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#999',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>대기 중인 방</h2>
        <button
          onClick={onRefresh}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          새로고침
        </button>
      </div>

      {rooms.length === 0 ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#999',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
        }}>
          대기 중인 방이 없습니다.
        </div>
      ) : (
        <div>
          {rooms.map((room) => (
            <div
              key={room.id}
              style={{
                padding: '16px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px',
                marginBottom: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {room.name}
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  호스트: {room.hostName} | 도전자: {room.challengerCount}명
                </div>
              </div>
              <button
                onClick={() => handleJoinRoom(room.id)}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                참가
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
