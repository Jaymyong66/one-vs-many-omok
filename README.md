**언어 선택 / Language:** 한국어 | [English](README.en.md)

# 일대다 오목 (One vs Many Omok)

1명의 호스트가 여러 명의 도전자 팀과 **하나의 공유 보드**에서 실시간으로 오목 대결을 펼치는 멀티플레이어 게임입니다. 도전자들은 투표로 한 수를 결정합니다.

## 게임 방식

- **호스트**: 방을 생성하고 게임 시작 전 돌 색상(흑/백/랜덤)을 선택
- **도전자**: 방에 참가하여 팀으로 투표를 통해 수를 결정
- **보드**: 15x15 오목판 (단일 공유 보드)
- **승리 조건**: 가로/세로/대각선으로 5개 연속

### 턴 진행

1. 흑이 먼저 착수 (호스트가 흑이면 호스트 선공, 백이면 도전자 팀 선공)
2. 투표 30초 타이머 시작 — 각 도전자가 셀을 클릭해 투표 (변경 가능)
3. 실시간으로 투표 현황이 모든 플레이어에게 표시
4. 타이머 종료(또는 전원 투표 완료) 시 다수결로 수 결정; 동수이면 랜덤 선택; 무투표이면 빈 칸 랜덤 착수
5. 승자가 없으면 상대방 차례

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
