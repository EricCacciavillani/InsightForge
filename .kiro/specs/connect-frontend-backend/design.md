# Design: Connect Frontend to Backend API

## Architecture

```
┌─────────────────────────────────────┐
│         Electron App                │
│  ┌─────────────────────────────┐    │
│  │   React Frontend            │    │
│  │   - useApi hook             │    │
│  │   - useWebSocket hook       │    │
│  └──────────────┬──────────────┘    │
│                 │                   │
│         HTTP + WebSocket            │
│                 │                   │
│  ┌──────────────▼──────────────┐    │
│  │   FastAPI Backend           │    │
│  │   - REST endpoints          │    │
│  │   - WebSocket /ws           │    │
│  └──────────────┬──────────────┘    │
│                 │                   │
│  ┌──────────────▼──────────────┐    │
│  │   Python Orchestrator       │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check if backend is running |
| `/config` | GET | Get current config and API key status |
| `/settings` | POST | Update API keys |
| `/runs` | GET | List all previous runs |
| `/runs/{component}/{timestamp}` | GET | Get run details |
| `/run` | POST | Start new orchestrator run |
| `/usage` | GET | Get token usage stats |
| `/ws` | WebSocket | Live updates during runs |

## Component Changes

### 1. App.tsx
- Add connection status indicator
- Check backend health on startup

### 2. useApi.ts (already exists)
- Already has REST and WebSocket hooks
- Add error handling for connection failures

### 3. Dashboard.tsx
- Replace mock data with real API calls
- Add loading states

### 4. RunOrchestrator.tsx
- Connect to WebSocket for live logs
- Call `/run` endpoint to start runs
- Show real-time progress

### 5. Results.tsx
- Fetch from `/runs` endpoint
- Load actual file contents

### 6. Settings.tsx
- POST to `/settings` endpoint
- Show API key status from `/config`

## Error Handling
- Show "Backend not running" banner if health check fails
- Retry WebSocket connection on disconnect
- Toast notifications for errors
