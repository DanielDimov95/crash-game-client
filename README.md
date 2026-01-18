# Crash Game Client

A real-time betting game client built with Angular that connects to a SignalR hub for live game updates.

## Features

- Real-time multiplier updates via SignalR
- Round status tracking (Betting Phase, Multiplier Updating Phase, etc.)
- Place bet functionality
- Cash out functionality
- Balance tracking
- Automatic reconnection handling

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open your browser and navigate to `http://localhost:4200`

## Game Flow

1. **Betting Phase**: When a new round is created, players can place bets
2. **Multiplier Updating Phase**: The multiplier increases in real-time
3. **Cash Out**: Players can cash out at any time before the crash
4. **Round Finished**: If a player doesn't cash out before the crash, they lose their bet

## Configuration

The SignalR connection and API endpoints are configured in:
- `src/app/services/signalr.service.ts` - SignalR hub connection
- `src/app/services/api.service.ts` - API endpoints for placing bets and cashing out

Session token is currently hardcoded in the services. In production, this should be managed securely.
