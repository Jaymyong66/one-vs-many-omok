# 일대다 오목 (One vs Many Omok)

1명의 호스트가 여러 명의 도전자와 동시에 오목 대결을 펼치는 실시간 멀티플레이어 게임입니다.

## 게임 방식

- **호스트**: 방을 생성하고 검은 돌(선공)로 플레이
- **도전자**: 방에 참가하여 각자 흰 돌로 호스트와 1:1 대결
- **보드**: 15x15 오목판
- **승리 조건**: 가로/세로/대각선으로 5개 연속

### 턴 진행

1. 호스트가 한 수를 두면 모든 도전자 보드에 동시 적용
2. 각 도전자는 자신의 보드에서 응수
3. 모든 도전자가 응수하면 호스트 차례

## 기술 스택

### Client
- React 18 + TypeScript
- Vite
- Socket.io-client
- 앱인토스 웹뷰 게임

### Server
- Node.js + Express
- Socket.io
- TypeScript

## 실행 방법

### 서버 실행

```bash
cd server
npm install
npm run dev
```

서버가 `http://localhost:3001`에서 실행됩니다.

### 클라이언트 실행

```bash
cd client
npm install
npm run dev
```

클라이언트가 `http://localhost:5173`에서 실행됩니다.

## 테스트

### 서버 테스트

```bash
cd server
npm test
```

### 클라이언트 테스트

```bash
cd client
npm run test:run
```

## 프로젝트 구조

```
one-vs-many-omok/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Board.tsx        # 오목 보드 UI
│   │   │   ├── Stone.tsx        # 돌 컴포넌트
│   │   │   ├── GameRoom.tsx     # 게임방 UI
│   │   │   ├── Lobby.tsx        # 로비/방 목록
│   │   │   └── PlayerList.tsx   # 참가자 목록
│   │   ├── hooks/
│   │   │   └── useSocket.ts     # WebSocket 연결 훅
│   │   ├── utils/
│   │   │   └── gameLogic.ts     # 오목 승리 판정 로직
│   │   └── types/
│   │       └── game.ts          # 타입 정의
│   ├── granite.config.ts        # 앱인토스 설정
│   └── vite.config.ts
│
└── server/
    └── src/
        ├── index.ts             # 서버 엔트리
        ├── GameRoom.ts          # 게임방 클래스
        ├── GameManager.ts       # 방 관리자
        └── types.ts             # 서버 타입
```

## 빌드

### 클라이언트 빌드

```bash
cd client
npm run build
```

### 서버 빌드

```bash
cd server
npm run build
npm start
```
