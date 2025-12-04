# Tech Stack

## Backend (Python 3.11)

- **Framework**: FastAPI with uvicorn
- **LLM Clients**: OpenAI (GPT-5.1), Google Gemini (gemini-2.0-flash)
- **Search**: Tavily for web/academic research
- **Validation**: Pydantic v2
- **Real-time**: WebSockets for live updates

## Frontend (Electron + React)

- **Desktop**: Electron 28
- **UI Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS 3
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Build**: Vite 5

## Package Managers

- Backend: pip or conda
- Frontend: npm

## Common Commands

### Backend
```bash
# Install dependencies
pip install -r requirements.txt

# Start API server (port 8742)
python -m api.server
```

### Frontend
```bash
cd frontend

# Install dependencies
npm install

# Dev server only (port 5173)
npm run dev

# Electron dev mode
npm run electron:dev

# Production build
npm run electron:build
```

## Required Environment Variables

- `OPENAI_API_KEY` - Required for GPT-5.1
- `GEMINI_API_KEY` - Required for Gemini
- `TAVILY_API_KEY` - Optional, enables deep research

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /health | Health check |
| GET | /config | Current configuration |
| POST | /settings | Update API keys |
| POST | /run | Start research run |
| GET | /runs | List past runs |
| GET | /runs/{component}/{timestamp} | Get run details |
| GET | /usage | Token usage stats |
| WS | /ws | Real-time updates |

## API Error Format

All errors return JSON with consistent structure:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {}  // Optional additional context
}
```

Status codes:
- `400` - Invalid parameters or request body
- `401` - Missing or invalid API key
- `404` - Resource not found
- `422` - Validation error (Pydantic)
- `500` - Internal server error

## Testing Commands

```bash
# Backend tests
pytest tests/
pytest tests/ --cov=backend  # with coverage
pytest tests/ -k "test_name"  # specific test

# Frontend tests
cd frontend
npm test
npm run test:coverage
```

## Obtaining API Keys

- **OpenAI**: https://platform.openai.com/api-keys
- **Gemini**: https://aistudio.google.com/apikey
- **Tavily**: https://tavily.com (optional, for web search)
